import { Router } from 'express';
import { fraudDetectionEngine } from '../services/fraudDetectionEngine';
import { medicalNecessityValidator } from '../services/medicalNecessityValidator';
import { storage } from '../storage';

const router = Router();

// ============================================================================
// FRAUD DETECTION ENDPOINTS
// ============================================================================

/**
 * Run fraud detection
 * POST /api/fraud/detect
 */
router.post('/api/fraud/detect', async (req, res) => {
  try {
    const {
      claimId,
      detectionLevel = 'standard',
      includeHistoricalAnalysis = true
    } = req.body;

    if (!claimId) {
      return res.status(400).json({ error: "claimId is required" });
    }

    const detection = await fraudDetectionEngine.analyzeClaim({
      claimId: Number(claimId),
      detectionLevel,
      includeHistoricalAnalysis
    });

    res.json({
      success: true,
      detection
    });

  } catch (error) {
    console.error('Error running fraud detection:', error);
    res.status(500).json({ error: "Failed to run fraud detection" });
  }
});

/**
 * Get fraud analysis
 * GET /api/fraud/analysis/:claimId
 */
router.get('/api/fraud/analysis/:claimId', async (req, res) => {
  try {
    const { claimId } = req.params;

    const analysis = await fraudDetectionEngine.getClaimAnalysis(Number(claimId));

    if (!analysis) {
      return res.status(404).json({ error: "Fraud analysis not found" });
    }

    res.json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('Error fetching fraud analysis:', error);
    res.status(500).json({ error: "Failed to fetch fraud analysis" });
  }
});

/**
 * Get fraud alerts
 * GET /api/fraud/alerts
 */
router.get('/api/fraud/alerts', async (req, res) => {
  try {
    const {
      riskLevel,
      status,
      limit = 50,
      offset = 0
    } = req.query;

    const alerts = await fraudDetectionEngine.getFraudAlerts({
      riskLevel: riskLevel as string,
      status: status as string,
      limit: Number(limit),
      offset: Number(offset)
    });

    const filtered = alerts.filter(alert => {
      if (riskLevel && alert.riskLevel !== riskLevel) return false;
      if (status && alert.status !== status) return false;
      return true;
    });

    res.json({
      success: true,
      alerts: filtered.slice(0, Number(limit)),
      count: filtered.length
    });

  } catch (error) {
    console.error('Error fetching fraud alerts:', error);
    res.status(500).json({ error: "Failed to fetch fraud alerts" });
  }
});

/**
 * Start investigation
 * POST /api/fraud/alerts/:alertId/investigate
 */
router.post('/api/fraud/alerts/:alertId/investigate', async (req, res) => {
  try {
    const { alertId } = req.params;
    const { assignedTo, priority } = req.body;

    const investigation = await fraudDetectionEngine.initiateInvestigation(
      Number(alertId),
      {
        assignedTo,
        priority: priority || 'medium'
      }
    );

    res.json({
      success: true,
      investigation
    });

  } catch (error) {
    console.error('Error starting investigation:', error);
    res.status(500).json({ error: "Failed to start investigation" });
  }
});

/**
 * Get fraud detection rules
 * GET /api/fraud/rules
 */
router.get('/api/fraud/rules', async (req, res) => {
  try {
    const { category, isActive } = req.query;

    const rules = await fraudDetectionEngine.getDetectionRules({
      category: category as string,
      isActive: isActive === 'true' ? true : undefined
    });

    res.json({
      success: true,
      rules,
      count: rules.length
    });

  } catch (error) {
    console.error('Error fetching fraud rules:', error);
    res.status(500).json({ error: "Failed to fetch fraud rules" });
  }
});

/**
 * Create fraud rule
 * POST /api/fraud/rules
 */
router.post('/api/fraud/rules', async (req, res) => {
  try {
    const {
      name,
      category,
      condition,
      riskScore,
      isActive = true
    } = req.body;

    if (!name || !category || !condition || !riskScore) {
      return res.status(400).json({
        error: "name, category, condition, and riskScore are required"
      });
    }

    const rule = await fraudDetectionEngine.createDetectionRule({
      name,
      category,
      condition,
      riskScore: Number(riskScore),
      isActive
    });

    res.status(201).json({
      success: true,
      rule
    });

  } catch (error) {
    console.error('Error creating fraud rule:', error);
    res.status(500).json({ error: "Failed to create fraud rule" });
  }
});

// ============================================================================
// MEDICAL NECESSITY VALIDATION ENDPOINTS
// ============================================================================

/**
 * Validate medical necessity
 * POST /api/fraud/medical-necessity/validate
 */
router.post('/api/fraud/medical-necessity/validate', async (req, res) => {
  try {
    const {
      claimId,
      diagnosisCode,
      procedureCodes,
      memberInfo,
      serviceInfo
    } = req.body;

    if (!claimId || !diagnosisCode || !procedureCodes) {
      return res.status(400).json({
        error: "claimId, diagnosisCode, and procedureCodes are required"
      });
    }

    const validation = await medicalNecessityValidator.validateMedicalNecessity({
      claimId: Number(claimId),
      diagnosisCode,
      procedureCodes,
      memberInfo,
      serviceInfo: {
        serviceDate: serviceInfo?.serviceDate ? new Date(serviceInfo.serviceDate) : new Date(),
        providerType: serviceInfo?.providerType,
        setting: serviceInfo?.setting,
        urgency: serviceInfo?.urgency
      }
    });

    res.json({
      success: true,
      validation
    });

  } catch (error) {
    console.error('Error validating medical necessity:', error);
    res.status(500).json({ error: "Failed to validate medical necessity" });
  }
});

/**
 * Get validation results
 * GET /api/fraud/medical-necessity/:claimId
 */
router.get('/api/fraud/medical-necessity/:claimId', async (req, res) => {
  try {
    const { claimId } = req.params;

    const validation = await medicalNecessityValidator.getValidationResults(
      Number(claimId)
    );

    if (!validation) {
      return res.status(404).json({ error: "Validation not found" });
    }

    res.json({
      success: true,
      validation
    });

  } catch (error) {
    console.error('Error fetching validation results:', error);
    res.status(500).json({ error: "Failed to fetch validation results" });
  }
});

/**
 * Create validation rule
 * POST /api/fraud/medical-necessity/rules
 */
router.post('/api/fraud/medical-necessity/rules', async (req, res) => {
  try {
    const {
      name,
      diagnosisCode,
      requiredCriteria,
      frequencyLimits,
      isActive = true
    } = req.body;

    if (!name || !diagnosisCode || !requiredCriteria) {
      return res.status(400).json({
        error: "name, diagnosisCode, and requiredCriteria are required"
      });
    }

    const rule = await medicalNecessityValidator.createValidationRule({
      name,
      diagnosisCode,
      requiredCriteria,
      frequencyLimits,
      isActive
    });

    res.status(201).json({
      success: true,
      rule
    });

  } catch (error) {
    console.error('Error creating validation rule:', error);
    res.status(500).json({ error: "Failed to create validation rule" });
  }
});

/**
 * Get validation rules
 * GET /api/fraud/medical-necessity/rules
 */
router.get('/api/fraud/medical-necessity/rules', async (req, res) => {
  try {
    const { diagnosisCode, isActive } = req.query;

    const rules = await medicalNecessityValidator.getValidationRules({
      diagnosisCode: diagnosisCode as string,
      isActive: isActive === 'true' ? true : undefined
    });

    res.json({
      success: true,
      rules,
      count: rules.length
    });

  } catch (error) {
    console.error('Error fetching validation rules:', error);
    res.status(500).json({ error: "Failed to fetch validation rules" });
  }
});

export default router;
