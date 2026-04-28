import { Database } from '../models/Database';
import { WinstonLogger } from '../utils/WinstonLogger';
import { eventClient } from '../integrations/EventClient';
import { CRMEvents } from '../integrations/CrmDomainEvents';
import {
  clients,
  clientDocuments,
  companies,
  quotes
} from '../models/schema';
import {
  Client,
  NewClient,
  NewClientDocument
} from '../models/schema';
import {
  ValidationError,
  NotFoundError,
  BusinessRuleError
} from '../utils/CustomErrors';
import {
  eq,
  sql,
  and
} from 'drizzle-orm';

/**
 * Client Management Service
 * Handles client conversion, KYC, SLA management
 */
export class ClientService {
  private readonly db: Database;
  private readonly logger: WinstonLogger;

  constructor() {
    this.db = Database.getInstance();
    this.logger = new WinstonLogger('client-service');
  }

  /**
   * Convert prospect to client (supports both individual and company types)
   */
  async convertToClient(companyId: number, conversionData: any, context: any): Promise<any> {
    const db = this.db.getDb();

    return await db.transaction(async (tx) => {
      // Get prospect/company details
      const companyResult = await tx.select()
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);

      const company = companyResult[0];

      if (!company) {
        throw new NotFoundError('Prospect not found');
      }

      if (company.status !== 'prospect') {
        throw new BusinessRuleError('Only prospects can be converted to clients');
      }

      // Determine client type from original lead
      const clientType = company.type === 'INDIVIDUAL' ? 'INDIVIDUAL_CLIENT' : 'CORPORATE_CLIENT';

      // Create client record
      const [client] = await tx.insert(clients).values({
        companyId,
        status: 'active',
        kycStatus: 'pending',
        slaId: conversionData.slaId,
        clientNumber: `CLI-${Date.now()}`,
        createdBy: context.userId,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      // Update company status
      await tx.update(companies)
        .set({
          status: 'client',
          convertedToClientAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(companies.id, companyId));

      // Mark all related quotes as converted
      await tx.update(quotes)
        .set({
          status: 'converted_to_client',
          updatedAt: new Date()
        })
        .where(and(
          eq(quotes.entityId, companyId),
          eq(quotes.entityType, 'COMPANY')
        ));

      eventClient.publishEvent(CRMEvents.CLIENT_CREATED, client.id, { 
        clientId: client.id, 
        companyId, 
        clientType,
        ...context 
      });

      return {
        success: true,
        client,
        clientType,
        message: `Successfully converted ${clientType.toLowerCase()} from prospect`
      };
    });
  }

  /**
   * Get client by ID
   */
  async getClientById(clientId: number): Promise<any> {
    const db = this.db.getDb();

    const clientResult = await db.select()
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    const client = clientResult[0];

    if (!client) {
      throw new NotFoundError(`Client with ID ${clientId} not found`);
    }

    return client;
  }

  /**
   * Upload KYC document for client
   */
  async uploadClientDocument(clientId: number, documentData: any, context: any): Promise<any> {
    const db = this.db.getDb();

    const [document] = await db.insert(clientDocuments).values({
      clientId,
      ...documentData,
      uploadedBy: context.userId,
      createdAt: new Date()
    }).returning();

    eventClient.publishEvent(CRMEvents.CLIENT_DOCUMENT_UPLOADED, clientId, { 
      clientId, 
      documentId: document.id, 
      type: documentData.type || 'KYC',
      ...context 
    });

    return document;
  }

  /**
   * Attach SLA to client
   */
  async attachClientSLA(clientId: number, slaData: any, context: any): Promise<any> {
    const db = this.db.getDb();

    const clientResult = await db.update(clients)
      .set({
        slaId: slaData.slaId,
        updatedAt: new Date()
      })
      .where(eq(clients.id, clientId))
      .returning();

    eventClient.publishEvent(CRMEvents.CLIENT_SLA_ATTACHED, clientId, { clientId, slaId: slaData.slaId, ...context });

    return { success: true, client: clientResult[0] };
  }
}

export const clientService = new ClientService();