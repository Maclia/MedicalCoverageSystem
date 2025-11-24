import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '../../middleware/auth';
import {
  getCurrentRiskAssessment,
  createRiskAssessment,
  updateRiskAssessment,
  getRiskAssessmentHistory,
  getRiskRecommendations,
  updateRecommendationStatus,
  getRiskAlerts,
  acknowledgeRiskAlert,
  getRiskPredictions,
  getRiskBenchmarks,
  getRiskActionItems,
  updateActionItemStatus,
  getRiskDashboard,
  generateRiskReport,
  calculateRiskScores,
  getRiskFactors,
  addRiskFactor,
  updateRiskFactor,
  deleteRiskFactor,
  getInterventionPlans,
  createInterventionPlan,
  updateInterventionPlan,
  getRiskConfig,
  updateRiskConfig
} from '../../services/riskAssessmentService';

const router = Router();

// Get current risk assessment for member
router.get('/assessment/current/:memberId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;
    const userId = req.user.id;

    // Ensure user can access this member's data
    const assessment = await getCurrentRiskAssessment(memberId, userId);
    res.json({ success: true, data: assessment });
  } catch (error) {
    console.error('Get current risk assessment error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve risk assessment' });
  }
});

// Create new risk assessment
router.post('/assessment', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { memberId, assessmentData } = req.body;
    const userId = req.user.id;

    const assessment = await createRiskAssessment(memberId, assessmentData, userId);
    res.json({ success: true, data: assessment });
  } catch (error) {
    console.error('Create risk assessment error:', error);
    res.status(500).json({ success: false, error: 'Failed to create risk assessment' });
  }
});

// Update risk assessment
router.put('/assessment/:assessmentId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { assessmentId } = req.params;
    const updateData = req.body;
    const userId = req.user.id;

    const assessment = await updateRiskAssessment(assessmentId, updateData, userId);
    res.json({ success: true, data: assessment });
  } catch (error) {
    console.error('Update risk assessment error:', error);
    res.status(500).json({ success: false, error: 'Failed to update risk assessment' });
  }
});

// Get risk assessment history
router.get('/assessment/history/:memberId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;
    const { limit = 12, offset = 0 } = req.query;

    const history = await getRiskAssessmentHistory(
      memberId,
      parseInt(limit as string),
      parseInt(offset as string)
    );
    res.json({ success: true, data: history });
  } catch (error) {
    console.error('Get risk assessment history error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve assessment history' });
  }
});

// Get risk recommendations
router.get('/recommendations/:memberId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;
    const { category, priority, status, limit = 20 } = req.query;

    const recommendations = await getRiskRecommendations(memberId, {
      category: category as string,
      priority: priority as string,
      status: status as string,
      limit: parseInt(limit as string)
    });
    res.json({ success: true, data: recommendations });
  } catch (error) {
    console.error('Get risk recommendations error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve recommendations' });
  }
});

// Update recommendation status
router.put('/recommendations/:recommendationId/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { recommendationId } = req.params;
    const { status, outcome, notes } = req.body;
    const userId = req.user.id;

    const recommendation = await updateRecommendationStatus(recommendationId, status, outcome, notes, userId);
    res.json({ success: true, data: recommendation });
  } catch (error) {
    console.error('Update recommendation status error:', error);
    res.status(500).json({ success: false, error: 'Failed to update recommendation status' });
  }
});

// Get risk alerts
router.get('/alerts/:memberId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;
    const { severity, read, acknowledged, limit = 50 } = req.query;

    const alerts = await getRiskAlerts(memberId, {
      severity: severity as string,
      read: read === 'true',
      acknowledged: acknowledged === 'true',
      limit: parseInt(limit as string)
    });
    res.json({ success: true, data: alerts });
  } catch (error) {
    console.error('Get risk alerts error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve risk alerts' });
  }
});

// Acknowledge risk alert
router.post('/alerts/:alertId/acknowledge', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const { notes } = req.body;
    const userId = req.user.id;

    const alert = await acknowledgeRiskAlert(alertId, userId, notes);
    res.json({ success: true, data: alert });
  } catch (error) {
    console.error('Acknowledge risk alert error:', error);
    res.status(500).json({ success: false, error: 'Failed to acknowledge alert' });
  }
});

// Get risk predictions
router.get('/predictions/:memberId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;
    const { type, limit = 10 } = req.query;

    const predictions = await getRiskPredictions(memberId, {
      type: type as string,
      limit: parseInt(limit as string)
    });
    res.json({ success: true, data: predictions });
  } catch (error) {
    console.error('Get risk predictions error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve risk predictions' });
  }
});

// Get risk benchmarks
router.get('/benchmarks', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { category, metric, population } = req.query;

    const benchmarks = await getRiskBenchmarks({
      category: category as string,
      metric: metric as string,
      population: population as string
    });
    res.json({ success: true, data: benchmarks });
  } catch (error) {
    console.error('Get risk benchmarks error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve benchmarks' });
  }
});

// Get risk action items
router.get('/action-items/:memberId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;
    const { status, priority, type, limit = 20 } = req.query;

    const actionItems = await getRiskActionItems(memberId, {
      status: status as string,
      priority: priority as string,
      type: type as string,
      limit: parseInt(limit as string)
    });
    res.json({ success: true, data: actionItems });
  } catch (error) {
    console.error('Get risk action items error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve action items' });
  }
});

// Update action item status
router.put('/action-items/:actionItemId/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { actionItemId } = req.params;
    const { status, outcome, notes } = req.body;
    const userId = req.user.id;

    const actionItem = await updateActionItemStatus(actionItemId, status, outcome, notes, userId);
    res.json({ success: true, data: actionItem });
  } catch (error) {
    console.error('Update action item status error:', error);
    res.status(500).json({ success: false, error: 'Failed to update action item status' });
  }
});

// Get comprehensive risk dashboard
router.get('/dashboard/:memberId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;
    const userId = req.user.id;

    const dashboard = await getRiskDashboard(memberId, userId);
    res.json({ success: true, data: dashboard });
  } catch (error) {
    console.error('Get risk dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve risk dashboard' });
  }
});

// Generate risk assessment report
router.get('/report/:memberId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;
    const { format = 'pdf', period = '12m', includeHistory = true } = req.query;

    const report = await generateRiskReport(memberId, {
      format: format as string,
      period: period as string,
      includeHistory: includeHistory === 'true'
    });
    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Generate risk report error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate risk report' });
  }
});

// Calculate risk scores (manual trigger)
router.post('/calculate/:memberId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;
    const { categories, forceRecalculate = false } = req.body;

    const scores = await calculateRiskScores(memberId, categories, forceRecalculate);
    res.json({ success: true, data: scores });
  } catch (error) {
    console.error('Calculate risk scores error:', error);
    res.status(500).json({ success: false, error: 'Failed to calculate risk scores' });
  }
});

// Get risk factors
router.get('/factors/:memberId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;
    const { category, riskLevel, limit = 50 } = req.query;

    const factors = await getRiskFactors(memberId, {
      category: category as string,
      riskLevel: riskLevel as string,
      limit: parseInt(limit as string)
    });
    res.json({ success: true, data: factors });
  } catch (error) {
    console.error('Get risk factors error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve risk factors' });
  }
});

// Add risk factor
router.post('/factors', authenticateToken, async (req: Request, res: Response) => {
  try {
    const factorData = req.body;
    const userId = req.user.id;

    const factor = await addRiskFactor(factorData, userId);
    res.json({ success: true, data: factor });
  } catch (error) {
    console.error('Add risk factor error:', error);
    res.status(500).json({ success: false, error: 'Failed to add risk factor' });
  }
});

// Update risk factor
router.put('/factors/:factorId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { factorId } = req.params;
    const updateData = req.body;
    const userId = req.user.id;

    const factor = await updateRiskFactor(factorId, updateData, userId);
    res.json({ success: true, data: factor });
  } catch (error) {
    console.error('Update risk factor error:', error);
    res.status(500).json({ success: false, error: 'Failed to update risk factor' });
  }
});

// Delete risk factor
router.delete('/factors/:factorId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { factorId } = req.params;
    const userId = req.user.id;

    await deleteRiskFactor(factorId, userId);
    res.json({ success: true, message: 'Risk factor deleted successfully' });
  } catch (error) {
    console.error('Delete risk factor error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete risk factor' });
  }
});

// Get intervention plans
router.get('/interventions/:memberId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;
    const { status, priority, type, limit = 20 } = req.query;

    const interventions = await getInterventionPlans(memberId, {
      status: status as string,
      priority: priority as string,
      type: type as string,
      limit: parseInt(limit as string)
    });
    res.json({ success: true, data: interventions });
  } catch (error) {
    console.error('Get intervention plans error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve intervention plans' });
  }
});

// Create intervention plan
router.post('/interventions', authenticateToken, async (req: Request, res: Response) => {
  try {
    const interventionData = req.body;
    const userId = req.user.id;

    const intervention = await createInterventionPlan(interventionData, userId);
    res.json({ success: true, data: intervention });
  } catch (error) {
    console.error('Create intervention plan error:', error);
    res.status(500).json({ success: false, error: 'Failed to create intervention plan' });
  }
});

// Update intervention plan
router.put('/interventions/:interventionId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { interventionId } = req.params;
    const updateData = req.body;
    const userId = req.user.id;

    const intervention = await updateInterventionPlan(interventionId, updateData, userId);
    res.json({ success: true, data: intervention });
  } catch (error) {
    console.error('Update intervention plan error:', error);
    res.status(500).json({ success: false, error: 'Failed to update intervention plan' });
  }
});

// Get risk assessment configuration
router.get('/config/:memberId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;

    const config = await getRiskConfig(memberId);
    res.json({ success: true, data: config });
  } catch (error) {
    console.error('Get risk config error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve risk configuration' });
  }
});

// Update risk assessment configuration
router.put('/config/:memberId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;
    const configData = req.body;
    const userId = req.user.id;

    const config = await updateRiskConfig(memberId, configData, userId);
    res.json({ success: true, data: config });
  } catch (error) {
    console.error('Update risk config error:', error);
    res.status(500).json({ success: false, error: 'Failed to update risk configuration' });
  }
});

// Admin-only routes
router.get('/admin/assessments/all', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    // Admin route to get all risk assessments
    const { limit = 100, offset = 0, riskLevel } = req.query;

    const assessments = await getCurrentRiskAssessment('all', 'admin');
    res.json({ success: true, data: assessments });
  } catch (error) {
    console.error('Get all risk assessments error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve all risk assessments' });
  }
});

router.get('/admin/benchmarks/update', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    // Admin route to update risk benchmarks
    const benchmarks = await getRiskBenchmarks({});
    res.json({ success: true, data: benchmarks });
  } catch (error) {
    console.error('Update benchmarks error:', error);
    res.status(500).json({ success: false, error: 'Failed to update benchmarks' });
  }
});

export default router;