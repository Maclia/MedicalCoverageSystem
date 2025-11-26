/**
 * Billing Communication Types
 */

export interface BillingCommunication {
  id: number;
  memberId?: number;
  companyId?: number;
  type: 'invoice' | 'reminder' | 'overdue' | 'payment' | 'collection' | 'suspension';
  templateId?: string;
  subject: string;
  content: string;
  channel: 'email' | 'sms' | 'push' | 'postal' | 'whatsapp';
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  responseReceived: boolean;
  responseReceivedAt?: Date;
  nextActionDate?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommunicationTemplate {
  id: number;
  name: string;
  type: string;
  subject: string;
  content: string;
  variables: string[];
  channel: string;
  isActive: boolean;
  language: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommunicationLog {
  id: number;
  communicationId: number;
  event: string;
  status: string;
  details?: Record<string, any>;
  timestamp: Date;
}