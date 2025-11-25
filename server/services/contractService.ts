import { db } from '../db';
import {
  providerContracts,
  contractDocuments,
  contractSignatures,
  medicalInstitutions,
  users
} from '../shared/schema';
import crypto from 'crypto';

export class ContractService {
  // Contract generation and templating
  async generateContractTemplate(templateType: string, institutionId: number) {
    // Get institution details
    const [institution] = await db.select()
      .from(medicalInstitutions)
      .where(medicalInstitutions.id.eq(institutionId));

    if (!institution) {
      throw new Error('Institution not found');
    }

    // Generate contract based on template type
    const templates = {
      'standard_service': {
        contractName: `${institution.name} - Standard Service Agreement`,
        contractType: 'service',
        reimbursementModel: 'fee_for_service',
        billingCycle: 'monthly',
        paymentTerms: 'NET_30'
      },
      'capitation': {
        contractName: `${institution.name} - Capitation Agreement`,
        contractType: 'service',
        reimbursementModel: 'capitation',
        billingCycle: 'monthly',
        paymentTerms: 'NET_15'
      },
      'facility_network': {
        contractName: `${institution.name} - Network Participation Agreement`,
        contractType: 'network',
        reimbursementModel: 'fee_for_service',
        billingCycle: 'monthly',
        paymentTerms: 'NET_30'
      },
      'specialty_service': {
        contractName: `${institution.name} - Specialty Service Agreement`,
        contractType: 'specialty',
        reimbursementModel: 'fee_for_service',
        billingCycle: 'monthly',
        paymentTerms: 'NET_45'
      }
    };

    const template = templates[templateType as keyof typeof templates];
    if (!template) {
      throw new Error('Invalid template type');
    }

    // Generate unique contract number
    const contractNumber = await this.generateContractNumber();

    // Calculate default effective date (30 days from now)
    const effectiveDate = new Date();
    effectiveDate.setDate(effectiveDate.getDate() + 30);

    // Calculate default expiry date (1 year from effective date)
    const expiryDate = new Date(effectiveDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    return {
      institutionId,
      contractNumber,
      ...template,
      effectiveDate,
      expiryDate,
      autoRenewal: false,
      renewalTermMonths: 12,
      terminationDays: 90,
      negotiatedDiscount: 0.0,
      qualityMetrics: JSON.stringify({
        claimApprovalRate: 95,
        responseTime: 48, // hours
        memberSatisfaction: 85,
        documentationQuality: 90
      }),
      utilizationLimits: JSON.stringify({
        maxClaimsPerMonth: 1000,
        maxClaimAmount: 10000
      }),
      complianceRequirements: JSON.stringify({
        hipaaCompliance: true,
        qualityReporting: true,
        credentialing: true,
        continuingEducation: true
      })
    };
  }

  // Generate unique contract number
  async generateContractNumber(): Promise<string> {
    const prefix = 'PC';
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${year}-${random}`;
  }

  // Document processing and storage
  async processDocumentUpload(
    contractId: number,
    file: any,
    documentType: string,
    uploadedBy: number
  ) {
    // Generate file hash for integrity verification
    const fileHash = crypto.createHash('sha256').update(file.buffer).digest('hex');

    // Get current version for this document type
    const [lastDocument] = await db.select()
      .from(contractDocuments)
      .where(
        contractDocuments.contractId.eq(contractId).and(
          contractDocuments.documentType.eq(documentType)
        )
      )
      .orderBy(contractDocuments.version.desc)
      .limit(1);

    const newVersion = (lastDocument?.version || 0) + 1;

    // Store file path (in production, this would be cloud storage)
    const storedFilePath = `/contracts/${contractId}/${documentType}_v${newVersion}.${file.originalname.split('.').pop()}`;

    const [newDocument] = await db.insert(contractDocuments)
      .values({
        contractId,
        documentType,
        documentName: `${documentType} - Version ${newVersion}`,
        originalFileName: file.originalname,
        storedFilePath,
        fileHash,
        fileSize: file.size,
        mimeType: file.mimetype,
        version: newVersion,
        uploadDate: new Date(),
        uploadedBy,
        required: this.isRequiredDocument(documentType),
        documentStatus: 'pending'
      })
      .returning();

    return newDocument;
  }

  // Check if document type is required
  private isRequiredDocument(documentType: string): boolean {
    const requiredDocuments = ['master_agreement', 'schedule'];
    return requiredDocuments.includes(documentType);
  }

  // Signature verification
  async verifySignature(
    signatureId: number,
    verificationData: {
      verificationMethod: string;
      verifiedBy: number;
      verificationNotes?: string;
    }
  ) {
    // In a real implementation, this would involve:
    // 1. Digital signature validation
    // 2. Timestamp verification
    // 3. Certificate chain validation
    // 4. Biometric verification if applicable

    const [signature] = await db.select()
      .from(contractSignatures)
      .where(contractSignatures.id.eq(signatureId));

    if (!signature) {
      throw new Error('Signature not found');
    }

    // Simulate signature verification
    const isValid = await this.validateDigitalSignature(signature);

    const [verifiedSignature] = await db.update(contractSignatures)
      .set({
        verificationStatus: isValid ? 'verified' : 'rejected',
        verifiedBy: verificationData.verifiedBy,
        verifiedDate: new Date()
      })
      .where(contractSignatures.id.eq(signatureId))
      .returning();

    return verifiedSignature;
  }

  // Digital signature validation (simulated)
  private async validateDigitalSignature(signature: any): Promise<boolean> {
    // In production, this would:
    // 1. Extract the digital signature from signatureData
    // 2. Verify it against the signer's public key
    // 3. Check timestamp validity
    // 4. Validate certificate chain

    // For now, return true if signature data exists
    return !!signature.signatureData;
  }

  // Automated renewal reminders
  async checkUpcomingRenewals(daysAhead: number = 30) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysAhead);

    const upcomingRenewals = await db.select({
      id: providerContracts.id,
      contractNumber: providerContracts.contractNumber,
      contractName: providerContracts.contractName,
      institutionId: providerContracts.institutionId,
      expiryDate: providerContracts.expiryDate,
      autoRenewal: providerContracts.autoRenewal,
      institutionName: medicalInstitutions.name,
      institutionContactEmail: medicalInstitutions.contactEmail,
      institutionContactPerson: medicalInstitutions.contactPerson
    })
      .from(providerContracts)
      .leftJoin(medicalInstitutions, providerContracts.institutionId.eq(medicalInstitutions.id))
      .where(
        providerContracts.expiryDate.lte(targetDate).and(
          providerContracts.expiryDate.gt(new Date())
        ).and(
          providerContracts.status.eq('active')
        )
      );

    return upcomingRenewals;
  }

  // Contract compliance checking
  async checkContractCompliance(contractId: number) {
    const [contract] = await db.select()
      .from(providerContracts)
      .where(providerContracts.id.eq(contractId));

    if (!contract) {
      throw new Error('Contract not found');
    }

    const complianceReport = {
      contractId,
      contractNumber: contract.contractNumber,
      overallCompliance: true,
      complianceIssues: [] as string[],
      requiredDocuments: [] as string[],
      missingSignatures: [] as string[],
      expiryStatus: null as string,
      renewalStatus: null as string
    };

    // Check required documents
    const requiredDocumentTypes = ['master_agreement', 'schedule'];
    const documents = await db.select()
      .from(contractDocuments)
      .where(
        contractDocuments.contractId.eq(contractId).and(
          contractDocuments.isActive.eq(true)
        )
      );

    for (const docType of requiredDocumentTypes) {
      const doc = documents.find(d => d.documentType === docType);
      if (!doc) {
        complianceReport.complianceIssues.push(`Missing required document: ${docType}`);
        complianceReport.overallCompliance = false;
      } else if (doc.documentStatus !== 'approved') {
        complianceReport.complianceIssues.push(`Document not approved: ${docType}`);
        complianceReport.overallCompliance = false;
      }
      complianceReport.requiredDocuments.push({
        type: docType,
        status: doc ? doc.documentStatus : 'missing',
        version: doc?.version || 0,
        uploadDate: doc?.uploadDate || null
      });
    }

    // Check required signatures
    const requiredSignatureTypes = ['provider', 'insurer'];
    const signatures = await db.select()
      .from(contractSignatures)
      .where(contractSignatures.contractId.eq(contractId));

    for (const sigType of requiredSignatureTypes) {
      const signature = signatures.find(s => s.signerType === sigType);
      if (!signature) {
        complianceReport.missingSignatures.push(sigType);
        complianceReport.complianceIssues.push(`Missing required signature: ${sigType}`);
        complianceReport.overallCompliance = false;
      } else if (signature.verificationStatus !== 'verified') {
        complianceReport.complianceIssues.push(`Signature not verified: ${sigType}`);
        complianceReport.overallCompliance = false;
      }
    }

    // Check expiry status
    if (contract.expiryDate) {
      const now = new Date();
      const expiryDate = new Date(contract.expiryDate);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry < 0) {
        complianceReport.expiryStatus = 'expired';
        complianceReport.complianceIssues.push('Contract has expired');
        complianceReport.overallCompliance = false;
      } else if (daysUntilExpiry < 30) {
        complianceReport.expiryStatus = 'expiring_soon';
        complianceReport.complianceIssues.push('Contract expires within 30 days');
      } else {
        complianceReport.expiryStatus = 'valid';
      }
    }

    // Check renewal status
    if (contract.autoRenewal) {
      complianceReport.renewalStatus = 'auto_renewal_enabled';
    } else {
      complianceReport.renewalStatus = 'manual_renewal_required';
      if (contract.expiryDate && new Date(contract.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
        complianceReport.complianceIssues.push('Manual renewal required before expiry');
      }
    }

    return complianceReport;
  }

  // Integration with provider rates
  async linkContractToRates(contractId: number, procedureRates: Array<{
    procedureId: number;
    agreedRate: number;
    effectiveDate: string;
    expiryDate?: string;
  }>) {
    // This would integrate with the providerProcedureRates table
    // For each procedure rate, create or update the rate based on contract terms

    const linkedRates = [];

    for (const rateData of procedureRates) {
      // Get the contract to extract the institution ID
      const [contract] = await db.select()
        .from(providerContracts)
        .where(providerContracts.id.eq(contractId));

      if (!contract) {
        throw new Error('Contract not found');
      }

      // Apply contract discounts if applicable
      let finalRate = rateData.agreedRate;
      if (contract.negotiatedDiscount && contract.negotiatedDiscount > 0) {
        finalRate = rateData.agreedRate * (1 - contract.negotiatedDiscount / 100);
      }

      // Create or update provider procedure rate
      // This would involve the providerProcedureRates table
      linkedRates.push({
        institutionId: contract.institutionId,
        procedureId: rateData.procedureId,
        agreedRate: finalRate,
        effectiveDate: rateData.effectiveDate,
        expiryDate: rateData.expiryDate,
        linkedFromContract: contractId
      });
    }

    return linkedRates;
  }

  // Contract analytics and reporting
  async getContractAnalytics(institutionId?: number) {
    let baseQuery = db.select()
      .from(providerContracts)
      .leftJoin(medicalInstitutions, providerContracts.institutionId.eq(medicalInstitutions.id));

    if (institutionId) {
      baseQuery = baseQuery.where(providerContracts.institutionId.eq(institutionId));
    }

    const contracts = await baseQuery;

    const analytics = {
      totalContracts: contracts.length,
      contractsByStatus: {} as Record<string, number>,
      contractsByType: {} as Record<string, number>,
      contractsByReimbursementModel: {} as Record<string, number>,
      averageContractValue: 0,
      totalContractValue: 0,
      expiringInNext90Days: 0,
      expiringInNext30Days: 0,
      autoRenewalContracts: 0,
      manualRenewalContracts: 0
    };

    const now = new Date();
    const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const next90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    for (const contract of contracts) {
      // Status breakdown
      const status = contract.status || 'unknown';
      analytics.contractsByStatus[status] = (analytics.contractsByStatus[status] || 0) + 1;

      // Type breakdown
      const type = contract.contractType || 'unknown';
      analytics.contractsByType[type] = (analytics.contractsByType[type] || 0) + 1;

      // Reimbursement model breakdown
      const model = contract.reimbursementModel || 'unknown';
      analytics.contractsByReimbursementModel[model] = (analytics.contractsByReimbursementModel[model] || 0) + 1;

      // Contract values
      if (contract.contractValue) {
        analytics.totalContractValue += contract.contractValue;
      }

      // Expiry tracking
      if (contract.expiryDate) {
        const expiryDate = new Date(contract.expiryDate);
        if (expiryDate <= next30Days) {
          analytics.expiringInNext30Days++;
        }
        if (expiryDate <= next90Days) {
          analytics.expiringInNext90Days++;
        }
      }

      // Renewal type
      if (contract.autoRenewal) {
        analytics.autoRenewalContracts++;
      } else {
        analytics.manualRenewalContracts++;
      }
    }

    analytics.averageContractValue = contracts.length > 0 ? analytics.totalContractValue / contracts.length : 0;

    return analytics;
  }
}

export const contractService = new ContractService();