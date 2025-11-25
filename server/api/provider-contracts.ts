import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import {
  providerContracts,
  contractDocuments,
  contractSignatures,
  medicalInstitutions,
  users,
  insertProviderContractSchema,
  insertContractDocumentSchema,
  insertContractSignatureSchema
} from '../shared/schema';
import { contractService } from '../services/contractService';

const router = Router();

// GET /api/provider-contracts - List all provider contracts
router.get('/', async (req, res) => {
  try {
    const { institutionId, status, contractType, page = 1, limit = 20 } = req.query;

    let query = db.select({
      id: providerContracts.id,
      institutionId: providerContracts.institutionId,
      contractNumber: providerContracts.contractNumber,
      contractName: providerContracts.contractName,
      contractType: providerContracts.contractType,
      status: providerContracts.status,
      reimbursementModel: providerContracts.reimbursementModel,
      effectiveDate: providerContracts.effectiveDate,
      expiryDate: providerContracts.expiryDate,
      contractValue: providerContracts.contractValue,
      billingCycle: providerContracts.billingCycle,
      createdAt: providerContracts.createdAt,
      updatedAt: providerContracts.updatedAt,
      // Institution details
      institutionName: medicalInstitutions.name,
      institutionType: medicalInstitutions.type,
      institutionContactEmail: medicalInstitutions.contactEmail
    })
      .from(providerContracts)
      .leftJoin(medicalInstitutions, providerContracts.institutionId.eq(medicalInstitutions.id));

    // Apply filters
    const conditions = [];
    if (institutionId) {
      conditions.push(providerContracts.institutionId.eq(parseInt(institutionId as string)));
    }
    if (status) {
      conditions.push(providerContracts.status.eq(status as string));
    }
    if (contractType) {
      conditions.push(providerContracts.contractType.eq(contractType as string));
    }

    if (conditions.length > 0) {
      query = query.where(conditions.reduce((acc, condition) => acc.and(condition)));
    }

    const contracts = await query
      .orderBy(providerContracts.createdAt.desc())
      .limit(parseInt(limit as string))
      .offset((parseInt(page as string) - 1) * parseInt(limit as string));

    // Get total count for pagination
    const totalCountQuery = db.select({ count: providerContracts.id })
      .from(providerContracts);

    const totalCount = await totalCountQuery;

    res.json({
      success: true,
      data: contracts,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: totalCount.length,
        pages: Math.ceil(totalCount.length / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Error fetching provider contracts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch provider contracts'
    });
  }
});

// POST /api/provider-contracts - Create new provider contract
router.post('/', async (req, res) => {
  try {
    const validatedData = insertProviderContractSchema.parse(req.body);

    // Generate unique contract number if not provided
    if (!validatedData.contractNumber) {
      validatedData.contractNumber = await contractService.generateContractNumber();
    }

    // Validate institution exists
    const [institution] = await db.select()
      .from(medicalInstitutions)
      .where(medicalInstitutions.id.eq(validatedData.institutionId));

    if (!institution) {
      return res.status(400).json({
        success: false,
        error: 'Institution not found'
      });
    }

    const [newContract] = await db.insert(providerContracts)
      .values(validatedData)
      .returning();

    res.status(201).json({ success: true, data: newContract });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Error creating provider contract:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create provider contract'
    });
  }
});

// GET /api/provider-contracts/:id - Get specific contract details
router.get('/:id', async (req, res) => {
  try {
    const contractId = parseInt(req.params.id);

    if (isNaN(contractId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid contract ID'
      });
    }

    const [contract] = await db.select({
      id: providerContracts.id,
      institutionId: providerContracts.institutionId,
      contractNumber: providerContracts.contractNumber,
      contractName: providerContracts.contractName,
      contractType: providerContracts.contractType,
      status: providerContracts.status,
      reimbursementModel: providerContracts.reimbursementModel,
      effectiveDate: providerContracts.effectiveDate,
      expiryDate: providerContracts.expiryDate,
      autoRenewal: providerContracts.autoRenewal,
      renewalTermMonths: providerContracts.renewalTermMonths,
      terminationDays: providerContracts.terminationDays,
      negotiatedDiscount: providerContracts.negotiatedDiscount,
      capitationRate: providerContracts.capitationRate,
      packageDealDetails: providerContracts.packageDealDetails,
      preAuthorizationRequirements: providerContracts.preAuthorizationRequirements,
      qualityMetrics: providerContracts.qualityMetrics,
      utilizationLimits: providerContracts.utilizationLimits,
      complianceRequirements: providerContracts.complianceRequirements,
      contractValue: providerContracts.contractValue,
      billingCycle: providerContracts.billingCycle,
      paymentTerms: providerContracts.paymentTerms,
      specialTerms: providerContracts.specialTerms,
      internalNotes: providerContracts.internalNotes,
      createdAt: providerContracts.createdAt,
      updatedAt: providerContracts.updatedAt,
      // Institution details
      institutionName: medicalInstitutions.name,
      institutionType: medicalInstitutions.type,
      institutionAddress: medicalInstitutions.address,
      institutionContactPerson: medicalInstitutions.contactPerson,
      institutionContactEmail: medicalInstitutions.contactEmail,
      institutionContactPhone: medicalInstitutions.contactPhone
    })
      .from(providerContracts)
      .leftJoin(medicalInstitutions, providerContracts.institutionId.eq(medicalInstitutions.id))
      .where(providerContracts.id.eq(contractId));

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Provider contract not found'
      });
    }

    res.json({ success: true, data: contract });
  } catch (error) {
    console.error('Error fetching provider contract:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch provider contract'
    });
  }
});

// PUT /api/provider-contracts/:id - Update provider contract
router.put('/:id', async (req, res) => {
  try {
    const contractId = parseInt(req.params.id);

    if (isNaN(contractId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid contract ID'
      });
    }

    const validatedData = insertProviderContractSchema.partial().parse(req.body);
    validatedData.updatedAt = new Date();

    const [updatedContract] = await db.update(providerContracts)
      .set(validatedData)
      .where(providerContracts.id.eq(contractId))
      .returning();

    if (!updatedContract) {
      return res.status(404).json({
        success: false,
        error: 'Provider contract not found'
      });
    }

    res.json({ success: true, data: updatedContract });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Error updating provider contract:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update provider contract'
    });
  }
});

// DELETE /api/provider-contracts/:id - Delete provider contract
router.delete('/:id', async (req, res) => {
  try {
    const contractId = parseInt(req.params.id);

    if (isNaN(contractId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid contract ID'
      });
    }

    // Check if contract has associated documents or signatures
    const [documentCount] = await db.select({ count: contractDocuments.id })
      .from(contractDocuments)
      .where(contractDocuments.contractId.eq(contractId));

    if (documentCount) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete contract with associated documents'
      });
    }

    const [deletedContract] = await db.delete(providerContracts)
      .where(providerContracts.id.eq(contractId))
      .returning();

    if (!deletedContract) {
      return res.status(404).json({
        success: false,
        error: 'Provider contract not found'
      });
    }

    res.json({ success: true, data: deletedContract });
  } catch (error) {
    console.error('Error deleting provider contract:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete provider contract'
    });
  }
});

// GET /api/provider-contracts/:id/documents - List contract documents
router.get('/:id/documents', async (req, res) => {
  try {
    const contractId = parseInt(req.params.id);

    if (isNaN(contractId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid contract ID'
      });
    }

    const documents = await db.select({
      id: contractDocuments.id,
      documentType: contractDocuments.documentType,
      documentName: contractDocuments.documentName,
      originalFileName: contractDocuments.originalFileName,
      fileSize: contractDocuments.fileSize,
      mimeType: contractDocuments.mimeType,
      version: contractDocuments.version,
      isActive: contractDocuments.isActive,
      uploadDate: contractDocuments.uploadDate,
      expiryDate: contractDocuments.expiryDate,
      required: contractDocuments.required,
      documentStatus: contractDocuments.documentStatus,
      approvedDate: contractDocuments.approvedDate,
      uploadedBy: users.email,
      approvedBy: users.email.as('approvedByEmail')
    })
      .from(contractDocuments)
      .leftJoin(users, contractDocuments.uploadedBy.eq(users.id))
      .leftJoin(users.as('approvedBy'), contractDocuments.approvedBy.eq(users.as('approvedBy').id))
      .where(contractDocuments.contractId.eq(contractId))
      .orderBy(contractDocuments.uploadDate.desc());

    res.json({ success: true, data: documents });
  } catch (error) {
    console.error('Error fetching contract documents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contract documents'
    });
  }
});

// POST /api/provider-contracts/:id/documents - Upload contract document
router.post('/:id/documents', async (req, res) => {
  try {
    const contractId = parseInt(req.params.id);

    if (isNaN(contractId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid contract ID'
      });
    }

    const documentData = {
      contractId,
      ...req.body
    };

    const validatedData = insertContractDocumentSchema.parse(documentData);

    // Process file upload and generate hash
    if (req.file) {
      // File processing would be handled here
      // For now, using the provided file data
    }

    const [newDocument] = await db.insert(contractDocuments)
      .values(validatedData)
      .returning();

    res.status(201).json({ success: true, data: newDocument });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Error uploading contract document:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload contract document'
    });
  }
});

// GET /api/provider-contracts/:id/signatures - List contract signatures
router.get('/:id/signatures', async (req, res) => {
  try {
    const contractId = parseInt(req.params.id);

    if (isNaN(contractId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid contract ID'
      });
    }

    const signatures = await db.select({
      id: contractSignatures.id,
      signerType: contractSignatures.signerType,
      signerName: contractSignatures.signerName,
      signerTitle: contractSignatures.signerTitle,
      signerEmail: contractSignatures.signerEmail,
      signatureDate: contractSignatures.signatureDate,
      signatureMethod: contractSignatures.signatureMethod,
      verificationStatus: contractSignatures.verificationStatus,
      verifiedDate: contractSignatures.verifiedDate,
      documentId: contractSignatures.documentId
    })
      .from(contractSignatures)
      .where(contractSignatures.contractId.eq(contractId))
      .orderBy(contractSignatures.signatureDate.desc());

    res.json({ success: true, data: signatures });
  } catch (error) {
    console.error('Error fetching contract signatures:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contract signatures'
    });
  }
});

// POST /api/provider-contracts/:id/signatures - Add contract signature
router.post('/:id/signatures', async (req, res) => {
  try {
    const contractId = parseInt(req.params.id);

    if (isNaN(contractId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid contract ID'
      });
    }

    const signatureData = {
      contractId,
      ...req.body
    };

    const validatedData = insertContractSignatureSchema.parse(signatureData);

    const [newSignature] = await db.insert(contractSignatures)
      .values(validatedData)
      .returning();

    res.status(201).json({ success: true, data: newSignature });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Error adding contract signature:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add contract signature'
    });
  }
});

// POST /api/provider-contracts/:id/activate - Activate contract
router.post('/:id/activate', async (req, res) => {
  try {
    const contractId = parseInt(req.params.id);

    if (isNaN(contractId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid contract ID'
      });
    }

    // Validate contract can be activated
    const [contract] = await db.select()
      .from(providerContracts)
      .where(providerContracts.id.eq(contractId));

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contract not found'
      });
    }

    if (contract.status === 'active') {
      return res.status(400).json({
        success: false,
        error: 'Contract is already active'
      });
    }

    // Check if effective date is in the past or today
    const now = new Date();
    const effectiveDate = new Date(contract.effectiveDate);
    if (effectiveDate > now) {
      return res.status(400).json({
        success: false,
        error: 'Contract effective date is in the future'
      });
    }

    const [activatedContract] = await db.update(providerContracts)
      .set({
        status: 'active',
        updatedAt: new Date()
      })
      .where(providerContracts.id.eq(contractId))
      .returning();

    res.json({ success: true, data: activatedContract });
  } catch (error) {
    console.error('Error activating contract:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to activate contract'
    });
  }
});

// POST /api/provider-contracts/:id/terminate - Terminate contract
router.post('/:id/terminate', async (req, res) => {
  try {
    const contractId = parseInt(req.params.id);
    const { terminationReason, effectiveDate } = req.body;

    if (isNaN(contractId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid contract ID'
      });
    }

    const [terminatedContract] = await db.update(providerContracts)
      .set({
        status: 'terminated',
        updatedAt: new Date(),
        // Store termination reason in specialTerms if not available elsewhere
        specialTerms: terminationReason || 'Contract terminated'
      })
      .where(providerContracts.id.eq(contractId))
      .returning();

    if (!terminatedContract) {
      return res.status(404).json({
        success: false,
        error: 'Contract not found'
      });
    }

    res.json({ success: true, data: terminatedContract });
  } catch (error) {
    console.error('Error terminating contract:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to terminate contract'
    });
  }
});

export default router;