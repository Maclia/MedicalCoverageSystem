import { Router } from 'express';
import { enhancedClaimsAdjudication } from '../services/enhancedClaimsAdjudication';
import { claimsProcessingWorkflow } from '../services/claimsProcessingWorkflow';
import { storage } from '../storage';

const router = Router();

// ============================================================================
// ENHANCED ADJUDICATION ENDPOINTS
// ============================================================================

/**
 * Run enhanced adjudication
 * POST /api/enhanced-claims/adjudicate
 */
router.post('/api/enhanced-claims/adjudicate', async (req, res) => {
  try {
    const {
      claimId,
      enhancedRules = true,
      aiAssistance = false,
      deepAnalysis = false
    } = req.body;

    if (!claimId) {
      return res.status(400).json({ error: "claimId is required" });
    }

    const result = await enhancedClaimsAdjudication.adjudicateClaim({
      claimId: Number(claimId),
      enhancedRules,
      aiAssistance,
      deepAnalysis
    });

    res.json({
      success: true,
      adjudication: result
    });

  } catch (error) {
    console.error('Error running enhanced adjudication:', error);
    res.status(500).json({ error: "Failed to run enhanced adjudication" });
  }
});

/**
 * Get adjudication results
 * GET /api/enhanced-claims/adjudication/:claimId
 */
router.get('/api/enhanced-claims/adjudication/:claimId', async (req, res) => {
  try {
    const { claimId } = req.params;

    const result = await enhancedClaimsAdjudication.getAdjudicationResult(
      Number(claimId)
    );

    if (!result) {
      return res.status(404).json({ error: "Adjudication result not found" });
    }

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Error fetching adjudication results:', error);
    res.status(500).json({ error: "Failed to fetch adjudication results" });
  }
});

/**
 * Batch enhanced adjudication
 * POST /api/enhanced-claims/adjudicate/batch
 */
router.post('/api/enhanced-claims/adjudicate/batch', async (req, res) => {
  try {
    const { claimIds, options = {} } = req.body;

    if (!claimIds || !Array.isArray(claimIds)) {
      return res.status(400).json({ error: "claimIds array is required" });
    }

    const results = await Promise.all(
      claimIds.map(id =>
        enhancedClaimsAdjudication.adjudicateClaim({
          claimId: Number(id),
          ...options
        })
      )
    );

    res.json({
      success: true,
      results,
      count: results.length
    });

  } catch (error) {
    console.error('Error in batch adjudication:', error);
    res.status(500).json({ error: "Failed to run batch adjudication" });
  }
});

/**
 * Get adjudication rules
 * GET /api/enhanced-claims/rules
 */
router.get('/api/enhanced-claims/rules', async (req, res) => {
  try {
    const { category, isActive } = req.query;

    const rules = await enhancedClaimsAdjudication.getAdjudicationRules({
      category: category as string,
      isActive: isActive === 'true' ? true : undefined
    });

    res.json({
      success: true,
      rules,
      count: rules.length
    });

  } catch (error) {
    console.error('Error fetching adjudication rules:', error);
    res.status(500).json({ error: "Failed to fetch adjudication rules" });
  }
});

/**
 * Create adjudication rule
 * POST /api/enhanced-claims/rules
 */
router.post('/api/enhanced-claims/rules', async (req, res) => {
  try {
    const {
      name,
      category,
      condition,
      action,
      priority = 'medium',
      isActive = true
    } = req.body;

    if (!name || !category || !condition || !action) {
      return res.status(400).json({
        error: "name, category, condition, and action are required"
      });
    }

    const rule = await enhancedClaimsAdjudication.createAdjudicationRule({
      name,
      category,
      condition,
      action,
      priority,
      isActive
    });

    res.status(201).json({
      success: true,
      rule
    });

  } catch (error) {
    console.error('Error creating adjudication rule:', error);
    res.status(500).json({ error: "Failed to create adjudication rule" });
  }
});

// ============================================================================
// CLAIMS WORKFLOW ENDPOINTS
// ============================================================================

/**
 * Start workflow
 * POST /api/enhanced-claims/workflow/start
 */
router.post('/api/enhanced-claims/workflow/start', async (req, res) => {
  try {
    const {
      claimId,
      workflowType = 'standard',
      priority = 'normal',
      initiatedBy
    } = req.body;

    if (!claimId) {
      return res.status(400).json({ error: "claimId is required" });
    }

    const workflow = await claimsProcessingWorkflow.processClaim(
      Number(claimId),
      {
        workflowType,
        priority,
        initiatedBy
      }
    );

    res.json({
      success: true,
      workflow
    });

  } catch (error) {
    console.error('Error starting workflow:', error);
    res.status(500).json({ error: "Failed to start workflow" });
  }
});

/**
 * Get workflow status
 * GET /api/enhanced-claims/workflow/:workflowId
 */
router.get('/api/enhanced-claims/workflow/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;

    const status = await claimsProcessingWorkflow.getWorkflowStatus(workflowId);

    if (!status) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    res.json({
      success: true,
      status
    });

  } catch (error) {
    console.error('Error fetching workflow status:', error);
    res.status(500).json({ error: "Failed to fetch workflow status" });
  }
});

/**
 * Cancel workflow
 * POST /api/enhanced-claims/workflow/:workflowId/cancel
 */
router.post('/api/enhanced-claims/workflow/:workflowId/cancel', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { reason, cancelledBy } = req.body;

    const cancelled = await claimsProcessingWorkflow.cancelWorkflow(workflowId);

    if (!cancelled) {
      return res.status(400).json({ error: "Workflow could not be cancelled" });
    }

    res.json({
      success: true,
      message: "Workflow cancelled successfully",
      workflowId
    });

  } catch (error) {
    console.error('Error cancelling workflow:', error);
    res.status(500).json({ error: "Failed to cancel workflow" });
  }
});

/**
 * Get active workflows
 * GET /api/enhanced-claims/workflows/active
 */
router.get('/api/enhanced-claims/workflows/active', async (req, res) => {
  try {
    const activeWorkflows = await claimsProcessingWorkflow.getActiveWorkflows();

    res.json({
      success: true,
      workflows: activeWorkflows.map(w => ({
        workflowId: w.workflowId,
        claimId: w.claimId,
        workflowType: w.workflowType,
        status: w.status,
        startTime: w.startTime,
        priority: w.metadata?.priority,
        currentStep: w.steps.find(s => s.status === 'in_progress')?.name
      })),
      count: activeWorkflows.length
    });

  } catch (error) {
    console.error('Error fetching active workflows:', error);
    res.status(500).json({ error: "Failed to fetch active workflows" });
  }
});

export default router;
