import { Router, Response } from 'express';
import { authenticate, requireRole, requireOwnership, AuthenticatedRequest } from '../middleware/auth';
import {
  getCommunications,
  getCommunication,
  createCommunication,
  updateCommunication,
  deleteCommunication,
  sendCommunication,
  scheduleCommunication,
  getCommunicationThreads,
  getThreadMessages,
  createThread,
  addMessageToThread,
  updateMessageReadStatus,
  getUnreadCount,
  markAsRead,
  markAsUnread,
  archiveThread,
  getNotificationPreferences,
  updateNotificationPreferences,
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  previewTemplate,
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  launchCampaign,
  pauseCampaign,
  resumeCampaign,
  getCampaignMetrics,
  getChatSessions,
  getChatSession,
  createChatSession,
  addChatMessage,
  updateChatSession,
  assignChatSession,
  closeChatSession,
  getAnnouncements,
  getAnnouncement,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  publishAnnouncement,
  getSurveys,
  getSurvey,
  createSurvey,
  updateSurvey,
  deleteSurvey,
  launchSurvey,
  getSurveyResponses,
  submitSurveyResponse,
  getCommunicationDashboard,
  getCommunicationAnalytics,
  generateCommunicationReport,
  getDeliveryReceipts,
  updateDeliveryStatus,
  uploadAttachment,
  downloadAttachment,
  getCommunicationSettings,
  updateCommunicationSettings
} from '../services/communicationService';

const router = Router();

// Communications
router.get('/communications', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const memberRole = req.user.role;
    const {
      memberId,
      type,
      status,
      category,
      priority,
      channel,
      direction,
      limit = 50,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      dateFrom,
      dateTo,
      tags
    } = req.query;

    // Only allow users to access their own communications unless they're admin/staff
    let targetMemberId = memberId as string;
    if (!targetMemberId && memberRole !== 'admin' && memberRole !== 'staff') {
      targetMemberId = userId;
    }

    const communications = await getCommunications({
      memberId: targetMemberId,
      type: type as string,
      status: status as string,
      category: category as string,
      priority: priority as string,
      channel: channel as string,
      direction: direction as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      sortBy: sortBy as string,
      sortOrder: sortOrder as string,
      search: search as string,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      tags: tags ? (tags as string).split(',') : undefined
    });

    res.json({ success: true, data: communications });
  } catch (error) {
    console.error('Get communications error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve communications' });
  }
});

router.get('/communications/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const communication = await getCommunication(id);
    res.json({ success: true, data: communication });
  } catch (error) {
    console.error('Get communication error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve communication' });
  }
});

router.post('/communications', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const communicationData = {
      ...req.body,
      senderId: userId
    };

    const communication = await createCommunication(communicationData);
    res.json({ success: true, data: communication });
  } catch (error) {
    console.error('Create communication error:', error);
    res.status(500).json({ success: false, error: 'Failed to create communication' });
  }
});

router.put('/communications/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const communication = await updateCommunication(id, updateData);
    res.json({ success: true, data: communication });
  } catch (error) {
    console.error('Update communication error:', error);
    res.status(500).json({ success: false, error: 'Failed to update communication' });
  }
});

router.delete('/communications/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await deleteCommunication(id);
    res.json({ success: true, message: 'Communication deleted successfully' });
  } catch (error) {
    console.error('Delete communication error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete communication' });
  }
});

router.post('/communications/:id/send', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { scheduleAt } = req.body;
    const result = await sendCommunication(id, scheduleAt ? new Date(scheduleAt) : undefined);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Send communication error:', error);
    res.status(500).json({ success: false, error: 'Failed to send communication' });
  }
});

router.post('/communications/:id/schedule', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { scheduledAt } = req.body;
    const result = await scheduleCommunication(id, new Date(scheduledAt));
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Schedule communication error:', error);
    res.status(500).json({ success: false, error: 'Failed to schedule communication' });
  }
});

// Message Threads
router.get('/threads', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const { memberId, status, priority, category, limit = 50, offset = 0 } = req.query;

    let targetMemberId = memberId as string;
    if (!targetMemberId && req.user.role !== 'admin' && req.user.role !== 'staff') {
      targetMemberId = userId;
    }

    const threads = await getCommunicationThreads({
      memberId: targetMemberId,
      status: status as string,
      priority: priority as string,
      category: category as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });

    res.json({ success: true, data: threads });
  } catch (error) {
    console.error('Get threads error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve message threads' });
  }
});

router.get('/threads/:threadId/messages', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { threadId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const messages = await getThreadMessages(threadId, parseInt(limit as string), parseInt(offset as string));
    res.json({ success: true, data: messages });
  } catch (error) {
    console.error('Get thread messages error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve thread messages' });
  }
});

router.post('/threads', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const threadData = {
      ...req.body,
      createdBy: userId
    };

    const thread = await createThread(threadData);
    res.json({ success: true, data: thread });
  } catch (error) {
    console.error('Create thread error:', error);
    res.status(500).json({ success: false, error: 'Failed to create message thread' });
  }
});

router.post('/threads/:threadId/messages', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { threadId } = req.params;
    const userId = req.user.id;
    const messageData = {
      ...req.body,
      senderId: userId
    };

    const message = await addMessageToThread(threadId, messageData);
    res.json({ success: true, data: message });
  } catch (error) {
    console.error('Add message to thread error:', error);
    res.status(500).json({ success: false, error: 'Failed to add message to thread' });
  }
});

router.put('/threads/:threadId/read', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { threadId } = req.params;
    const { messageId, read = true } = req.body;
    const userId = req.user.id;

    await updateMessageReadStatus(threadId, messageId, read, userId);
    res.json({ success: true, message: 'Message read status updated' });
  } catch (error) {
    console.error('Update message read status error:', error);
    res.status(500).json({ success: false, error: 'Failed to update message read status' });
  }
});

router.get('/unread/count', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const { memberId } = req.query;

    let targetMemberId = memberId as string;
    if (!targetMemberId && req.user.role !== 'admin' && req.user.role !== 'staff') {
      targetMemberId = userId;
    }

    const count = await getUnreadCount(targetMemberId || userId);
    res.json({ success: true, data: { unreadCount: count } });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ success: false, error: 'Failed to get unread count' });
  }
});

router.post('/threads/:threadId/mark-read', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { threadId } = req.params;
    const userId = req.user.id;
    await markAsRead(threadId, userId);
    res.json({ success: true, message: 'Thread marked as read' });
  } catch (error) {
    console.error('Mark thread as read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark thread as read' });
  }
});

router.post('/threads/:threadId/mark-unread', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { threadId } = req.params;
    const userId = req.user.id;
    await markAsUnread(threadId, userId);
    res.json({ success: true, message: 'Thread marked as unread' });
  } catch (error) {
    console.error('Mark thread as unread error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark thread as unread' });
  }
});

router.post('/threads/:threadId/archive', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { threadId } = req.params;
    await archiveThread(threadId);
    res.json({ success: true, message: 'Thread archived' });
  } catch (error) {
    console.error('Archive thread error:', error);
    res.status(500).json({ success: false, error: 'Failed to archive thread' });
  }
});

// Notification Preferences
router.get('/notifications/preferences/:memberId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { memberId } = req.params;
    const preferences = await getNotificationPreferences(memberId);
    res.json({ success: true, data: preferences });
  } catch (error) {
    console.error('Get notification preferences error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve notification preferences' });
  }
});

router.put('/notifications/preferences/:memberId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { memberId } = req.params;
    const preferencesData = req.body;
    const preferences = await updateNotificationPreferences(memberId, preferencesData);
    res.json({ success: true, data: preferences });
  } catch (error) {
    console.error('Update notification preferences error:', error);
    res.status(500).json({ success: false, error: 'Failed to update notification preferences' });
  }
});

// Templates
router.get('/templates', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { category, type, language, isActive, limit = 50, offset = 0 } = req.query;
    const templates = await getTemplates({
      category: category as string,
      type: type as string,
      language: language as string,
      isActive: isActive === 'true',
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve templates' });
  }
});

router.get('/templates/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const template = await getTemplate(id);
    res.json({ success: true, data: template });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve template' });
  }
});

router.post('/templates', authenticate, requireRole(['admin', 'staff']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const templateData = {
      ...req.body,
      createdBy: userId
    };

    const template = await createTemplate(templateData);
    res.json({ success: true, data: template });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ success: false, error: 'Failed to create template' });
  }
});

router.put('/templates/:id', authenticate, requireRole(['admin', 'staff']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const template = await updateTemplate(id, updateData);
    res.json({ success: true, data: template });
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ success: false, error: 'Failed to update template' });
  }
});

router.delete('/templates/:id', authenticate, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await deleteTemplate(id);
    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete template' });
  }
});

router.post('/templates/:id/preview', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { variables } = req.body;
    const preview = await previewTemplate(id, variables);
    res.json({ success: true, data: preview });
  } catch (error) {
    console.error('Preview template error:', error);
    res.status(500).json({ success: false, error: 'Failed to preview template' });
  }
});

// Campaigns
router.get('/campaigns', authenticate, requireRole(['admin', 'staff']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, type, limit = 50, offset = 0 } = req.query;
    const campaigns = await getCampaigns({
      status: status as string,
      type: type as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
    res.json({ success: true, data: campaigns });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve campaigns' });
  }
});

router.get('/campaigns/:id', authenticate, requireRole(['admin', 'staff']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const campaign = await getCampaign(id);
    res.json({ success: true, data: campaign });
  } catch (error) {
    console.error('Get campaign error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve campaign' });
  }
});

router.post('/campaigns', authenticate, requireRole(['admin', 'staff']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const campaignData = {
      ...req.body,
      createdBy: userId
    };

    const campaign = await createCampaign(campaignData);
    res.json({ success: true, data: campaign });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ success: false, error: 'Failed to create campaign' });
  }
});

router.put('/campaigns/:id', authenticate, requireRole(['admin', 'staff']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const campaign = await updateCampaign(id, updateData);
    res.json({ success: true, data: campaign });
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({ success: false, error: 'Failed to update campaign' });
  }
});

router.delete('/campaigns/:id', authenticate, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await deleteCampaign(id);
    res.json({ success: true, message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete campaign' });
  }
});

router.post('/campaigns/:id/launch', authenticate, requireRole(['admin', 'staff']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await launchCampaign(id);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Launch campaign error:', error);
    res.status(500).json({ success: false, error: 'Failed to launch campaign' });
  }
});

router.post('/campaigns/:id/pause', authenticate, requireRole(['admin', 'staff']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pauseCampaign(id);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Pause campaign error:', error);
    res.status(500).json({ success: false, error: 'Failed to pause campaign' });
  }
});

router.post('/campaigns/:id/resume', authenticate, requireRole(['admin', 'staff']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await resumeCampaign(id);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Resume campaign error:', error);
    res.status(500).json({ success: false, error: 'Failed to resume campaign' });
  }
});

router.get('/campaigns/:id/metrics', authenticate, requireRole(['admin', 'staff']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const metrics = await getCampaignMetrics(id);
    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error('Get campaign metrics error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve campaign metrics' });
  }
});

// Chat Sessions
router.get('/chat/sessions', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { memberId, type, status, priority, department, limit = 50, offset = 0 } = req.query;

    let targetMemberId = memberId as string;
    if (!targetMemberId && req.user.role !== 'admin' && req.user.role !== 'staff') {
      targetMemberId = req.user.id;
    }

    const sessions = await getChatSessions({
      memberId: targetMemberId,
      type: type as string,
      status: status as string,
      priority: priority as string,
      department: department as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });

    res.json({ success: true, data: sessions });
  } catch (error) {
    console.error('Get chat sessions error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve chat sessions' });
  }
});

router.get('/chat/sessions/:sessionId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = await getChatSession(sessionId);
    res.json({ success: true, data: session });
  } catch (error) {
    console.error('Get chat session error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve chat session' });
  }
});

router.post('/chat/sessions', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const sessionData = {
      ...req.body,
      memberId: req.body.memberId || userId
    };

    const session = await createChatSession(sessionData);
    res.json({ success: true, data: session });
  } catch (error) {
    console.error('Create chat session error:', error);
    res.status(500).json({ success: false, error: 'Failed to create chat session' });
  }
});

router.post('/chat/sessions/:sessionId/messages', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    const messageData = {
      ...req.body,
      senderId: userId
    };

    const message = await addChatMessage(sessionId, messageData);
    res.json({ success: true, data: message });
  } catch (error) {
    console.error('Add chat message error:', error);
    res.status(500).json({ success: false, error: 'Failed to add chat message' });
  }
});

router.put('/chat/sessions/:sessionId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const updateData = req.body;
    const session = await updateChatSession(sessionId, updateData);
    res.json({ success: true, data: session });
  } catch (error) {
    console.error('Update chat session error:', error);
    res.status(500).json({ success: false, error: 'Failed to update chat session' });
  }
});

router.post('/chat/sessions/:sessionId/assign', authenticate, requireRole(['admin', 'staff']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { assignedTo } = req.body;
    const session = await assignChatSession(sessionId, assignedTo);
    res.json({ success: true, data: session });
  } catch (error) {
    console.error('Assign chat session error:', error);
    res.status(500).json({ success: false, error: 'Failed to assign chat session' });
  }
});

router.post('/chat/sessions/:sessionId/close', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { resolution, satisfactionRating } = req.body;
    const session = await closeChatSession(sessionId, resolution, satisfactionRating);
    res.json({ success: true, data: session });
  } catch (error) {
    console.error('Close chat session error:', error);
    res.status(500).json({ success: false, error: 'Failed to close chat session' });
  }
});

// Announcements
router.get('/announcements', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type, status, visibility, limit = 50, offset = 0 } = req.query;
    const announcements = await getAnnouncements({
      type: type as string,
      status: status as string,
      visibility: visibility as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
    res.json({ success: true, data: announcements });
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve announcements' });
  }
});

router.get('/announcements/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const announcement = await getAnnouncement(id);
    res.json({ success: true, data: announcement });
  } catch (error) {
    console.error('Get announcement error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve announcement' });
  }
});

router.post('/announcements', authenticate, requireRole(['admin', 'staff']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const announcementData = {
      ...req.body,
      author: userId,
      authorName: req.user.name || 'System'
    };

    const announcement = await createAnnouncement(announcementData);
    res.json({ success: true, data: announcement });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ success: false, error: 'Failed to create announcement' });
  }
});

router.put('/announcements/:id', authenticate, requireRole(['admin', 'staff']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const announcement = await updateAnnouncement(id, updateData);
    res.json({ success: true, data: announcement });
  } catch (error) {
    console.error('Update announcement error:', error);
    res.status(500).json({ success: false, error: 'Failed to update announcement' });
  }
});

router.delete('/announcements/:id', authenticate, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await deleteAnnouncement(id);
    res.json({ success: true, message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete announcement' });
  }
});

router.post('/announcements/:id/publish', authenticate, requireRole(['admin', 'staff']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await publishAnnouncement(id);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Publish announcement error:', error);
    res.status(500).json({ success: false, error: 'Failed to publish announcement' });
  }
});

// Surveys
router.get('/surveys', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type, status, limit = 50, offset = 0 } = req.query;
    const surveys = await getSurveys({
      type: type as string,
      status: status as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
    res.json({ success: true, data: surveys });
  } catch (error) {
    console.error('Get surveys error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve surveys' });
  }
});

router.get('/surveys/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const survey = await getSurvey(id);
    res.json({ success: true, data: survey });
  } catch (error) {
    console.error('Get survey error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve survey' });
  }
});

router.post('/surveys', authenticate, requireRole(['admin', 'staff']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const surveyData = {
      ...req.body,
      createdBy: userId
    };

    const survey = await createSurvey(surveyData);
    res.json({ success: true, data: survey });
  } catch (error) {
    console.error('Create survey error:', error);
    res.status(500).json({ success: false, error: 'Failed to create survey' });
  }
});

router.put('/surveys/:id', authenticate, requireRole(['admin', 'staff']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const survey = await updateSurvey(id, updateData);
    res.json({ success: true, data: survey });
  } catch (error) {
    console.error('Update survey error:', error);
    res.status(500).json({ success: false, error: 'Failed to update survey' });
  }
});

router.delete('/surveys/:id', authenticate, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await deleteSurvey(id);
    res.json({ success: true, message: 'Survey deleted successfully' });
  } catch (error) {
    console.error('Delete survey error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete survey' });
  }
});

router.post('/surveys/:id/launch', authenticate, requireRole(['admin', 'staff']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await launchSurvey(id);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Launch survey error:', error);
    res.status(500).json({ success: false, error: 'Failed to launch survey' });
  }
});

router.get('/surveys/:id/responses', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const responses = await getSurveyResponses(id, parseInt(limit as string), parseInt(offset as string));
    res.json({ success: true, data: responses });
  } catch (error) {
    console.error('Get survey responses error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve survey responses' });
  }
});

router.post('/surveys/:id/responses', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const responseData = {
      ...req.body,
      memberId: userId
    };

    const response = await submitSurveyResponse(id, responseData);
    res.json({ success: true, data: response });
  } catch (error) {
    console.error('Submit survey response error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit survey response' });
  }
});

// Dashboard and Analytics
router.get('/dashboard/:memberId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { memberId } = req.params;
    const userId = req.user.id;

    let targetMemberId = memberId;
    if (targetMemberId !== userId && req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const dashboard = await getCommunicationDashboard(targetMemberId);
    res.json({ success: true, data: dashboard });
  } catch (error) {
    console.error('Get communication dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve communication dashboard' });
  }
});

router.get('/analytics', authenticate, requireRole(['admin', 'staff']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type, period, memberId, limit = 100 } = req.query;
    const analytics = await getCommunicationAnalytics({
      type: type as string,
      period: period as string,
      memberId: memberId as string,
      limit: parseInt(limit as string)
    });
    res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('Get communication analytics error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve communication analytics' });
  }
});

router.post('/report', authenticate, requireRole(['admin', 'staff']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type, filters, format = 'pdf' } = req.body;
    const report = await generateCommunicationReport(type, filters, format);
    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Generate communication report error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate communication report' });
  }
});

// Delivery Receipts
router.get('/delivery-receipts/:communicationId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { communicationId } = req.params;
    const receipts = await getDeliveryReceipts(communicationId);
    res.json({ success: true, data: receipts });
  } catch (error) {
    console.error('Get delivery receipts error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve delivery receipts' });
  }
});

router.post('/delivery-receipts', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const receiptData = req.body;
    const receipt = await updateDeliveryStatus(receiptData);
    res.json({ success: true, data: receipt });
  } catch (error) {
    console.error('Update delivery status error:', error);
    res.status(500).json({ success: false, error: 'Failed to update delivery status' });
  }
});

// File Attachments
router.post('/attachments/upload', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // This would typically be handled by a file upload middleware like multer
    // For now, returning a mock response
    const mockAttachment = {
      id: 'mock-attachment-id',
      filename: 'example.pdf',
      originalName: 'example.pdf',
      mimeType: 'application/pdf',
      size: 1024000,
      url: '/uploads/example.pdf',
      uploadedAt: new Date(),
      uploadedBy: req.user.id
    };
    res.json({ success: true, data: mockAttachment });
  } catch (error) {
    console.error('Upload attachment error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload attachment' });
  }
});

router.get('/attachments/:id/download', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const attachment = await downloadAttachment(id);
    res.json({ success: true, data: attachment });
  } catch (error) {
    console.error('Download attachment error:', error);
    res.status(500).json({ success: false, error: 'Failed to download attachment' });
  }
});

// Settings
router.get('/settings', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = await getCommunicationSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Get communication settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve communication settings' });
  }
});

router.put('/settings', authenticate, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const settingsData = req.body;
    const settings = await updateCommunicationSettings(settingsData);
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Update communication settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to update communication settings' });
  }
});

export default router;