import { Router } from 'express';
import { complianceService } from '../services/complianceService';
import { contractService } from '../services/contractService';
import { storage } from '../storage';

const router = Router();

// ============================================================================
// COMPLIANCE ENDPOINTS
// ============================================================================

/**
 * Get compliance checks
 * GET /api/compliance/checks
 */
router.get('/api/compliance/checks', async (req, res) => {
  try {
    const {
      entityType,
      entityId,
      status,
      limit = 50,
      offset = 0
    } = req.query;

    const checks = await complianceService.getComplianceChecks({
      entityType: entityType as string,
      entityId: entityId ? Number(entityId) : undefined,
      status: status as string,
      limit: Number(limit),
      offset: Number(offset)
    });

    res.json({
      success: true,
      ...checks
    });

  } catch (error) {
    console.error('Error fetching compliance checks:', error);
    res.status(500).json({ error: "Failed to fetch compliance checks" });
  }
});

/**
 * Run compliance check
 * POST /api/compliance/checks
 */
router.post('/api/compliance/checks', async (req, res) => {
  try {
    const {
      entityType,
      entityId,
      checkType,
      parameters
    } = req.body;

    if (!entityType || !entityId || !checkType) {
      return res.status(400).json({
        error: "entityType, entityId, and checkType are required"
      });
    }

    const result = await complianceService.runComplianceCheck({
      entityType,
      entityId: Number(entityId),
      checkType,
      parameters
    });

    res.status(201).json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Error running compliance check:', error);
    res.status(500).json({ error: "Failed to run compliance check" });
  }
});

/**
 * Get check results
 * GET /api/compliance/checks/:checkId
 */
router.get('/api/compliance/checks/:checkId', async (req, res) => {
  try {
    const { checkId } = req.params;

    const check = await complianceService.getCheckResults(Number(checkId));

    if (!check) {
      return res.status(404).json({ error: "Compliance check not found" });
    }

    res.json({
      success: true,
      check
    });

  } catch (error) {
    console.error('Error fetching check results:', error);
    res.status(500).json({ error: "Failed to fetch check results" });
  }
});

/**
 * Generate compliance report
 * GET /api/compliance/report
 */
router.get('/api/compliance/report', async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      reportType = 'summary'
    } = req.query;

    const report = await complianceService.generateComplianceReport({
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      reportType: reportType as string
    });

    res.json({
      success: true,
      report
    });

  } catch (error) {
    console.error('Error generating compliance report:', error);
    res.status(500).json({ error: "Failed to generate compliance report" });
  }
});

/**
 * Run compliance audit
 * POST /api/compliance/audit
 */
router.post('/api/compliance/audit', async (req, res) => {
  try {
    const {
      auditType,
      scope,
      depth = 'standard'
    } = req.body;

    if (!auditType || !scope) {
      return res.status(400).json({
        error: "auditType and scope are required"
      });
    }

    const audit = await complianceService.runComplianceAudit({
      auditType,
      scope,
      depth
    });

    res.status(201).json({
      success: true,
      audit
    });

  } catch (error) {
    console.error('Error running compliance audit:', error);
    res.status(500).json({ error: "Failed to run compliance audit" });
  }
});

// ============================================================================
// CONTRACT ENDPOINTS
// ============================================================================

/**
 * Get all contracts
 * GET /api/contracts
 */
router.get('/api/contracts', async (req, res) => {
  try {
    const {
      companyId,
      memberId,
      status,
      type,
      limit = 50,
      offset = 0
    } = req.query;

    const contracts = await contractService.getContracts({
      companyId: companyId ? Number(companyId) : undefined,
      memberId: memberId ? Number(memberId) : undefined,
      status: status as string,
      type: type as string,
      limit: Number(limit),
      offset: Number(offset)
    });

    res.json({
      success: true,
      ...contracts
    });

  } catch (error) {
    console.error('Error fetching contracts:', error);
    res.status(500).json({ error: "Failed to fetch contracts" });
  }
});

/**
 * Create contract
 * POST /api/contracts
 */
router.post('/api/contracts', async (req, res) => {
  try {
    const {
      companyId,
      memberId,
      type,
      startDate,
      endDate,
      terms,
      status = 'draft'
    } = req.body;

    if (!type || !startDate || !terms) {
      return res.status(400).json({
        error: "type, startDate, and terms are required"
      });
    }

    const contract = await contractService.createContract({
      companyId: companyId ? Number(companyId) : undefined,
      memberId: memberId ? Number(memberId) : undefined,
      type,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      terms,
      status
    });

    res.status(201).json({
      success: true,
      contract
    });

  } catch (error) {
    console.error('Error creating contract:', error);
    res.status(500).json({ error: "Failed to create contract" });
  }
});

/**
 * Get contract details
 * GET /api/contracts/:contractId
 */
router.get('/api/contracts/:contractId', async (req, res) => {
  try {
    const { contractId } = req.params;

    const contract = await contractService.getContract(Number(contractId));

    if (!contract) {
      return res.status(404).json({ error: "Contract not found" });
    }

    res.json({
      success: true,
      contract
    });

  } catch (error) {
    console.error('Error fetching contract:', error);
    res.status(500).json({ error: "Failed to fetch contract" });
  }
});

/**
 * Update contract
 * PUT /api/contracts/:contractId
 */
router.put('/api/contracts/:contractId', async (req, res) => {
  try {
    const { contractId } = req.params;
    const updates = req.body;

    const contract = await contractService.updateContract(
      Number(contractId),
      updates
    );

    res.json({
      success: true,
      contract
    });

  } catch (error) {
    console.error('Error updating contract:', error);
    res.status(500).json({ error: "Failed to update contract" });
  }
});

/**
 * Delete contract
 * DELETE /api/contracts/:contractId
 */
router.delete('/api/contracts/:contractId', async (req, res) => {
  try {
    const { contractId } = req.params;
    const { reason } = req.body;

    await contractService.deleteContract(
      Number(contractId),
      reason
    );

    res.json({
      success: true,
      message: "Contract deleted successfully"
    });

  } catch (error) {
    console.error('Error deleting contract:', error);
    res.status(500).json({ error: "Failed to delete contract" });
  }
});

/**
 * Terminate contract
 * POST /api/contracts/:contractId/terminate
 */
router.post('/api/contracts/:contractId/terminate', async (req, res) => {
  try {
    const { contractId } = req.params;
    const { terminationDate, reason, terminatedBy } = req.body;

    const result = await contractService.terminateContract(
      Number(contractId),
      {
        terminationDate: terminationDate ? new Date(terminationDate) : new Date(),
        reason,
        terminatedBy
      }
    );

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Error terminating contract:', error);
    res.status(500).json({ error: "Failed to terminate contract" });
  }
});

/**
 * Get expiring contracts
 * GET /api/contracts/expiring
 */
router.get('/api/contracts/expiring', async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const contracts = await contractService.getExpiringContracts({
      days: Number(days)
    });

    res.json({
      success: true,
      contracts,
      count: contracts.length
    });

  } catch (error) {
    console.error('Error fetching expiring contracts:', error);
    res.status(500).json({ error: "Failed to fetch expiring contracts" });
  }
});

export default router;
