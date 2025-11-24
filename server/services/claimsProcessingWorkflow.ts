import { storage } from '../storage';
import { claimsAdjudicationService } from './claimsAdjudication';
import { eligibilityEngine } from './eligibilityEngine';
import { medicalNecessityValidator } from './medicalNecessityValidator';
import { fraudDetectionEngine } from './fraudDetectionEngine';
import { financialCalculationService } from './financialCalculationService';
import { eobGenerationService } from './eobGenerationService';
import { Claim, ClaimAdjudicationResult, ExplanationOfBenefits } from '@shared/schema';

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  result?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export interface WorkflowExecution {
  workflowId: string;
  claimId: number;
  workflowType: 'standard' | 'expedited' | 'manual_review' | 'investigation';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  totalDuration?: number;
  steps: WorkflowStep[];
  finalResult?: WorkflowResult;
  error?: string;
  metadata: {
    initiatedBy: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    processingMode: 'automatic' | 'manual';
    estimatedCompletionTime?: Date;
  };
}

export interface WorkflowResult {
  claimId: number;
  finalStatus: 'approved' | 'partially_approved' | 'denied' | 'under_review' | 'investigation_required';
  approvedAmount: number;
  memberResponsibility: number;
  insurerResponsibility: number;
  processingTime: number;
  stepsExecuted: string[];
  alerts: string[];
  nextSteps: string[];
  qualityScore: number;
  complianceScore: number;
  auditRequired: boolean;
  eobGenerated: boolean;
  paymentEstimated: boolean;
}

export interface WorkflowConfiguration {
  enableAutoApproval: boolean;
  autoApprovalThreshold: number; // 0-100
  requireMedicalReviewThreshold: number;
  enableFraudDetection: boolean;
  fraudDetectionThreshold: number;
  enableFinancialValidation: boolean;
  enableBatchProcessing: boolean;
  maxBatchSize: number;
  processingTimeout: number; // minutes
  retryAttempts: number;
  notificationTriggers: {
    claimSubmitted: boolean;
    eligibilityVerified: boolean;
    medicalReviewRequired: boolean;
    fraudDetected: boolean;
    claimApproved: boolean;
    claimDenied: boolean;
    paymentProcessed: boolean;
  };
}

export class ClaimsProcessingWorkflow {
  private activeWorkflows: Map<string, WorkflowExecution> = new Map();
  private workflowQueue: WorkflowExecution[] = [];
  private configuration: WorkflowConfiguration;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.configuration = this.getDefaultConfiguration();
    this.startBackgroundProcessing();
  }

  // Initialize and orchestrate the complete claims processing workflow
  async processClaim(claimId: number, options: {
    workflowType?: 'standard' | 'expedited' | 'manual_review' | 'investigation';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    processingMode?: 'automatic' | 'manual';
    initiatedBy?: string;
  } = {}): Promise<WorkflowResult> {
    const workflowId = this.generateWorkflowId();
    const claim = await storage.getClaim(claimId);

    if (!claim) {
      throw new Error(`Claim ${claimId} not found`);
    }

    // Determine workflow type based on claim characteristics and options
    const workflowType = this.determineWorkflowType(claim, options);

    // Create workflow execution
    const workflow: WorkflowExecution = {
      workflowId,
      claimId,
      workflowType,
      status: 'pending',
      startTime: new Date(),
      steps: [],
      metadata: {
        initiatedBy: options.initiatedBy || 'system',
        priority: options.priority || this.determinePriority(claim),
        processingMode: options.processingMode || 'automatic',
        estimatedCompletionTime: this.estimateCompletionTime(workflowType)
      }
    };

    // Store workflow
    this.activeWorkflows.set(workflowId, workflow);

    try {
      // Execute workflow steps
      const result = await this.executeWorkflow(workflow);

      // Update workflow with final result
      workflow.finalResult = result;
      workflow.status = 'completed';
      workflow.endTime = new Date();
      workflow.totalDuration = workflow.endTime.getTime() - workflow.startTime.getTime();

      // Save workflow execution to storage
      await this.saveWorkflowExecution(workflow);

      return result;

    } catch (error) {
      workflow.status = 'failed';
      workflow.error = error instanceof Error ? error.message : 'Unknown error';
      workflow.endTime = new Date();
      workflow.totalDuration = workflow.endTime.getTime() - workflow.startTime.getTime();

      await this.saveWorkflowExecution(workflow);
      throw error;
    } finally {
      // Remove from active workflows
      this.activeWorkflows.delete(workflowId);
    }
  }

  // Execute the complete workflow with all steps
  private async executeWorkflow(workflow: WorkflowExecution): Promise<WorkflowResult> {
    workflow.status = 'running';

    // Define workflow steps based on workflow type
    const steps = this.defineWorkflowSteps(workflow.workflowType);

    // Execute each step
    for (const step of steps) {
      const workflowStep: WorkflowStep = {
        id: step.id,
        name: step.name,
        description: step.description,
        status: 'pending',
        metadata: step.metadata || {}
      };

      workflow.steps.push(workflowStep);

      try {
        workflowStep.status = 'in_progress';
        workflowStep.startTime = new Date();

        // Execute the step
        workflowStep.result = await step.execute(workflow.claimId, workflow);

        workflowStep.status = 'completed';
        workflowStep.endTime = new Date();
        workflowStep.duration = workflowStep.endTime.getTime() - workflowStep.startTime.getTime();

      } catch (error) {
        workflowStep.status = 'failed';
        workflowStep.error = error instanceof Error ? error.message : 'Unknown error';
        workflowStep.endTime = new Date();
        workflowStep.duration = workflowStep.endTime.getTime() - workflowStep.startTime.getTime();

        // Determine if workflow should continue or fail
        if (step.critical) {
          throw error;
        }
      }
    }

    // Compile final result
    return this.compileWorkflowResult(workflow);
  }

  // Define workflow steps based on workflow type
  private defineWorkflowSteps(workflowType: string): Array<{
    id: string;
    name: string;
    description: string;
    execute: (claimId: number, workflow: WorkflowExecution) => Promise<any>;
    critical: boolean;
    metadata?: Record<string, any>;
  }> {
    const commonSteps = [
      {
        id: 'claim_validation',
        name: 'Claim Validation',
        description: 'Validate claim data and completeness',
        execute: async (claimId: number) => await this.validateClaim(claimId),
        critical: true
      },
      {
        id: 'eligibility_verification',
        name: 'Eligibility Verification',
        description: 'Verify member eligibility and benefits',
        execute: async (claimId: number) => await this.verifyEligibility(claimId),
        critical: true
      },
      {
        id: 'fraud_detection',
        name: 'Fraud Detection Analysis',
        description: 'Analyze claim for potential fraud indicators',
        execute: async (claimId: number) => await this.detectFraud(claimId),
        critical: false
      },
      {
        id: 'medical_necessity_validation',
        name: 'Medical Necessity Validation',
        description: 'Validate medical necessity of procedures',
        execute: async (claimId: number) => await this.validateMedicalNecessity(claimId),
        critical: false
      },
      {
        id: 'financial_calculation',
        name: 'Financial Calculation',
        description: 'Calculate financial responsibility and amounts',
        execute: async (claimId: number) => await this.calculateFinancials(claimId),
        critical: true
      }
    ];

    const adjudicationStep = {
      id: 'claims_adjudication',
      name: 'Claims Adjudication',
      description: 'Adjudicate claim based on all validations',
      execute: async (claimId: number) => await this.adjudicateClaim(claimId),
      critical: true
    };

    const eobStep = {
      id: 'eob_generation',
      name: 'EOB Generation',
      description: 'Generate Explanation of Benefits',
      execute: async (claimId: number) => await this.generateEOB(claimId),
      critical: false
    };

    switch (workflowType) {
      case 'expedited':
        return [
          commonSteps[0], // claim_validation
          commonSteps[1], // eligibility_verification
          commonSteps[4], // financial_calculation
          adjudicationStep,
          eobStep
        ];

      case 'investigation':
        return [
          commonSteps[0], // claim_validation
          commonSteps[1], // eligibility_verification
          commonSteps[2], // fraud_detection (enhanced)
          {
            id: 'enhanced_review',
            name: 'Enhanced Investigation Review',
            description: 'Detailed fraud investigation review',
            execute: async (claimId: number) => await this.conductEnhancedReview(claimId),
            critical: true
          },
          adjudicationStep
        ];

      case 'manual_review':
        return [
          commonSteps[0], // claim_validation
          commonSteps[1], // eligibility_verification
          commonSteps[2], // fraud_detection
          {
            id: 'manual_clinical_review',
            name: 'Manual Clinical Review',
            description: 'Manual review by clinical specialist',
            execute: async (claimId: number) => await this.conductManualReview(claimId),
            critical: true
          },
          commonSteps[4], // financial_calculation
          adjudicationStep,
          eobStep
        ];

      default: // standard
        return [...commonSteps, adjudicationStep, eobStep];
    }
  }

  // Workflow step implementations
  private async validateClaim(claimId: number): Promise<any> {
    const claim = await storage.getClaim(claimId);
    if (!claim) {
      throw new Error('Claim not found');
    }

    const validationErrors: string[] = [];

    // Basic validation
    if (!claim.memberId) validationErrors.push('Member ID required');
    if (!claim.institutionId) validationErrors.push('Institution ID required');
    if (!claim.benefitId) validationErrors.push('Benefit ID required');
    if (!claim.amount || claim.amount <= 0) validationErrors.push('Valid claim amount required');
    if (!claim.serviceDate) validationErrors.push('Service date required');

    // Service date validation
    if (claim.serviceDate) {
      const serviceDate = new Date(claim.serviceDate);
      const today = new Date();
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 1); // Allow future dates up to 1 year

      if (serviceDate > maxDate) {
        validationErrors.push('Service date too far in future');
      }

      const minDate = new Date();
      minDate.setFullYear(minDate.getFullYear() - 2); // Allow dates up to 2 years ago
      if (serviceDate < minDate) {
        validationErrors.push('Service date too old (beyond 2 years)');
      }
    }

    return {
      valid: validationErrors.length === 0,
      validationErrors,
      claim: {
        id: claim.id,
        amount: claim.amount,
        serviceDate: claim.serviceDate,
        submissionDate: claim.submissionDate
      }
    };
  }

  private async verifyEligibility(claimId: number): Promise<any> {
    const claim = await storage.getClaim(claimId);
    if (!claim) {
      throw new Error('Claim not found');
    }

    const eligibilityCheck = await eligibilityEngine.checkEligibility({
      memberId: claim.memberId,
      benefitId: claim.benefitId,
      institutionId: claim.institutionId,
      serviceDate: claim.serviceDate ? new Date(claim.serviceDate) : new Date(),
      claimAmount: claim.amount
    });

    return eligibilityCheck;
  }

  private async detectFraud(claimId: number): Promise<any> {
    const claim = await storage.getClaim(claimId);
    if (!claim) {
      throw new Error('Claim not found');
    }

    const fraudAnalysis = await fraudDetectionEngine.analyzeClaim(claim);
    return fraudAnalysis;
  }

  private async validateMedicalNecessity(claimId: number): Promise<any> {
    const claim = await storage.getClaim(claimId);
    if (!claim) {
      throw new Error('Claim not found');
    }

    // Get member and diagnosis information
    const member = await storage.getMember(claim.memberId);
    const diagnosisCodes = await storage.getDiagnosisCodes();

    if (!member) {
      throw new Error('Member not found');
    }

    // For demonstration, use first diagnosis code
    const primaryDiagnosis = diagnosisCodes[0]?.code || 'Z00.00';

    const validationRequest = {
      claimId,
      diagnosisCode: primaryDiagnosis,
      procedureCodes: ['99213'], // General check-up
      memberInfo: {
        age: this.calculateAge(member.dateOfBirth),
        gender: member.gender,
        medicalHistory: [] // Would get from member records
      },
      serviceInfo: {
        serviceDate: claim.serviceDate ? new Date(claim.serviceDate) : new Date(),
        providerType: 'primary_care',
        setting: 'outpatient',
        urgency: 'elective'
      }
    };

    const validationResult = await medicalNecessityValidator.validateMedicalNecessity(validationRequest);
    return validationResult;
  }

  private async calculateFinancials(claimId: number): Promise<any> {
    const claim = await storage.getClaim(claimId);
    if (!claim) {
      throw new Error('Claim not found');
    }

    const calculationRequest = {
      claimId,
      originalAmount: claim.amount,
      memberId: claim.memberId,
      benefitId: claim.benefitId,
      institutionId: claim.institutionId
    };

    const financialResult = await financialCalculationService.calculateFinancialResponsibility(calculationRequest);
    return financialResult;
  }

  private async adjudicateClaim(claimId: number): Promise<any> {
    const adjudicationResult = await claimsAdjudicationService.processClaim(claimId);
    return adjudicationResult;
  }

  private async generateEOB(claimId: number): Promise<any> {
    const eobResult = await eobGenerationService.generateEOB(claimId);
    return eobResult;
  }

  private async conductEnhancedReview(claimId: number): Promise<any> {
    // Enhanced review for investigation workflow
    return {
      reviewType: 'enhanced_investigation',
      investigationRequired: true,
      reviewFlags: ['billing_pattern_anomaly', 'provider_behavior_deviation'],
      recommendation: 'hold_for_manual_review'
    };
  }

  private async conductManualReview(claimId: number): Promise<any> {
    // Manual clinical review
    return {
      reviewType: 'manual_clinical',
      reviewerAssigned: true,
      reviewStatus: 'pending_clinical_specialist',
      estimatedReviewTime: '24-48_hours'
    };
  }

  // Compile workflow result from all steps
  private compileWorkflowResult(workflow: WorkflowExecution): WorkflowResult {
    const claimId = workflow.claimId;
    const adjudicationStep = workflow.steps.find(s => s.id === 'claims_adjudication');
    const financialStep = workflow.steps.find(s => s.id === 'financial_calculation');
    const fraudStep = workflow.steps.find(s => s.id === 'fraud_detection');
    const eobStep = workflow.steps.find(s => s.id === 'eob_generation');

    // Get adjudication result
    const adjudicationResult = adjudicationStep?.result;
    const financialResult = financialStep?.result;

    // Determine final status
    let finalStatus: WorkflowResult['finalStatus'] = 'under_review';
    let approvedAmount = 0;
    let memberResponsibility = 0;
    let insurerResponsibility = 0;

    if (adjudicationResult) {
      switch (adjudicationResult.status) {
        case 'APPROVED':
          finalStatus = 'approved';
          approvedAmount = adjudicationResult.approvedAmount || 0;
          break;
        case 'PARTIALLY_APPROVED':
          finalStatus = 'partially_approved';
          approvedAmount = adjudicationResult.approvedAmount || 0;
          break;
        case 'DENIED':
          finalStatus = 'denied';
          approvedAmount = 0;
          break;
        case 'UNDER_REVIEW':
          finalStatus = 'under_review';
          approvedAmount = adjudicationResult.approvedAmount || 0;
          break;
      }

      memberResponsibility = adjudicationResult.memberResponsibility || 0;
      insurerResponsibility = adjudicationResult.insurerResponsibility || 0;
    }

    if (financialResult && financialResult.calculations) {
      memberResponsibility = financialResult.calculations.memberResponsibility;
      insurerResponsibility = financialResult.calculations.insurerResponsibility;
    }

    // Calculate processing time
    const processingTime = workflow.endTime ?
      workflow.endTime.getTime() - workflow.startTime.getTime() : 0;

    // Generate alerts
    const alerts: string[] = [];
    if (fraudStep?.result?.riskLevel === 'HIGH') {
      alerts.push('High fraud risk detected');
    }
    if (fraudStep?.result?.riskLevel === 'CRITICAL') {
      alerts.push('Critical fraud indicators - investigation required');
    }
    if (finalStatus === 'denied') {
      alerts.push('Claim denied - member notification required');
    }
    if (finalStatus === 'approved' && approvedAmount > 10000) {
      alerts.push('High-value claim approved - additional review recommended');
    }

    // Determine next steps
    const nextSteps: string[] = [];
    if (finalStatus === 'approved' || finalStatus === 'partially_approved') {
      nextSteps.push('Process payment to provider');
      nextSteps.push('Generate and send EOB to member');
    }
    if (finalStatus === 'denied') {
      nextSteps.push('Send denial letter to member');
      nextSteps.push('Notify provider of denial');
    }
    if (finalStatus === 'under_review') {
      nextSteps.push('Assign to clinical reviewer');
      nextSteps.push('Request additional documentation if needed');
    }
    if (alerts.includes('Critical fraud indicators - investigation required')) {
      nextSteps.push('Initiate fraud investigation');
      nextSteps.push('Place claim on hold');
    }

    // Calculate quality and compliance scores
    const qualityScore = this.calculateQualityScore(workflow);
    const complianceScore = this.calculateComplianceScore(workflow);

    // Determine if audit is required
    const auditRequired = this.shouldRequireAudit(workflow);

    return {
      claimId,
      finalStatus,
      approvedAmount,
      memberResponsibility,
      insurerResponsibility,
      processingTime,
      stepsExecuted: workflow.steps.map(s => s.id),
      alerts,
      nextSteps,
      qualityScore,
      complianceScore,
      auditRequired,
      eobGenerated: eobStep?.status === 'completed',
      paymentEstimated: financialStep?.status === 'completed'
    };
  }

  // Helper methods
  private determineWorkflowType(claim: Claim, options: any): WorkflowExecution['workflowType'] {
    if (options.workflowType) {
      return options.workflowType;
    }

    // Auto-determine based on claim characteristics
    if (claim.amount > 25000) {
      return 'investigation';
    }
    if (claim.amount > 10000 || claim.fraudRiskLevel === 'high') {
      return 'manual_review';
    }
    if (claim.amount < 500 && claim.submissionDate) {
      const daysSinceSubmission = (Date.now() - new Date(claim.submissionDate).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceSubmission < 1) {
        return 'expedited';
      }
    }

    return 'standard';
  }

  private determinePriority(claim: Claim): WorkflowExecution['metadata']['priority'] {
    if (claim.amount > 50000) return 'urgent';
    if (claim.amount > 25000) return 'high';
    if (claim.amount > 10000) return 'medium';
    return 'low';
  }

  private estimateCompletionTime(workflowType: string): Date {
    const now = new Date();
    let minutes = 30; // Standard processing time

    switch (workflowType) {
      case 'expedited':
        minutes = 5;
        break;
      case 'standard':
        minutes = 30;
        break;
      case 'manual_review':
        minutes = 24 * 60; // 24 hours
        break;
      case 'investigation':
        minutes = 72 * 60; // 72 hours
        break;
    }

    return new Date(now.getTime() + minutes * 60 * 1000);
  }

  private calculateAge(dateOfBirth: string | Date): number {
    const birth = new Date(dateOfBirth);
    const today = new Date();
    return today.getFullYear() - birth.getFullYear();
  }

  private calculateQualityScore(workflow: WorkflowExecution): number {
    let score = 100;

    // Deduct points for failed steps
    const failedSteps = workflow.steps.filter(s => s.status === 'failed');
    score -= failedSteps.length * 10;

    // Deduct points for long processing time
    if (workflow.totalDuration && workflow.totalDuration > 60000) { // > 1 minute
      score -= 10;
    }

    return Math.max(0, score);
  }

  private calculateComplianceScore(workflow: WorkflowExecution): number {
    let score = 100;

    // Check if all required steps were completed
    const requiredSteps = ['claim_validation', 'eligibility_verification', 'financial_calculation'];
    const completedRequiredSteps = workflow.steps.filter(s =>
      requiredSteps.includes(s.id) && s.status === 'completed'
    );

    if (completedRequiredSteps.length < requiredSteps.length) {
      score -= 25;
    }

    return Math.max(0, score);
  }

  private shouldRequireAudit(workflow: WorkflowExecution): boolean {
    // Require audit for high-value claims or those with quality issues
    const adjudicationResult = workflow.steps.find(s => s.id === 'claims_adjudication')?.result;
    const highValue = adjudicationResult?.approvedAmount > 25000;
    const qualityIssues = workflow.steps.some(s => s.status === 'failed');
    const fraudAlerts = workflow.steps.find(s => s.id === 'fraud_detection')?.result?.riskLevel === 'HIGH';

    return highValue || qualityIssues || fraudAlerts;
  }

  private generateWorkflowId(): string {
    return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultConfiguration(): WorkflowConfiguration {
    return {
      enableAutoApproval: true,
      autoApprovalThreshold: 85,
      requireMedicalReviewThreshold: 60,
      enableFraudDetection: true,
      fraudDetectionThreshold: 70,
      enableFinancialValidation: true,
      enableBatchProcessing: true,
      maxBatchSize: 50,
      processingTimeout: 30, // minutes
      retryAttempts: 3,
      notificationTriggers: {
        claimSubmitted: true,
        eligibilityVerified: true,
        medicalReviewRequired: true,
        fraudDetected: true,
        claimApproved: true,
        claimDenied: true,
        paymentProcessed: true
      }
    };
  }

  private startBackgroundProcessing(): void {
    // Process workflow queue every 30 seconds
    this.processingInterval = setInterval(() => {
      this.processWorkflowQueue();
    }, 30000);
  }

  private async processWorkflowQueue(): Promise<void> {
    while (this.workflowQueue.length > 0) {
      const workflow = this.workflowQueue.shift();
      if (workflow) {
        try {
          await this.executeWorkflow(workflow);
        } catch (error) {
          console.error('Error processing workflow:', error);
        }
      }
    }
  }

  private async saveWorkflowExecution(workflow: WorkflowExecution): Promise<void> {
    // In a real implementation, this would save to database
    console.log(`Workflow ${workflow.workflowId} completed for claim ${workflow.claimId}`);
  }

  // Public methods for workflow management
  async getWorkflowStatus(workflowId: string): Promise<WorkflowExecution | null> {
    return this.activeWorkflows.get(workflowId) || null;
  }

  async cancelWorkflow(workflowId: string): Promise<boolean> {
    const workflow = this.activeWorkflows.get(workflowId);
    if (workflow) {
      workflow.status = 'cancelled';
      workflow.endTime = new Date();
      this.activeWorkflows.delete(workflowId);
      return true;
    }
    return false;
  }

  async getActiveWorkflows(): Promise<WorkflowExecution[]> {
    return Array.from(this.activeWorkflows.values());
  }

  updateConfiguration(config: Partial<WorkflowConfiguration>): void {
    this.configuration = { ...this.configuration, ...config };
  }

  async getWorkflowHistory(claimId: number): Promise<WorkflowExecution[]> {
    // In a real implementation, this would query the database
    return [];
  }
}

export const claimsProcessingWorkflow = new ClaimsProcessingWorkflow();