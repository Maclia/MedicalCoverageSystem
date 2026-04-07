/**
 * Card Management Service
 * Handles all card-related business logic including generation, verification, and production
 */

import crypto from 'crypto';
import { db } from '../config/database';
import { memberCards, cardTemplates, cardVerificationEvents, cardProductionBatches } from '../../../shared/schema';
import { eq, and, desc, gte, lte, count, sum, sql } from 'drizzle-orm';

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
      let templateType = 'standard';

      if (request.templateId) {
        const templateResult = await db.execute(
          sql`SELECT template_type FROM card_templates WHERE id = ${request.templateId} LIMIT 1`
        );
        if (templateResult.rows.length > 0) {
          templateType = templateResult.rows[0].template_type as string;
        }
      } else {
        const defaultTemplate = await db.execute(
          sql`SELECT template_type FROM card_templates WHERE is_default = true AND is_active = true LIMIT 1`
        );
        if (defaultTemplate.rows.length > 0) {
          templateType = defaultTemplate.rows[0].template_type as string;
        }
      }

      // Generate QR code data
      const qrCodeData = this.generateQRCodeData(request.memberId, cardNumber);

      // Generate digital card URL
      const digitalCardUrl = `/cards/digital/${request.memberId}/${cardNumber}`;

      // Create card record using raw SQL
      const cardResult = await db.execute(
        sql`INSERT INTO member_cards 
            (member_id, card_number, card_type, status, template_type, expiry_date, qr_code_data, digital_card_url, nfc_enabled, chip_enabled, personalization_data, delivery_method, delivery_address)
            VALUES (${request.memberId}, ${cardNumber}, ${request.cardType}, 'pending', ${templateType}, ${expiryDate}, ${qrCodeData}, ${digitalCardUrl}, true, true, ${JSON.stringify({ template: templateType, generated: new Date() })}, ${request.expeditedShipping ? 'express' : 'standard_mail'}, ${request.deliveryAddress || null})
            RETURNING *`
      );

      const card = cardResult.rows[0];

      // If physical card requested, create production batch record
      if (request.cardType === 'physical' || request.cardType === 'both') {
        await this.initializePhysicalCardProduction(card.id);
      }

      return {
        success: true,
        card: card,
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
      let query = sql`SELECT * FROM member_cards WHERE member_id = ${memberId}`;

      if (activeOnly) {
        query = sql`SELECT * FROM member_cards WHERE member_id = ${memberId} AND status = 'active'`;
      }

      const cards = await db.execute(query);
      return cards.rows;
    } catch (error) {
      throw new Error(`Failed to retrieve member cards: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get a specific card
   */
  async getCard(cardId: number) {
    try {
      const card = await db.execute(
        sql`SELECT * FROM member_cards WHERE id = ${cardId} LIMIT 1`
      );

      if (!card.rows.length) {
        throw new Error('Card not found');
      }

      return card.rows[0];
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
      const cardResult = await db.execute(
        sql`SELECT * FROM member_cards WHERE card_number = ${cardInfo.cardNumber} LIMIT 1`
      );

      if (!cardResult.rows.length) {
        throw new Error('Card not found');
      }

      const cardData = cardResult.rows[0];

      // Check if card is active and not expired
      const now = new Date();
      const expiryDate = new Date(cardData.expiry_date);
      const isExpired = expiryDate < now;
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

      // Create verification event using raw SQL
      const eventResult = await db.execute(
        sql`INSERT INTO card_verification_events 
            (card_id, member_id, verifier_id, verification_method, verification_result, verification_data, ip_address, geolocation, fraud_risk_score, fraud_indicators, verification_timestamp)
            VALUES (${cardData.id}, ${memberId || cardData.member_id}, ${this.parseProviderIdToInt(request.providerId)}, ${request.verificationType}, ${verificationResult}, ${JSON.stringify({ qrCodeData: request.qrCodeData, location: request.location, deviceInfo: request.deviceInfo })}, ${request.ipAddress || null}, ${request.geolocation ? JSON.stringify(request.geolocation) : null}, ${fraudRiskScore}, ${JSON.stringify(fraudIndicators)}, ${now})
            RETURNING *`
      );

      const event = eventResult.rows[0];

      return {
        success: verificationResult === 'success',
        card: {
          id: cardData.id,
          memberId: cardData.member_id,
          cardNumber: this.maskCardNumber(cardData.card_number),
          status: cardData.status,
          expiryDate: expiryDate,
        },
        verification: {
          id: event.id,
          method: request.verificationType,
          result: verificationResult,
          fraudRiskScore,
          fraudIndicators,
          timestamp: event.verification_timestamp,
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
      const deactivationDate = ['inactive', 'lost', 'stolen', 'damaged'].includes(update.status)
        ? new Date()
        : null;

      const cardResult = await db.execute(
        sql`UPDATE member_cards 
            SET status = ${update.status}, 
                deactivation_date = ${deactivationDate}, 
                replacement_reason = ${update.reason || null}, 
                updated_at = ${new Date()}
            WHERE id = ${update.cardId}
            RETURNING *`
      );

      if (!cardResult.rows.length) {
        throw new Error('Card not found');
      }

      return {
        success: true,
        card: cardResult.rows[0],
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
      await db.execute(
        sql`UPDATE member_cards 
            SET status = 'replaced', 
                replacement_reason = ${reason}, 
                updated_at = ${new Date()}
            WHERE id = ${cardId}`
      );

      // Generate new card
      const newCardRequest: CardGenerationRequest = {
        memberId: originalCard.member_id,
        cardType: originalCard.card_type,
        expeditedShipping: expedited,
        deliveryAddress: originalCard.delivery_address,
      };

      const newCard = await this.generateMemberCard(newCardRequest);

      return {
        success: true,
        originalCardId: cardId,
        newCard: newCard.card,
        message: 'Card replacement requested successfully',
      };
    } catch (error) {
      throw new Error(`Failed to request card replacement: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get card templates
   */
  async getCardTemplates(activeOnly: boolean = true) {
    try {
      let query = sql`SELECT * FROM card_templates`;

      if (activeOnly) {
        query = sql`SELECT * FROM card_templates WHERE is_active = true`;
      }

      const templates = await db.execute(query);
      return templates.rows;
    } catch (error) {
      throw new Error(`Failed to retrieve card templates: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get production batches
   */
  async getProductionBatches(status?: string) {
    try {
      let query = sql`SELECT * FROM card_production_batches`;

      if (status) {
        query = sql`SELECT * FROM card_production_batches WHERE production_status = ${status}`;
      }

      const batches = await db.execute(query);
      return batches.rows;
    } catch (error) {
      throw new Error(`Failed to retrieve production batches: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get verification events for a card
   */
  async getVerificationHistory(cardId: number, limit: number = 50) {
    try {
      const events = await db.execute(
        sql`SELECT * FROM card_verification_events 
            WHERE card_id = ${cardId} 
            ORDER BY verification_timestamp DESC 
            LIMIT ${limit}`
      );
      return events.rows;
    } catch (error) {
      throw new Error(`Failed to retrieve verification history: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get last verification location for impossible travel detection
   */
  private async getLastVerificationLocation(cardId: number): Promise<{ lat: number; lng: number } | null> {
    try {
      const result = await db.execute(
        sql`SELECT geolocation FROM card_verification_events 
            WHERE card_id = ${cardId} AND geolocation IS NOT NULL 
            ORDER BY verification_timestamp DESC LIMIT 1`
      );

      if (result.rows.length > 0 && result.rows[0].geolocation) {
        const geo = typeof result.rows[0].geolocation === 'string'
          ? JSON.parse(result.rows[0].geolocation)
          : result.rows[0].geolocation;
        return { lat: geo.lat, lng: geo.lng };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get last verification time
   */
  private async getLastVerificationTime(cardId: number): Promise<Date | null> {
    try {
      const result = await db.execute(
        sql`SELECT verification_timestamp FROM card_verification_events 
            WHERE card_id = ${cardId} 
            ORDER BY verification_timestamp DESC LIMIT 1`
      );

      if (result.rows.length > 0) {
        return new Date(result.rows[0].verification_timestamp);
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Initialize physical card production
   */
  private async initializePhysicalCardProduction(cardId: number): Promise<void> {
    try {
      const batchId = `BATCH-${Date.now()}-${cardId}`;

      await db.execute(
        sql`INSERT INTO card_production_batches 
            (batch_id, card_id, production_status, requested_at)
            VALUES (${batchId}, ${cardId}, 'pending', ${new Date()})`
      );
    } catch (error) {
      throw new Error(`Failed to initialize physical card production: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate a unique card number
   */
  private generateCardNumber(): string {
    const prefix = 'MC'; // Medical Coverage
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  /**
   * Generate QR code data
   */
  private generateQRCodeData(memberId: number, cardNumber: string): string {
    const data = {
      memberId,
      cardNumber,
      timestamp: Date.now(),
      checksum: crypto.createHash('sha256').update(`${memberId}:${cardNumber}`).digest('hex').substring(0, 8),
    };
    return Buffer.from(JSON.stringify(data)).toString('base64');
  }

  /**
   * Parse QR code data
   */
  private parseQRCodeData(qrCodeData: string): { memberId: number; cardNumber: string } {
    try {
      const decoded = JSON.parse(Buffer.from(qrCodeData, 'base64').toString('utf-8'));
      return {
        memberId: decoded.memberId,
        cardNumber: decoded.cardNumber,
      };
    } catch {
      throw new Error('Invalid QR code data');
    }
  }

  /**
   * Mask card number for display
   */
  private maskCardNumber(cardNumber: string): string {
    if (cardNumber.length <= 8) {
      return cardNumber;
    }
    return cardNumber.substring(0, 4) + '****' + cardNumber.substring(cardNumber.length - 4);
  }

  /**
   * Parse provider ID to integer
   */
  private parseProviderIdToInt(providerId: string): number {
    const parsed = parseInt(providerId, 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

export const cardManagementService = new CardManagementService();
