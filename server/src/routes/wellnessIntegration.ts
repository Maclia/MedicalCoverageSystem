import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '../../middleware/auth';
import {
  getWellnessIntegrations,
  connectDevice,
  disconnectDevice,
  syncDeviceData,
  getHealthData,
  getHealthMetrics,
  getWellnessIncentives,
  getWellnessRewards,
  claimWellnessReward,
  getWellnessCoaches,
  bookCoachingSession,
  getCoachingSessions,
  getAvailableSlots,
  addManualHealthData,
  updateHealthGoals,
  getWellnessStats,
  revokeDeviceAccess,
  refreshDeviceToken
} from '../../services/wellnessIntegrationService';

const router = Router();

// Get all wellness integrations for the current user
router.get('/integrations', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const integrations = await getWellnessIntegrations(userId);
    res.json({ success: true, data: integrations });
  } catch (error) {
    console.error('Get wellness integrations error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve wellness integrations' });
  }
});

// Initiate device connection
router.post('/integrations/connect', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { provider, permissions, settings } = req.body;

    if (!provider) {
      return res.status(400).json({ success: false, error: 'Provider is required' });
    }

    const validProviders = ['fitbit', 'apple_health', 'google_fit', 'samsung_health', 'garmin_connect'];
    if (!validProviders.includes(provider)) {
      return res.status(400).json({ success: false, error: 'Invalid provider' });
    }

    const connectionData = await connectDevice(userId, provider, permissions, settings);
    res.json({ success: true, data: connectionData });
  } catch (error) {
    console.error('Connect device error:', error);
    res.status(500).json({ success: false, error: 'Failed to initiate device connection' });
  }
});

// Complete device connection (OAuth callback handler)
router.post('/integrations/callback/:provider', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { provider } = req.params;
    const { code, state } = req.body;

    if (!code || !state) {
      return res.status(400).json({ success: false, error: 'Missing required OAuth parameters' });
    }

    const result = await connectDevice(userId, provider, null, null, code, state);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Device connection callback error:', error);
    res.status(500).json({ success: false, error: 'Failed to complete device connection' });
  }
});

// Disconnect device
router.post('/integrations/:integrationId/disconnect', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { integrationId } = req.params;

    await disconnectDevice(userId, integrationId);
    res.json({ success: true, message: 'Device disconnected successfully' });
  } catch (error) {
    console.error('Disconnect device error:', error);
    res.status(500).json({ success: false, error: 'Failed to disconnect device' });
  }
});

// Revoke device access
router.post('/integrations/:integrationId/revoke', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { integrationId } = req.params;

    await revokeDeviceAccess(userId, integrationId);
    res.json({ success: true, message: 'Device access revoked successfully' });
  } catch (error) {
    console.error('Revoke device access error:', error);
    res.status(500).json({ success: false, error: 'Failed to revoke device access' });
  }
});

// Refresh device token
router.post('/integrations/:integrationId/refresh', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { integrationId } = req.params;

    const result = await refreshDeviceToken(userId, integrationId);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Refresh device token error:', error);
    res.status(500).json({ success: false, error: 'Failed to refresh device token' });
  }
});

// Sync device data
router.post('/integrations/:integrationId/sync', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { integrationId } = req.params;
    const { dataTypes, dateRange } = req.body;

    const syncResult = await syncDeviceData(userId, integrationId, dataTypes, dateRange);
    res.json({ success: true, data: syncResult });
  } catch (error) {
    console.error('Sync device data error:', error);
    res.status(500).json({ success: false, error: 'Failed to sync device data' });
  }
});

// Get health data
router.get('/health-data', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const {
      dataTypes,
      dateFrom,
      dateTo,
      source,
      limit = 100,
      offset = 0
    } = req.query;

    const healthData = await getHealthData(userId, {
      dataTypes: dataTypes as string[],
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      source: source as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });

    res.json({ success: true, data: healthData });
  } catch (error) {
    console.error('Get health data error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve health data' });
  }
});

// Get health metrics dashboard
router.get('/health-metrics', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { period = '30d' } = req.query;

    const metrics = await getHealthMetrics(userId, period as string);
    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error('Get health metrics error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve health metrics' });
  }
});

// Add manual health data
router.post('/health-data/manual', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const healthData = req.body;

    const result = await addManualHealthData(userId, healthData);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Add manual health data error:', error);
    res.status(500).json({ success: false, error: 'Failed to add manual health data' });
  }
});

// Update health goals
router.put('/health-goals', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { goals } = req.body;

    const result = await updateHealthGoals(userId, goals);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Update health goals error:', error);
    res.status(500).json({ success: false, error: 'Failed to update health goals' });
  }
});

// Get wellness incentives
router.get('/incentives', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { category, status, limit = 50 } = req.query;

    const incentives = await getWellnessIncentives(userId, {
      category: category as string,
      status: status as string,
      limit: parseInt(limit as string)
    });

    res.json({ success: true, data: incentives });
  } catch (error) {
    console.error('Get wellness incentives error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve wellness incentives' });
  }
});

// Get wellness rewards
router.get('/rewards', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { category, available, limit = 50 } = req.query;

    const rewards = await getWellnessRewards(userId, {
      category: category as string,
      available: available === 'true',
      limit: parseInt(limit as string)
    });

    res.json({ success: true, data: rewards });
  } catch (error) {
    console.error('Get wellness rewards error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve wellness rewards' });
  }
});

// Claim wellness reward
router.post('/rewards/:rewardId/claim', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { rewardId } = req.params;

    const result = await claimWellnessReward(userId, rewardId);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Claim wellness reward error:', error);
    res.status(500).json({ success: false, error: 'Failed to claim wellness reward' });
  }
});

// Get wellness coaches
router.get('/coaches', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      specialty,
      language,
      availability,
      rating,
      limit = 20,
      offset = 0
    } = req.query;

    const coaches = await getWellnessCoaches({
      specialty: specialty as string,
      language: language as string,
      availability: availability as string,
      rating: rating ? parseFloat(rating as string) : undefined,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });

    res.json({ success: true, data: coaches });
  } catch (error) {
    console.error('Get wellness coaches error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve wellness coaches' });
  }
});

// Get available coaching slots
router.get('/coaches/:coachId/slots', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { coachId } = req.params;
    const { dateFrom, dateTo } = req.query;

    const slots = await getAvailableSlots(coachId, dateFrom as string, dateTo as string);
    res.json({ success: true, data: slots });
  } catch (error) {
    console.error('Get available slots error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve available slots' });
  }
});

// Book coaching session
router.post('/coaching-sessions', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { coachId, slotId, type, notes } = req.body;

    const result = await bookCoachingSession(userId, coachId, slotId, type, notes);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Book coaching session error:', error);
    res.status(500).json({ success: false, error: 'Failed to book coaching session' });
  }
});

// Get coaching sessions
router.get('/coaching-sessions', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { status, limit = 20, offset = 0 } = req.query;

    const sessions = await getCoachingSessions(userId, {
      status: status as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });

    res.json({ success: true, data: sessions });
  } catch (error) {
    console.error('Get coaching sessions error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve coaching sessions' });
  }
});

// Get wellness statistics
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { period = '30d' } = req.query;

    const stats = await getWellnessStats(userId, period as string);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Get wellness stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve wellness statistics' });
  }
});

// Admin-only routes
router.get('/admin/integrations/all', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const integrations = await getWellnessIntegrations('all');
    res.json({ success: true, data: integrations });
  } catch (error) {
    console.error('Get all wellness integrations error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve all wellness integrations' });
  }
});

export default router;