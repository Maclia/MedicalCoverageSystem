import axios, { AxiosInstance } from 'axios';
import { config } from '../config/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger();

export interface NlpAnalysisResult {
  text: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number; // -1 to 1
  entities: EntityExtraction[];
  keywords: KeywordWeight[];
  suspiciousPatterns: string[];
  riskScore: number; // 0-100
  language: string;
}

export interface EntityExtraction {
  type:
    | 'PHONE'
    | 'EMAIL'
    | 'LOCATION'
    | 'PERSON'
    | 'ORGANIZATION'
    | 'AMOUNT'
    | 'DATE';
  value: string;
  confidence: number;
}

export interface KeywordWeight {
  keyword: string;
  weight: number; // 0-1
  frequency: number;
}

export class NlpService {
  private nlpClient?: AxiosInstance;
  private suspiciousPatterns: RegExp[];
  private fraudKeywords: Set<string>;

  constructor() {
    this.suspiciousPatterns = [];
    this.fraudKeywords = new Set();
    this.initializeClient();
    this.initializePatterns();
  }

  /**
   * Initialize NLP API client
   */
  private initializeClient(): void {
    const { nlp } = config;

    if (nlp.enabled) {
      this.nlpClient = axios.create({
        baseURL: nlp.apiUrl,
        timeout: nlp.timeout,
        headers: {
          'Authorization': `Bearer ${nlp.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      logger.info(`NLP client initialized`, {
        apiUrl: nlp.apiUrl,
      });
    }
  }

  /**
   * Initialize suspicious patterns and fraud keywords
   */
  private initializePatterns(): void {
    // Regex patterns for detecting suspicious content
    this.suspiciousPatterns = [
      // Medical code manipulation
      /\b(DRG|CPT|ICD-?9|ICD-?10)[\s-]?(\d{3,6})\b/gi,
      // Billing code variations
      /bill(?:ing)?.*(?:code|cpt|hcpcs)/gi,
      // Pharmacy abuse
      /(?:early|excess).*(?:refill|prescription|pharmacy)/gi,
      // Drug/medication suspicious mentions
      /(?:opioid|controlled|schedule|narcotic|abuse)/gi,
      // Clinical testing anomalies
      /(?:unnecessary|excess|duplicate).*(?:test|procedure|imaging)/gi,
      // Emergency room fraud
      /(?:frequent|multiple).*(?:ER|emergency)/gi,
    ];

    // Fraud-related keywords
    this.fraudKeywords = new Set([
      'fake',
      'fraudulent',
      'counterfeit',
      'forged',
      'stolen',
      'unauthorized',
      'illegal',
      'unlawful',
      'deception',
      'manipulation',
      'fabricated',
      'falsified',
      'altered',
      'modified',
      'claimed',
      'billing error',
      'coding error',
      'upcoding',
      'unbundling',
      'duplicate',
      'kickback',
      'bribery',
      'rebate',
      'self-dealing',
    ]);
  }

  /**
   * Analyze clinical notes for fraud indicators
   */
  async analyzeClinicalNotes(clinicalNotes: string): Promise<NlpAnalysisResult> {
    const result: NlpAnalysisResult = {
      text: clinicalNotes,
      sentiment: 'neutral',
      sentimentScore: 0,
      entities: [],
      keywords: [],
      suspiciousPatterns: [],
      riskScore: 0,
      language: 'en',
    };

    try {
      // Call NLP service if available
      if (this.nlpClient) {
        const response = await this.nlpClient.post('/analyze', {
          text: clinicalNotes,
          tasks: ['sentiment', 'entities', 'keywords'],
        });

        result.sentiment = response.data.sentiment;
        result.sentimentScore = response.data.sentimentScore;
        result.entities = response.data.entities || [];
        result.keywords = response.data.keywords || [];
        result.language = response.data.language;
      }

      // Detect suspicious patterns locally
      result.suspiciousPatterns = this.detectPatterns(clinicalNotes);

      // Calculate risk score
      result.riskScore = this.calculateNlpRiskScore(result);

      logger.debug(`Clinical notes analyzed`, {
        textLength: clinicalNotes.length,
        entityCount: result.entities.length,
        patternCount: result.suspiciousPatterns.length,
        riskScore: result.riskScore,
      });
    } catch (error) {
      logger.error(`NLP analysis failed`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return result;
  }

  /**
   * Analyze provider claims descriptions for fraud indicators
   */
  async analyzeClaimsDescription(description: string): Promise<NlpAnalysisResult> {
    const result = await this.analyzeClinicalNotes(description);

    // Additional checks for claims-specific fraud
    const claimsFraudPatterns = this.detectClaimsFraudPatterns(description);
    result.suspiciousPatterns.push(...claimsFraudPatterns);

    // Recalculate risk score with claims fraud patterns
    result.riskScore = this.calculateNlpRiskScore(result);

    return result;
  }

  /**
   * Analyze communication for fraud indicators
   */
  async analyzeCommunication(text: string): Promise<NlpAnalysisResult> {
    const result = await this.analyzeClinicalNotes(text);

    // Detect high-risk communication patterns
    if (this.containsFraudKeywords(text)) {
      result.riskScore = Math.min(100, result.riskScore + 20);
    }

    // Detect pressure tactics
    if (this.detectPressureTactics(text)) {
      result.riskScore = Math.min(100, result.riskScore + 15);
    }

    return result;
  }

  /**
   * Extract and validate entities from notes
   */
  async extractAndValidateEntities(text: string): Promise<EntityExtraction[]> {
    const entities: EntityExtraction[] = [];

    // Phone numbers
    const phoneRegex = /(?:\+1|1)?\s*\(?(\d{3})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})/g;
    let match;
    while ((match = phoneRegex.exec(text)) !== null) {
      entities.push({
        type: 'PHONE',
        value: match[0],
        confidence: 0.95,
      });
    }

    // Email addresses
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    while ((match = emailRegex.exec(text)) !== null) {
      entities.push({
        type: 'EMAIL',
        value: match[0],
        confidence: 0.98,
      });
    }

    // Currency amounts
    const amountRegex = /\$\s?([\d,]+(?:\.\d{2})?)/g;
    while ((match = amountRegex.exec(text)) !== null) {
      entities.push({
        type: 'AMOUNT',
        value: match[1],
        confidence: 0.90,
      });
    }

    // Dates
    const dateRegex =
      /(?:\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/g;
    while ((match = dateRegex.exec(text)) !== null) {
      entities.push({
        type: 'DATE',
        value: match[0],
        confidence: 0.85,
      });
    }

    logger.debug(`Entities extracted from text`, {
      entityCount: entities.length,
      types: [...new Set(entities.map(e => e.type))],
    });

    return entities;
  }

  /**
   * Detect suspicious patterns in text
   */
  private detectPatterns(text: string): string[] {
    const patterns: string[] = [];

    this.suspiciousPatterns.forEach(pattern => {
      if (pattern.test(text)) {
        patterns.push(pattern.source);
      }
    });

    return patterns;
  }

  /**
   * Detect claims-specific fraud patterns
   */
  private detectClaimsFraudPatterns(text: string): string[] {
    const patterns: string[] = [];

    const claimsPatterns = [
      {
        name: 'Billing code manipulation',
        regex: /(?:change|modify|alter).*(?:code|cpt|icd)/gi,
      },
      {
        name: 'Medical necessity denial',
        regex: /(?:not necessary|unnecessary procedure|no medical need)/gi,
      },
      {
        name: 'Excessive testing',
        regex: /(?:excessive|unnecessary|redundant).*(?:test|lab|imaging)/gi,
      },
      {
        name: 'Upcoding indicators',
        regex: /(?:upgrade|upcode|higher level|more severe)/gi,
      },
      {
        name: 'Unbundling indicators',
        regex: /(?:separate|itemized|billed separately).*(?:procedure|service)/gi,
      },
    ];

    claimsPatterns.forEach(({ name, regex }) => {
      if (regex.test(text)) {
        patterns.push(name);
      }
    });

    return patterns;
  }

  /**
   * Check if text contains fraud keywords
   */
  private containsFraudKeywords(text: string): boolean {
    const lowerText = text.toLowerCase();
    for (const keyword of this.fraudKeywords) {
      if (lowerText.includes(keyword)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Detect pressure tactics in communication
   */
  private detectPressureTactics(text: string): boolean {
    const pressurePatterns = [
      /(?:must|must immediately|required to|have to|must act)/gi,
      /(?:urgent|emergency|time-sensitive|act now)/gi,
      /(?:deadline|expires|limited time)/gi,
      /(?:threats?|legal|lawsuit|prosecution)/gi,
    ];

    return pressurePatterns.some(pattern => pattern.test(text));
  }

  /**
   * Calculate NLP risk score
   */
  private calculateNlpRiskScore(result: NlpAnalysisResult): number {
    let score = 0;

    // Sentiment risk: negative sentiment increases risk
    if (result.sentimentScore < -0.3) {
      score += Math.abs(result.sentimentScore) * 30;
    }

    // Suspicious patterns increase risk
    score += result.suspiciousPatterns.length * 15;

    // Fraud keywords increase risk
    const fraudKeywordCount = result.keywords.filter(k =>
      this.fraudKeywords.has(k.keyword.toLowerCase())
    ).length;
    score += fraudKeywordCount * 20;

    // High-risk entity combinations
    const phoneCount = result.entities.filter(e => e.type === 'PHONE').length;
    const emailCount = result.entities.filter(e => e.type === 'EMAIL').length;

    if (phoneCount > 3 || emailCount > 3) {
      score += 20; // Multiple contact attempts
    }

    return Math.min(100, score);
  }

  /**
   * Get NLP service status
   */
  getStatus(): { enabled: boolean; configured: boolean } {
    return {
      enabled: config.nlp.enabled,
      configured: !!this.nlpClient,
    };
  }
}

// Export singleton instance
export const nlpService = new NlpService();
