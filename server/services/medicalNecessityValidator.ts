import { storage } from '../storage';
import {
  Claim,
  Member,
  DiagnosisCode,
  MedicalProcedure,
  MedicalNecessityValidation,
  InsertMedicalNecessityValidation
} from '@shared/schema';

export interface MedicalNecessityRequest {
  claimId: number;
  diagnosisCode: string;
  procedureCodes: string[];
  memberInfo: {
    age: number;
    gender: string;
    medicalHistory: string[];
  };
  serviceInfo: {
    serviceDate: Date;
    providerType: string;
    setting: string; // inpatient, outpatient, emergency, etc.
    urgency: string; // elective, urgent, emergent
  };
}

export interface MedicalNecessityValidationResult {
  claimId: number;
  diagnosisCode: string;
  procedureCodes: string[];
  validationResult: 'PASS' | 'FAIL' | 'REVIEW_REQUIRED';
  necessityScore: number; // 0-100
  confidenceLevel: number; // 0-100
  requiresClinicalReview: boolean;
  validationDetails: {
    diagnosisSupport: {
      supported: boolean;
      evidence: string[];
      strength: 'weak' | 'moderate' | 'strong';
    };
    procedureAppropriateness: {
      appropriate: boolean;
      alternativeProcedures: string[];
      lessInvasiveOptions: string[];
    };
    clinicalGuidelines: {
      guidelineReferences: string[];
      complianceScore: number;
      recommendations: string[];
    };
    demographicFactors: {
      ageAppropriate: boolean;
      genderAppropriate: boolean;
      frequencyAppropriate: boolean;
    };
  };
  riskFactors: {
    highRiskIndicators: string[];
    experimentalProcedures: boolean;
    cosmeticProcedures: boolean;
    preventiveCare: boolean;
  };
  recommendations: string[];
  reviewerNotes?: string;
  clinicalGuidelineReference?: string;
}

export interface ClinicalGuideline {
  id: string;
  name: string;
  organization: string;
  diagnosisCodes: string[];
  procedureCodes: string[];
  criteria: {
    ageRange?: { min: number; max: number };
    gender?: string[];
    frequencyLimits?: { maxPerYear: number; maxPerLifetime: number };
    medicalNecessityCriteria: string[];
    exclusionCriteria: string[];
  };
  lastUpdated: Date;
}

export class MedicalNecessityValidator {
  private clinicalGuidelines: Map<string, ClinicalGuideline> = new Map();

  constructor() {
    this.initializeClinicalGuidelines();
  }

  // Initialize clinical guidelines database (simplified version)
  private initializeClinicalGuidelines(): void {
    // Cardiology guidelines
    this.clinicalGuidelines.set('I25.1', {
      id: 'CAD-001',
      name: 'Coronary Artery Disease Management',
      organization: 'American Heart Association',
      diagnosisCodes: ['I25.1', 'I25.10', 'I25.11'],
      procedureCodes: ['92920', '92924', '92928', '92933', '92934'],
      criteria: {
        ageRange: { min: 18, max: 100 },
        gender: ['male', 'female'],
        frequencyLimits: { maxPerYear: 2, maxPerLifetime: 10 },
        medicalNecessityCriteria: [
          'Symptomatic coronary artery disease confirmed by angiography',
          'Failed medical therapy',
          'Significant coronary artery stenosis (>70%)',
          'Documented ischemia on stress testing'
        ],
        exclusionCriteria: [
          'Asymptomatic with minimal stenosis',
          'Co-morbid conditions prohibit intervention',
          'Patient refuses intervention'
        ]
      },
      lastUpdated: new Date('2023-01-15')
    });

    // Orthopedic guidelines
    this.clinicalGuidelines.set('M16.1', {
      id: 'ORTHO-001',
      name: 'Osteoarthritis Knee Management',
      organization: 'American Academy of Orthopaedic Surgeons',
      diagnosisCodes: ['M16.1', 'M16.10', 'M16.11'],
      procedureCodes: ['27447', '27486', '27487'],
      criteria: {
        ageRange: { min: 40, max: 85 },
        gender: ['male', 'female'],
        frequencyLimits: { maxPerYear: 1, maxPerLifetime: 2 },
        medicalNecessityCriteria: [
          'Kellgren-Lawrence grade 3 or 4 osteoarthritis',
          'Failed conservative therapy (3+ months)',
          'Significant functional impairment',
          'Pain refractory to medical management'
        ],
        exclusionCriteria: [
          'Mild osteoarthritis (grade 1-2)',
          'Inadequate trial of conservative treatment',
          'Active infection'
        ]
      },
      lastUpdated: new Date('2023-03-01')
    });

    // Mental health guidelines
    this.clinicalGuidelines.set('F32.9', {
      id: 'PSYCH-001',
      name: 'Major Depressive Disorder Treatment',
      organization: 'American Psychiatric Association',
      diagnosisCodes: ['F32.9', 'F33.0', 'F33.1', 'F33.2'],
      procedureCodes: ['90834', '90837', '90853', '90836'],
      criteria: {
        ageRange: { min: 18, max: 100 },
        gender: ['male', 'female'],
        frequencyLimits: { maxPerYear: 52, maxPerLifetime: 1000 },
        medicalNecessityCriteria: [
          'DSM-5 criteria for Major Depressive Disorder',
          'Functional impairment in daily activities',
          'Symptoms present for >2 weeks',
          'Moderate to severe symptoms (PHQ-9 >= 10)'
        ],
        exclusionCriteria: [
          'Mild symptoms (PHQ-9 < 10)',
          'Substance-induced depression',
          'Bereavement-related depression'
        ]
      },
      lastUpdated: new Date('2023-02-20')
    });
  }

  // Validate medical necessity for a claim
  async validateMedicalNecessity(request: MedicalNecessityRequest): Promise<MedicalNecessityValidationResult> {
    try {
      // Get diagnosis code information
      const diagnosisCode = await this.getDiagnosisCode(request.diagnosisCode);

      // Get procedure information
      const procedures = await this.getProcedures(request.procedureCodes);

      // Find applicable clinical guidelines
      const applicableGuidelines = this.findApplicableGuidelines(request.diagnosisCode, request.procedureCodes);

      // Evaluate diagnosis support
      const diagnosisSupport = this.evaluateDiagnosisSupport(request, diagnosisCode, applicableGuidelines);

      // Evaluate procedure appropriateness
      const procedureAppropriateness = this.evaluateProcedureAppropriateness(request, procedures, applicableGuidelines);

      // Evaluate clinical guideline compliance
      const clinicalGuidelinesEval = this.evaluateClinicalGuidelineCompliance(request, applicableGuidelines);

      // Evaluate demographic factors
      const demographicFactors = this.evaluateDemographicFactors(request, applicableGuidelines);

      // Assess risk factors
      const riskFactors = this.assessRiskFactors(request, procedures);

      // Calculate overall necessity score
      const necessityScore = this.calculateNecessityScore(
        diagnosisSupport,
        procedureAppropriateness,
        clinicalGuidelinesEval,
        demographicFactors,
        riskFactors
      );

      // Determine validation result and confidence
      const { validationResult, confidenceLevel, requiresClinicalReview } = this.determineValidationResult(
        necessityScore,
        riskFactors,
        clinicalGuidelinesEval
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        validationResult,
        diagnosisSupport,
        procedureAppropriateness,
        clinicalGuidelinesEval,
        riskFactors
      );

      const result: MedicalNecessityValidationResult = {
        claimId: request.claimId,
        diagnosisCode: request.diagnosisCode,
        procedureCodes: request.procedureCodes,
        validationResult,
        necessityScore,
        confidenceLevel,
        requiresClinicalReview,
        validationDetails: {
          diagnosisSupport,
          procedureAppropriateness,
          clinicalGuidelines: clinicalGuidelinesEval,
          demographicFactors
        },
        riskFactors,
        recommendations,
        clinicalGuidelineReference: applicableGuidelines[0]?.name
      };

      // Save validation result
      await this.saveValidationResult(result);

      return result;

    } catch (error) {
      console.error('Error validating medical necessity:', error);
      throw error;
    }
  }

  // Get diagnosis code information
  private async getDiagnosisCode(code: string): Promise<DiagnosisCode | null> {
    try {
      return await storage.getDiagnosisCodeByCode(code);
    } catch (error) {
      console.error('Error getting diagnosis code:', error);
      return null;
    }
  }

  // Get procedure information
  private async getProcedures(procedureCodes: string[]): Promise<MedicalProcedure[]> {
    const procedures: MedicalProcedure[] = [];

    for (const code of procedureCodes) {
      try {
        // This is simplified - in real implementation, you'd search by procedure code
        const allProcedures = await storage.getMedicalProcedures();
        const procedure = allProcedures.find(p => p.code === code);
        if (procedure) {
          procedures.push(procedure);
        }
      } catch (error) {
        console.error(`Error getting procedure ${code}:`, error);
      }
    }

    return procedures;
  }

  // Find applicable clinical guidelines
  private findApplicableGuidelines(diagnosisCode: string, procedureCodes: string[]): ClinicalGuideline[] {
    const applicableGuidelines: ClinicalGuideline[] = [];

    for (const [key, guideline] of this.clinicalGuidelines) {
      const diagnosisMatch = guideline.diagnosisCodes.includes(diagnosisCode);
      const procedureMatch = procedureCodes.some(code => guideline.procedureCodes.includes(code));

      if (diagnosisMatch || procedureMatch) {
        applicableGuidelines.push(guideline);
      }
    }

    return applicableGuidelines;
  }

  // Evaluate diagnosis support
  private evaluateDiagnosisSupport(
    request: MedicalNecessityRequest,
    diagnosisCode: DiagnosisCode | null,
    guidelines: ClinicalGuideline[]
  ) {
    const supported = guidelines.length > 0;
    const evidence: string[] = [];
    let strength: 'weak' | 'moderate' | 'strong' = 'weak';

    if (diagnosisCode) {
      evidence.push(`Valid ICD code: ${diagnosisCode.code} - ${diagnosisCode.description}`);
      strength = 'moderate';
    }

    guidelines.forEach(guideline => {
      evidence.push(`Guideline support: ${guideline.name}`);
      strength = 'strong';
    });

    return {
      supported,
      evidence,
      strength
    };
  }

  // Evaluate procedure appropriateness
  private evaluateProcedureAppropriateness(
    request: MedicalNecessityRequest,
    procedures: MedicalProcedure[],
    guidelines: ClinicalGuideline[]
  ) {
    const appropriate = procedures.length > 0 && guidelines.length > 0;
    const alternativeProcedures: string[] = [];
    const lessInvasiveOptions: string[] = [];

    // In a real implementation, this would use medical knowledge bases
    if (procedures.some(p => p.category === 'surgery')) {
      lessInvasiveOptions.push('Conservative management');
      lessInvasiveOptions.push('Physical therapy');
    }

    if (procedures.some(p => p.category === 'diagnostic')) {
      alternativeProcedures.push('Less invasive imaging');
      alternativeProcedures.push('Clinical evaluation');
    }

    return {
      appropriate,
      alternativeProcedures,
      lessInvasiveOptions
    };
  }

  // Evaluate clinical guideline compliance
  private evaluateClinicalGuidelineCompliance(
    request: MedicalNecessityRequest,
    guidelines: ClinicalGuideline[]
  ) {
    const guidelineReferences = guidelines.map(g => g.name);
    let complianceScore = 100; // Start with perfect compliance
    const recommendations: string[] = [];

    guidelines.forEach(guideline => {
      // Check age criteria
      if (guideline.criteria.ageRange) {
        const { min, max } = guideline.criteria.ageRange;
        if (request.memberInfo.age < min || request.memberInfo.age > max) {
          complianceScore -= 20;
          recommendations.push(`Age ${request.memberInfo.age} outside guideline range (${min}-${max})`);
        }
      }

      // Check gender criteria
      if (guideline.criteria.gender &&
          !guideline.criteria.gender.includes(request.memberInfo.gender.toLowerCase())) {
        complianceScore -= 15;
        recommendations.push(`Gender not specified in guideline`);
      }

      // Check medical necessity criteria
      if (guideline.criteria.medicalNecessityCriteria.length > 0) {
        recommendations.push('Ensure all medical necessity criteria are documented');
      }
    });

    return {
      guidelineReferences,
      complianceScore: Math.max(0, complianceScore),
      recommendations
    };
  }

  // Evaluate demographic factors
  private evaluateDemographicFactors(
    request: MedicalNecessityRequest,
    guidelines: ClinicalGuideline[]
  ) {
    let ageAppropriate = true;
    let genderAppropriate = true;
    let frequencyAppropriate = true;

    guidelines.forEach(guideline => {
      if (guideline.criteria.ageRange) {
        const { min, max } = guideline.criteria.ageRange;
        ageAppropriate = ageAppropriate &&
          (request.memberInfo.age >= min && request.memberInfo.age <= max);
      }

      if (guideline.criteria.gender) {
        genderAppropriate = genderAppropriate &&
          guideline.criteria.gender.includes(request.memberInfo.gender.toLowerCase());
      }

      if (guideline.criteria.frequencyLimits) {
        // In a real implementation, you'd check actual usage frequency
        frequencyAppropriate = true; // Simplified
      }
    });

    return {
      ageAppropriate,
      genderAppropriate,
      frequencyAppropriate
    };
  }

  // Assess risk factors
  private assessRiskFactors(
    request: MedicalNecessityRequest,
    procedures: MedicalProcedure[]
  ) {
    const highRiskIndicators: string[] = [];
    let experimentalProcedures = false;
    let cosmeticProcedures = false;
    let preventiveCare = false;

    // Check for high-risk procedures
    procedures.forEach(procedure => {
      if (procedure.category === 'surgery' && request.memberInfo.age > 80) {
        highRiskIndicators.push('High-risk surgery in elderly patient');
      }

      if (procedure.category === 'experimental') {
        experimentalProcedures = true;
        highRiskIndicators.push('Experimental procedure');
      }

      if (procedure.category === 'cosmetic') {
        cosmeticProcedures = true;
        highRiskIndicators.push('Cosmetic procedure');
      }
    });

    // Check for preventive care
    if (request.serviceInfo.urgency === 'elective' &&
        request.serviceInfo.setting === 'outpatient') {
      preventiveCare = true;
    }

    return {
      highRiskIndicators,
      experimentalProcedures,
      cosmeticProcedures,
      preventiveCare
    };
  }

  // Calculate overall necessity score
  private calculateNecessityScore(
    diagnosisSupport: any,
    procedureAppropriateness: any,
    clinicalGuidelines: any,
    demographicFactors: any,
    riskFactors: any
  ): number {
    let score = 0;

    // Diagnosis support (30% weight)
    if (diagnosisSupport.supported) {
      score += diagnosisSupport.strength === 'strong' ? 30 :
               diagnosisSupport.strength === 'moderate' ? 20 : 10;
    }

    // Procedure appropriateness (25% weight)
    if (procedureAppropriateness.appropriate) {
      score += 25;
    }

    // Clinical guideline compliance (25% weight)
    score += (clinicalGuidelines.complianceScore / 100) * 25;

    // Demographic factors (15% weight)
    let demographicScore = 15;
    if (!demographicFactors.ageAppropriate) demographicScore -= 5;
    if (!demographicFactors.genderAppropriate) demographicScore -= 5;
    if (!demographicFactors.frequencyAppropriate) demographicScore -= 5;
    score += Math.max(0, demographicScore);

    // Risk factors (5% weight)
    if (riskFactors.experimentalProcedures || riskFactors.cosmeticProcedures) {
      score -= 5;
    } else if (riskFactors.highRiskIndicators.length > 0) {
      score -= 2;
    } else {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  // Determine validation result and confidence level
  private determineValidationResult(
    necessityScore: number,
    riskFactors: any,
    clinicalGuidelines: any
  ): { validationResult: 'PASS' | 'FAIL' | 'REVIEW_REQUIRED'; confidenceLevel: number; requiresClinicalReview: boolean } {
    let validationResult: 'PASS' | 'FAIL' | 'REVIEW_REQUIRED' = 'PASS';
    let requiresClinicalReview = false;
    let confidenceLevel = 100;

    if (necessityScore >= 80) {
      validationResult = 'PASS';
      requiresClinicalReview = false;
      confidenceLevel = Math.min(100, necessityScore + 10);
    } else if (necessityScore >= 60) {
      validationResult = 'REVIEW_REQUIRED';
      requiresClinicalReview = true;
      confidenceLevel = 70;
    } else if (necessityScore >= 40) {
      validationResult = 'REVIEW_REQUIRED';
      requiresClinicalReview = true;
      confidenceLevel = 50;
    } else {
      validationResult = 'FAIL';
      requiresClinicalReview = false;
      confidenceLevel = Math.max(30, necessityScore + 10);
    }

    // Adjust for risk factors
    if (riskFactors.experimentalProcedures || riskFactors.cosmeticProcedures) {
      requiresClinicalReview = true;
      confidenceLevel -= 20;
    }

    return {
      validationResult,
      confidenceLevel: Math.max(0, Math.min(100, confidenceLevel)),
      requiresClinicalReview
    };
  }

  // Generate recommendations
  private generateRecommendations(
    validationResult: 'PASS' | 'FAIL' | 'REVIEW_REQUIRED',
    diagnosisSupport: any,
    procedureAppropriateness: any,
    clinicalGuidelines: any,
    riskFactors: any
  ): string[] {
    const recommendations: string[] = [];

    if (validationResult === 'FAIL') {
      recommendations.push('Procedure does not meet medical necessity criteria');
      recommendations.push('Consider alternative treatment options');
      recommendations.push('Document additional clinical information if available');
    } else if (validationResult === 'REVIEW_REQUIRED') {
      recommendations.push('Clinical review recommended by medical professional');
      recommendations.push('Additional documentation may be required');
      recommendations.push('Consider pre-authorization process');
    } else {
      recommendations.push('Procedure meets medical necessity criteria');
      recommendations.push('Ensure all documentation is complete');
      recommendations.push('Proceed with standard claims process');
    }

    if (procedureAppropriateness.alternativeProcedures.length > 0) {
      recommendations.push('Consider alternative procedures: ' + procedureAppropriateness.alternativeProcedures.join(', '));
    }

    if (riskFactors.highRiskIndicators.length > 0) {
      recommendations.push('High-risk factors identified - ensure proper risk mitigation');
    }

    return recommendations;
  }

  // Save validation result
  private async saveValidationResult(result: MedicalNecessityValidationResult): Promise<void> {
    try {
      await storage.createMedicalNecessityResult({
        claimId: result.claimId,
        diagnosisCode: result.diagnosisCode,
        procedureCodes: JSON.stringify(result.procedureCodes),
        validationResult: result.validationResult,
        necessityScore: result.necessityScore,
        reviewerNotes: result.reviewerNotes,
        requiresClinicalReview: result.requiresClinicalReview,
        clinicalGuidelineReference: result.clinicalGuidelineReference
      });
    } catch (error) {
      console.error('Error saving medical necessity validation:', error);
    }
  }

  // Get validation history for a member
  async getValidationHistory(memberId: number): Promise<MedicalNecessityValidationResult[]> {
    try {
      const claims = await storage.getClaimsByMember(memberId);
      const history: MedicalNecessityValidationResult[] = [];

      for (const claim of claims) {
        const validations = await storage.getMedicalNecessityValidationsByClaim(claim.id);
        for (const validation of validations) {
          // Convert storage format to result format
          history.push({
            claimId: validation.claimId,
            diagnosisCode: validation.diagnosisCode,
            procedureCodes: JSON.parse(validation.procedureCodes || '[]'),
            validationResult: validation.validationResult as 'PASS' | 'FAIL' | 'REVIEW_REQUIRED',
            necessityScore: validation.necessityScore || 0,
            confidenceLevel: 0, // Not stored in simplified version
            requiresClinicalReview: validation.requiresClinicalReview,
            validationDetails: {
              diagnosisSupport: { supported: true, evidence: [], strength: 'moderate' },
              procedureAppropriateness: { appropriate: true, alternativeProcedures: [], lessInvasiveOptions: [] },
              clinicalGuidelines: { guidelineReferences: [], complianceScore: 100, recommendations: [] },
              demographicFactors: { ageAppropriate: true, genderAppropriate: true, frequencyAppropriate: true }
            },
            riskFactors: { highRiskIndicators: [], experimentalProcedures: false, cosmeticProcedures: false, preventiveCare: false },
            recommendations: [],
            reviewerNotes: validation.reviewerNotes,
            clinicalGuidelineReference: validation.clinicalGuidelineReference
          });
        }
      }

      return history.sort((a, b) => b.claimId - a.claimId);

    } catch (error) {
      console.error('Error getting validation history:', error);
      return [];
    }
  }
}

export const medicalNecessityValidator = new MedicalNecessityValidator();