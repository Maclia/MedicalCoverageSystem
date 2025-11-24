import { storage } from '../storage';
import {
  MemberCard,
  InsertMemberCard,
  CardTemplate,
  InsertCardTemplate,
  CardVerificationEvent,
  InsertCardVerificationEvent,
  CardProductionBatch,
  InsertCardProductionBatch
} from '@shared/schema';

export interface CardGenerationRequest {
  memberId: number;
  cardType: 'physical' | 'digital' | 'both';
  templateId?: number;
  companyId?: number;
  expeditedShipping?: boolean;
}

export interface CardVerificationRequest {
  qrCodeData: string;
  providerId: string;
  verificationType: 'qr_scan' | 'manual_entry' | 'nfc_tap';
  location?: string;
  deviceInfo?: string;
}

export interface CardVerificationResponse {
  valid: boolean;
  card?: MemberCard;
  member?: any;
  verificationEvent?: CardVerificationEvent;
  reason?: string;
}

export interface CardStatusUpdate {
  cardId: number;
  status: 'active' | 'inactive' | 'expired' | 'lost' | 'stolen' | 'damaged';
  reason?: string;
  notes?: string;
}

export class CardManagementService {
  // Card Generation and Issuance
  async generateCardForMember(request: CardGenerationRequest): Promise<MemberCard[]> {
    const { memberId, cardType, templateId, companyId, expeditedShipping } = request;

    // Validate member exists and is eligible
    const member = await storage.getMember(memberId);
    if (!member) {
      throw new Error('Member not found');
    }

    // Check member eligibility using existing eligibility engine
    const { eligibilityEngine } = await import('../services/eligibilityEngine');
    const isEligible = await eligibilityEngine.validateMemberEligibility(memberId);
    if (!isEligible) {
      throw new Error('Member is not eligible for card issuance');
    }

    // Get or create appropriate card template
    const template = await this.getOrCreateCardTemplate(memberId, templateId, companyId);

    const generatedCards: MemberCard[] = [];

    if (cardType === 'physical' || cardType === 'both') {
      const physicalCard = await this.createPhysicalCard(memberId, template.id, expeditedShipping);
      generatedCards.push(physicalCard);
    }

    if (cardType === 'digital' || cardType === 'both') {
      const digitalCard = await this.createDigitalCard(memberId, template.id);
      generatedCards.push(digitalCard);
    }

    return generatedCards;
  }

  private async getOrCreateCardTemplate(memberId: number, templateId?: number, companyId?: number): Promise<CardTemplate> {
    if (templateId) {
      const template = await storage.getCardTemplate(templateId);
      if (!template) {
        throw new Error('Specified card template not found');
      }
      return template;
    }

    // Get member's company for template selection
    const member = await storage.getMember(memberId);
    const targetCompanyId = companyId || member?.companyId;

    if (!targetCompanyId) {
      throw new Error('Company ID required for template generation');
    }

    // Try to find existing active template for the company
    const existingTemplates = await storage.getCardTemplatesByCompany(targetCompanyId);
    const activeTemplate = existingTemplates.find(t => t.isActive && t.templateType === 'standard');

    if (activeTemplate) {
      return activeTemplate;
    }

    // Create default template for the company
    return await this.createDefaultCardTemplate(targetCompanyId);
  }

  private async createDefaultCardTemplate(companyId: number): Promise<CardTemplate> {
    const company = await storage.getCompany(companyId);
    const companyName = company?.name || 'Unknown Company';

    const templateData: InsertCardTemplate = {
      companyId,
      templateType: 'standard',
      templateName: `${companyName} Standard Card`,
      cardDesign: JSON.stringify({
        backgroundColor: '#1e40af',
        textColor: '#ffffff',
        logoPosition: 'top-left',
        memberInfoPosition: 'center'
      }),
      isActive: true
    };

    return await storage.createCardTemplate(templateData);
  }

  private async createPhysicalCard(memberId: number, templateId: number, expedited?: boolean): Promise<MemberCard> {
    const cardData: InsertMemberCard = {
      memberId,
      cardType: 'physical',
      templateId,
      cardStatus: 'pending',
      shippingAddress: await this.getMemberShippingAddress(memberId),
      expeditedShipping: expedited || false
    };

    const card = await storage.createMemberCard(cardData);

    // Add to production batch for physical card printing
    await this.addToProductionBatch(card.id, 'physical');

    return card;
  }

  private async createDigitalCard(memberId: number, templateId: number): Promise<MemberCard> {
    const cardData: InsertMemberCard = {
      memberId,
      cardType: 'digital',
      templateId,
      cardStatus: 'active' // Digital cards can be activated immediately
    };

    return await storage.createMemberCard(cardData);
  }

  private async getMemberShippingAddress(memberId: number): Promise<string> {
    // In a real implementation, this would get the member's address from their profile
    const member = await storage.getMember(memberId);
    return `${member?.firstName} ${member?.lastName}\n123 Main St\nCity, State 12345`;
  }

  private async addToProductionBatch(cardId: number, cardType: 'physical' | 'digital'): Promise<void> {
    // Find or create a suitable production batch
    const batches = await storage.getCardProductionBatchesByStatus('pending');
    let batch = batches[0];

    if (!batch) {
      const batchData: InsertCardProductionBatch = {
        batchName: `Card Production - ${new Date().toISOString().split('T')[0]}`,
        batchType: cardType,
        productionQuantity: 0,
        batchStatus: 'pending'
      };
      batch = await storage.createCardProductionBatch(batchData);
    }

    // Update batch quantity
    await storage.updateCardProductionBatch(batch.id, {
      productionQuantity: batch.productionQuantity + 1
    });
  }

  // Card Verification
  async verifyCard(request: CardVerificationRequest): Promise<CardVerificationResponse> {
    const { qrCodeData, providerId, verificationType, location, deviceInfo } = request;

    // Find card by QR code data
    const allCards = await storage.getMemberCards();
    const card = allCards.find(c => c.qrCodeData === qrCodeData);

    if (!card) {
      const verificationEvent = await this.createVerificationEvent(
        null,
        null,
        providerId,
        verificationType,
        'failed',
        'QR code not found',
        location,
        deviceInfo
      );

      return {
        valid: false,
        verificationEvent,
        reason: 'Card not found'
      };
    }

    // Validate card status and eligibility
    const validation = await storage.validateCardForTransaction(card.id);
    if (!validation.valid) {
      const verificationEvent = await this.createVerificationEvent(
        card.id,
        card.memberId,
        providerId,
        verificationType,
        'failed',
        validation.reason,
        location,
        deviceInfo
      );

      return {
        valid: false,
        card,
        verificationEvent,
        reason: validation.reason
      };
    }

    // Get member information
    const member = await storage.getMember(card.memberId);
    if (!member) {
      return {
        valid: false,
        card,
        reason: 'Member not found'
      };
    }

    // Record successful verification
    const verificationEvent = await this.createVerificationEvent(
      card.id,
      card.memberId,
      providerId,
      verificationType,
      'success',
      undefined,
      location,
      deviceInfo
    );

    // Update last used timestamp
    await storage.updateMemberCard(card.id, {
      lastUsedAt: new Date()
    });

    return {
      valid: true,
      card,
      member: {
        id: member.id,
        name: `${member.firstName} ${member.lastName}`,
        memberType: member.memberType,
        dateOfBirth: member.dateOfBirth
      },
      verificationEvent
    };
  }

  private async createVerificationEvent(
    cardId: number | null,
    memberId: number | null,
    providerId: string,
    verificationType: string,
    result: 'success' | 'failed',
    reason?: string,
    location?: string,
    deviceInfo?: string
  ): Promise<CardVerificationEvent> {
    const eventData: InsertCardVerificationEvent = {
      cardId: cardId!,
      memberId: memberId!,
      verifiedBy: providerId,
      verificationType,
      verificationResult: result,
      location,
      deviceInfo,
      additionalData: reason ? JSON.stringify({ reason }) : null
    };

    return await storage.createCardVerificationEvent(eventData);
  }

  // Card Status Management
  async updateCardStatus(update: CardStatusUpdate): Promise<MemberCard> {
    const { cardId, status, reason, notes } = update;

    const card = await storage.getMemberCard(cardId);
    if (!card) {
      throw new Error('Card not found');
    }

    // Handle specific status transitions
    switch (status) {
      case 'lost':
      case 'stolen':
        // Automatically deactivate and flag for replacement
        await storage.deactivateMemberCard(cardId, `Card reported ${status}`);
        await this.flagCardForReplacement(cardId, reason || `Card ${status}`);
        break;

      case 'damaged':
        await storage.deactivateMemberCard(cardId, 'Card damaged');
        await this.flagCardForReplacement(cardId, reason || 'Card damaged');
        break;

      case 'inactive':
        await storage.deactivateMemberCard(cardId, reason || 'Deactivated by request');
        break;

      case 'active':
        // Reactivate a previously inactive card
        await storage.updateMemberCard(cardId, {
          cardStatus: status,
          deactivatedAt: null,
          deactivationReason: null
        });
        break;

      case 'expired':
        await storage.updateMemberCard(cardId, {
          cardStatus: status
        });
        break;
    }

    // Get updated card
    const updatedCard = await storage.getMemberCard(cardId);
    return updatedCard!;
  }

  private async flagCardForReplacement(cardId: number, reason: string): Promise<void> {
    // In a real implementation, this would create a replacement request
    // For now, we'll just log the reason
    console.log(`Card ${cardId} flagged for replacement: ${reason}`);
  }

  // Card Replacement
  async requestCardReplacement(cardId: number, reason: string, expedited?: boolean): Promise<MemberCard> {
    const oldCard = await storage.getMemberCard(cardId);
    if (!oldCard) {
      throw new Error('Card not found');
    }

    // Create replacement card
    const replacementData: InsertMemberCard = {
      memberId: oldCard.memberId,
      cardType: oldCard.cardType,
      templateId: oldCard.templateId,
      cardStatus: 'pending',
      shippingAddress: await this.getMemberShippingAddress(oldCard.memberId),
      expeditedShipping: expedited || false
    };

    const result = await storage.replaceMemberCard(cardId, replacementData);

    // Add new physical card to production batch if needed
    if (oldCard.cardType === 'physical') {
      await this.addToProductionBatch(result.newCard.id, 'physical');
    }

    return result.newCard;
  }

  // Batch Processing
  async getProductionBatches(status?: string): Promise<CardProductionBatch[]> {
    if (status) {
      return await storage.getCardProductionBatchesByStatus(status);
    }
    return await storage.getCardProductionBatches();
  }

  async updateProductionBatchStatus(
    batchId: number,
    status: 'pending' | 'in_production' | 'shipped' | 'delivered' | 'cancelled',
    trackingNumber?: string
  ): Promise<CardProductionBatch> {
    const updates: Partial<CardProductionBatch> = {
      batchStatus: status
    };

    if (trackingNumber) {
      updates.trackingNumber = trackingNumber;
    }

    // If batch is shipped or delivered, update associated cards
    if (status === 'shipped' || status === 'delivered') {
      await this.updateCardsInBatch(batchId, status);
    }

    return await storage.updateCardProductionBatch(batchId, updates);
  }

  private async updateCardsInBatch(batchId: number, batchStatus: string): Promise<void> {
    // In a real implementation, this would find all cards in the batch
    // and update their status accordingly
    console.log(`Updating cards in batch ${batchId} to status: ${batchStatus}`);
  }

  // Reporting and Analytics
  async getCardUsageStatistics(memberId?: number, startDate?: Date, endDate?: Date): Promise<any> {
    const events = await storage.getCardVerificationEventsByDateRange(
      startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default to last 30 days
      endDate || new Date()
    );

    const filteredEvents = memberId
      ? events.filter(e => e.memberId === memberId)
      : events;

    return {
      totalVerifications: filteredEvents.length,
      successfulVerifications: filteredEvents.filter(e => e.verificationResult === 'success').length,
      failedVerifications: filteredEvents.filter(e => e.verificationResult === 'failed').length,
      verificationTypes: this.groupByVerificationType(filteredEvents),
      dailyUsage: this.groupByDay(filteredEvents)
    };
  }

  private groupByVerificationType(events: CardVerificationEvent[]): Record<string, number> {
    return events.reduce((acc, event) => {
      acc[event.verificationType] = (acc[event.verificationType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupByDay(events: CardVerificationEvent[]): Record<string, number> {
    return events.reduce((acc, event) => {
      const day = event.verifiedAt.toISOString().split('T')[0];
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}

export const cardManagementService = new CardManagementService();