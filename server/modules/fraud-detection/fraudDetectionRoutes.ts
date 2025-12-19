import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth";
import { fraudDetectionService } from "./fraudDetectionService";
import { z } from "zod";

const router = Router();

// Validation schemas
const analyzeClaimSchema = z.object({
  claimId: z.number().optional(),
  memberId: z.number(),
  providerId: z.number().optional(),
  amount: z.number(),
  diagnosisCodes: z.array(z.string()).optional(),
  serviceDate: z.string(),
  location: z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    city: z.string().optional(),
    state: z.string().optional()
  }).optional()
});

const createRuleSchema = z.object({
  ruleName: z.string(),
  ruleType: z.string(),
  description: z.string(),
  conditions: z.any(),
  actions: z.any(),
  riskWeight: z.number().optional(),
  priority: z.number().optional()
});

const createInvestigationSchema = z.object({
  alertId: z.string(),
  title: z.string(),
  description: z.string(),
  assignedInvestigator: z.number().optional()
});

// 1. REAL-TIME ANALYSIS ENDPOINTS

/**
 * POST /api/fraud/analyze-claim
 * Analyze a claim for fraud in real-time
 */
router.post("/analyze-claim", authenticate, requireRole(['insurance', 'admin']), async (req, res) => {
  try {
    const claimData = analyzeClaimSchema.parse(req.body);
    const result = await fraudDetectionService.analyzeClaimForFraud(claimData);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Error analyzing claim for fraud:", error);
    res.status(500).json({
      success: false,
      error: "Failed to analyze claim"
    });
  }
});

/**
 * POST /api/fraud/monitor-patterns
 * Monitor transaction patterns for a member
 */
router.post("/monitor-patterns", authenticate, requireRole(['insurance', 'admin']), async (req, res) => {
  try {
    const { memberId, timeWindow = 24 } = req.body;

    if (!memberId) {
      return res.status(400).json({
        success: false,
        error: "Member ID is required"
      });
    }

    const patterns = await fraudDetectionService.monitorTransactionPatterns(memberId, timeWindow);

    res.json({
      success: true,
      data: patterns
    });
  } catch (error) {
    console.error("Error monitoring patterns:", error);
    res.status(500).json({
      success: false,
      error: "Failed to monitor patterns"
    });
  }
});

// 2. ALERT MANAGEMENT ENDPOINTS

/**
 * GET /api/fraud/alerts
 * Get fraud alerts with filtering
 */
router.get("/alerts", authenticate, requireRole(['insurance', 'admin']), async (req, res) => {
  try {
    const {
      status,
      riskLevel,
      priority,
      limit = 50,
      offset = 0
    } = req.query;

    // This would implement proper filtering logic
    // For now, return mock data
    const alerts = [
      {
        id: 1,
        alertId: "alert_123",
        riskLevel: "high",
        status: "pending_review",
        description: "Unusual claim frequency detected",
        createdAt: new Date()
      }
    ];

    res.json({
      success: true,
      data: alerts,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total: alerts.length
      }
    });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch alerts"
    });
  }
});

/**
 * PUT /api/fraud/alerts/:id/status
 * Update alert status
 */
router.put("/alerts/:id/status", authenticate, requireRole(['insurance', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignedTo } = req.body;

    // Update alert status logic would go here

    res.json({
      success: true,
      message: "Alert status updated successfully"
    });
  } catch (error) {
    console.error("Error updating alert status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update alert status"
    });
  }
});

// 3. RULE MANAGEMENT ENDPOINTS

/**
 * GET /api/fraud/rules
 * Get fraud detection rules
 */
router.get("/rules", authenticate, requireRole(['admin']), async (req, res) => {
  try {
    // Fetch rules logic would go here
    const rules = [
      {
        id: 1,
        ruleName: "High Frequency Claims",
        ruleType: "threshold",
        description: "Alert when claims exceed frequency threshold",
        isActive: true,
        priority: 1
      }
    ];

    res.json({
      success: true,
      data: rules
    });
  } catch (error) {
    console.error("Error fetching rules:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch rules"
    });
  }
});

/**
 * POST /api/fraud/rules
 * Create a new fraud detection rule
 */
router.post("/rules", authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const ruleData = createRuleSchema.parse(req.body);
    const rule = await fraudDetectionService.createFraudRule({
      ...ruleData,
      createdBy: (req as any).user.id
    });

    res.status(201).json({
      success: true,
      data: rule
    });
  } catch (error) {
    console.error("Error creating rule:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create rule"
    });
  }
});

// 4. INVESTIGATION MANAGEMENT ENDPOINTS

/**
 * GET /api/fraud/investigations
 * Get fraud investigations
 */
router.get("/investigations", authenticate, requireRole(['insurance', 'admin']), async (req, res) => {
  try {
    // Fetch investigations logic would go here
    const investigations = [
      {
        id: 1,
        investigationId: "inv_123",
        title: "Provider Ring Investigation",
        status: "in_progress",
        assignedInvestigator: 1,
        createdAt: new Date()
      }
    ];

    res.json({
      success: true,
      data: investigations
    });
  } catch (error) {
    console.error("Error fetching investigations:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch investigations"
    });
  }
});

/**
 * POST /api/fraud/investigations
 * Create a new investigation
 */
router.post("/investigations", authenticate, requireRole(['insurance', 'admin']), async (req, res) => {
  try {
    const investigationData = createInvestigationSchema.parse(req.body);

    // Create investigation logic would go here
    const investigation = {
      id: Date.now(),
      ...investigationData,
      status: "open",
      createdAt: new Date()
    };

    res.status(201).json({
      success: true,
      data: investigation
    });
  } catch (error) {
    console.error("Error creating investigation:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create investigation"
    });
  }
});

// 5. ANALYTICS ENDPOINTS

/**
 * GET /api/fraud/analytics
 * Get fraud analytics and metrics
 */
router.get("/analytics", authenticate, requireRole(['insurance', 'admin']), async (req, res) => {
  try {
    const { timePeriod = 'monthly' } = req.query;
    const analytics = await fraudDetectionService.generateFraudAnalytics(timePeriod as string);

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch analytics"
    });
  }
});

/**
 * POST /api/fraud/analytics/update
 * Update analytics metrics (admin only)
 */
router.post("/analytics/update", authenticate, requireRole(['admin']), async (req, res) => {
  try {
    await fraudDetectionService.updateAnalyticsMetrics();

    res.json({
      success: true,
      message: "Analytics metrics updated successfully"
    });
  } catch (error) {
    console.error("Error updating analytics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update analytics"
    });
  }
});

// 6. MACHINE LEARNING ENDPOINTS

/**
 * GET /api/fraud/models
 * Get available ML models
 */
router.get("/models", authenticate, requireRole(['admin']), async (req, res) => {
  try {
    // Fetch ML models logic would go here
    const models = [
      {
        id: 1,
        modelName: "Fraud Classification Model",
        algorithm: "random_forest",
        accuracy: 0.85,
        isActive: true,
        deployedAt: new Date()
      }
    ];

    res.json({
      success: true,
      data: models
    });
  } catch (error) {
    console.error("Error fetching models:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch models"
    });
  }
});

/**
 * POST /api/fraud/models/train
 * Train a new ML model
 */
router.post("/models/train", authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { modelConfig, trainingData } = req.body;

    if (!modelConfig || !trainingData) {
      return res.status(400).json({
        success: false,
        error: "Model config and training data are required"
      });
    }

    const model = await fraudDetectionService.trainMLModel(modelConfig, trainingData);

    res.status(201).json({
      success: true,
      data: model,
      message: "Model training initiated"
    });
  } catch (error) {
    console.error("Error training model:", error);
    res.status(500).json({
      success: false,
      error: "Failed to train model"
    });
  }
});

// 7. NETWORK ANALYSIS ENDPOINTS

/**
 * GET /api/fraud/networks
 * Get network analysis results
 */
router.get("/networks", authenticate, requireRole(['insurance', 'admin']), async (req, res) => {
  try {
    // Fetch network analysis results
    const networks = [
      {
        id: 1,
        networkId: "network_123",
        networkType: "provider_ring",
        riskScore: 75,
        entities: ["provider_1", "provider_2", "member_1"],
        analysisDate: new Date()
      }
    ];

    res.json({
      success: true,
      data: networks
    });
  } catch (error) {
    console.error("Error fetching networks:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch networks"
    });
  }
});

/**
 * POST /api/fraud/networks/analyze
 * Analyze network connections
 */
router.post("/networks/analyze", authenticate, requireRole(['insurance', 'admin']), async (req, res) => {
  try {
    const { claimData } = req.body;

    if (!claimData) {
      return res.status(400).json({
        success: false,
        error: "Claim data is required"
      });
    }

    const analysis = await fraudDetectionService.analyzeNetworkConnections(claimData);

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error("Error analyzing networks:", error);
    res.status(500).json({
      success: false,
      error: "Failed to analyze networks"
    });
  }
});

// 8. BEHAVIORAL ANALYSIS ENDPOINTS

/**
 * GET /api/fraud/behavioral-profiles
 * Get behavioral profiles
 */
router.get("/behavioral-profiles", authenticate, requireRole(['insurance', 'admin']), async (req, res) => {
  try {
    const { entityType, entityId } = req.query;

    // Fetch behavioral profiles logic would go here
    const profiles = [
      {
        id: 1,
        entityType: "member",
        entityId: Number(entityId) || 1,
        profileData: {
          claimFrequency: 2.5,
          averageAmount: 150
        },
        lastUpdated: new Date()
      }
    ];

    res.json({
      success: true,
      data: profiles
    });
  } catch (error) {
    console.error("Error fetching behavioral profiles:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch behavioral profiles"
    });
  }
});

/**
 * POST /api/fraud/behavioral-profiles/analyze
 * Analyze behavioral patterns
 */
router.post("/behavioral-profiles/analyze", authenticate, requireRole(['insurance', 'admin']), async (req, res) => {
  try {
    const { claimData } = req.body;

    if (!claimData) {
      return res.status(400).json({
        success: false,
        error: "Claim data is required"
      });
    }

    const analysis = await fraudDetectionService.analyzeBehavioralPatterns(claimData);

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error("Error analyzing behavioral patterns:", error);
    res.status(500).json({
      success: false,
      error: "Failed to analyze behavioral patterns"
    });
  }
});

// 9. RISK SCORING ENDPOINTS

/**
 * GET /api/fraud/risk-scores
 * Get risk scores for entities
 */
router.get("/risk-scores", authenticate, requireRole(['insurance', 'admin']), async (req, res) => {
  try {
    const { entityType, entityId } = req.query;

    // Fetch risk scores logic would go here
    const riskScores = [
      {
        id: 1,
        entityType: entityType || "member",
        entityId: Number(entityId) || 1,
        riskScore: 65,
        riskLevel: "medium",
        lastCalculated: new Date()
      }
    ];

    res.json({
      success: true,
      data: riskScores
    });
  } catch (error) {
    console.error("Error fetching risk scores:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch risk scores"
    });
  }
});

/**
 * POST /api/fraud/risk-scores/calculate
 * Calculate risk score for an entity
 */
router.post("/risk-scores/calculate", authenticate, requireRole(['insurance', 'admin']), async (req, res) => {
  try {
    const { entityType, entityId, entityData } = req.body;

    if (!entityType || !entityId) {
      return res.status(400).json({
        success: false,
        error: "Entity type and ID are required"
      });
    }

    // Calculate risk score logic would go here
    const riskScore = Math.floor(Math.random() * 100);
    const riskLevel = riskScore >= 80 ? 'critical' :
                     riskScore >= 60 ? 'high' :
                     riskScore >= 40 ? 'medium' : 'low';

    res.json({
      success: true,
      data: {
        entityType,
        entityId,
        riskScore,
        riskLevel,
        calculatedAt: new Date()
      }
    });
  } catch (error) {
    console.error("Error calculating risk score:", error);
    res.status(500).json({
      success: false,
      error: "Failed to calculate risk score"
    });
  }
});

export default router;
