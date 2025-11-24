export interface Communication {
  id: string;
  memberId: string;
  type: 'message' | 'email' | 'sms' | 'push' | 'in_app' | 'chat' | 'announcement' | 'survey' | 'reminder';
  direction: 'inbound' | 'outbound' | 'internal';
  subject?: string;
  content: string;
  htmlContent?: string;
  status: 'draft' | 'scheduled' | 'sent' | 'delivered' | 'read' | 'failed' | 'bounced' | 'spam';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: 'medical' | 'administrative' | 'wellness' | 'billing' | 'general' | 'marketing' | 'support' | 'educational';
  channel: string;
  senderId: string;
  senderName: string;
  senderRole: 'system' | 'admin' | 'coach' | 'provider' | 'support' | 'member';
  recipientId?: string;
  recipientName?: string;
  recipientRole?: string;
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failedAt?: Date;
  replyTo?: string;
  attachments: CommunicationAttachment[];
  metadata: Record<string, any>;
  templateId?: string;
  campaignId?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CommunicationAttachment {
  id: string;
  communicationId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  path: string;
  uploadedAt: Date;
  uploadedBy: string;
}

export interface MessageThread {
  id: string;
  memberId: string;
  subject?: string;
  participants: MessageParticipant[];
  lastMessageAt: Date;
  lastMessagePreview: string;
  unreadCount: number;
  status: 'active' | 'archived' | 'closed' | 'resolved';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: string;
  assignedTo?: string;
  assignedToName?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageParticipant {
  userId: string;
  name: string;
  role: string;
  avatar?: string;
  status: 'active' | 'away' | 'offline';
  lastSeen?: Date;
  hasRead: boolean;
  joinedAt: Date;
}

export interface NotificationPreference {
  id: string;
  memberId: string;
  category: string;
  channel: 'email' | 'sms' | 'push' | 'in_app';
  enabled: boolean;
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  minPriority: 'low' | 'normal' | 'high' | 'urgent';
  quietHours?: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommunicationTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  type: 'email' | 'sms' | 'push' | 'in_app';
  subject?: string;
  content: string;
  htmlContent?: string;
  variables: TemplateVariable[];
  tags: string[];
  isActive: boolean;
  version: string;
  language: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface CommunicationCampaign {
  id: string;
  name: string;
  description: string;
  type: 'announcement' | 'marketing' | 'educational' | 'wellness' | 'reminder' | 'survey';
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'paused' | 'cancelled';
  templateId: string;
  segmentCriteria: SegmentCriteria;
  schedule: CampaignSchedule;
  channel: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  budget?: number;
  targetCount: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  clickCount: number;
  conversionCount: number;
  metrics: CampaignMetrics;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SegmentCriteria {
  includeAll: boolean;
  memberIds?: string[];
  filters: SegmentFilter[];
  exclusions: SegmentFilter[];
}

export interface SegmentFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'is_null' | 'is_not_null';
  value: any;
  valueType: 'string' | 'number' | 'boolean' | 'date' | 'array';
}

export interface CampaignSchedule {
  type: 'immediate' | 'scheduled' | 'recurring';
  startDate?: Date;
  endDate?: Date;
  timezone: string;
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    interval: number;
    daysOfWeek?: number[];
    dayOfMonth?: number;
    endDate?: Date;
  };
}

export interface CampaignMetrics {
  sendRate: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
  bounceRate: number;
  spamRate: number;
  unsubscribeRate: number;
  costPerMessage?: number;
  totalCost?: number;
  roi?: number;
}

export interface ChatSession {
  id: string;
  memberId: string;
  type: 'support' | 'wellness' | 'medical' | 'administrative' | 'coaching';
  status: 'active' | 'waiting' | 'closed' | 'transferred';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assignedTo?: string;
  assignedToName?: string;
  department?: string;
  queuePosition?: number;
  estimatedWaitTime?: number;
  satisfactionRating?: number;
  resolution?: string;
  tags: string[];
  messages: ChatMessage[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  endedAt?: Date;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  senderId: string;
  senderName: string;
  senderRole: 'member' | 'agent' | 'system';
  content: string;
  type: 'text' | 'image' | 'file' | 'system' | 'typing_indicator';
  attachments: CommunicationAttachment[];
  isRead: boolean;
  readAt?: Date;
  isEdited: boolean;
  editedAt?: Date;
  deletedAt?: Date;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  htmlContent?: string;
  summary?: string;
  type: 'general' | 'maintenance' | 'feature' | 'security' | 'policy' | 'emergency';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  visibility: 'public' | 'members' | 'internal' | 'role_based';
  targetRoles?: string[];
  targetSegments?: string[];
  startDate?: Date;
  endDate?: Date;
  author: string;
  authorName: string;
  attachments: CommunicationAttachment[];
  tags: string[];
  readCount: number;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  type: 'satisfaction' | 'feedback' | 'research' | 'health_assessment' | 'engagement';
  status: 'draft' | 'active' | 'closed' | 'archived';
  questions: SurveyQuestion[];
  settings: SurveySettings;
  targetCriteria?: SegmentCriteria;
  schedule?: CampaignSchedule;
  responses: SurveyResponse[];
  metrics: SurveyMetrics;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SurveyQuestion {
  id: string;
  type: 'single_choice' | 'multiple_choice' | 'rating' | 'text' | 'number' | 'date' | 'matrix' | 'nps';
  question: string;
  description?: string;
  required: boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  order: number;
}

export interface SurveySettings {
  anonymous: boolean;
  allowPartial: boolean;
  showProgress: boolean;
  timeLimit?: number;
  redirectUrl?: string;
  thankYouMessage?: string;
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  memberId: string;
  answers: SurveyAnswer[];
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  ip?: string;
  userAgent?: string;
  source?: string;
  status: 'started' | 'in_progress' | 'completed' | 'abandoned';
}

export interface SurveyAnswer {
  questionId: string;
  answer: string | number | string[] | boolean;
  timeSpent?: number;
}

export interface SurveyMetrics {
  totalInvitations: number;
  totalResponses: number;
  responseRate: number;
  completionRate: number;
  averageTime: number;
  averageRating?: number;
  responsesByDate: Record<string, number>;
  questionAnalytics: Record<string, any>;
}

export interface CommunicationDashboard {
  summary: CommunicationSummary;
  recentCommunications: Communication[];
  unreadCount: number;
  pendingCount: number;
  scheduledCount: number;
  failedCount: number;
  activeThreads: MessageThread[];
  announcements: Announcement[];
  surveys: Survey[];
  campaigns: CommunicationCampaign[];
  quickActions: QuickAction[];
}

export interface CommunicationSummary {
  totalCommunications: number;
  communicationsThisPeriod: number;
  deliveryRate: number;
  openRate: number;
  responseRate: number;
  satisfactionRating: number;
  averageResponseTime: number;
  topCategories: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  channelBreakdown: Record<string, number>;
  trendData: Array<{
    date: string;
    sent: number;
    delivered: number;
    read: number;
    responded: number;
  }>;
}

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  action: string;
  category: 'message' | 'announcement' | 'campaign' | 'survey' | 'template';
  priority: 'low' | 'normal' | 'high';
  permission?: string;
}

export interface CommunicationSettings {
  notifications: NotificationPreferences;
  autoReply: AutoReplySettings;
  signatures: EmailSignature[];
  templates: string[];
  defaultChannels: Record<string, string>;
  workingHours: WorkingHours;
  escalation: EscalationSettings;
  compliance: ComplianceSettings;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  in_app: boolean;
  categories: Record<string, {
    enabled: boolean;
    channels: string[];
    frequency: string;
    priority: string;
  }>;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
}

export interface AutoReplySettings {
  enabled: boolean;
  message: string;
  conditions: {
    outsideHours: boolean;
    away: boolean;
    keywords: string[];
    categories: string[];
  };
  delay: number;
}

export interface EmailSignature {
  id: string;
  name: string;
  content: string;
  isDefault: boolean;
  createdBy: string;
  createdAt: Date;
}

export interface WorkingHours {
  timezone: string;
  hours: Array<{
    day: number;
    start: string;
    end: string;
    enabled: boolean;
  }>;
  holidays: string[];
}

export interface EscalationSettings {
  enabled: boolean;
  rules: EscalationRule[];
}

export interface EscalationRule {
  id: string;
  name: string;
  trigger: {
    field: string;
    operator: string;
    value: any;
    timeWindow?: number;
  };
  action: {
    type: 'assign' | 'notify' | 'escalate' | 'auto_response';
    target?: string;
    message?: string;
    priority?: string;
  };
  isActive: boolean;
}

export interface ComplianceSettings {
  recordRetention: number;
  consentRequired: boolean;
  gdprCompliant: boolean;
  hipaaCompliant: boolean;
  auditLogging: boolean;
  encryption: {
    at_rest: boolean;
    in_transit: boolean;
  };
  dataMasking: boolean;
  auditTrail: boolean;
}

export interface CommunicationAnalytics {
  id: string;
  type: 'overview' | 'engagement' | 'performance' | 'trends' | 'comparative';
  period: string;
  filters: Record<string, any>;
  data: any;
  visualizations: any[];
  generatedAt: Date;
}

export interface DeliveryReceipt {
  id: string;
  communicationId: string;
  channel: string;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'bounced' | 'spam';
  timestamp: Date;
  provider: string;
  providerId?: string;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface CommunicationMetrics {
  total: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  bounced: number;
  spam: number;
  responseCount: number;
  averageResponseTime: number;
  deliveryRate: number;
  readRate: number;
  responseRate: number;
  engagementScore: number;
}