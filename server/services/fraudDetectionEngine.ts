import { storage } from '../storage';
import {
  Claim,
  Member,
  MedicalInstitution,
  MedicalPersonnel,
  DiagnosisCode,
  FraudDetectionResult,
  InsertFraudDetectionResult
} from '@shared/schema';

export interface FraudDetectionRequest {
  claimId: number;
  claim: Claim;
  member: Member;
  memberHistory: Claim[];
  provider: MedicalInstitution;
  providerHistory: Claim[];
}

export interface FraudDetectionResult {
  claimId: number;
  riskScore: number; // 0-100
  riskLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  detectedIndicators: FraudIndicator[];
  ruleBasedViolations: string[];
  mlModelConfidence?: number;
  investigationRequired: boolean;
  investigationStatus: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';
  fraudType: 'NONE' | 'BILLING_FRAUD' | 'UPSELLING' | 'DUPLICATE' | 'UNBUNDLING' | 'KICKBACKS' | 'PHANTOM_BILLING';
  detailedAnalysis: {
    billingPatternAnalysis: BillingPatternAnalysis;
    providerBehaviorAnalysis: ProviderBehaviorAnalysis;
    memberBehaviorAnalysis: MemberBehaviorAnalysis;
    clinicalAnomalies: ClinicalAnomaly[];
    complianceIssues: ComplianceIssue[];
  };
  recommendations: string[];
  actionItems: string[];
}

export interface FraudIndicator {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  weight: number;
  evidence: any;
}

export interface BillingPatternAnalysis {
  unusuallyHighBilling: boolean;
  inconsistentBillingPatterns: boolean;
  highFrequencyClaims: boolean;
  weekendHolidayBilling: boolean;
  sameDayMultipleClaims: boolean;
  upcodingIndicators: boolean;
  unbundlingIndicators: boolean;
  duplicateBillingIndicators: boolean;
}

export interface ProviderBehaviorAnalysis {
  outlierStatus: boolean;
  highRiskSpecialties: boolean;
  newProviderRisk: boolean;
  geographicAnomalies: boolean;
  referralPatternAnomalies: boolean;
  networkComplianceIssues: boolean;
}

export interface MemberBehaviorAnalysis {
  excessiveClaims: boolean;
  claimFrequencyAnomalies: boolean;
  providerShopping: boolean;
  suspiciousTiming: boolean;
}

export interface ClinicalAnomaly {
  type: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  clinicalRationale: string;
}

export interface ComplianceIssue {
  regulation: string;
  violation: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  potentialPenalty: string;
}

export class FraudDetectionEngine {
  private readonly HIGH_RISK_THRESHOLD = 70;
  private readonly MEDIUM_RISK_THRESHOLD = 40;
  private readonly CRITICAL_RISK_THRESHOLD = 85;

  // Analyze claim for fraud indicators
  async analyzeClaim(request: FraudDetectionRequest): Promise<FraudDetectionResult> {
    try {
      // Perform various fraud detection analyses
      const billingPatternAnalysis = await this.analyzeBillingPatterns(request);
      const providerBehaviorAnalysis = await this.analyzeProviderBehavior(request);
      const memberBehaviorAnalysis = await this.analyzeMemberBehavior(request);
      const clinicalAnomalies = await this.detectClinicalAnomalies(request);
      const complianceIssues = await this.checkComplianceIssues(request);

      // Calculate overall risk score
      const detectedIndicators = this.collectFraudIndicators(
        billingPatternAnalysis,
        providerBehaviorAnalysis,
        memberBehaviorAnalysis,
        clinicalAnomalies,
        complianceIssues
      );

      const riskScore = this.calculateRiskScore(detectedIndicators);
      const riskLevel = this.determineRiskLevel(riskScore);
      const investigationRequired = riskLevel !== 'NONE' && riskLevel !== 'LOW';
      const fraudType = this.determineFraudType(detectedIndicators, riskLevel);

      // Generate rule-based violations
      const ruleBasedViolations = this.generateRuleBasedViolations(detectedIndicators);

      // Generate ML model confidence (simulated)
      const mlModelConfidence = this.simulateMLModelConfidence(riskScore);

      // Generate recommendations and action items
      const recommendations = this.generateRecommendations(riskLevel, detectedIndicators);
      const actionItems = this.generateActionItems(riskLevel, investigationRequired, fraudType);

      const result: FraudDetectionResult = {
        claimId: request.claimId,
        riskScore,
        riskLevel,
        detectedIndicators,
        ruleBasedViolations,
        mlModelConfidence,
        investigationRequired,
        investigationStatus: investigationRequired ? 'PENDING' : 'RESOLVED',
        fraudType,
        detailedAnalysis: {
          billingPatternAnalysis,
          providerBehaviorAnalysis,
          memberBehaviorAnalysis,
          clinicalAnomalies,
          complianceIssues
        },
        recommendations,
        actionItems
      };

      // Save fraud detection result
      await this.saveFraudDetectionResult(result);

      return result;

    } catch (error) {
      console.error('Error analyzing claim for fraud:', error);
      throw error;
    }
  }

  // Analyze billing patterns
  private async analyzeBillingPatterns(request: FraudDetectionRequest): Promise<BillingPatternAnalysis> {
    const { claim, memberHistory, providerHistory } = request;

    // Check for unusually high billing amounts
    const providerAvgAmount = providerHistory.length > 0 ?
      providerHistory.reduce((sum, c) => sum + c.amount, 0) / providerHistory.length : 0;
    const unusuallyHighBilling = claim.amount > (providerAvgAmount * 3);

    // Check for inconsistent billing patterns
    const providerAmounts = providerHistory.map(c => c.amount);
    const standardDeviation = this.calculateStandardDeviation(providerAmounts);
    const inconsistentBillingPatterns = Math.abs(claim.amount - providerAvgAmount) > (2 * standardDeviation);

    // Check for high frequency claims
    const recentProviderClaims = providerHistory.filter(c =>
      new Date(c.claimDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    const highFrequencyClaims = recentProviderClaims.length > 20;

    // Check for weekend/holiday billing
    const claimDate = new Date(claim.claimDate);
    const isWeekend = claimDate.getDay() === 0 || claimDate.getDay() === 6;
    const weekendHolidayBilling = isWeekend;

    // Check for same-day multiple claims from same provider
    const sameDayClaims = providerHistory.filter(c =>
      new Date(c.claimDate).toDateString() === claimDate.toDateString() && c.id !== claim.id
    );
    const sameDayMultipleClaims = sameDayClaims.length > 0;

    // Check for upcoding indicators
    const upcodingIndicators = this.detectUpcodingPatterns(claim, providerHistory);

    // Check for unbundling indicators
    const unbundlingIndicators = this.detectUnbundlingPatterns(claim, providerHistory);

    // Check for duplicate billing indicators
    const duplicateBillingIndicators = this.detectDuplicateBilling(claim, memberHistory);

    return {
      unusuallyHighBilling,
      inconsistentBillingPatterns,
      highFrequencyClaims,
      weekendHolidayBilling,
      sameDayMultipleClaims,
      upcodingIndicators,
      unbundlingIndicators,
      duplicateBillingIndicators
    };
  }

  // Analyze provider behavior
  private async analyzeProviderBehavior(request: FraudDetectionRequest): Promise<ProviderBehaviorAnalysis> {
    const { provider, providerHistory } = request;

    // Check if provider is an outlier
    const providerAvgAmount = providerHistory.length > 0 ?
      providerHistory.reduce((sum, c) => sum + c.amount, 0) / providerHistory.length : 0;
    const allProvidersAvg = 1000; // Simplified - should get from all providers
    const outlierStatus = providerAvgAmount > (allProvidersAvg * 2);

    // Check for high-risk specialties
    const highRiskSpecialties = ['pain_management', 'chiropractic', 'physical_therapy', 'mental_health'];
    const providerType = provider.type.toLowerCase();
    const highRiskSpecialtiesFlag = highRiskSpecialties.some(specialty =>
      providerType.includes(specialty)
    );

    // Check if provider is new (less than 6 months)
    const providerAge = Date.now() - new Date(provider.createdAt).getTime();
    const sixMonthsInMs = 6 * 30 * 24 * 60 * 60 * 1000;
    const newProviderRisk = providerAge < sixMonthsInMs;

    // Check for geographic anomalies
    const geographicAnomalies = this.checkGeographicAnomalies(provider, providerHistory);

    // Check referral pattern anomalies
    const referralPatternAnomalies = this.checkReferralPatterns(providerHistory);

    // Check network compliance issues
    const networkComplianceIssues = provider.approvalStatus !== 'approved';

    return {
      outlierStatus,
      highRiskSpecialties: highRiskSpecialtiesFlag,
      newProviderRisk,
      geographicAnomalies,
      referralPatternAnomalies,
      networkComplianceIssues
    };
  }

  // Analyze member behavior
  private async analyzeMemberBehavior(request: FraudDetectionRequest): Promise<MemberBehaviorAnalysis> {
    const { member, memberHistory } = request;

    // Check for excessive claims
    const recentClaims = memberHistory.filter(c =>
      new Date(c.claimDate) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    );
    const excessiveClaims = recentClaims.length > 15;

    // Check claim frequency anomalies
    const claimFrequencyAnomalies = this.checkClaimFrequencyAnomalies(memberHistory);

    // Check for provider shopping
    const uniqueProviders = new Set(memberHistory.map(c => c.institutionId));
    const providerShopping = uniqueProviders.size > 10;

    // Check for suspicious timing
    const suspiciousTiming = this.checkSuspiciousTiming(memberHistory);

    return {
      excessiveClaims,
      claimFrequencyAnomalies,
      providerShopping,
      suspiciousTiming
    };
  }

  // Detect clinical anomalies
  private async detectClinicalAnomalies(request: FraudDetectionRequest): Promise<ClinicalAnomaly[]> {
    const anomalies: ClinicalAnomaly[] = [];

    // Check for diagnosis/procedure mismatches
    const diagnosisProcedureMismatch = await this.checkDiagnosisProcedureMismatch(request);
    if (diagnosisProcedureMismatch) {
      anomalies.push(diagnosisProcedureMismatch);
    }

    // Check for unlikely age-gender combinations
    const ageGenderAnomaly = this.checkAgeGenderAnomalies(request);
    if (ageGenderAnomaly) {
      anomalies.push(ageGenderAnomaly);
    }

    // Check for treatment duration anomalies
    const durationAnomaly = this.checkTreatmentDurationAnomalies(request);
    if (durationAnomaly) {
      anomalies.push(durationAnomaly);
    }

    return anomalies;
  }

  // Check compliance issues
  private async checkComplianceIssues(request: FraudDetectionRequest): Promise<ComplianceIssue[]> {
    const issues: ComplianceIssue[] = [];

    // Check HIPAA compliance
    const hipaaIssue = this.checkHIPAACompliance(request);
    if (hipaaIssue) {
      issues.push(hipaaIssue);
    }

    // Check billing compliance
    const billingComplianceIssue = this.checkBillingCompliance(request);
    if (billingComplianceIssue) {
      issues.push(billingComplianceIssue);
    }

    return issues;
  }

  // Collect fraud indicators from all analyses
  private collectFraudIndicators(
    billingAnalysis: BillingPatternAnalysis,
    providerAnalysis: ProviderBehaviorAnalysis,
    memberAnalysis: MemberBehaviorAnalysis,
    clinicalAnomalies: ClinicalAnomaly[],
    complianceIssues: ComplianceIssue[]
  ): FraudIndicator[] {
    const indicators: FraudIndicator[] = [];

    // Billing pattern indicators
    if (billingAnalysis.unusuallyHighBilling) {
      indicators.push({
        type: 'UNUSUALLY_HIGH_BILLING',
        severity: 'HIGH',
        description: 'Claim amount significantly higher than provider average',
        weight: 20,
        evidence: { billingAmount: billingAnalysis.unusuallyHighBilling }
      });
    }

    if (billingAnalysis.duplicateBillingIndicators) {
      indicators.push({
        type: 'DUPLICATE_BILLING',
        severity: 'HIGH',
        description: 'Possible duplicate billing detected',
        weight: 25,
        evidence: { duplicateDetected: true }
      });
    }

    if (billingAnalysis.upcodingIndicators) {
      indicators.push({
        type: 'UPCODING',
        severity: 'MEDIUM',
        description: 'Indicators of upcoding services',
        weight: 15,
        evidence: { upcodingDetected: true }
      });
    }

    // Provider behavior indicators
    if (providerAnalysis.outlierStatus) {
      indicators.push({
        type: 'OUTLIER_PROVIDER',
        severity: 'MEDIUM',
        description: 'Provider billing patterns are statistical outliers',
        weight: 10,
        evidence: { isOutlier: true }
      });
    }

    if (providerAnalysis.networkComplianceIssues) {
      indicators.push({
        type: 'NETWORK_COMPLIANCE',
        severity: 'MEDIUM',
        description: 'Provider not in approved network',
        weight: 10,
        evidence: { networkStatus: 'unapproved' }
      });
    }

    // Member behavior indicators
    if (memberAnalysis.providerShopping) {
      indicators.push({
        type: 'PROVIDER_SHOPPING',
        severity: 'LOW',
        description: 'Member uses unusually high number of different providers',
        weight: 5,
        evidence: { providerCount: 'high' }
      });
    }

    // Clinical anomalies
    clinicalAnomalies.forEach(anomaly => {
      indicators.push({
        type: 'CLINICAL_ANOMALY',
        severity: anomaly.severity,
        description: anomaly.description,
        weight: anomaly.severity === 'HIGH' ? 15 : 10,
        evidence: { anomaly }
      });
    });

    // Compliance issues
    complianceIssues.forEach(issue => {
      indicators.push({
        type: 'COMPLIANCE_VIOLATION',
        severity: issue.severity,
        description: `${issue.regulation}: ${issue.violation}`,
        weight: issue.severity === 'HIGH' ? 20 : 10,
        evidence: { complianceIssue: issue }
      });
    });

    return indicators;
  }

  // Calculate overall risk score
  private calculateRiskScore(indicators: FraudIndicator[]): number {
    let totalScore = 0;
    let maxPossibleScore = 0;

    indicators.forEach(indicator => {
      const severityWeight = indicator.severity === 'HIGH' ? 1.0 :
                            indicator.severity === 'MEDIUM' ? 0.7 : 0.4;
      totalScore += indicator.weight * severityWeight;
      maxPossibleScore += indicator.weight;
    });

    // Normalize to 0-100 scale
    return maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
  }

  // Determine risk level
  private determineRiskLevel(riskScore: number): 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (riskScore >= this.CRITICAL_RISK_THRESHOLD) return 'CRITICAL';
    if (riskScore >= this.HIGH_RISK_THRESHOLD) return 'HIGH';
    if (riskScore >= this.MEDIUM_RISK_THRESHOLD) return 'MEDIUM';
    if (riskScore > 0) return 'LOW';
    return 'NONE';
  }

  // Determine fraud type
  private determineFraudType(
    indicators: FraudIndicator[],
    riskLevel: string
  ): 'NONE' | 'BILLING_FRAUD' | 'UPSELLING' | 'DUPLICATE' | 'UNBUNDLING' | 'KICKBACKS' | 'PHANTOM_BILLING' {
    if (riskLevel === 'NONE') return 'NONE';

    const hasDuplicate = indicators.some(i => i.type === 'DUPLICATE_BILLING');
    const hasUpcoding = indicators.some(i => i.type === 'UPCODING');
    const hasUnbundling = indicators.some(i => i.type === 'UNBUNDLING');

    if (hasDuplicate) return 'DUPLICATE';
    if (hasUpcoding) return 'BILLING_FRAUD';
    if (hasUnbundling) return 'UNBUNDLING';

    return 'BILLING_FRAUD'; // Default for other cases
  }

  // Generate rule-based violations
  private generateRuleBasedViolations(indicators: FraudIndicator[]): string[] {
    return indicators
      .filter(i => i.severity === 'HIGH')
      .map(i => `${i.type}: ${i.description}`);
  }

  // Simulate ML model confidence
  private simulateMLModelConfidence(riskScore: number): number {
    // Simulate ML model confidence based on risk score
    // Higher risk scores generally have higher confidence in fraud detection
    const baseConfidence = 60 + (riskScore * 0.4);
    return Math.min(95, Math.max(40, baseConfidence + (Math.random() - 0.5) * 10));
  }

  // Generate recommendations
  private generateRecommendations(
    riskLevel: string,
    indicators: FraudIndicator[]
  ): string[] {
    const recommendations: string[] = [];

    if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
      recommendations.push('Immediate investigation required');
      recommendations.push('Suspend payments pending investigation');
      recommendations.push('Conduct provider audit');
    } else if (riskLevel === 'MEDIUM') {
      recommendations.push('Review claim documentation');
      recommendations.push('Verify provider credentials');
      recommendations.push('Monitor future claims from this provider');
    } else if (riskLevel === 'LOW') {
      recommendations.push('Monitor claim processing');
      recommendations.push('Review patterns quarterly');
    }

    // Specific recommendations based on indicators
    indicators.forEach(indicator => {
      if (indicator.type === 'DUPLICATE_BILLING') {
        recommendations.push('Check for exact duplicate claims');
      }
      if (indicator.type === 'UPCODING') {
        recommendations.push('Verify procedure coding accuracy');
      }
      if (indicator.type === 'NETWORK_COMPLIANCE') {
        recommendations.push('Confirm provider network participation');
      }
    });

    return recommendations;
  }

  // Generate action items
  private generateActionItems(
    riskLevel: string,
    investigationRequired: boolean,
    fraudType: string
  ): string[] {
    const actionItems: string[] = [];

    if (investigationRequired) {
      actionItems.push('Assign to fraud investigation team');
      actionItems.push('Request additional documentation');
      actionItems.push('Contact provider for clarification');
    }

    if (riskLevel === 'CRITICAL') {
      actionItems.push('Escalate to senior fraud analyst');
      actionItems.push('Consider legal action if confirmed');
      actionItems.push('Report to regulatory authorities');
    }

    if (fraudType === 'DUPLICATE') {
      actionItems.push('Cross-reference with all claims database');
      actionItems.push('Check for systemic billing errors');
    }

    if (fraudType === 'BILLING_FRAUD') {
      actionItems.push('Conduct full provider audit');
      actionItems.push('Review all claims from past 12 months');
    }

    return actionItems;
  }

  // Helper methods for specific detections

  private detectUpcodingPatterns(claim: Claim, providerHistory: Claim[]): boolean {
    // Simplified upcoding detection
    return claim.amount > 2000 && claim.description.toLowerCase().includes('complex');
  }

  private detectUnbundlingPatterns(claim: Claim, providerHistory: Claim[]): boolean {
    // Simplified unbundling detection
    return claim.description.toLowerCase().includes('multiple') && claim.amount > 1000;
  }

  private detectDuplicateBilling(claim: Claim, memberHistory: Claim[]): boolean {
    return memberHistory.some(c =>
      c.diagnosisCode === claim.diagnosisCode &&
      Math.abs(new Date(c.claimDate).getTime() - new Date(claim.claimDate).getTime()) < 7 * 24 * 60 * 60 * 1000
    );
  }

  private checkGeographicAnomalies(provider: MedicalInstitution, providerHistory: Claim[]): boolean {
    // Simplified geographic check
    return providerHistory.length > 0; // Would check actual geographic patterns
  }

  private checkReferralPatterns(providerHistory: Claim[]): boolean {
    // Simplified referral pattern check
    return false; // Would analyze actual referral patterns
  }

  private checkClaimFrequencyAnomalies(memberHistory: Claim[]): boolean {
    const recentClaims = memberHistory.filter(c =>
      new Date(c.claimDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    return recentClaims.length > 5;
  }

  private checkSuspiciousTiming(memberHistory: Claim[]): boolean {
    // Check for claims filed on predictable patterns
    const sortedClaims = memberHistory.sort((a, b) =>
      new Date(a.claimDate).getTime() - new Date(b.claimDate).getTime()
    );

    for (let i = 1; i < sortedClaims.length; i++) {
      const timeDiff = new Date(sortedClaims[i].claimDate).getTime() -
                     new Date(sortedClaims[i-1].claimDate).getTime();
      // Claims filed exactly 7 days apart repeatedly
      if (Math.abs(timeDiff - (7 * 24 * 60 * 60 * 1000)) < 60000) {
        return true;
      }
    }

    return false;
  }

  private async checkDiagnosisProcedureMismatch(request: FraudDetectionRequest): Promise<ClinicalAnomaly | null> {
    // Simplified check for diagnosis/procedure mismatch
    const { claim } = request;
    const highRiskDiagnosis = ['Z00.0', 'Z00.1']; // General medical exams
    const highRiskProcedures = ['surgery', 'imaging', 'laboratory'];

    if (highRiskDiagnosis.includes(claim.diagnosisCode) &&
        highRiskProcedures.some(procedure => claim.description.toLowerCase().includes(procedure))) {
      return {
        type: 'DIAGNOSIS_PROCEDURE_MISMATCH',
        description: 'Preventive care diagnosis with high-risk procedure',
        severity: 'MEDIUM',
        clinicalRationale: 'General examination codes typically do not support high-cost procedures'
      };
    }

    return null;
  }

  private checkAgeGenderAnomalies(request: FraudDetectionRequest): ClinicalAnomaly | null {
    // Simplified age/gender check
    const { claim, member } = request;
    const memberAge = this.calculateAge(member.dateOfBirth);

    // Pregnancy-related procedures for males or very young/old members
    if (claim.description.toLowerCase().includes('pregnancy') &&
        (member.gender === 'male' || memberAge < 15 || memberAge > 55)) {
      return {
        type: 'AGE_GENDER_ANOMALY',
        description: 'Pregnancy-related procedure with incompatible age/gender',
        severity: 'HIGH',
        clinicalRationale: 'Clinical indication not supported by patient demographics'
      };
    }

    return null;
  }

  private checkTreatmentDurationAnomalies(request: FraudDetectionRequest): ClinicalAnomaly | null {
    // Simplified duration check
    const { claim } = request;
    if (claim.amount > 10000 && claim.description.toLowerCase().includes('consultation')) {
      return {
        type: 'DURATION_ANOMALY',
        description: 'Unusually high cost for consultation service',
        severity: 'MEDIUM',
        clinicalRationale: 'Consultation costs are typically much lower'
      };
    }

    return null;
  }

  private checkHIPAACompliance(request: FraudDetectionRequest): ComplianceIssue | null {
    // Simplified HIPAA check
    return null; // Would implement actual HIPAA compliance checks
  }

  private checkBillingCompliance(request: FraudDetectionRequest): ComplianceIssue | null {
    const { claim } = request;
    if (claim.amount > 50000) {
      return {
        regulation: 'CMS Billing Guidelines',
        violation: 'Claim amount exceeds typical limits',
        severity: 'MEDIUM',
        potentialPenalty: 'Claim rejection and audit'
      };
    }

    return null;
  }

  private calculateStandardDeviation(values: number[]): number {
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squareDiffs = values.map(val => Math.pow(val - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(avgSquareDiff);
  }

  private calculateAge(dateOfBirth: string): number {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  // Save fraud detection result
  private async saveFraudDetectionResult(result: FraudDetectionResult): Promise<void> {
    try {
      await storage.createFraudDetectionResult({
        claimId: result.claimId,
        detectionDate: new Date(),
        riskScore: result.riskScore,
        riskLevel: result.riskLevel,
        detectedIndicators: JSON.stringify(result.detectedIndicators),
        mlModelConfidence: result.mlModelConfidence,
        ruleBasedViolations: JSON.stringify(result.ruleBasedViolations),
        investigationRequired: result.investigationRequired,
        investigationStatus: result.investigationStatus,
        fraudType: result.fraudType
      });
    } catch (error) {
      console.error('Error saving fraud detection result:', error);
    }
  }

  // Get fraud alerts for dashboard
  async getFraudAlerts(): Promise<FraudDetectionResult[]> {
    try {
      const fraudResults = await storage.getFraudDetectionResults();
      const alerts: FraudDetectionResult[] = [];

      for (const result of fraudResults) {
        if (result.riskLevel === 'HIGH' || result.riskLevel === 'CRITICAL') {
          // Convert storage format to analysis format
          alerts.push({
            claimId: result.claimId,
            riskScore: result.riskScore,
            riskLevel: result.riskLevel as 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
            detectedIndicators: JSON.parse(result.detectedIndicators || '[]'),
            ruleBasedViolations: JSON.parse(result.ruleBasedViolations || '[]'),
            mlModelConfidence: result.mlModelConfidence,
            investigationRequired: result.investigationRequired,
            investigationStatus: result.investigationStatus as 'PENDING' | 'IN_PROGRESS' | 'RESOLVED',
            fraudType: result.fraudType as 'NONE' | 'BILLING_FRAUD' | 'UPSELLING' | 'DUPLICATE' | 'UNBUNDLING' | 'KICKBACKS' | 'PHANTOM_BILLING',
            detailedAnalysis: {
              billingPatternAnalysis: {
                unusuallyHighBilling: false,
                inconsistentBillingPatterns: false,
                highFrequencyClaims: false,
                weekendHolidayBilling: false,
                sameDayMultipleClaims: false,
                upcodingIndicators: false,
                unbundlingIndicators: false,
                duplicateBillingIndicators: false
              },
              providerBehaviorAnalysis: {
                outlierStatus: false,
                highRiskSpecialties: false,
                newProviderRisk: false,
                geographicAnomalies: false,
                referralPatternAnomalies: false,
                networkComplianceIssues: false
              },
              memberBehaviorAnalysis: {
                excessiveClaims: false,
                claimFrequencyAnomalies: false,
                providerShopping: false,
                suspiciousTiming: false
              },
              clinicalAnomalies: [],
              complianceIssues: []
            },
            recommendations: ['Investigation recommended'],
            actionItems: ['Review claim documentation']
          });
        }
      }

      return alerts.sort((a, b) => b.riskScore - a.riskScore);

    } catch (error) {
      console.error('Error getting fraud alerts:', error);
      return [];
    }
  }
}

export const fraudDetectionEngine = new FraudDetectionEngine();