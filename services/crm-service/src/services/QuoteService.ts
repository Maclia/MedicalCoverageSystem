import { Database } from '../models/Database';
import { WinstonLogger } from '../utils/WinstonLogger';
import { eventClient } from '../integrations/EventClient';
import { CRMEvents } from '../integrations/CrmDomainEvents';
import {
  quotes,
  quoteItems,
  quoteDocuments
} from '../models/schema';
import {
  Quote,
  NewQuote,
  NewQuoteItem,
  NewQuoteDocument
} from '../models/schema';
import {
  ValidationError,
  NotFoundError,
  BusinessRuleError
} from '../utils/CustomErrors';
import {
  eq,
  sql,
  and,
  ne,
  desc
} from 'drizzle-orm';

/**
 * Quote Management Service
 * Handles all quote operations: creation, sending to insurances, responses, approval
 */
export class QuoteService {
  private readonly db: Database;
  private readonly logger: WinstonLogger;

  constructor() {
    this.db = Database.getInstance();
    this.logger = new WinstonLogger('quote-service');
  }

  /**
   * Create new quote
   */
  async createQuote(quoteData: any, context: any): Promise<any> {
    const db = this.db.getDb();

    try {
      this.logger.info('Creating new quote', { context });

      const [quote] = await db.insert(quotes).values({
        ...quoteData,
        createdBy: context.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'draft'
      }).returning();

      await eventClient.publishEvent(CRMEvents.QUOTE_CREATED, quote.id, { quoteId: quote.id, ...context });
      return quote;
    } catch (error) {
      this.logger.error('Failed to create quote', error);
      throw error;
    }
  }

  /**
   * Get quote by ID
   */
  async getQuoteById(quoteId: number): Promise<any> {
    const db = this.db.getDb();

    const quoteResult = await db.select()
      .from(quotes)
      .where(eq(quotes.id, quoteId))
      .limit(1);

    const quote = quoteResult[0];

    if (!quote) {
      throw new NotFoundError(`Quote with ID ${quoteId} not found`);
    }

    return quote;
  }

  /**
   * Send quote to multiple insurance providers
   */
  async sendQuoteToInsurances(quoteId: number, insuranceProviders: number[], context: any): Promise<any> {
    const db = this.db.getDb();

    const quote = await this.getQuoteById(quoteId);
    
    if (quote.status !== 'draft' && quote.status !== 'negotiation') {
      throw new BusinessRuleError('Quote cannot be sent in current status');
    }

    // Update quote status
    await db.update(quotes)
      .set({ 
        status: 'sent_to_insurances',
        updatedAt: new Date(),
        sentAt: new Date(),
        sentBy: context.userId,
        targetInsurances: insuranceProviders
      })
      .where(eq(quotes.id, quoteId));

    await eventClient.publishEvent(CRMEvents.QUOTE_SENT_TO_INSURANCES, quoteId, { 
      quoteId, 
      insuranceProviders, 
      ...context 
    });

    return { success: true, message: `Quote sent to ${insuranceProviders.length} insurance providers` };
  }

  /**
   * Record received quote from insurance
   */
  async recordReceivedQuote(quoteId: number, insuranceQuote: any, context: any): Promise<any> {
    const db = this.db.getDb();

    // Store insurance response
    await db.insert(quoteItems).values({
      quoteId,
      name: insuranceQuote.name || `Quote from Insurance ${insuranceQuote.insuranceId}`,
      unitPrice: insuranceQuote.premium || 0,
      totalPrice: insuranceQuote.premium || 0,
      quantity: 1,
      description: JSON.stringify(insuranceQuote.coverageDetails || {})
    });

    // Update quote status
    await db.update(quotes)
      .set({ 
        status: 'responses_received',
        updatedAt: new Date()
      })
      .where(eq(quotes.id, quoteId));

    eventClient.publishEvent(CRMEvents.QUOTE_RESPONSE_RECEIVED, quoteId, {
      quoteId,
      ...context
    });

    return { success: true };
  }

  /**
   * Approve quote and lock all other quotes
   */
  async approveQuote(quoteId: number, approvalData: any, context: any): Promise<any> {
    const db = this.db.getDb();

    return await db.transaction(async (tx) => {
      const quoteResult = await tx.select()
        .from(quotes)
        .where(eq(quotes.id, quoteId))
        .limit(1);

      const quote = quoteResult[0];

      if (!quote) {
        throw new NotFoundError('Quote');
      }

      // Lock all other quotes for this prospect/client
      if (quote.entityId && quote.entityType) {
        await tx.update(quotes)
          .set({ 
            status: 'locked',
            updatedAt: new Date(),
            lockedReason: 'Another quote was approved'
          })
          .where(and(
            eq(quotes.entityId, quote.entityId!),
            eq(quotes.entityType, quote.entityType!),
            ne(quotes.id, quoteId)
          ));
      }

      // Approve selected quote
      const [approvedQuote] = await tx.update(quotes)
        .set({ 
          status: 'approved',
          updatedAt: new Date(),
          approvedAt: new Date(),
          approvedById: context.userId,
          acceptanceLetterId: approvalData.acceptanceLetterId
        })
        .where(eq(quotes.id, quoteId))
        .returning();

      eventClient.publishEvent(CRMEvents.QUOTE_APPROVED, quoteId, { quoteId, ...context });

      return {
        success: true,
        quote: approvedQuote,
        message: 'Quote approved. All other quotes have been locked.'
      };
    });
  }

  /**
   * Reject quote with reason code
   */
  async rejectQuote(quoteId: number, rejectCode: string, rejectReason: string, context: any): Promise<any> {
    const db = this.db.getDb();

    await db.update(quotes)
      .set({ 
        status: 'rejected',
        updatedAt: new Date(),
        rejectedAt: new Date(),
        rejectedBy: context.userId,
        rejectCode,
        rejectedReason: rejectReason
      })
      .where(eq(quotes.id, quoteId));

    eventClient.publishEvent(CRMEvents.QUOTE_REJECTED, quoteId, { quoteId, rejectCode, ...context });

    return { success: true, rejectCode };
  }

  /**
   * Update quote during negotiation phase
   */
  async updateQuoteNegotiation(quoteId: number, updateData: any, context: any): Promise<any> {
    const db = this.db.getDb();

    const quote = await this.getQuoteById(quoteId);

    if (quote.status !== 'negotiation') {
      throw new BusinessRuleError('Updates are only allowed during negotiation phase');
    }

    const [updatedQuote] = await db.update(quotes)
      .set({
        ...updateData,
        updatedAt: new Date(),
        lastNegotiationUpdate: new Date(),
        lastNegotiationBy: context.userId
      })
      .where(eq(quotes.id, quoteId))
      .returning();

    eventClient.publishEvent(CRMEvents.QUOTE_NEGOTIATION_UPDATED, quoteId, { quoteId, ...context });

    return updatedQuote;
  }

  /**
   * Attach document to quote
   */
  async attachQuoteDocument(quoteId: number, documentData: any, context: any): Promise<any> {
    const db = this.db.getDb();

    const [document] = await db.insert(quoteDocuments).values({
      quoteId,
      ...documentData,
      uploadedBy: context.userId,
      createdAt: new Date()
    }).returning();

    eventClient.publishEvent(CRMEvents.QUOTE_DOCUMENT_ATTACHED, quoteId, { quoteId, documentId: document.id, ...context });

    return document;
  }
}

export const quoteService = new QuoteService();