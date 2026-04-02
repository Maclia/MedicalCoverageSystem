import axios, { AxiosInstance } from 'axios';
import { config } from '../config/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger();

export interface ExternalDatabaseResult {
  source: 'mib' | 'nicb' | 'ndh';
  found: boolean;
  matchType?: 'exact' | 'probable' | 'possible';
  matchDetails?: Record<string, any>;
  recordDate?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  caseNumber?: string;
  riskScore: number; // 0-100
}

export interface MemberId {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  ssn?: string;
}

export interface ProviderId {
  npi?: string;
  tinEin?: string;
  providerName: string;
  speciality?: string;
}

export class ExternalDatabaseService {
  private mibClient?: AxiosInstance;
  private nicbClient?: AxiosInstance;
  private ndhClient?: AxiosInstance;

  constructor() {
    this.initializeClients();
  }

  /**
   * Initialize external database API clients
   */
  private initializeClients(): void {
    const { externalDatabases } = config;

    if (externalDatabases.mib.enabled) {
      this.mibClient = axios.create({
        baseURL: externalDatabases.mib.apiUrl,
        timeout: externalDatabases.mib.timeout,
        headers: {
          'Authorization': `Bearer ${externalDatabases.mib.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      logger.info(`MIB client initialized`, {
        apiUrl: externalDatabases.mib.apiUrl,
      });
    }

    if (externalDatabases.nicb.enabled) {
      this.nicbClient = axios.create({
        baseURL: externalDatabases.nicb.apiUrl,
        timeout: externalDatabases.nicb.timeout,
        headers: {
          'Authorization': `Bearer ${externalDatabases.nicb.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      logger.info(`NICB client initialized`, {
        apiUrl: externalDatabases.nicb.apiUrl,
      });
    }

    if (externalDatabases.ndh.enabled) {
      this.ndhClient = axios.create({
        baseURL: externalDatabases.ndh.apiUrl,
        timeout: externalDatabases.ndh.timeout,
        headers: {
          'Authorization': `Bearer ${externalDatabases.ndh.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      logger.info(`NDH client initialized`, {
        apiUrl: externalDatabases.ndh.apiUrl,
      });
    }
  }

  /**
   * Check member against external fraud databases
   */
  async checkMemberFraudHistory(member: MemberId): Promise<ExternalDatabaseResult[]> {
    const results: ExternalDatabaseResult[] = [];

    try {
      logger.info(`Checking member against external fraud databases`, {
        memberName: `${member.firstName} ${member.lastName}`,
      });

      // Check MIB (Medical Information Bureau)
      if (this.mibClient) {
        const mibResult = await this.checkMibDatabase(member);
        results.push(mibResult);
      }

      // Check NICB (National Insurance Crime Bureau)
      if (this.nicbClient) {
        const nicbResult = await this.checkNicbDatabase(member);
        results.push(nicbResult);
      }

      // Check NDH (National Dental History)
      if (this.ndhClient) {
        const ndhResult = await this.checkNdhDatabase(member);
        results.push(ndhResult);
      }

      logger.info(`External fraud check completed for member`, {
        memberName: `${member.firstName} ${member.lastName}`,
        matches: results.filter(r => r.found).length,
      });

      return results;
    } catch (error) {
      logger.error(`Error checking member fraud history`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Check provider against external fraud databases
   */
  async checkProviderFraudHistory(provider: ProviderId): Promise<ExternalDatabaseResult[]> {
    const results: ExternalDatabaseResult[] = [];

    try {
      logger.info(`Checking provider against external fraud databases`, {
        providerName: provider.providerName,
      });

      // NICB has provider fraud data
      if (this.nicbClient) {
        const nicbResult = await this.checkNicbProviderDatabase(provider);
        results.push(nicbResult);
      }

      logger.info(`External fraud check completed for provider`, {
        providerName: provider.providerName,
        matches: results.filter(r => r.found).length,
      });

      return results;
    } catch (error) {
      logger.error(`Error checking provider fraud history`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Check MIB (Medical Information Bureau) database
   */
  private async checkMibDatabase(member: MemberId): Promise<ExternalDatabaseResult> {
    const result: ExternalDatabaseResult = {
      source: 'mib',
      found: false,
      riskScore: 0,
    };

    try {
      if (!this.mibClient) {
        logger.warn(`MIB client not initialized`);
        return result;
      }

      const response = await this.mibClient.post('/fraud-check', {
        firstName: member.firstName,
        lastName: member.lastName,
        dateOfBirth: member.dateOfBirth,
        ssn: member.ssn,
      });

      if (response.data.found) {
        result.found = true;
        result.matchType = response.data.matchType;
        result.matchDetails = response.data.details;
        result.recordDate = response.data.recordDate;
        result.severity = response.data.severity;
        result.riskScore = this.calculateMibRiskScore(response.data);
      }

      logger.debug(`MIB check completed`, {
        memberName: `${member.firstName} ${member.lastName}`,
        found: result.found,
      });
    } catch (error) {
      logger.error(`MIB database check failed`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return result;
  }

  /**
   * Check NICB (National Insurance Crime Bureau) database
   */
  private async checkNicbDatabase(member: MemberId): Promise<ExternalDatabaseResult> {
    const result: ExternalDatabaseResult = {
      source: 'nicb',
      found: false,
      riskScore: 0,
    };

    try {
      if (!this.nicbClient) {
        logger.warn(`NICB client not initialized`);
        return result;
      }

      const response = await this.nicbClient.post('/healthcare-fraud-check', {
        firstName: member.firstName,
        lastName: member.lastName,
        dateOfBirth: member.dateOfBirth,
        ssn: member.ssn,
      });

      if (response.data.found) {
        result.found = true;
        result.matchType = response.data.matchType;
        result.matchDetails = response.data.details;
        result.caseNumber = response.data.caseNumber;
        result.severity = response.data.severity;
        result.riskScore = this.calculateNicbRiskScore(response.data);
      }

      logger.debug(`NICB check completed`, {
        memberName: `${member.firstName} ${member.lastName}`,
        found: result.found,
      });
    } catch (error) {
      logger.error(`NICB database check failed`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return result;
  }

  /**
   * Check NICB provider database
   */
  private async checkNicbProviderDatabase(provider: ProviderId): Promise<ExternalDatabaseResult> {
    const result: ExternalDatabaseResult = {
      source: 'nicb',
      found: false,
      riskScore: 0,
    };

    try {
      if (!this.nicbClient) {
        return result;
      }

      const response = await this.nicbClient.post('/provider-fraud-check', {
        npi: provider.npi,
        tinEin: provider.tinEin,
        providerName: provider.providerName,
      });

      if (response.data.found) {
        result.found = true;
        result.matchType = response.data.matchType;
        result.matchDetails = response.data.details;
        result.caseNumber = response.data.caseNumber;
        result.riskScore = this.calculateNicbRiskScore(response.data);
      }

      logger.debug(`NICB provider check completed`, {
        providerName: provider.providerName,
        found: result.found,
      });
    } catch (error) {
      logger.error(`NICB provider database check failed`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return result;
  }

  /**
   * Check NDH (National Dental History) database
   */
  private async checkNdhDatabase(member: MemberId): Promise<ExternalDatabaseResult> {
    const result: ExternalDatabaseResult = {
      source: 'ndh',
      found: false,
      riskScore: 0,
    };

    try {
      if (!this.ndhClient) {
        logger.warn(`NDH client not initialized`);
        return result;
      }

      const response = await this.ndhClient.post('/fraud-check', {
        firstName: member.firstName,
        lastName: member.lastName,
        dateOfBirth: member.dateOfBirth,
        ssn: member.ssn,
      });

      if (response.data.found) {
        result.found = true;
        result.matchType = response.data.matchType;
        result.matchDetails = response.data.details;
        result.severity = response.data.severity;
        result.riskScore = this.calculateNdhRiskScore(response.data);
      }

      logger.debug(`NDH check completed`, {
        memberName: `${member.firstName} ${member.lastName}`,
        found: result.found,
      });
    } catch (error) {
      logger.error(`NDH database check failed`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return result;
  }

  /**
   * Calculate risk score from MIB response
   */
  private calculateMibRiskScore(data: any): number {
    const severityMap: Record<string, number> = {
      critical: 90,
      high: 70,
      medium: 50,
      low: 30,
    };

    let score = severityMap[data.severity] || 40;

    // Adjust based on match type
    if (data.matchType === 'exact') {
      score += 10;
    } else if (data.matchType === 'probable') {
      score += 5;
    }

    return Math.min(100, score);
  }

  /**
   * Calculate risk score from NICB response
   */
  private calculateNicbRiskScore(data: any): number {
    const severityMap: Record<string, number> = {
      critical: 95,
      high: 75,
      medium: 55,
      low: 35,
    };

    let score = severityMap[data.severity] || 45;

    // Adjust based on case status
    if (data.caseStatus === 'active') {
      score += 15;
    }

    return Math.min(100, score);
  }

  /**
   * Calculate risk score from NDH response
   */
  private calculateNdhRiskScore(data: any): number {
    const severityMap: Record<string, number> = {
      critical: 85,
      high: 65,
      medium: 45,
      low: 25,
    };

    return Math.min(100, severityMap[data.severity] || 40);
  }

  /**
   * Get integration status
   */
  getIntegrationStatus(): Record<string, boolean> {
    return {
      mib: config.externalDatabases.mib.enabled && !!this.mibClient,
      nicb: config.externalDatabases.nicb.enabled && !!this.nicbClient,
      ndh: config.externalDatabases.ndh.enabled && !!this.ndhClient,
    };
  }
}

// Export singleton instance
export const externalDatabaseService = new ExternalDatabaseService();
