/**
 * Card Management Service
 * Handles all card-related business logic including generation, verification, and production
 */

import crypto from 'crypto';
import { db } from '../config/database';
import { memberCards, cardTemplates, cardVerificationEvents, cardProductionBatches } from '../../../shared/schema';
import { eq, and, desc, gte, lte, count, sum } from 'drizzle-orm';

export interface CardGenerationRequest {
  memberId: number;
  cardType: 'digital' | 'physical' | 'both';
  templateId?: number;
  expeditedShipping?: boolean;
  deliveryAddress?: string;
}

export interface CardVerificationRequest {
  qrCodeData: string;
  providerId: string;
  verificationType: 'qr_scan' | 'card_number' | 'api_call' | 'nfc';
  location?: string;
  deviceInfo?: string;
  ipAddress?: string;
  geolocation?: { lat: number; lng: number };
}

export interface CardStatusUpdate {
  cardId: number;
  status: 'active' | 'inactive' | 'expired' | 'lost' | 'stolen' | 'damaged' | 'replaced';
  reason?: string;
}

class CardManagementService {
  /**
   * Generate a new card for a member
   */
  async generateMemberCard(request: CardGenerationRequest) {
    try {
      // Generate unique card number
      const cardNumber = this.generateCardNumber();

      // Set expiry date (typically 5 years from now)
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 5);

      // Get template (use default if not specified)
      const template = request.templateId
        ? await db
            .select()
            .from(cardTemplates)
            .where(eq(cardTemplates.id, request.templateId))
            .limit(1)
        : await db
            .select()
            .from(cardTemplates)
            .where(and(eq(cardTemplates.isDefault, true), eq(cardTemplates.isActive, true)))
            .limit(1);

      // Generate QR code data
      const qrCodeData = this.generateQRCodeData(request.memberId, cardNumber);

      // Generate digital card URL
      const digitalCardUrl = `/cards/digital/${request.memberId}/${cardNumber}`;

      // Create card record
      const card = await db
        .insert(memberCards)
        .values({
          memberId: request.memberId,
          cardNumber,
          cardType: request.cardType,
          status: 'pending',
          templateType: template[0]?.templateType || 'standard',
          expiryDate,
          qrCodeData,
          digitalCardUrl,
          nfcEnabled: true,
          chipEnabled: true,
          personalizationData: JSON.stringify({
            template: template[0],
            generated: new Date(),
          }),
          deliveryMethod: request.expeditedShipping ? 'express' : 'standard_mail',
          deliveryAddress: request.deliveryAddress,
        })
        .returning();

      // If physical card requested, create production batch record
      if (request.cardType === 'physical' || request.cardType === 'both') {
        await this.initializePhysicalCardProduction(card[0].id);
      }

      return {
        success: true,
        card: card[0],
        message: `Card generated successfully with number ${cardNumber}`,
      };
    } catch (error) {
      throw new Error(`Failed to generate card: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get all cards for a member
   */
  async getMemberCards(memberId: number, activeOnly: boolean = false) {
    try {
      let query = db.select().from(memberCards).where(eq(memberCards.memberId, memberId));

      if (activeOnly) {
        query = query.where(eq(memberCards.status, 'active'));
      }

      const cards = await query;
      return cards;
    } catch (error) {
      throw new Error(`Failed to retrieve member cards: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get a specific card
   */
  async getCard(cardId: number) {
    try {
      const card = await db
        .select()
        .from(memberCards)
        .where(eq(memberCards.id, cardId))
        .limit(1);

      if (!card.length) {
        throw new Error('Card not found');
      }

      return card[0];
    } catch (error) {
      throw new Error(`Failed to retrieve card: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Verify a card
   */
  async verifyCard(request: CardVerificationRequest, memberId: number | null = null) {
    try {
      // Parse QR code data to get card info
      const cardInfo = this.parseQRCodeData(request.qrCodeData);

      // Find the card
      const card = await db
        .select()
        .from(memberCards)
        .where(eq(memberCards.cardNumber, cardInfo.cardNumber))
        .limit(1);

      if (!card.length) {
        throw new Error('Card not found');
      }

      const cardData = card[0];

      // Check if card is active and not expired
      const now = new Date();
      const isExpired = cardData.expiryDate < now;
      const isActive = cardData.status === 'active' && !isExpired;

      // Calculate fraud risk score
      let fraudRiskScore = 0;
      const fraudIndicators: string[] = [];

      if (cardData.status === 'lost' || cardData.status === 'stolen') {
        fraudRiskScore += 90;
        fraudIndicators.push('Card reported lost/stolen');
      }

      if (isExpired) {
        fraudRiskScore += 50;
        fraudIndicators.push('Card expired');
      }

      if (!isActive && cardData.status !== 'inactive') {
        fraudRiskScore += 40;
        fraudIndicators.push('Card inactive or suspended');
      }

      // Geolocation-based fraud detection (if provided)
      if (request.geolocation) {
        const lastVerificationLocation = await this.getLastVerificationLocation(cardData.id);
        if (lastVerificationLocation) {
          const distance = this.calculateDistance(
            request.geolocation.lat,
            request.geolocation.lng,
            lastVerificationLocation.lat,
            lastVerificationLocation.lng
          );

          // Impossible travel detection (>900 km in < 24 hours)
          const lastVerificationTime = await this.getLastVerificationTime(cardData.id);
          if (lastVerificationTime) {
            const timeDiffHours = (now.getTime() - lastVerificationTime.getTime()) / (1000 * 60 * 60);
            const speed = distance / timeDiffHours;

            if (speed > 900) {
              fraudRiskScore += 70;
              fraudIndicators.push('Impossible travel detected');
            }
          }
        }
      }

      const verificationResult = isActive ? 'success' : 'failed';

      // Create verification event
      const event = await db
        .insert(cardVerificationEvents)
        .values({
          cardId: cardData.id,
          memberId: memberId || cardData.memberId,
          verifierId: this.parseProviderIdToInt(request.providerId),
          verificationMethod: request.verificationType,
          verificationResult,
          verificationData: JSON.stringify({
            qrCodeData: request.qrCodeData,
            location: request.location,
            deviceInfo: request.deviceInfo,
          }),
          ipAddress: request.ipAddress,
          geolocation: request.geolocation ? JSON.stringify(request.geolocation) : null,
          fraudRiskScore,
          fraudIndicators: JSON.stringify(fraudIndicators),
        })
        .returning();

      return {
        success: verificationResult === 'success',
        card: {
          id: cardData.id,
          memberId: cardData.memberId,
          cardNumber: this.maskCardNumber(cardData.cardNumber),
          status: cardData.status,
          expiryDate: cardData.expiryDate,
        },
        verification: {
          id: event[0].id,
          method: request.verificationType,
          result: verificationResult,
          fraudRiskScore,
          fraudIndicators,
          timestamp: event[0].verificationTimestamp,
        },
        message: isActive ? 'Card verified successfully' : 'Card verification failed',
      };
    } catch (error) {
      throw new Error(`Card verification failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update card status
   */
  async updateCardStatus(update: CardStatusUpdate) {
    try {
      const card = await db
        .update(memberCards)
        .set({
          status: update.status,
          deactivationDate: ['inactive', 'lost', 'stolen', 'damaged'].includes(update.status)
            ? new Date()
            : undefined,
          replacementReason: update.reason,
          updatedAt: new Date(),
        })
        .where(eq(memberCards.id, update.cardId))
        .returning();

      if (!card.length) {
        throw new Error('Card not found');
      }

      return {
        success: true,
        card: card[0],
        message: `Card status updated to ${update.status}`,
      };
    } catch (error) {
      throw new Error(`Failed to update card status: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Request card replacement
   */
  async requestCardReplacement(cardId: number, reason: string, expedited: boolean = false) {
    try {
      // Get original card
      const originalCard = await this.getCard(cardId);

      // Mark original card as replaced
      await db
        .update(memberCards)
        .set({
          status: 'replaced',
          deactivationDate: new Date(),
        })
        .where(eq(memberCards.id, cardId));

      // Generate new card
      const newCard = await this.generateMemberCard({
        memberId: originalCard.memberId,
        cardType: originalCard.cardType as 'digital' | 'physical' | 'both',
        templateId: undefined,
        expeditedShipping: expedited,
      });

      // Link to original card
      await db.update(memberCards).set({ previousCardId: cardId }).where(eq(memberCards.id, newCard.card.id));

      return {
        success: true,
        originalCard: cardId,
        newCard: newCard.card,
        message: `Replacement card requested - New card number: ${newCard.card.cardNumber}`,
      };
    } catch (error) {
      throw new Error(`Failed to request replacement: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get all card templates
   */
  async getCardTemplates(activeOnly: boolean = true) {
    try {
      let query = db.select().from(cardTemplates);

      if (activeOnly) {
        query = query.where(eq(cardTemplates.isActive, true));
      }

      return await query;
    } catch (error) {
      throw new Error(`Failed to retrieve templates: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create or update card template
   */
  async upsertCardTemplate(template: any) {
    try {
      if (template.id) {
        const updated = await db
          .update(cardTemplates)
          .set({ ...template, updatedAt: new Date() })
          .where(eq(cardTemplates.id, template.id))
          .returning();
        return updated[0];
      } else {
        const created = await db.insert(cardTemplates).values(template).returning();
        return created[0];
      }
    } catch (error) {
      throw new Error(`Failed to save template: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get production batches
   */
  async getProductionBatches(status?: string) {
    try {
      let query = db.select().from(cardProductionBatches);

      if (status) {
        query = query.where(eq(cardProductionBatches.productionStatus, status));
      }

      return await query;
    } catch (error) {
      throw new Error(`Failed to retrieve batches: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get batch details
   */
  async getBatchDetails(batchId: string) {
    try {
      const batch = await db
        .select()
        .from(cardProductionBatches)
        .where(eq(cardProductionBatches.batchId, batchId))
        .limit(1);

      if (!batch.length) {
        throw new Error('Batch not found');
      }

      return batch[0];
    } catch (error) {
      throw new Error(`Failed to retrieve batch: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update batch status
   */
  async updateBatchStatus(batchId: string, status: string, additionalData?: any) {
    try {
      const updated = await db
        .update(cardProductionBatches)
        .set({
          productionStatus: status,
          ...(status === 'shipped' && { shippingDate: new Date() }),
          ...(status === 'completed' && { completionDate: new Date() }),
          ...additionalData,
          updatedAt: new Date(),
        })
        .where(eq(cardProductionBatches.batchId, batchId))
        .returning();

      if (!updated.length) {
        throw new Error('Batch not found');
      }

      return updated[0];
    } catch (error) {
      throw new Error(`Failed to update batch: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get verification events for a card
   */
  async getCardVerificationHistory(cardId: number, limit: number = 20) {
    try {
      const events = await db
        .select()
        .from(cardVerificationEvents)
        .where(eq(cardVerificationEvents.cardId, cardId))
        .orderBy(desc(cardVerificationEvents.verificationTimestamp))
        .limit(limit);

      return events;
    } catch (error) {
      throw new Error(`Failed to retrieve verification history: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get analytics for card system
   */
  async getCardAnalytics() {
    try {
      const [totalCards, activeCards, verificationStats, recentVerifications] = await Promise.all([
        db
          .select()
          .from(memberCards)
          .then((cards: any[]) => cards.length),

        db
          .select()
          .from(memberCards)
          .where(eq(memberCards.status, 'active'))
          .then((cards: any[]) => cards.length),

        db
          .select()
          .from(cardVerificationEvents)
          .then((events: any[]) => ({
            total: events.length,
            successful: events.filter((e: any) => e.verificationResult === 'success').length,
            failed: events.filter((e: any) => e.verificationResult === 'failed').length,
          })),

        db
          .select()
          .from(cardVerificationEvents)
          .orderBy(desc(cardVerificationEvents.verificationTimestamp))
          .limit(5)
          .then((events: any[]) => events),
      ]);

      return {
        cards: {
          total: totalCards,
          active: activeCards,
          activePercentage: ((activeCards / totalCards) * 100).toFixed(2),
        },
        verification: verificationStats,
        recentVerifications,
      };
    } catch (error) {
      throw new Error(`Failed to generate analytics: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ===== Helper Methods =====

  /**
   * Generate a unique card number
   */
  private generateCardNumber(): string {
    // Generate in format: MC-XXXX-XXXX-XXXX (Medical Coverage Card)
    const parts = [];
    parts.push('MC');
    for (let i = 0; i < 3; i++) {
      const part = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, '0');
      parts.push(part);
    }
    return parts.join('-');
  }

  /**
   * Generate QR code data
   */
  private generateQRCodeData(memberId: number, cardNumber: string): string {
    const timestamp = Date.now();
    const data = `${cardNumber}|${memberId}|${timestamp}`;
    const checksum = crypto.createHash('sha256').update(data).digest('hex').substring(0, 8);
    return `MC|${cardNumber}|${memberId}|${checksum}`;
  }

  /**
   * Parse QR code data
   */
  private parseQRCodeData(qrCodeData: string) {
    const parts = qrCodeData.split('|');
    if (parts[0] !== 'MC' || parts.length < 3) {
      throw new Error('Invalid QR code format');
    }

    return {
      format: parts[0],
      cardNumber: parts[1],
      memberId: parseInt(parts[2]),
      checksum: parts[3] || '',
    };
  }

  /**
   * Mask card number for display
   */
  private maskCardNumber(cardNumber: string): string {
    const parts = cardNumber.split('-');
    if (parts.length >= 4) {
      return `${parts[0]}-${parts[1]}-****-${parts[3]}`;
    }
    return '****';
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Get last verification location for a card
   */
  private async getLastVerificationLocation(cardId: number) {
    try {
      const events = await db
        .select()
        .from(cardVerificationEvents)
        .where(eq(cardVerificationEvents.cardId, cardId))
        .orderBy(desc(cardVerificationEvents.verificationTimestamp))
        .limit(1);

      if (!events.length || !events[0].geolocation) return null;

      const geoData = JSON.parse(events[0].geolocation);
      return { lat: geoData.lat, lng: geoData.lng };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get last verification time for a card
   */
  private async getLastVerificationTime(cardId: number) {
    try {
      const events = await db
        .select()
        .from(cardVerificationEvents)
        .where(eq(cardVerificationEvents.cardId, cardId))
        .orderBy(desc(cardVerificationEvents.verificationTimestamp))
        .limit(1);

      return events.length ? events[0].verificationTimestamp : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Initialize physical card production
   */
  private async initializePhysicalCardProduction(cardId: number) {
    try {
      const batchId = `BATCH-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      await db
        .insert(cardProductionBatches)
        .values({
          batchId,
          batchName: `Batch ${new Date().toISOString()}`,
          batchType: 'initial_issue',
          totalCards: 1,
          processedCards: 0,
          productionStatus: 'pending',
        })
        .returning();

      // Update card with batch ID
      await db.update(memberCards).set({ batchId }).where(eq(memberCards.id, cardId));
    } catch (error) {
      console.error('Failed to initialize physical card production:', error);
    }
  }

  /**
   * Parse provider ID (handle both string and number formats)
   */
  private parseProviderIdToInt(providerId: string): number | null {
    try {
      const id = parseInt(providerId);
      return isNaN(id) ? null : id;
    } catch {
      return null;
    }
  }
}

export const cardManagementService = new CardManagementService();
