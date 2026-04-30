export type CommunicationStatus =
  | "draft"
  | "scheduled"
  | "sent"
  | "delivered"
  | "read"
  | "failed"
  | "bounced"
  | "spam";

export type CommunicationPriority = "low" | "normal" | "high" | "urgent";
export type CommunicationType = "message" | "email" | "sms" | "push" | "chat" | "announcement";

export interface Communication {
  id: string;
  type: CommunicationType | string;
  status: CommunicationStatus | string;
  subject?: string;
  content: string;
  category: string;
  priority: CommunicationPriority | string;
  senderId?: string;
  senderName?: string;
  senderRole?: string;
  recipientId?: string;
  channel?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MessageThread {
  id: string;
  subject?: string;
  priority: CommunicationPriority | string;
  category: string;
  unreadCount: number;
  lastMessagePreview: string;
  lastMessageAt: string;
  status?: string;
}

export interface NotificationPreference {
  id: string;
  memberId: string;
  channel: string;
  enabled: boolean;
  category?: string;
}

export interface CommunicationTemplate {
  id: string;
  name: string;
  type: string;
  category: string;
  subject?: string;
  content: string;
  language?: string;
  isActive?: boolean;
}

export interface CommunicationCampaign {
  id: string;
  name: string;
  type: string;
  status: string;
  audienceSize?: number;
  scheduledAt?: string;
}

export interface ChatSession {
  id: string;
  memberId?: string;
  status: string;
  type?: string;
  priority?: CommunicationPriority | string;
  assignedTo?: string;
  lastMessageAt?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  priority: CommunicationPriority | string;
  status?: string;
  authorName: string;
  createdAt: string;
  viewCount: number;
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  questions: Array<Record<string, unknown>>;
  metrics: {
    responseRate: number;
  };
}

export interface DeliveryReceipt {
  id: string;
  communicationId: string;
  status: CommunicationStatus | string;
  deliveredAt?: string;
  readAt?: string;
}

export interface CommunicationDashboard {
  unreadCount: number;
  recentCommunications: Communication[];
  activeThreads: MessageThread[];
  announcements: Announcement[];
  surveys: Survey[];
  quickActions: Array<{
    id: string;
    title: string;
    action: string;
  }>;
  summary: {
    totalCommunications: number;
    deliveryRate: number;
    openRate: number;
    responseRate: number;
    averageResponseTime: number;
    satisfactionRating: number;
  };
}
