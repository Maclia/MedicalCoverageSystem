import { Router } from 'express';
import { claimsAdjudicationService } from '../services/claimsAdjudication';
import { eligibilityEngine } from '../services/eligibilityEngine';
import { medicalNecessityValidator } from '../services/medicalNecessityValidator';
import { fraudDetectionEngine } from '../services/fraudDetectionEngine';
import { financialCalculationService } from '../services/financialCalculationService';
import { eobGenerationService } from '../services/eobGenerationService';
import { claimsProcessingWorkflow } from '../services/claimsProcessingWorkflow';
import { batchProcessingService } from '../services/batchProcessingService';
import { claimsAnalyticsService } from '../services/claimsAnalyticsService';
import { notificationService } from '../services/notificationService';
import { storage } from '../storage';

const router = Router();

// Claims Processing API Endpoints

// Process claim through complete adjudication workflow
router.post('/api/claims/:id/process', async (req, res) => {
  try {
    const { id } = req.params;
    const { forceReprocess } = req.body;

    const claim = await storage.getClaim(Number(id));
    if (!claim) {
      return res.status(404).json({ error: "Claim not found" });
    }

    // Check if claim has already been processed
    if (claim.status !== 'submitted' && claim.status !== 'under_review' && !forceReprocess) {
      return res.status(400).json({
        error: "Claim has already been processed. Use forceReprocess=true to reprocess."
      });
    }

    // Process claim through adjudication service
    const adjudicationResult = await claimsAdjudicationService.processClaim(Number(id));

    res.json({
      success: true,
      claimId: Number(id),
      adjudicationResult
    });

  } catch (error) {
    console.error('Error processing claim:', error);
    res.status(500).json({ error: "Failed to process claim" });
  }
});

// Get detailed adjudication results for a claim
router.get('/api/claims/:id/adjudication', async (req, res) => {
  try {
    const { id } = req.params;
    const adjudicationResults = await storage.getClaimAdjudicationResultsByClaim(Number(id));

    res.json({
      claimId: Number(id),
      adjudicationResults: adjudicationResults.map(result => ({
        ...result,
        appliedRules: result.appliedRules ? JSON.parse(result.appliedRules) : [],
        denialReasons: result.denialReasons ? JSON.parse(result.denialReasons) : []
      }))
    });

  } catch (error) {
    console.error('Error fetching adjudication results:', error);
    res.status(500).json({ error: "Failed to fetch adjudication results" });
  }
});

// Get medical necessity validation for a claim
router.get('/api/claims/:id/medical-necessity', async (req, res) => {
  try {
    const { id } = req.params;
    const medicalNecessityValidations = await storage.getMedicalNecessityValidationsByClaim(Number(id));

    res.json({
      claimId: Number(id),
      medicalNecessityValidations: medicalNecessityValidations.map(validation => ({
        ...validation,
        procedureCodes: validation.procedureCodes ? JSON.parse(validation.procedureCodes) : []
      }))
    });

  } catch (error) {
    console.error('Error fetching medical necessity validation:', error);
    res.status(500).json({ error: "Failed to fetch medical necessity validation" });
  }
});

// Submit claim for medical review
router.post('/api/claims/:id/medical-review', async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewerNotes, reviewerId } = req.body;

    const claim = await storage.getClaim(Number(id));
    if (!claim) {
      return res.status(404).json({ error: "Claim not found" });
    }

    // Update claim status to indicate medical review
    const updatedClaim = await storage.updateClaimStatus(
      Number(id),
      'under_review',
      `Medical review requested: ${reviewerNotes}`
    );

    res.json({
      success: true,
      claimId: Number(id),
      status: updatedClaim.status,
      reviewerNotes,
      reviewerId
    });

  } catch (error) {
    console.error('Error submitting for medical review:', error);
    res.status(500).json({ error: "Failed to submit for medical review" });
  }
});

// Get fraud detection analysis for a claim
router.get('/api/claims/:id/fraud-analysis', async (req, res) => {
  try {
    const { id } = req.params;
    const fraudDetectionResults = await storage.getFraudDetectionResultsByClaim(Number(id));

    res.json({
      claimId: Number(id),
      fraudDetectionResults: fraudDetectionResults.map(result => ({
        ...result,
        detectedIndicators: result.detectedIndicators ? JSON.parse(result.detectedIndicators) : [],
        ruleBasedViolations: result.ruleBasedViolations ? JSON.parse(result.ruleBasedViolations) : []
      }))
    });

  } catch (error) {
    console.error('Error fetching fraud analysis:', error);
    res.status(500).json({ error: "Failed to fetch fraud analysis" });
  }
});

// Check eligibility for a member and benefit
router.post('/api/eligibility/check', async (req, res) => {
  try {
    const { memberId, benefitId, institutionId, serviceDate, claimAmount } = req.body;

    const eligibilityCheck = await eligibilityEngine.checkEligibility({
      memberId: Number(memberId),
      benefitId: Number(benefitId),
      institutionId: Number(institutionId),
      serviceDate: serviceDate ? new Date(serviceDate) : new Date(),
      claimAmount: Number(claimAmount)
    });

    res.json(eligibilityCheck);

  } catch (error) {
    console.error('Error checking eligibility:', error);
    res.status(500).json({ error: "Failed to check eligibility" });
  }
});

// Get benefit utilization for a member
router.get('/api/members/:id/benefit-utilization', async (req, res) => {
  try {
    const { id } = req.params;
    const benefitUtilizations = await storage.getBenefitUtilizationByMember(Number(id));

    res.json({
      memberId: Number(id),
      benefitUtilizations: benefitUtilizations.map(utilization => ({
        ...utilization,
        utilizationPercentage: utilization.limitAmount ?
          (utilization.usedAmount / utilization.limitAmount) * 100 : 0
      }))
    });

  } catch (error) {
    console.error('Error fetching benefit utilization:', error);
    res.status(500).json({ error: "Failed to fetch benefit utilization" });
  }
});

// Generate and retrieve EOB for a claim
router.get('/api/claims/:id/eob', async (req, res) => {
  try {
    const { id } = req.params;
    const { format = 'html' } = req.query;

    const explanationOfBenefits = await storage.getExplanationOfBenefitsByClaim(Number(id));

    if (explanationOfBenefits.length === 0) {
      return res.status(404).json({ error: "EOB not found for this claim" });
    }

    // If specific EOB is requested
    const specificEOBId = req.query.specificId;
    const eob = specificEOBId ?
      explanationOfBenefits.find(eob => eob.id === Number(specificEOBId)) :
      explanationOfBenefits[0];

    if (!eob) {
      return res.status(404).json({ error: "EOB not found" });
    }

    // Generate EOB in requested format
    if (format && format !== 'json') {
      const eobDocument = await eobGenerationService.generateEOBFormat(eob as any, format);

      if (format === 'html') {
        res.setHeader('Content-Type', 'text/html');
        return res.send(eobDocument);
      } else if (format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        return res.send(eobDocument);
      } else if (format === 'plain') {
        res.setHeader('Content-Type', 'text/plain');
        return res.send(eobDocument);
      }
    }

    // Return JSON format by default
    res.json({
      eobId: eob.id,
      eobNumber: eob.eobNumber,
      eobDate: eob.eobDate,
      status: eob.status,
      totalBilledAmount: eob.totalBilledAmount,
      totalAllowedAmount: eob.totalAllowedAmount,
      totalPaidAmount: eob.totalPaidAmount,
      memberResponsibility: eob.memberResponsibility,
      planResponsibility: eob.planResponsibility,
      serviceDetails: eob.serviceDetails ? JSON.parse(eob.serviceDetails) : [],
      denialReasons: eob.denialReasons ? JSON.parse(eob.denialReasons) : [],
      appealInformation: eob.appealInformation ? JSON.parse(eob.appealInformation) : null
    });

  } catch (error) {
    console.error('Error fetching EOB:', error);
    res.status(500).json({ error: "Failed to fetch EOB" });
  }
});

// Send EOB to member
router.post('/api/eobs/:eobId/send', async (req, res) => {
  try {
    const { eobId } = req.params;
    const { deliveryMethod } = req.body;

    const success = await eobGenerationService.sendEOBToMember(Number(eobId), deliveryMethod);

    if (success) {
      res.json({ success: true, eobId: Number(eobId), deliveryMethod });
    } else {
      res.status(500).json({ error: "Failed to send EOB" });
    }

  } catch (error) {
    console.error('Error sending EOB:', error);
    res.status(500).json({ error: "Failed to send EOB" });
  }
});

// Batch process multiple claims
router.post('/api/claims/batch-process', async (req, res) => {
  try {
    const { claimIds, options } = req.body;
    const results = [];
    const errors = [];

    console.log(`Starting batch processing for ${claimIds.length} claims`);

    // Process each claim
    for (const claimId of claimIds) {
      try {
        const adjudicationResult = await claimsAdjudicationService.processClaim(claimId);
        results.push({
          claimId,
          success: adjudicationResult.success,
          status: adjudicationResult.status,
          adjudicationResult
        });
      } catch (error) {
        console.error(`Error processing claim ${claimId}:`, error);
        errors.push({
          claimId,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      totalClaims: claimIds.length,
      processedClaims: results.length,
      failedClaims: errors.length,
      results,
      errors,
      summary: {
        approved: results.filter(r => r.status === 'APPROVED').length,
        partiallyApproved: results.filter(r => r.status === 'PARTIALLY_APPROVED').length,
        denied: results.filter(r => r.status === 'DENIED').length
      }
    });

  } catch (error) {
    console.error('Error in batch processing:', error);
    res.status(500).json({ error: "Failed to batch process claims" });
  }
});

// Get fraud alerts requiring investigation
router.get('/api/fraud-alerts', async (req, res) => {
  try {
    const fraudAlerts = await fraudDetectionEngine.getFraudAlerts();

    res.json({
      alerts: fraudAlerts,
      totalAlerts: fraudAlerts.length,
      highRiskAlerts: fraudAlerts.filter(alert => alert.riskLevel === 'HIGH' || alert.riskLevel === 'CRITICAL').length
    });

  } catch (error) {
    console.error('Error fetching fraud alerts:', error);
    res.status(500).json({ error: "Failed to fetch fraud alerts" });
  }
});

// Create fraud investigation record
router.post('/api/fraud-investigations/:claimId', async (req, res) => {
  try {
    const { claimId } = req.params;
    const { investigatorId, notes, priority, assignedTo } = req.body;

    const claim = await storage.getClaim(Number(claimId));
    if (!claim) {
      return res.status(404).json({ error: "Claim not found" });
    }

    // Mark claim for fraud investigation
    const fraudReviewDate = new Date();
    await storage.markClaimAsFraudulent(
      Number(claimId),
      'MEDIUM', // Default risk level
      `Fraud investigation initiated: ${notes}`,
      Number(investigatorId)
    );

    // Update claim status
    const updatedClaim = await storage.updateClaimStatus(
      Number(claimId),
      'fraud_review',
      `Fraud investigation assigned to ${assignedTo}`
    );

    res.json({
      success: true,
      claimId: Number(claimId),
      investigatorId,
      investigationStatus: 'PENDING',
      fraudReviewDate,
      assignedTo,
      notes,
      claimStatus: updatedClaim.status
    });

  } catch (error) {
    console.error('Error creating fraud investigation:', error);
    res.status(500).json({ error: "Failed to create fraud investigation" });
  }
});

// Calculate financial responsibility for a claim
router.post('/api/claims/:id/financial-calculation', async (req, res) => {
  try {
    const { id } = req.params;
    const { claimAmount, memberId, benefitId, institutionId } = req.body;

    // Get claim details
    const claim = await storage.getClaim(Number(id));
    if (!claim) {
      return res.status(404).json({ error: "Claim not found" });
    }

    const calculationRequest = {
      claimId: Number(id),
      originalAmount: claimAmount || claim.amount,
      memberId: memberId || claim.memberId,
      benefitId: benefitId || claim.benefitId,
      institutionId: institutionId || claim.institutionId
    };

    const financialResult = await financialCalculationService.calculateFinancialResponsibility(calculationRequest);

    res.json({
      success: true,
      claimId: Number(id),
      financialResult
    });

  } catch (error) {
    console.error('Error calculating financial responsibility:', error);
    res.status(500).json({ error: "Failed to calculate financial responsibility" });
  }
});

// Get medical necessity validation for a diagnosis and procedure
router.post('/api/medical-necessity/validate', async (req, res) => {
  try {
    const {
      claimId,
      diagnosisCode,
      procedureCodes,
      memberInfo,
      serviceInfo
    } = req.body;

    const validationRequest = {
      claimId: Number(claimId),
      diagnosisCode,
      procedureCodes,
      memberInfo,
      serviceInfo: {
        serviceDate: new Date(serviceInfo.serviceDate),
        providerType: serviceInfo.providerType,
        setting: serviceInfo.setting,
        urgency: serviceInfo.urgency
      }
    };

    const validationResult = await medicalNecessityValidator.validateMedicalNecessity(validationRequest);

    res.json({
      success: true,
      validationResult
    });

  } catch (error) {
    console.error('Error validating medical necessity:', error);
    res.status(500).json({ error: "Failed to validate medical necessity" });
  }
});

// Get eligibility summary for a company
router.get('/api/analytics/eligibility-summary', async (req, res) => {
  try {
    const { companyId } = req.query;

    const summary = companyId ?
      await eligibilityEngine.getEligibilitySummary(Number(companyId)) :
      await eligibilityEngine.getEligibilitySummary();

    res.json({
      success: true,
      summary,
      date: new Date()
    });

  } catch (error) {
    console.error('Error getting eligibility summary:', error);
    res.status(500).json({ error: "Failed to get eligibility summary" });
  }
});

// Estimate claim payment timing
router.get('/api/claims/:id/payment-timing', async (req, res) => {
  try {
    const { id } = req.params;

    const claim = await storage.getClaim(Number(id));
    if (!claim) {
      return res.status(404).json({ error: "Claim not found" });
    }

    // Simplified risk level assessment
    let riskLevel = 'LOW';
    if (claim.fraudRiskLevel === 'high' || claim.fraudRiskLevel === 'confirmed') {
      riskLevel = 'HIGH';
    } else if (claim.fraudRiskLevel === 'medium') {
      riskLevel = 'MEDIUM';
    }

    const estimatedDays = await financialCalculationService.estimatePaymentTiming(claim.amount, riskLevel);

    res.json({
      claimId: Number(id),
      riskLevel,
      estimatedDays,
      estimatedPaymentDate: new Date(Date.now() + estimatedDays * 24 * 60 * 60 * 1000),
      currentDate: new Date()
    });

  } catch (error) {
    console.error('Error estimating payment timing:', error);
    res.status(500).json({ error: "Failed to estimate payment timing" });
  }
});

// Calculate MLR impact
router.post('/api/analytics/mlr-impact', async (req, res) => {
  try {
    const { insurerResponsibility, memberResponsibility, premiumAmount } = req.body;

    const mlrImpact = await financialCalculationService.calculateMLRImpact(
      Number(insurerResponsibility),
      Number(memberResponsibility),
      Number(premiumAmount)
    );

    res.json({
      success: true,
      mlrImpact
    });

  } catch (error) {
    console.error('Error calculating MLR impact:', error);
    res.status(500).json({ error: "Failed to calculate MLR impact" });
  }
});

// Workflow Orchestration API Endpoints

// Process claim through complete workflow orchestration
router.post('/api/claims/:id/workflow', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      workflowType,
      priority,
      processingMode,
      initiatedBy
    } = req.body;

    const workflowResult = await claimsProcessingWorkflow.processClaim(Number(id), {
      workflowType,
      priority,
      processingMode,
      initiatedBy
    });

    res.json({
      success: true,
      claimId: Number(id),
      workflowResult
    });

  } catch (error) {
    console.error('Error processing claim workflow:', error);
    res.status(500).json({ error: "Failed to process claim workflow" });
  }
});

// Get workflow status
router.get('/api/workflows/:workflowId/status', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const workflowStatus = await claimsProcessingWorkflow.getWorkflowStatus(workflowId);

    if (!workflowStatus) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    res.json({
      workflowId,
      status: workflowStatus
    });

  } catch (error) {
    console.error('Error fetching workflow status:', error);
    res.status(500).json({ error: "Failed to fetch workflow status" });
  }
});

// Cancel active workflow
router.post('/api/workflows/:workflowId/cancel', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const cancelled = await claimsProcessingWorkflow.cancelWorkflow(workflowId);

    if (!cancelled) {
      return res.status(404).json({ error: "Workflow not found or already completed" });
    }

    res.json({
      success: true,
      workflowId,
      message: "Workflow cancelled successfully"
    });

  } catch (error) {
    console.error('Error cancelling workflow:', error);
    res.status(500).json({ error: "Failed to cancel workflow" });
  }
});

// Get all active workflows
router.get('/api/workflows/active', async (req, res) => {
  try {
    const activeWorkflows = await claimsProcessingWorkflow.getActiveWorkflows();

    res.json({
      activeWorkflows: activeWorkflows.map(workflow => ({
        workflowId: workflow.workflowId,
        claimId: workflow.claimId,
        workflowType: workflow.workflowType,
        status: workflow.status,
        startTime: workflow.startTime,
        estimatedCompletionTime: workflow.metadata.estimatedCompletionTime,
        priority: workflow.metadata.priority,
        currentStep: workflow.steps.find(s => s.status === 'in_progress')?.name,
        completedSteps: workflow.steps.filter(s => s.status === 'completed').length,
        totalSteps: workflow.steps.length
      })),
      totalActive: activeWorkflows.length
    });

  } catch (error) {
    console.error('Error fetching active workflows:', error);
    res.status(500).json({ error: "Failed to fetch active workflows" });
  }
});

// Get workflow history for a claim
router.get('/api/claims/:id/workflow-history', async (req, res) => {
  try {
    const { id } = req.params;
    const workflowHistory = await claimsProcessingWorkflow.getWorkflowHistory(Number(id));

    res.json({
      claimId: Number(id),
      workflowHistory
    });

  } catch (error) {
    console.error('Error fetching workflow history:', error);
    res.status(500).json({ error: "Failed to fetch workflow history" });
  }
});

// Update workflow configuration
router.put('/api/workflows/configuration', async (req, res) => {
  try {
    const configuration = req.body;

    claimsProcessingWorkflow.updateConfiguration(configuration);

    res.json({
      success: true,
      message: "Workflow configuration updated successfully",
      configuration
    });

  } catch (error) {
    console.error('Error updating workflow configuration:', error);
    res.status(500).json({ error: "Failed to update workflow configuration" });
  }
});

// Get workflow analytics
router.get('/api/analytics/workflow-performance', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Get active workflows for real-time analytics
    const activeWorkflows = await claimsProcessingWorkflow.getActiveWorkflows();

    // Calculate performance metrics
    const totalActive = activeWorkflows.length;
    const avgProcessingTime = activeWorkflows.length > 0 ?
      activeWorkflows.reduce((sum, w) => sum + (Date.now() - w.startTime.getTime()), 0) / totalActive : 0;

    const workflowTypeBreakdown = activeWorkflows.reduce((acc, workflow) => {
      acc[workflow.workflowType] = (acc[workflow.workflowType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const priorityBreakdown = activeWorkflows.reduce((acc, workflow) => {
      acc[workflow.metadata.priority] = (acc[workflow.metadata.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Workflow queue metrics
    const queueLength = activeWorkflows.filter(w => w.status === 'pending').length;
    const processingNow = activeWorkflows.filter(w => w.status === 'running').length;

    res.json({
      period: {
        startDate: start,
        endDate: end
      },
      realTimeMetrics: {
        totalActiveWorkflows: totalActive,
        averageProcessingTime: Math.round(avgProcessingTime / 1000), // seconds
        queueLength,
        processingNow
      },
      breakdown: {
        workflowTypes: workflowTypeBreakdown,
        priorities: priorityBreakdown
      },
      performance: {
        throughputPerHour: Math.round(totalActive * 2), // Estimated
        averageStepsCompleted: activeWorkflows.length > 0 ?
          Math.round(activeWorkflows.reduce((sum, w) => sum + w.steps.filter(s => s.status === 'completed').length, 0) / totalActive) : 0,
        successRate: 95.5 // Simulated
      }
    });

  } catch (error) {
    console.error('Error fetching workflow analytics:', error);
    res.status(500).json({ error: "Failed to fetch workflow analytics" });
  }
});

// Batch Processing API Endpoints

// Create new batch job
router.post('/api/batch-jobs', async (req, res) => {
  try {
    const {
      name,
      description,
      claimIds,
      configuration,
      filters,
      metadata,
      createdBy
    } = req.body;

    let batchJob;

    if (claimIds && claimIds.length > 0) {
      // Create batch job from specific claim IDs
      batchJob = await batchProcessingService.createBatchJob(
        name,
        description,
        claimIds,
        configuration,
        metadata,
        createdBy
      );
    } else if (filters) {
      // Create batch job from filters
      batchJob = await batchProcessingService.createBatchJobFromFilters(
        name,
        description,
        filters,
        configuration,
        metadata,
        createdBy
      );
    } else {
      return res.status(400).json({ error: "Either claimIds or filters must be provided" });
    }

    res.status(201).json({
      success: true,
      batchJob
    });

  } catch (error) {
    console.error('Error creating batch job:', error);
    res.status(500).json({ error: "Failed to create batch job" });
  }
});

// Get all batch jobs
router.get('/api/batch-jobs', async (req, res) => {
  try {
    const batchJobs = await batchProcessingService.getAllBatchJobs();

    res.json({
      batchJobs: batchJobs.map(job => ({
        batchId: job.batchId,
        name: job.name,
        description: job.description,
        status: job.status,
        priority: job.priority,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        estimatedDuration: job.estimatedDuration,
        actualDuration: job.actualDuration,
        createdBy: job.createdBy,
        progress: job.progress,
        results: job.results,
        errorCount: job.errors.length
      })),
      totalBatches: batchJobs.length
    });

  } catch (error) {
    console.error('Error fetching batch jobs:', error);
    res.status(500).json({ error: "Failed to fetch batch jobs" });
  }
});

// Get specific batch job details
router.get('/api/batch-jobs/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    const batchJob = await batchProcessingService.getBatchJob(batchId);

    if (!batchJob) {
      return res.status(404).json({ error: "Batch job not found" });
    }

    res.json({
      batchJob
    });

  } catch (error) {
    console.error('Error fetching batch job:', error);
    res.status(500).json({ error: "Failed to fetch batch job" });
  }
});

// Start batch job
router.post('/api/batch-jobs/:batchId/start', async (req, res) => {
  try {
    const { batchId } = req.params;
    const started = await batchProcessingService.startBatchJob(batchId);

    if (!started) {
      return res.status(400).json({ error: "Batch job could not be started" });
    }

    res.json({
      success: true,
      batchId,
      message: "Batch job started successfully"
    });

  } catch (error) {
    console.error('Error starting batch job:', error);
    res.status(500).json({ error: "Failed to start batch job" });
  }
});

// Cancel batch job
router.post('/api/batch-jobs/:batchId/cancel', async (req, res) => {
  try {
    const { batchId } = req.params;
    const cancelled = await batchProcessingService.cancelBatchJob(batchId);

    if (!cancelled) {
      return res.status(400).json({ error: "Batch job could not be cancelled" });
    }

    res.json({
      success: true,
      batchId,
      message: "Batch job cancelled successfully"
    });

  } catch (error) {
    console.error('Error cancelling batch job:', error);
    res.status(500).json({ error: "Failed to cancel batch job" });
  }
});

// Pause batch job
router.post('/api/batch-jobs/:batchId/pause', async (req, res) => {
  try {
    const { batchId } = req.params;
    const paused = await batchProcessingService.pauseBatchJob(batchId);

    if (!paused) {
      return res.status(400).json({ error: "Batch job could not be paused" });
    }

    res.json({
      success: true,
      batchId,
      message: "Batch job paused successfully"
    });

  } catch (error) {
    console.error('Error pausing batch job:', error);
    res.status(500).json({ error: "Failed to pause batch job" });
  }
});

// Resume batch job
router.post('/api/batch-jobs/:batchId/resume', async (req, res) => {
  try {
    const { batchId } = req.params;
    const resumed = await batchProcessingService.resumeBatchJob(batchId);

    if (!resumed) {
      return res.status(400).json({ error: "Batch job could not be resumed" });
    }

    res.json({
      success: true,
      batchId,
      message: "Batch job resumed successfully"
    });

  } catch (error) {
    console.error('Error resuming batch job:', error);
    res.status(500).json({ error: "Failed to resume batch job" });
  }
});

// Get batch job claims details
router.get('/api/batch-jobs/:batchId/claims', async (req, res) => {
  try {
    const { batchId } = req.params;
    const batchJob = await batchProcessingService.getBatchJob(batchId);

    if (!batchJob) {
      return res.status(404).json({ error: "Batch job not found" });
    }

    res.json({
      batchId,
      claims: batchJob.claims.map(claim => ({
        claimId: claim.claimId,
        status: claim.status,
        priority: claim.priority,
        attempts: claim.attempts,
        processingTime: claim.processingTime,
        estimatedProcessingTime: claim.estimatedProcessingTime,
        error: claim.error,
        result: claim.status === 'completed' ? {
          finalStatus: claim.result?.finalStatus,
          approvedAmount: claim.result?.approvedAmount,
          memberResponsibility: claim.result?.memberResponsibility,
          insurerResponsibility: claim.result?.insurerResponsibility,
          qualityScore: claim.result?.qualityScore,
          complianceScore: claim.result?.complianceScore
        } : null
      })),
      summary: {
        total: batchJob.claims.length,
        completed: batchJob.claims.filter(c => c.status === 'completed').length,
        failed: batchJob.claims.filter(c => c.status === 'failed').length,
        processing: batchJob.claims.filter(c => c.status === 'processing').length,
        pending: batchJob.claims.filter(c => c.status === 'pending').length,
        skipped: batchJob.claims.filter(c => c.status === 'skipped').length
      }
    });

  } catch (error) {
    console.error('Error fetching batch job claims:', error);
    res.status(500).json({ error: "Failed to fetch batch job claims" });
  }
});

// Get batch job errors
router.get('/api/batch-jobs/:batchId/errors', async (req, res) => {
  try {
    const { batchId } = req.params;
    const batchJob = await batchProcessingService.getBatchJob(batchId);

    if (!batchJob) {
      return res.status(404).json({ error: "Batch job not found" });
    }

    res.json({
      batchId,
      errors: batchJob.errors,
      errorSummary: {
        totalErrors: batchJob.errors.length,
        errorsByType: batchJob.errors.reduce((acc, error) => {
          acc[error.errorType] = (acc[error.errorType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        retryableErrors: batchJob.errors.filter(e => e.retryable).length
      }
    });

  } catch (error) {
    console.error('Error fetching batch job errors:', error);
    res.status(500).json({ error: "Failed to fetch batch job errors" });
  }
});

// Get batch analytics
router.get('/api/analytics/batch-performance', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const analytics = await batchProcessingService.getBatchAnalytics(Number(days));

    res.json({
      analytics
    });

  } catch (error) {
    console.error('Error fetching batch analytics:', error);
    res.status(500).json({ error: "Failed to fetch batch analytics" });
  }
});

// Get batch job configuration templates
router.get('/api/batch-jobs/templates', async (req, res) => {
  try {
    const templates = [
      {
        id: 'high_priority',
        name: 'High Priority Claims',
        description: 'Process high-value and urgent claims first',
        configuration: {
          processingMode: 'smart_parallel',
          maxConcurrency: 3,
          groupByPriority: true,
          optimizeForSpeed: false,
          failureThreshold: 10
        },
        filters: {
          claimAmountRange: { min: 25000, max: 999999 },
          priorityLevels: ['urgent', 'high']
        }
      },
      {
        id: 'standard_processing',
        name: 'Standard Claims Processing',
        description: 'Standard processing for regular claims',
        configuration: {
          processingMode: 'parallel',
          maxConcurrency: 5,
          groupByPriority: false,
          optimizeForSpeed: true,
          failureThreshold: 25
        },
        filters: {
          claimAmountRange: { min: 100, max: 25000 },
          claimStatuses: ['submitted', 'under_review']
        }
      },
      {
        id: 'bulk_processing',
        name: 'Bulk Claims Processing',
        description: 'Process large volumes of claims efficiently',
        configuration: {
          processingMode: 'parallel',
          maxConcurrency: 10,
          groupByPriority: false,
          optimizeForSpeed: true,
          failureThreshold: 30,
          skipFailedClaims: true
        },
        filters: {
          claimAmountRange: { min: 1, max: 10000 }
        }
      },
      {
        id: 'fraud_review',
        name: 'Fraud Review Batch',
        description: 'Process claims with fraud indicators',
        configuration: {
          processingMode: 'sequential',
          maxConcurrency: 1,
          groupByPriority: true,
          optimizeForSpeed: false,
          failureThreshold: 5
        },
        filters: {
          fraudRiskLevels: ['medium', 'high', 'confirmed']
        }
      }
    ];

    res.json({
      templates
    });

  } catch (error) {
    console.error('Error fetching batch templates:', error);
    res.status(500).json({ error: "Failed to fetch batch templates" });
  }
});

// Claims Analytics API Endpoints

// Generate comprehensive claims analytics
router.post('/api/analytics/claims', async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      filters
    } = req.body;

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const analytics = await claimsAnalyticsService.generateClaimsAnalytics(start, end, filters);

    res.json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('Error generating claims analytics:', error);
    res.status(500).json({ error: "Failed to generate claims analytics" });
  }
});

// Calculate MLR (Medical Loss Ratio)
router.post('/api/analytics/mlr', async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      projectionMonths
    } = req.body;

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    const months = projectionMonths || 12;

    const mlrCalculation = await claimsAnalyticsService.calculateMLR(start, end, months);

    res.json({
      success: true,
      mlrCalculation
    });

  } catch (error) {
    console.error('Error calculating MLR:', error);
    res.status(500).json({ error: "Failed to calculate MLR" });
  }
});

// Generate trend analysis
router.post('/api/analytics/trends', async (req, res) => {
  try {
    const {
      startDate,
      endDate
    } = req.body;

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const trendAnalysis = await claimsAnalyticsService.generateTrendAnalysis(start, end);

    res.json({
      success: true,
      trendAnalysis
    });

  } catch (error) {
    console.error('Error generating trend analysis:', error);
    res.status(500).json({ error: "Failed to generate trend analysis" });
  }
});

// Generate performance dashboard
router.get('/api/analytics/dashboard', async (req, res) => {
  try {
    const performanceDashboard = await claimsAnalyticsService.generatePerformanceDashboard();

    res.json({
      success: true,
      dashboard: performanceDashboard
    });

  } catch (error) {
    console.error('Error generating performance dashboard:', error);
    res.status(500).json({ error: "Failed to generate performance dashboard" });
  }
});

// Get claims volume metrics
router.get('/api/analytics/volume', async (req, res) => {
  try {
    const { startDate, endDate, memberId, institutionId, benefitId } = req.query;

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const filters = {
      memberId: memberId ? Number(memberId) : undefined,
      institutionId: institutionId ? Number(institutionId) : undefined,
      benefitId: benefitId ? Number(benefitId) : undefined
    };

    // Get claims analytics for volume metrics
    const analytics = await claimsAnalyticsService.generateClaimsAnalytics(start, end, filters);

    res.json({
      success: true,
      volumeMetrics: analytics.volume,
      period: analytics.period
    });

  } catch (error) {
    console.error('Error fetching volume metrics:', error);
    res.status(500).json({ error: "Failed to fetch volume metrics" });
  }
});

// Get financial analytics
router.get('/api/analytics/financial', async (req, res) => {
  try {
    const { startDate, endDate, memberId, institutionId } = req.query;

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const filters = {
      memberId: memberId ? Number(memberId) : undefined,
      institutionId: institutionId ? Number(institutionId) : undefined
    };

    const analytics = await claimsAnalyticsService.generateClaimsAnalytics(start, end, filters);

    res.json({
      success: true,
      financialMetrics: analytics.financial,
      period: analytics.period
    });

  } catch (error) {
    console.error('Error fetching financial analytics:', error);
    res.status(500).json({ error: "Failed to fetch financial analytics" });
  }
});

// Get processing performance metrics
router.get('/api/analytics/processing', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const analytics = await claimsAnalyticsService.generateClaimsAnalytics(start, end);

    res.json({
      success: true,
      processingMetrics: analytics.processing,
      qualityMetrics: analytics.quality,
      period: analytics.period
    });

  } catch (error) {
    console.error('Error fetching processing analytics:', error);
    res.status(500).json({ error: "Failed to fetch processing analytics" });
  }
});

// Get member analytics
router.get('/api/analytics/members', async (req, res) => {
  try {
    const { startDate, endDate, memberId } = req.query;

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const filters = {
      memberId: memberId ? Number(memberId) : undefined
    };

    const analytics = await claimsAnalyticsService.generateClaimsAnalytics(start, end, filters);

    res.json({
      success: true,
      memberMetrics: analytics.memberMetrics,
      period: analytics.period
    });

  } catch (error) {
    console.error('Error fetching member analytics:', error);
    res.status(500).json({ error: "Failed to fetch member analytics" });
  }
});

// Get provider analytics
router.get('/api/analytics/providers', async (req, res) => {
  try {
    const { startDate, endDate, institutionId } = req.query;

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const filters = {
      institutionId: institutionId ? Number(institutionId) : undefined
    };

    const analytics = await claimsAnalyticsService.generateClaimsAnalytics(start, end, filters);

    res.json({
      success: true,
      providerMetrics: analytics.providerMetrics,
      period: analytics.period
    });

  } catch (error) {
    console.error('Error fetching provider analytics:', error);
    res.status(500).json({ error: "Failed to fetch provider analytics" });
  }
});

// Get benefit utilization analytics
router.get('/api/analytics/benefits', async (req, res) => {
  try {
    const { startDate, endDate, benefitId } = req.query;

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const filters = {
      benefitId: benefitId ? Number(benefitId) : undefined
    };

    const analytics = await claimsAnalyticsService.generateClaimsAnalytics(start, end, filters);

    res.json({
      success: true,
      benefitUtilization: analytics.benefitUtilization,
      period: analytics.period
    });

  } catch (error) {
    console.error('Error fetching benefit analytics:', error);
    res.status(500).json({ error: "Failed to fetch benefit analytics" });
  }
});

// Get comprehensive report with multiple analytics sections
router.post('/api/analytics/comprehensive-report', async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      includeMLR = true,
      includeTrends = true,
      includeDashboard = true,
      filters
    } = req.body;

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const report: any = {
      success: true,
      reportPeriod: { startDate: start, endDate: end },
      generatedAt: new Date()
    };

    // Basic claims analytics
    report.claimsAnalytics = await claimsAnalyticsService.generateClaimsAnalytics(start, end, filters);

    // MLR calculation
    if (includeMLR) {
      report.mlrCalculation = await claimsAnalyticsService.calculateMLR(start, end);
    }

    // Trend analysis
    if (includeTrends) {
      report.trendAnalysis = await claimsAnalyticsService.generateTrendAnalysis(start, end);
    }

    // Performance dashboard
    if (includeDashboard) {
      report.performanceDashboard = await claimsAnalyticsService.generatePerformanceDashboard();
    }

    res.json(report);

  } catch (error) {
    console.error('Error generating comprehensive report:', error);
    res.status(500).json({ error: "Failed to generate comprehensive report" });
  }
});

// Get real-time analytics dashboard data
router.get('/api/analytics/realtime', async (req, res) => {
  try {
    const dashboard = await claimsAnalyticsService.generatePerformanceDashboard();

    res.json({
      success: true,
      realTimeData: {
        ...dashboard.realTime,
        kpis: dashboard.kpis,
        alerts: dashboard.alerts,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('Error fetching real-time analytics:', error);
    res.status(500).json({ error: "Failed to fetch real-time analytics" });
  }
});

// Export analytics data in various formats
router.post('/api/analytics/export', async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      format = 'json',
      sections = ['all'],
      filters
    } = req.body;

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    // Generate analytics data
    const analytics = await claimsAnalyticsService.generateClaimsAnalytics(start, end, filters);
    const mlrCalculation = sections.includes('mlr') || sections.includes('all') ?
      await claimsAnalyticsService.calculateMLR(start, end) : null;
    const trendAnalysis = sections.includes('trends') || sections.includes('all') ?
      await claimsAnalyticsService.generateTrendAnalysis(start, end) : null;

    const exportData = {
      metadata: {
        exportDate: new Date(),
        period: { startDate: start, endDate: end },
        format,
        sections
      },
      analytics,
      mlrCalculation,
      trendAnalysis
    };

    // Handle different export formats
    switch (format.toLowerCase()) {
      case 'csv':
        // Convert to CSV format (simplified)
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="claims-analytics-${new Date().toISOString().split('T')[0]}.csv"`);
        return res.send(convertToCSV(exportData));

      case 'excel':
        // Would implement Excel export
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="claims-analytics-${new Date().toISOString().split('T')[0]}.xlsx"`);
        return res.json(exportData); // Placeholder

      case 'pdf':
        // Would implement PDF export
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="claims-analytics-${new Date().toISOString().split('T')[0]}.pdf"`);
        return res.json(exportData); // Placeholder

      default:
        // JSON format
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="claims-analytics-${new Date().toISOString().split('T')[0]}.json"`);
        return res.json(exportData);
    }

  } catch (error) {
    console.error('Error exporting analytics:', error);
    res.status(500).json({ error: "Failed to export analytics" });
  }
});

export default router;

// Helper function to convert data to CSV (simplified implementation)
// Notification System API Endpoints

// Send direct notification
router.post('/api/notifications/send', async (req, res) => {
  try {
    const {
      type,
      recipient,
      recipientType,
      subject,
      message,
      data,
      priority = 'medium',
      scheduledAt
    } = req.body;

    const notification = await notificationService.sendNotification(
      type,
      recipient,
      recipientType,
      subject,
      message,
      data,
      priority,
      scheduledAt ? new Date(scheduledAt) : undefined
    );

    res.status(201).json({
      success: true,
      notification
    });

  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: "Failed to send notification" });
  }
});

// Send template-based notification
router.post('/api/notifications/send-template', async (req, res) => {
  try {
    const {
      templateId,
      recipient,
      recipientType,
      variables,
      scheduledAt
    } = req.body;

    const notification = await notificationService.sendTemplateNotification(
      templateId,
      recipient,
      recipientType,
      variables,
      scheduledAt ? new Date(scheduledAt) : undefined
    );

    if (!notification) {
      return res.status(400).json({ error: "Notification not sent - template conditions not met or user preferences" });
    }

    res.status(201).json({
      success: true,
      notification
    });

  } catch (error) {
    console.error('Error sending template notification:', error);
    res.status(500).json({ error: "Failed to send template notification" });
  }
});

// Get notification by ID
router.get('/api/notifications/:notificationId', async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notification = await notificationService.getNotification(notificationId);

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.json({
      success: true,
      notification
    });

  } catch (error) {
    console.error('Error fetching notification:', error);
    res.status(500).json({ error: "Failed to fetch notification" });
  }
});

// Get notifications for recipient
router.get('/api/notifications', async (req, res) => {
  try {
    const {
      recipient,
      recipientType,
      limit = 50,
      offset = 0,
      unreadOnly = false
    } = req.query;

    if (!recipient || !recipientType) {
      return res.status(400).json({ error: "Recipient and recipientType are required" });
    }

    const notifications = await notificationService.getNotificationsForRecipient(
      recipient as string,
      recipientType as any,
      Number(limit),
      Number(offset),
      Boolean(unreadOnly)
    );

    res.json({
      success: true,
      notifications,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total: notifications.length
      }
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// Mark notification as read
router.post('/api/notifications/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;
    const success = await notificationService.markAsRead(notificationId);

    if (!success) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.json({
      success: true,
      message: "Notification marked as read"
    });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

// Update notification preferences
router.put('/api/notifications/preferences/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const preferences = req.body;

    const updatedPreferences = await notificationService.updateNotificationPreferences(
      Number(userId),
      preferences
    );

    res.json({
      success: true,
      preferences: updatedPreferences
    });

  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: "Failed to update notification preferences" });
  }
});

// Get notification preferences
router.get('/api/notifications/preferences/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const preferences = await notificationService.getNotificationPreferences(Number(userId));

    res.json({
      success: true,
      preferences
    });

  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ error: "Failed to fetch notification preferences" });
  }
});

// Send claim status update notification
router.post('/api/notifications/claim-status/:claimId', async (req, res) => {
  try {
    const { claimId } = req.params;
    const { oldStatus, newStatus } = req.body;

    if (!oldStatus || !newStatus) {
      return res.status(400).json({ error: "Both oldStatus and newStatus are required" });
    }

    const notifications = await notificationService.sendClaimStatusUpdate(
      Number(claimId),
      oldStatus,
      newStatus
    );

    res.json({
      success: true,
      notifications,
      claimId: Number(claimId),
      statusUpdate: { oldStatus, newStatus }
    });

  } catch (error) {
    console.error('Error sending claim status notification:', error);
    res.status(500).json({ error: "Failed to send claim status notification" });
  }
});

// Send payment notification
router.post('/api/notifications/payment/:claimId', async (req, res) => {
  try {
    const { claimId } = req.params;
    const { paymentAmount, paymentDate } = req.body;

    if (!paymentAmount || !paymentDate) {
      return res.status(400).json({ error: "Both paymentAmount and paymentDate are required" });
    }

    const notifications = await notificationService.sendPaymentNotification(
      Number(claimId),
      Number(paymentAmount),
      new Date(paymentDate)
    );

    res.json({
      success: true,
      notifications,
      claimId: Number(claimId),
      paymentDetails: { paymentAmount, paymentDate }
    });

  } catch (error) {
    console.error('Error sending payment notification:', error);
    res.status(500).json({ error: "Failed to send payment notification" });
  }
});

// Send fraud alert notification
router.post('/api/notifications/fraud-alert/:claimId', async (req, res) => {
  try {
    const { claimId } = req.params;
    const { riskLevel, indicators } = req.body;

    if (!riskLevel || !indicators) {
      return res.status(400).json({ error: "Both riskLevel and indicators are required" });
    }

    const notifications = await notificationService.sendFraudAlert(
      Number(claimId),
      riskLevel,
      indicators
    );

    res.json({
      success: true,
      notifications,
      claimId: Number(claimId),
      fraudAlert: { riskLevel, indicators }
    });

  } catch (error) {
    console.error('Error sending fraud alert notification:', error);
    res.status(500).json({ error: "Failed to send fraud alert notification" });
  }
});

// Get notification analytics
router.get('/api/notifications/analytics', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const analytics = await notificationService.getNotificationAnalytics(start, end);

    res.json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('Error fetching notification analytics:', error);
    res.status(500).json({ error: "Failed to fetch notification analytics" });
  }
});

// Get notification templates
router.get('/api/notifications/templates', async (req, res) => {
  try {
    // Return available notification templates
    const templates = [
      {
        id: 'claim_status_approved',
        name: 'Claim Approved',
        type: 'email',
        category: 'claim_status',
        description: 'Sent when a claim is approved',
        variables: ['memberName', 'claimId', 'claimAmount', 'newStatus', 'serviceDate', 'portalUrl']
      },
      {
        id: 'claim_status_denied',
        name: 'Claim Denied',
        type: 'email',
        category: 'claim_status',
        description: 'Sent when a claim is denied',
        variables: ['memberName', 'claimId', 'claimAmount', 'newStatus', 'serviceDate', 'portalUrl']
      },
      {
        id: 'claim_status_partially_approved',
        name: 'Claim Partially Approved',
        type: 'email',
        category: 'claim_status',
        description: 'Sent when a claim is partially approved',
        variables: ['memberName', 'claimId', 'claimAmount', 'approvedAmount', 'serviceDate', 'portalUrl']
      },
      {
        id: 'claim_payment',
        name: 'Claim Payment Processed',
        type: 'email',
        category: 'payment',
        description: 'Sent when a claim payment is processed',
        variables: ['memberName', 'claimId', 'paymentAmount', 'paymentDate', 'portalUrl']
      },
      {
        id: 'claim_status_provider_approved',
        name: 'Provider - Claim Approved',
        type: 'email',
        category: 'claim_status',
        description: 'Sent to provider when claim is approved',
        variables: ['institutionName', 'claimId', 'memberName', 'claimAmount', 'serviceDate', 'portalUrl']
      }
    ];

    res.json({
      success: true,
      templates
    });

  } catch (error) {
    console.error('Error fetching notification templates:', error);
    res.status(500).json({ error: "Failed to fetch notification templates" });
  }
});

// Get notification queue status
router.get('/api/notifications/queue-status', async (req, res) => {
  try {
    // In a real implementation, this would get actual queue metrics
    const queueStatus = {
      queueSize: 25,
      processingRate: 15.5, // notifications per minute
      averageWaitTime: 45, // seconds
      providers: {
        email: {
          name: 'SendGrid',
          status: 'healthy',
          rateLimitUsage: 65, // percentage
          lastDelivery: new Date()
        },
        sms: {
          name: 'Twilio',
          status: 'healthy',
          rateLimitUsage: 23, // percentage
          lastDelivery: new Date()
        },
        push: {
          name: 'Firebase',
          status: 'degraded',
          rateLimitUsage: 45, // percentage
          lastDelivery: new Date()
        }
      },
      alerts: [
        {
          type: 'warning',
          message: 'Push notifications experiencing slight delays',
          timestamp: new Date()
        }
      ]
    };

    res.json({
      success: true,
      queueStatus
    });

  } catch (error) {
    console.error('Error fetching queue status:', error);
    res.status(500).json({ error: "Failed to fetch queue status" });
  }
});

// Batch send notifications
router.post('/api/notifications/batch', async (req, res) => {
  try {
    const {
      notifications,
      templateId,
      recipients,
      variables,
      scheduledAt
    } = req.body;

    let sentNotifications = [];

    if (notifications && Array.isArray(notifications)) {
      // Send individual notifications
      for (const notif of notifications) {
        try {
          const notification = await notificationService.sendNotification(
            notif.type,
            notif.recipient,
            notif.recipientType,
            notif.subject,
            notif.message,
            notif.data,
            notif.priority,
            scheduledAt ? new Date(scheduledAt) : undefined
          );
          sentNotifications.push(notification);
        } catch (error) {
          console.error(`Error sending notification to ${notif.recipient}:`, error);
        }
      }
    } else if (templateId && recipients && Array.isArray(recipients)) {
      // Send template notifications to multiple recipients
      for (const recipient of recipients) {
        try {
          const notification = await notificationService.sendTemplateNotification(
            templateId,
            recipient.recipient,
            recipient.recipientType,
            {
              ...variables,
              ...recipient.variables // Allow per-recipient variable overrides
            },
            scheduledAt ? new Date(scheduledAt) : undefined
          );
          if (notification) {
            sentNotifications.push(notification);
          }
        } catch (error) {
          console.error(`Error sending template notification to ${recipient.recipient}:`, error);
        }
      }
    } else {
      return res.status(400).json({ error: "Either notifications array or templateId with recipients array required" });
    }

    res.status(201).json({
      success: true,
      sentNotifications,
      totalSent: sentNotifications.length,
      batchId: `batch_${Date.now()}`
    });

  } catch (error) {
    console.error('Error in batch notification send:', error);
    res.status(500).json({ error: "Failed to send batch notifications" });
  }
});

function convertToCSV(data: any): string {
  // This is a simplified CSV conversion
  // In a real implementation, you'd use a proper CSV library
  const headers = ['Metric', 'Value', 'Period'];
  const rows = [
    ['Total Claims', data.analytics.volume.totalClaims, 'Report Period'],
    ['Approved Claims', data.analytics.volume.approvedClaims, 'Report Period'],
    ['Total Billed Amount', data.analytics.financial.totalBilledAmount, 'Report Period'],
    ['Approval Rate', data.analytics.financial.approvalRate, 'Report Period']
  ];

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  return csvContent;
}