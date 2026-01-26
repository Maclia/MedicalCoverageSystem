import { Router } from 'express';
import { leadScoringService } from '../services/leadScoringService';
import { leadNurturingService } from '../services/leadNurturingService';
import { storage } from '../storage';

const router = Router();

// ============================================================================
// LEAD SCORING ENDPOINTS
// ============================================================================

/**
 * Score a lead
 * POST /api/leads/score
 */
router.post('/api/leads/score', async (req, res) => {
  try {
    const { leadId, forceRecalculate = false } = req.body;

    if (!leadId) {
      return res.status(400).json({ error: "leadId is required" });
    }

    const score = await leadScoringService.calculateLeadScore(
      Number(leadId),
      forceRecalculate
    );

    res.json({
      success: true,
      score
    });

  } catch (error) {
    console.error('Error scoring lead:', error);
    res.status(500).json({ error: "Failed to score lead" });
  }
});

/**
 * Get lead score
 * GET /api/leads/:leadId/score
 */
router.get('/api/leads/:leadId/score', async (req, res) => {
  try {
    const { leadId } = req.params;

    const score = await leadScoringService.getLeadScore(Number(leadId));

    if (!score) {
      return res.status(404).json({ error: "Lead score not found" });
    }

    res.json({
      success: true,
      score
    });

  } catch (error) {
    console.error('Error fetching lead score:', error);
    res.status(500).json({ error: "Failed to fetch lead score" });
  }
});

/**
 * Recalculate scores
 * POST /api/leads/score/recalculate
 */
router.post('/api/leads/score/recalculate', async (req, res) => {
  try {
    const { leadIds } = req.body;

    if (!leadIds || !Array.isArray(leadIds)) {
      return res.status(400).json({ error: "leadIds array is required" });
    }

    const results = await Promise.all(
      leadIds.map(id =>
        leadScoringService.calculateLeadScore(Number(id), true)
      )
    );

    res.json({
      success: true,
      results,
      count: results.length
    });

  } catch (error) {
    console.error('Error recalculating scores:', error);
    res.status(500).json({ error: "Failed to recalculate scores" });
  }
});

/**
 * Get top scoring leads
 * GET /api/leads/scores/top
 */
router.get('/api/leads/scores/top', async (req, res) => {
  try {
    const { limit = 20, minScore = 70 } = req.query;

    const leads = await leadScoringService.getTopScoringLeads({
      limit: Number(limit),
      minScore: Number(minScore)
    });

    res.json({
      success: true,
      leads,
      count: leads.length
    });

  } catch (error) {
    console.error('Error fetching top scoring leads:', error);
    res.status(500).json({ error: "Failed to fetch top scoring leads" });
  }
});

/**
 * Create scoring rule
 * POST /api/leads/scoring/rules
 */
router.post('/api/leads/scoring/rules', async (req, res) => {
  try {
    const {
      name,
      criteria,
      weight,
      isActive = true
    } = req.body;

    if (!name || !criteria || !weight) {
      return res.status(400).json({
        error: "name, criteria, and weight are required"
      });
    }

    const rule = await leadScoringService.createScoringRule({
      name,
      criteria,
      weight: Number(weight),
      isActive
    });

    res.status(201).json({
      success: true,
      rule
    });

  } catch (error) {
    console.error('Error creating scoring rule:', error);
    res.status(500).json({ error: "Failed to create scoring rule" });
  }
});

// ============================================================================
// LEAD NURTURING ENDPOINTS
// ============================================================================

/**
 * Create nurturing campaign
 * POST /api/leads/nurture/campaign
 */
router.post('/api/leads/nurture/campaign', async (req, res) => {
  try {
    const {
      name,
      description,
      leadIds,
      workflow,
      triggers,
      isActive = true
    } = req.body;

    if (!name || !leadIds || !workflow) {
      return res.status(400).json({
        error: "name, leadIds, and workflow are required"
      });
    }

    const campaign = await leadNurturingService.createCampaign({
      name,
      description,
      leadIds,
      workflow,
      triggers,
      isActive
    });

    res.status(201).json({
      success: true,
      campaign
    });

  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: "Failed to create campaign" });
  }
});

/**
 * Get campaign details
 * GET /api/leads/nurture/campaign/:campaignId
 */
router.get('/api/leads/nurture/campaign/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;

    const campaign = await leadNurturingService.getCampaign(Number(campaignId));

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    res.json({
      success: true,
      campaign
    });

  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({ error: "Failed to fetch campaign" });
  }
});

/**
 * Enroll lead in campaign
 * POST /api/leads/nurture/enroll
 */
router.post('/api/leads/nurture/enroll', async (req, res) => {
  try {
    const { leadId, campaignId } = req.body;

    if (!leadId || !campaignId) {
      return res.status(400).json({
        error: "leadId and campaignId are required"
      });
    }

    const enrollment = await leadNurturingService.enrollLead(
      Number(leadId),
      Number(campaignId)
    );

    res.status(201).json({
      success: true,
      enrollment
    });

  } catch (error) {
    console.error('Error enrolling lead:', error);
    res.status(500).json({ error: "Failed to enroll lead" });
  }
});

/**
 * Get nurturing progress
 * GET /api/leads/nurture/progress/:leadId
 */
router.get('/api/leads/nurture/progress/:leadId', async (req, res) => {
  try {
    const { leadId } = req.params;

    const progress = await leadNurturingService.getLeadProgress(Number(leadId));

    res.json({
      success: true,
      progress
    });

  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ error: "Failed to fetch progress" });
  }
});

/**
 * Update campaign
 * PUT /api/leads/nurture/campaign/:campaignId
 */
router.put('/api/leads/nurture/campaign/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const updates = req.body;

    const campaign = await leadNurturingService.updateCampaign(
      Number(campaignId),
      updates
    );

    res.json({
      success: true,
      campaign
    });

  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({ error: "Failed to update campaign" });
  }
});

export default router;
