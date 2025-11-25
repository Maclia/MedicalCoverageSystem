import { storage } from '../storage';
import {
  Claim,
  Member,
  Company,
  MedicalInstitution,
  ExplanationOfBenefits,
  InsertExplanationOfBenefits
} from '../../shared/schema.js';

export interface EOBGenerationRequest {
  claimId: number;
  memberId: number;
  adjudicationResult: any; // From claims adjudication service
  financialCalculations: any; // From financial calculation service
  memberPreferences?: {
    format: 'email' | 'mail' | 'portal';
    language: 'en' | 'es' | 'fr';
    accessibility: 'standard' | 'large-print' | 'braille';
  };
}

export interface EOBDocument {
  eobNumber: string;
  eobDate: Date;
  memberInformation: {
    name: string;
    memberID: string;
    dateOfBirth: string;
    groupNumber: string;
    planName: string;
    coverageDates: {
      startDate: string;
      endDate: string;
    };
    employerName: string;
  };
  providerInformation: {
    name: string;
    npiNumber?: string;
    address: string;
    phone: string;
    taxonomy: string;
  };
  claimInformation: {
    claimNumber: string;
    serviceDate: string;
    claimStatus: 'Approved' | 'Partially Approved' | 'Denied';
    submissionDate: string;
    decisionDate: string;
  };
  serviceDetails: ServiceLineItem[];
  financialSummary: {
    totalBilledAmount: number;
    totalAllowedAmount: number;
    totalDeniedAmount: number;
    totalPaidAmount: number;
    memberResponsibility: number;
    planResponsibility: number;
    networkSavings: number;
  };
  denialReasons: DenialReason[];
  appealInformation: {
    appealRights: string;
    appealDeadline: Date;
    appealInstructions: string[];
    appealMethods: string[];
  };
  contactInformation: {
    memberServices: ContactDetails;
    providerRelations: ContactDetails;
    appealsDepartment: ContactDetails;
  };
  legalDisclosures: LegalDisclosure[];
  summaryOfBenefits: {
    deductible: BenefitInfo;
    copay: BenefitInfo;
    coinsurance: BenefitInfo;
    outOfPocketMaximum: BenefitInfo;
  };
  attachments: EOBAttachment[];
}

export interface ServiceLineItem {
  lineNumber: number;
  serviceDate: string;
  procedureCode: string;
  description: string;
  billedAmount: number;
  allowedAmount: number;
  deniedAmount: number;
  memberResponsibility: number;
  planResponsibility: number;
  networkStatus: 'InNetwork' | 'OutOfNetwork';
  providerNotes?: string;
  denialReasons: string[];
}

export interface DenialReason {
  code: string;
  description: string;
  severity: 'Informational' | 'Warning' | 'Error';
  associatedServices: number[];
}

export interface ContactDetails {
  phone: string;
  email: string;
  address: string;
  hours: string;
  website?: string;
}

export interface LegalDisclosure {
  title: string;
  text: string;
  code?: string;
  reference: string;
}

export interface BenefitInfo {
  name: string;
  amount?: number;
  percentage?: number;
  remaining?: number;
  met: boolean;
}

export interface EOBAttachment {
  type: 'medical_record' | 'invoice' | 'explanation' | 'prior_auth' | 'appeal_form';
  name: string;
  description: string;
  available: boolean;
}

export class EOBGenerationService {
  private eobCounter: number = 1000;

  // Generate EOB document
  async generateEOB(request: EOBGenerationRequest): Promise<EOBDocument> {
    try {
      // Get claim and related data
      const claim = await storage.getClaim(request.claimId);
      const member = await storage.getMember(request.memberId);
      const institution = await storage.getMedicalInstitution(claim!.institutionId);
      const company = await storage.getCompany(member!.companyId);

      // Generate unique EOB number
      const eobNumber = this.generateEOBNumber();

      // Build EOB document structure
      const eobDocument: EOBDocument = {
        eobNumber,
        eobDate: new Date(),
        memberInformation: {
          name: `${member!.firstName} ${member!.lastName}`,
          memberID: `MEM-${member!.id.toString().padStart(8, '0')}`,
          dateOfBirth: member!.dateOfBirth,
          groupNumber: `GRP-${company!.id.toString().padStart(6, '0')}`,
          planName: `${company!.name} Health Plan`,
          coverageDates: {
            startDate: '2024-01-01',
            endDate: '2024-12-31'
          },
          employerName: company!.name
        },
        providerInformation: {
          name: institution!.name,
          npiNumber: `NPI-${Math.floor(Math.random() * 1000000000).toString().padStart(10, '0')}`,
          address: institution!.address,
          phone: institution!.contactPhone,
          taxonomy: this.getTaxonomyCode(institution!.type)
        },
        claimInformation: {
          claimNumber: `CLM-${claim!.id.toString().padStart(8, '0')}`,
          serviceDate: new Date(claim!.serviceDate).toISOString().split('T')[0],
          claimStatus: this.mapAdjudicationStatus(request.adjudicationResult.status),
          submissionDate: new Date(claim!.claimDate).toISOString().split('T')[0],
          decisionDate: new Date().toISOString().split('T')[0]
        },
        serviceDetails: await this.buildServiceDetails(request),
        financialSummary: await this.buildFinancialSummary(request),
        denialReasons: await this.buildDenialReasons(request),
        appealInformation: await this.buildAppealInformation(request),
        contactInformation: await this.buildContactInformation(company!, institution!),
        legalDisclosures: await this.buildLegalDisclosures(),
        summaryOfBenefits: await this.buildSummaryOfBenefits(request),
        attachments: await this.buildAttachments(request)
      };

      // Save EOB to database
      await this.saveEOB(eobDocument);

      return eobDocument;

    } catch (error) {
      console.error('Error generating EOB:', error);
      throw error;
    }
  }

  // Generate unique EOB number
  private generateEOBNumber(): string {
    this.eobCounter++;
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `EOB-${timestamp}-${this.eobCounter.toString().padStart(6, '0')}`;
  }

  // Map adjudication status to EOB status
  private mapAdjudicationStatus(status: string): 'Approved' | 'Partially Approved' | 'Denied' {
    switch (status.toUpperCase()) {
      case 'APPROVED':
        return 'Approved';
      case 'PARTIALLY_APPROVED':
        return 'Partially Approved';
      case 'DENIED':
      case 'PENDING_REVIEW':
        return 'Denied';
      default:
        return 'Denied';
    }
  }

  // Build service details section
  private async buildServiceDetails(request: EOBGenerationRequest): Promise<ServiceLineItem[]> {
    const serviceDetails: ServiceLineItem[] = [];
    const { claim, financialCalculations } = request;

    // Get procedure items if available
    const procedureItems = await storage.getClaimProcedureItemsByClaim(request.claimId);

    if (procedureItems.length > 0) {
      // Detailed service line items for procedure-based claims
      for (let i = 0; i < procedureItems.length; i++) {
        const item = procedureItems[i];
        const procedure = await storage.getMedicalProcedure(item.procedureId);

        const serviceLine: ServiceLineItem = {
          lineNumber: i + 1,
          serviceDate: new Date(claim!.serviceDate).toISOString().split('T')[0],
          procedureCode: procedure ? procedure.code : 'UNKNOWN',
          description: procedure ? procedure.name : claim!.description,
          billedAmount: item.totalAmount,
          allowedAmount: item.totalAmount * 0.9, // Simplified calculation
          deniedAmount: item.totalAmount * 0.1,
          memberResponsibility: item.totalAmount * 0.2,
          planResponsibility: item.totalAmount * 0.8,
          networkStatus: 'InNetwork',
          denialReasons: []
        };

        serviceDetails.push(serviceLine);
      }
    } else {
      // Single service line item for simple claims
      const serviceLine: ServiceLineItem = {
        lineNumber: 1,
        serviceDate: new Date(claim!.serviceDate).toISOString().split('T')[0],
        procedureCode: 'UNSPECIFIED',
        description: claim!.description,
        billedAmount: claim!.amount,
        allowedAmount: financialCalculations.calculations.allowedAmount,
        deniedAmount: claim!.amount - financialCalculations.calculations.allowedAmount,
        memberResponsibility: financialCalculations.calculations.memberResponsibility,
        planResponsibility: financialCalculations.calculations.insurerResponsibility,
        networkStatus: 'InNetwork',
        denialReasons: []
      };

      serviceDetails.push(serviceLine);
    }

    return serviceDetails;
  }

  // Build financial summary
  private buildFinancialSummary(request: EOBGenerationRequest): any {
    const { financialCalculations } = request;
    const serviceDetails = await this.buildServiceDetails(request);

    const totalBilledAmount = serviceDetails.reduce((sum, item) => sum + item.billedAmount, 0);
    const totalAllowedAmount = serviceDetails.reduce((sum, item) => sum + item.allowedAmount, 0);
    const totalDeniedAmount = serviceDetails.reduce((sum, item) => sum + item.deniedAmount, 0);
    const totalPaidAmount = serviceDetails.reduce((sum, item) => sum + item.planResponsibility, 0);
    const totalMemberResponsibility = serviceDetails.reduce((sum, item) => sum + item.memberResponsibility, 0);

    return {
      totalBilledAmount,
      totalAllowedAmount,
      totalDeniedAmount,
      totalPaidAmount,
      memberResponsibility: totalMemberResponsibility,
      planResponsibility: totalPaidAmount,
      networkSavings: totalBilledAmount - totalAllowedAmount
    };
  }

  // Build denial reasons
  private async buildDenialReasons(request: EOBGenerationRequest): Promise<DenialReason[]> {
    const denialReasons: DenialReason[] = [];
    const { adjudicationResult, financialCalculations } = request;

    if (adjudicationResult.denialReasons && adjudicationResult.denialReasons.length > 0) {
      adjudicationResult.denialReasons.forEach((reason: string, index: number) => {
        denialReasons.push({
          code: `DEN-${(index + 1).toString().padStart(3, '0')}`,
          description: reason,
          severity: 'Error',
          associatedServices: [1] // Simplified - would map to actual service lines
        });
      });
    }

    // Add financial denial reasons
    if (financialCalculations.calculations.allowedAmount < financialCalculations.calculations.originalAmount) {
      denialReasons.push({
        code: 'FIN-001',
        description: 'Amount exceeds contracted rates',
        severity: 'Warning',
        associatedServices: [1]
      });
    }

    return denialReasons;
  }

  // Build appeal information
  private buildAppealInformation(request: EOBGenerationRequest): any {
    const appealDeadline = new Date();
    appealDeadline.setDate(appealDeadline.getDate() + 30); // 30 days from EOB date

    return {
      appealRights: 'You have the right to appeal any denied claim or portion of a claim.',
      appealDeadline,
      appealInstructions: [
        'Review your EOB carefully to understand why the claim was denied',
        'Gather any additional medical documentation that supports the claim',
        'Submit a written appeal within 30 days of receiving this EOB',
        'Include a letter from your healthcare provider if applicable',
        'Keep copies of all documents for your records'
      ],
      appealMethods: [
        'Online through member portal',
        'Mail to: Appeals Department, [Insurance Company Address]',
        'Fax: [Appeals Fax Number]',
        'Email: appeals@insurancecompany.com'
      ]
    };
  }

  // Build contact information
  private buildContactInformation(company: Company, institution: MedicalInstitution): any {
    return {
      memberServices: {
        phone: '1-800-555-0123',
        email: 'members@insurancecompany.com',
        address: '123 Insurance Way, Suite 100, Insurance City, IC 12345',
        hours: 'Monday-Friday 8am-8pm EST',
        website: 'www.insurancecompany.com'
      },
      providerRelations: {
        phone: '1-800-555-0124',
        email: 'providers@insurancecompany.com',
        address: '123 Insurance Way, Suite 200, Insurance City, IC 12345',
        hours: 'Monday-Friday 9am-6pm EST',
        website: 'providers.insurancecompany.com'
      },
      appealsDepartment: {
        phone: '1-800-555-0125',
        email: 'appeals@insurancecompany.com',
        address: '123 Insurance Way, Suite 300, Insurance City, IC 12345',
        hours: 'Monday-Friday 9am-5pm EST',
        website: 'appeals.insurancecompany.com'
      }
    };
  }

  // Build legal disclosures
  private buildLegalDisclosures(): LegalDisclosure[] {
    return [
      {
        title: 'Notice of Privacy Practices',
        text: 'This notice describes how medical information about you may be used and disclosed and how you can get access to this information.',
        code: 'HIPAA-001',
        reference: '45 CFR 164.520'
      },
      {
        title: 'Your Rights and Responsibilities',
        text: 'You have the right to timely resolution of claims, and the responsibility to provide accurate information.',
        code: 'RIGHTS-001',
        reference: 'Plan Document'
      },
      {
        title: 'Coordination of Benefits',
        text: 'We have coordinated benefits with any other health coverage you may have to determine the primary payer.',
        code: 'COB-001',
        reference: 'COB Regulations'
      }
    ];
  }

  // Build summary of benefits
  private buildSummaryOfBenefits(request: EOBGenerationRequest): any {
    return {
      deductible: {
        name: 'Annual Deductible',
        amount: 1000,
        remaining: 500,
        met: false
      },
      copay: {
        name: 'Office Visit Copay',
        amount: 20,
        met: false
      },
      coinsurance: {
        name: 'Coinsurance',
        percentage: 20,
        remaining: 'Not applicable'
      },
      outOfPocketMaximum: {
        name: 'Out-of-Pocket Maximum',
        amount: 5000,
        remaining: 3500,
        met: false
      }
    };
  }

  // Build attachments
  private async buildAttachments(request: EOBGenerationRequest): Promise<EOBAttachment[]> {
    return [
      {
        type: 'explanation',
        name: 'EOB Explanation Document',
        description: 'Detailed explanation of benefits and claim processing',
        available: true
      },
      {
        type: 'appeal_form',
        name: 'Appeal Request Form',
        description: 'Form to request an appeal of denied services',
        available: true
      },
      {
        type: 'medical_record',
        name: 'Medical Documentation',
        description: 'Medical records related to this claim',
        available: false // Would check if actually available
      }
    ];
  }

  // Get taxonomy code for provider type
  private getTaxonomyCode(providerType: string): string {
    const taxonomyCodes: { [key: string]: string } = {
      'hospital': '282N00000X',
      'clinic': '261QP2000X',
      'laboratory': '291U00000X',
      'imaging': '2085R0001X',
      'pharmacy': '3336C0003X',
      'specialist': '174400000X',
      'general': '208D00000X'
    };

    return taxonomyCodes[providerType.toLowerCase()] || '208D00000X';
  }

  // Save EOB to database
  private async saveEOB(eobDocument: EOBDocument): Promise<void> {
    try {
      await storage.createExplanationOfBenefits({
        claimId: 0, // Will be set by actual claim ID
        memberId: 0, // Will be set by actual member ID
        eobDate: eobDocument.eobDate,
        eobNumber: eobDocument.eobNumber,
        totalBilledAmount: eobDocument.financialSummary.totalBilledAmount,
        totalAllowedAmount: eobDocument.financialSummary.totalAllowedAmount,
        totalPaidAmount: eobDocument.financialSummary.totalPaidAmount,
        memberResponsibility: eobDocument.financialSummary.memberResponsibility,
        planResponsibility: eobDocument.financialSummary.planResponsibility,
        serviceDetails: JSON.stringify(eobDocument.serviceDetails),
        denialReasons: JSON.stringify(eobDocument.denialReasons),
        appealInformation: JSON.stringify(eobDocument.appealInformation),
        status: 'GENERATED'
      });
    } catch (error) {
      console.error('Error saving EOB:', error);
    }
  }

  // Send EOB to member
  async sendEOBToMember(eobId: number, deliveryMethod: 'email' | 'mail' | 'portal'): Promise<boolean> {
    try {
      const eob = await storage.getExplanationOfBenefits(eobId);
      if (!eob) {
        throw new Error(`EOB with ID ${eobId} not found`);
      }

      // In a real implementation, this would:
      // 1. Generate PDF version
      // 2. Send via email, mail, or make available in portal
      // 3. Track delivery status
      // 4. Update EOB status

      // Simplified implementation
      console.log(`Sending EOB ${eob.eobNumber} via ${deliveryMethod}`);

      // Update EOB status
      // Note: Would need update method in storage
      console.log(`EOB ${eob.eobNumber} sent successfully`);

      return true;

    } catch (error) {
      console.error('Error sending EOB to member:', error);
      return false;
    }
  }

  // Generate EOB in specified format
  async generateEOBFormat(eobDocument: EOBDocument, format: 'html' | 'pdf' | 'plain'): Promise<string> {
    switch (format) {
      case 'html':
        return this.generateHTMLFormat(eobDocument);
      case 'pdf':
        return this.generatePDFFormat(eobDocument);
      case 'plain':
        return this.generatePlainTextFormat(eobDocument);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  // Generate HTML format
  private generateHTMLFormat(eobDocument: EOBDocument): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Explanation of Benefits - ${eobDocument.eobNumber}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 20px; }
        .service-line { margin-bottom: 10px; }
        .denial { color: #d32f2f; }
        .total { font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Explanation of Benefits</h1>
        <h2>EOB Number: ${eobDocument.eobNumber}</h2>
        <p>Generated: ${eobDocument.eobDate.toLocaleDateString()}</p>
    </div>

    <div class="section">
        <h3>Member Information</h3>
        <p><strong>Name:</strong> ${eobDocument.memberInformation.name}</p>
        <p><strong>Member ID:</strong> ${eobDocument.memberInformation.memberID}</p>
        <p><strong>Date of Birth:</strong> ${eobDocument.memberInformation.dateOfBirth}</p>
        <p><strong>Plan:</strong> ${eobDocument.memberInformation.planName}</p>
        <p><strong>Employer:</strong> ${eobDocument.memberInformation.employerName}</p>
    </div>

    <div class="section">
        <h3>Provider Information</h3>
        <p><strong>Name:</strong> ${eobDocument.providerInformation.name}</p>
        <p><strong>NPI:</strong> ${eobDocument.providerInformation.npiNumber}</p>
        <p><strong>Address:</strong> ${eobDocument.providerInformation.address}</p>
        <p><strong>Phone:</strong> ${eobDocument.providerInformation.phone}</p>
    </div>

    <div class="section">
        <h3>Claim Information</h3>
        <p><strong>Claim Number:</strong> ${eobDocument.claimInformation.claimNumber}</p>
        <p><strong>Service Date:</strong> ${eobDocument.claimInformation.serviceDate}</p>
        <p><strong>Status:</strong> ${eobDocument.claimInformation.claimStatus}</p>
    </div>

    <div class="section">
        <h3>Service Details</h3>
        ${eobDocument.serviceDetails.map(service => `
            <div class="service-line">
                <p><strong>Service:</strong> ${service.description}</p>
                <p><strong>Billed Amount:</strong> $${service.billedAmount.toFixed(2)}</p>
                <p><strong>Allowed Amount:</strong> $${service.allowedAmount.toFixed(2)}</p>
                <p><strong>Member Responsibility:</strong> $${service.memberResponsibility.toFixed(2)}</p>
                <p><strong>Plan Responsibility:</strong> $${service.planResponsibility.toFixed(2)}</p>
            </div>
        `).join('')}
    </div>

    <div class="section">
        <h3>Financial Summary</h3>
        <p><strong>Total Billed:</strong> $${eobDocument.financialSummary.totalBilledAmount.toFixed(2)}</p>
        <p><strong>Total Allowed:</strong> $${eobDocument.financialSummary.totalAllowedAmount.toFixed(2)}</p>
        <p><strong>Total Paid by Plan:</strong> $${eobDocument.financialSummary.totalPaidAmount.toFixed(2)}</p>
        <p><strong>Your Responsibility:</strong> $${eobDocument.financialSummary.memberResponsibility.toFixed(2)}</p>
        <p><strong>Network Savings:</strong> $${eobDocument.financialSummary.networkSavings.toFixed(2)}</p>
    </div>

    ${eobDocument.denialReasons.length > 0 ? `
    <div class="section">
        <h3>Denial Reasons</h3>
        ${eobDocument.denialReasons.map(reason => `
            <div class="denial">
                <p><strong>${reason.code}:</strong> ${reason.description}</p>
            </div>
        `).join('')}
    </div>
    ` : ''}

    <div class="section">
        <h3>Appeal Information</h3>
        <p><strong>Your Rights:</strong> ${eobDocument.appealInformation.appealRights}</p>
        <p><strong>Appeal Deadline:</strong> ${eobDocument.appealInformation.appealDeadline.toLocaleDateString()}</p>
        <p><strong>Instructions:</strong> ${eobDocument.appealInformation.appealInstructions.join(', ')}</p>
    </div>
</body>
</html>
    `;
  }

  // Generate PDF format (simplified - would use PDF library in real implementation)
  private generatePDFFormat(eobDocument: EOBDocument): string {
    return `PDF generation for EOB ${eobDocument.eobNumber} (PDF library would be used here)`;
  }

  // Generate plain text format
  private generatePlainTextFormat(eobDocument: EOBDocument): string {
    return `
EXPLANATION OF BENEFITS - ${eobDocument.eobNumber}
Generated: ${eobDocument.eobDate.toLocaleDateString()}
================================================================

MEMBER INFORMATION
Name: ${eobDocument.memberInformation.name}
Member ID: ${eobDocument.memberInformation.memberID}
Date of Birth: ${eobDocument.memberInformation.dateOfBirth}
Plan: ${eobDocument.memberInformation.planName}
Employer: ${eobDocument.memberInformation.employerName}

PROVIDER INFORMATION
Name: ${eobDocument.providerInformation.name}
NPI: ${eobDocument.providerInformation.npiNumber}
Address: ${eobDocument.providerInformation.address}
Phone: ${eobDocument.providerInformation.phone}

CLAIM INFORMATION
Claim Number: ${eobDocument.claimInformation.claimNumber}
Service Date: ${eobDocument.claimInformation.serviceDate}
Status: ${eobDocument.claimInformation.claimStatus}

SERVICE DETAILS
${eobDocument.serviceDetails.map((service, index) => `
${index + 1}. ${service.description}
   Billed Amount: $${service.billedAmount.toFixed(2)}
   Allowed Amount: $${service.allowedAmount.toFixed(2)}
   Member Responsibility: $${service.memberResponsibility.toFixed(2)}
   Plan Responsibility: $${service.planResponsibility.toFixed(2)}
`).join('\n')}

FINANCIAL SUMMARY
Total Billed: $${eobDocument.financialSummary.totalBilledAmount.toFixed(2)}
Total Allowed: $${eobDocument.financialSummary.totalAllowedAmount.toFixed(2)}
Total Paid by Plan: $${eobDocument.financialSummary.totalPaidAmount.toFixed(2)}
Your Responsibility: $${eobDocument.financialSummary.memberResponsibility.toFixed(2)}
Network Savings: $${eobDocument.financialSummary.networkSavings.toFixed(2)}

${eobDocument.denialReasons.length > 0 ? `
DENIAL REASONS
${eobDocument.denialReasons.map(reason => `${reason.code}: ${reason.description}`).join('\n')}
` : ''}

APPEAL INFORMATION
Your Rights: ${eobDocument.appealInformation.appealRights}
Appeal Deadline: ${eobDocument.appealInformation.appealDeadline.toLocaleDateString()}
Instructions: ${eobDocument.appealInformation.appealInstructions.join(', ')}
    `;
  }
}

export const eobGenerationService = new EOBGenerationService();