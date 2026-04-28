/**
 * CRM Service Domain Events
 * Standardized events published by CRM service for system integration
 */

export const CRMEvents = {
  // Lead Events
  LEAD_CREATED: 'crm.lead.created',
  LEAD_UPDATED: 'crm.lead.updated',
  LEAD_CONVERTED: 'crm.lead.converted',
  LEAD_QUALIFIED: 'crm.lead.qualified',
  LEAD_LOST: 'crm.lead.lost',

  // Company Events
  COMPANY_CREATED: 'crm.company.created',
  COMPANY_UPDATED: 'crm.company.updated',
  COMPANY_ONBOARDED: 'crm.company.onboarded',

  // Contact Events
  CONTACT_CREATED: 'crm.contact.created',
  CONTACT_UPDATED: 'crm.contact.updated',
  CONTACT_VERIFIED: 'crm.contact.verified',

  // Opportunity Events
  OPPORTUNITY_CREATED: 'crm.opportunity.created',
  OPPORTUNITY_UPDATED: 'crm.opportunity.updated',
  OPPORTUNITY_WON: 'crm.opportunity.won',
  OPPORTUNITY_LOST: 'crm.opportunity.lost',

  // Bulk Import Events
  BULK_IMPORT_STARTED: 'crm.bulk.import.started',
  BULK_IMPORT_COMPLETED: 'crm.bulk.import.completed',
  BULK_MEMBER_IMPORTED: 'crm.bulk.member.imported',

  // Activity Events
  ACTIVITY_LOGGED: 'crm.activity.logged',

  // Quote Events
  QUOTE_CREATED: 'crm.quote.created',
  QUOTE_UPDATED: 'crm.quote.updated',
  QUOTE_SENT_TO_INSURANCES: 'crm.quote.sent_to_insurances',
  QUOTE_RESPONSE_RECEIVED: 'crm.quote.response_received',
  QUOTE_APPROVED: 'crm.quote.approved',
  QUOTE_REJECTED: 'crm.quote.rejected',
  QUOTE_NEGOTIATION_UPDATED: 'crm.quote.negotiation_updated',
  QUOTE_DOCUMENT_ATTACHED: 'crm.quote.document_attached',
  QUOTE_LOCKED: 'crm.quote.locked',
  QUOTE_CONVERTED_TO_CLIENT: 'crm.quote.converted_to_client',

  // Client Events
  CLIENT_CREATED: 'crm.client.created',
  CLIENT_UPDATED: 'crm.client.updated',
  CLIENT_DOCUMENT_UPLOADED: 'crm.client.document_uploaded',
  CLIENT_SLA_ATTACHED: 'crm.client.sla_attached',
  CLIENT_KYC_UPDATED: 'crm.client.kyc_updated'
} as const;

export type CRMEventType = typeof CRMEvents[keyof typeof CRMEvents];

export interface CRMEventPayload {
  id: number | string;
  [key: string]: any;
}

// Event metadata interface with standard fields
export interface CRMEventMetadata {
  userId?: number;
  requestId?: string;
  correlationId?: string;
  source?: string;
  timestamp: number;
}

export interface CRMEvent {
  type: CRMEventType;
  aggregateId: string;
  data: CRMEventPayload;
  metadata: CRMEventMetadata;
}

export default CRMEvents;