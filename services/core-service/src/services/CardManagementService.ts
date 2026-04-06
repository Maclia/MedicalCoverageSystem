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
  async generateMemberCard(request: CardGenerationRequest) {
    try {
      const cardNumber = this.generateCardNumber();
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 5);
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

      const qrCodeData = this.generateQRCodeData(request.memberId, cardNumber);
      const digitalCardUrl = `/cards/digital/${request.memberId}/${cardNumber}`;

      const cardResult = await db.execute(
        sql`INSERT INTO member_cards 
            (member_id, card_number, card_type, status, template_type, expiry_date, qr_code_data, digital_card_url, nfc_enabled, chip_enabled, personalization_data, delivery_method, delivery_address)
            VALUES (${request.memberId}, ${cardNumber}, ${request.cardType}, 'pending', ${templateType}, ${expiryDate}, ${qrCodeData}, ${digitalCardUrl}, true, true, ${JSON.stringify({ template: templateType, generated: new Date() })}, ${request.expeditedShipping ? 'express' : 'standard_mail'}, ${request.deliveryAddress || null})
            RETURNING *`
      );

      const card = cardResult.rows[0];

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

  async verifyCard(request: CardVerificationRequest, memberId: number | null = null) {
    try {
      const cardInfo = this.parseQRCodeData(request.qrCodeData);
      let cardData: any;

      if (cardInfo.cardId) {
        const cardResult = await db.execute(
          sql`SELECT mc.*, m.status as member_status, m.plan_id 
              FROM member_cards mc
              JOIN members m ON mc.member_id = m.id
              WHERE mc.id = ${cardInfo.cardId}
              LIMIT 1`
        );
        if (cardResult.rows.length > 0) {
          cardData = cardResult.rows[0];
        }
      }

      if (!cardData && cardInfo.cardNumber) {
        const cardResult = await db.execute(
          sql`SELECT mc.*, m.status as member_status, m.plan_id 
              FROM member_cards mc
              JOIN members m ON mc.member_id = m.id
              WHERE mc.card_number = ${cardInfo.cardNumber}
              LIMIT 1`
        );
        if (cardResult.rows.length > 0) {
          cardData = cardResult.rows[0];
        }
      }

      if (!cardData) {
        throw new Error('Card not found');
      }

      const now = new Date();
      const expiryDate = new Date(cardData.expiry_date);
      const isActive = cardData.status === 'active' && expiryDate > now && cardData.member_status === 'active';

      let fraudRiskScore = 0;
      const fraudIndicators: string[] = [];

      if (cardData.status === 'lost' || cardData.status === 'stolen') {
        fraudRiskScore += 100;
        fraudIndicators.push('Card reported lost/stolen');
      }

      if (expiryDate <= now) {
        fraudRiskScore += 50;
        fraudIndicators.push('Card expired');
      }

      if (!isActive && cardData.status !== 'inactive') {
        fraudRiskScore += 40;
        fraudIndicators.push('Card inactive or suspended');
      }

      if (request.geolocation) {
        const lastVerificationLocation = await this.getLastVerificationLocation(cardData.id);
        if (lastVerificationLocation) {
          const distance = this.calculateDistance(
            request.geolocation.lat,
            request.geolocation.lng,
            lastVerificationLocation.lat,
            lastVerificationLocation.lng
          );

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

  async requestCardReplacement(cardId: number, reason: string, expedited: boolean = false) {
    try {
      const originalCard = await this.getCard(cardId);

      await db.execute(
        sql`UPDATE member_cards 
            SET status = 'replaced', 
                replacement_reason = ${reason}, 
                updated_at = ${new Date()}
            WHERE id = ${cardId}`
      );

      const newCardRequest: CardGenerationRequest = {
        memberId: originalCard.member_id,
        cardType: originalCard.card_type,
        expeditedShipping: expedited,
        deliveryAddress: originalCard.delivery_address,
      };

      const newCard = await this.generateMemberCard(newCardRequest);

      return {
        success: true,
        newCard: newCard.card,
        message: `Card replacement requested. New card number: ${newCard.card.card_number}`,
      };
    } catch (error) {
      throw new Error(`Failed to request card replacement: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async initializePhysicalCardProduction(cardId: number) {
    try {
      await db.execute(
        sql`INSERT INTO card_production_batches 
            (card_id, production_stage, status, started_at)
            VALUES (${cardId}, 'initiated', 'pending', ${new Date()})`
      );
    } catch (error) {
      throw new Error(`Failed to initialize physical card production: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getCardProductionStatus(cardId: number) {
    try {
      const result = await db.execute(
        sql`SELECT cpb.*, u.name as operator_name
            FROM card_production_batches cpb
            LEFT JOIN users u ON cpb.operator_id = u.id
            WHERE cpb.card_id = ${cardId}
            ORDER BY cpb.created_at DESC
            LIMIT 1`
      );

      if (!result.rows.length) {
        throw new Error('Production record not found');
      }

      const production = result.rows[0];
      return {
        cardId: production.card_id,
        stage: production.production_stage,
        status: production.status,
        startedAt: production.started_at,
        completedAt: production.completed_at,
        operator: production.operator_name,
        trackingNumber: production.tracking_number,
        estimatedDelivery: production.estimated_delivery,
      };
    } catch (error) {
      throw new Error(`Failed to get production status: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async updateProductionStage(cardId: number, stage: string, operatorId: number, notes?: string) {
    try {
      const isComplete = stage === 'delivered' || stage === 'quality_check';
      const completedAt = isComplete ? new Date() : null;

      await db.execute(
        sql`UPDATE card_production_batches 
            SET production_stage = ${stage}, 
                status = ${isComplete ? 'completed' : 'in_progress'},
                operator_id = ${operatorId},
                notes = ${notes || null},
                completed_at = ${completedAt},
                updated_at = ${new Date()}
            WHERE card_id = ${cardId}
            AND (status = 'pending' OR status = 'in_progress')`
      );

      if (stage === 'shipped') {
        await db.execute(
          sql`UPDATE member_cards 
              SET status = 'active', 
                  shipped_at = ${new Date()},
                  updated_at = ${new Date()}
              WHERE id = ${cardId}`
        );
      }

      return {
        success: true,
        message: `Card production stage updated to ${stage}`,
      };
    } catch (error) {
      throw new Error(`Failed to update production stage: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getCardStatistics(startDate?: Date, endDate?: Date) {
    try {
      const dateCondition = startDate && endDate 
        ? sql`WHERE created_at BETWEEN ${startDate} AND ${endDate}`
        : startDate 
          ? sql`WHERE created_at >= ${startDate}`
          : endDate 
            ? sql`WHERE created_at <= ${endDate}`
            : sql``;

      const statsResult = await db.execute(
        sql`SELECT 
            COUNT(*) as total_cards,
            COUNT(CASE WHEN status = 'active' THEN 1 END) as active_cards,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_cards,
            COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_cards,
            COUNT(CASE WHEN status = 'lost' OR status = 'stolen' THEN 1 END) as lost_stolen_cards,
            COUNT(CASE WHEN card_type = 'physical' THEN 1 END) as physical_cards,
            COUNT(CASE WHEN card_type = 'digital' THEN 1 END) as digital_cards
            FROM member_cards ${dateCondition}`
      );

      const verificationStatsResult = await db.execute(
        sql`SELECT 
            COUNT(*) as total_verifications,
            COUNT(CASE WHEN verification_result = 'success' THEN 1 END) as successful_verifications,
            COUNT(CASE WHEN verification_result = 'failed' THEN 1 END) as failed_verifications,
            AVG(fraud_risk_score) as avg_fraud_score
            FROM card_verification_events`
      );

      return {
        cards: statsResult.rows[0],
        verifications: verificationStatsResult.rows[0],
      };
    } catch (error) {
      throw new Error(`Failed to get card statistics: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async bulkGenerateCards(requests: CardGenerationRequest[]) {
    try {
      const results = [];
      const errors = [];

      for (const request of requests) {
        try {
          const result = await this.generateMemberCard(request);
          results.push(result);
        } catch (error) {
          errors.push({
            memberId: request.memberId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return {
        success: errors.length === 0,
        totalProcessed: requests.length,
        successful: results.length,
        failed: errors.length,
        results,
        errors,
      };
    } catch (error) {
      throw new Error(`Bulk card generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async deactivateExpiredCards() {
    try {
      const result = await db.execute(
        sql`UPDATE member_cards 
            SET status = 'expired', 
                deactivation_date = ${new Date()},
                updated_at = ${new Date()}
            WHERE expiry_date < ${new Date()}
            AND status = 'active'
            RETURNING id, card_number, expiry_date`
      );

      return {
        success: true,
        deactivatedCount: result.rows.length,
        cards: result.rows,
      };
    } catch (error) {
      throw new Error(`Failed to deactivate expired cards: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getVerificationHistory(cardId: number, limit: number = 50) {
    try {
      const history = await db.execute(
        sql`SELECT cve.*, u.name as verifier_name
            FROM card_verification_events cve
            LEFT JOIN users u ON cve.verifier_id = u.id
            WHERE cve.card_id = ${cardId}
            ORDER BY cve.verification_timestamp DESC
            LIMIT ${limit}`
      );

      return history.rows;
    } catch (error) {
      throw new Error(`Failed to get verification history: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private generateCardNumber(): string {
    const prefix = 'MCS';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  private generateQRCodeData(memberId: number, cardNumber: string): string {
    const data = {
      mid: memberId,
      cn: cardNumber,
      ts: Date.now(),
    };
    return Buffer.from(JSON.stringify(data)).toString('base64');
  }

  private parseQRCodeData(qrCodeData: string): { cardId?: number; cardNumber?: string; memberId?: number } {
    try {
      const decoded = Buffer.from(qrCodeData, 'base64').toString('utf-8');
      const data = JSON.parse(decoded);
      return {
        cardId: data.cid,
        cardNumber: data.cn,
        memberId: data.mid,
      };
    } catch {
      return {};
    }
  }

  private maskCardNumber(cardNumber: string): string {
    if (cardNumber.length <= 8) {
      return cardNumber;
    }
    return cardNumber.substring(0, 4) + '*'.repeat(cardNumber.length - 8) + cardNumber.substring(cardNumber.length - 4);
  }

  private parseProviderIdToInt(providerId: string): number {
    const parsed = parseInt(providerId, 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private async getLastVerificationLocation(cardId: number): Promise<{ lat: number; lng: number } | null> {
    try {
      const result = await db.execute(
        sql`SELECT geolocation 
            FROM card_verification_events 
            WHERE card_id = ${cardId} 
            AND geolocation IS NOT NULL 
            ORDER BY verification_timestamp DESC 
            LIMIT 1`
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

  private async getLastVerificationTime(cardId: number): Promise<Date | null> {
    try {
      const result = await db.execute(
        sql`SELECT verification_timestamp 
            FROM card_verification_events 
            WHERE card_id = ${cardId} 
            ORDER BY verification_timestamp DESC 
            LIMIT 1`
      );

      if (result.rows.length > 0) {
        return new Date(result.rows[0].verification_timestamp);
      }
      return null;
    } catch {
      return null;
    }
  }
}

export const cardManagementService = new CardManagementService();
export default cardManagementService;
