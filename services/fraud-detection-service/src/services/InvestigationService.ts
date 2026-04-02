import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger.js';

const logger = createLogger();

export interface Investigation {
  id: string;
  investigationId: string;
  alertId: number;
  claimId: number;
  memberId: number;
  providerId: number;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'closed' | 'escalated';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedInvestigator?: number;
  findings: Record<string, any>;
  evidence: EvidenceItem[];
  conclusion?: string;
  estimatedLoss?: number;
  actualLoss?: number;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  targetCompletionDate: string;
}

export interface EvidenceItem {
  id: string;
  type: 'document' | 'transaction' | 'communication' | 'other';
  description: string;
  sourceUrl?: string;
  uploadedAt: string;
  uploadedBy: number;
  significance: 'low' | 'medium' | 'high' | 'critical';
}

export interface InvestigationNote {
  id: string;
  investigationId: string;
  authorId: number;
  authorName: string;
  content: string;
  createdAt: string;
  isPrivate: boolean;
}

export class InvestigationService {
  private investigations: Map<string, Investigation> = new Map();
  private notes: Map<string, InvestigationNote[]> = new Map();

  /**
   * Create a new investigation from fraud alert
   */
  async createInvestigation(
    alertId: number,
    claimId: number,
    memberId: number,
    providerId: number,
    riskLevel: 'medium' | 'high' | 'critical',
    createdBy: number
  ): Promise<Investigation> {
    try {
      const investigationId = uuidv4();
      const id = `inv_${investigationId}`;

      const investigation: Investigation = {
        id,
        investigationId,
        alertId,
        claimId,
        memberId,
        providerId,
        title: `Fraud Investigation - Claim #${claimId}`,
        description: `Investigation triggered by fraud alert #${alertId} for claim #${claimId}`,
        status: 'open',
        priority: this.mapRiskToPriority(riskLevel),
        findings: {},
        evidence: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        targetCompletionDate: this.calculateTargetDate(riskLevel),
      };

      this.investigations.set(id, investigation);
      this.notes.set(id, []);

      logger.info(`Investigation created`, {
        investigationId,
        claimId,
        priority: investigation.priority,
      });

      return investigation;
    } catch (error) {
      logger.error(`Error creating investigation`, {
        claimId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get investigation by ID
   */
  async getInvestigation(investigationId: string): Promise<Investigation | null> {
    return this.investigations.get(investigationId) || null;
  }

  /**
   * Update investigation status
   */
  async updateInvestigationStatus(
    investigationId: string,
    newStatus: Investigation['status'],
    conclusion?: string
  ): Promise<Investigation> {
    const investigation = this.investigations.get(investigationId);

    if (!investigation) {
      throw new Error(`Investigation ${investigationId} not found`);
    }

    investigation.status = newStatus;
    investigation.updatedAt = new Date().toISOString();

    if (newStatus === 'closed' && conclusion) {
      investigation.conclusion = conclusion;
      investigation.closedAt = new DateTime().toISOString();
    }

    this.investigations.set(investigationId, investigation);

    logger.info(`Investigation status updated`, {
      investigationId,
      newStatus,
      claimId: investigation.claimId,
    });

    return investigation;
  }

  /**
   * Assign investigator to investigation
   */
  async assignInvestigator(investigationId: string, investigatorId: number): Promise<Investigation> {
    const investigation = this.investigations.get(investigationId);

    if (!investigation) {
      throw new Error(`Investigation ${investigationId} not found`);
    }

    investigation.assignedInvestigator = investigatorId;
    investigation.status = 'in_progress';
    investigation.updatedAt = new Date().toISOString();

    this.investigations.set(investigationId, investigation);

    logger.info(`Investigator assigned`, {
      investigationId,
      investigatorId,
      claimId: investigation.claimId,
    });

    return investigation;
  }

  /**
   * Add evidence to investigation
   */
  async addEvidence(
    investigationId: string,
    type: EvidenceItem['type'],
    description: string,
    uploadedBy: number,
    sourceUrl?: string,
    significance: EvidenceItem['significance'] = 'medium'
  ): Promise<EvidenceItem> {
    const investigation = this.investigations.get(investigationId);

    if (!investigation) {
      throw new Error(`Investigation ${investigationId} not found`);
    }

    const evidence: EvidenceItem = {
      id: uuidv4(),
      type,
      description,
      sourceUrl,
      uploadedAt: new Date().toISOString(),
      uploadedBy,
      significance,
    };

    investigation.evidence.push(evidence);
    investigation.updatedAt = new Date().toISOString();

    this.investigations.set(investigationId, investigation);

    logger.info(`Evidence added to investigation`, {
      investigationId,
      evidenceId: evidence.id,
      type,
      significance,
    });

    return evidence;
  }

  /**
   * Add note to investigation
   */
  async addNote(
    investigationId: string,
    authorId: number,
    authorName: string,
    content: string,
    isPrivate: boolean = false
  ): Promise<InvestigationNote> {
    const investigation = this.investigations.get(investigationId);

    if (!investigation) {
      throw new Error(`Investigation ${investigationId} not found`);
    }

    const note: InvestigationNote = {
      id: uuidv4(),
      investigationId,
      authorId,
      authorName,
      content,
      createdAt: new Date().toISOString(),
      isPrivate,
    };

    if (!this.notes.has(investigationId)) {
      this.notes.set(investigationId, []);
    }

    this.notes.get(investigationId)!.push(note);
    investigation.updatedAt = new Date().toISOString();
    this.investigations.set(investigationId, investigation);

    logger.info(`Note added to investigation`, {
      investigationId,
      noteId: note.id,
      private: isPrivate,
    });

    return note;
  }

  /**
   * Get investigation notes
   */
  async getInvestigationNotes(investigationId: string, includePrivate: boolean = false): Promise<InvestigationNote[]> {
    let notes = this.notes.get(investigationId) || [];

    if (!includePrivate) {
      notes = notes.filter(n => !n.isPrivate);
    }

    return notes;
  }

  /**
   * Record financial findings
   */
  async recordFinancialFindings(
    investigationId: string,
    estimatedLoss?: number,
    actualLoss?: number,
    findings?: Record<string, any>
  ): Promise<Investigation> {
    const investigation = this.investigations.get(investigationId);

    if (!investigation) {
      throw new Error(`Investigation ${investigationId} not found`);
    }

    if (estimatedLoss !== undefined) {
      investigation.estimatedLoss = estimatedLoss;
    }

    if (actualLoss !== undefined) {
      investigation.actualLoss = actualLoss;
    }

    if (findings) {
      investigation.findings = { ...investigation.findings, ...findings };
    }

    investigation.updatedAt = new Date().toISOString();
    this.investigations.set(investigationId, investigation);

    logger.info(`Financial findings recorded`, {
      investigationId,
      estimatedLoss,
      actualLoss,
    });

    return investigation;
  }

  /**
   * Escalate investigation
   */
  async escalateInvestigation(investigationId: string, reason: string): Promise<Investigation> {
    const investigation = this.investigations.get(investigationId);

    if (!investigation) {
      throw new Error(`Investigation ${investigationId} not found`);
    }

    investigation.status = 'escalated';
    investigation.findings = {
      ...investigation.findings,
      escalationReason: reason,
    };
    investigation.updatedAt = new DateTime().toISOString();

    this.investigations.set(investigationId, investigation);

    logger.info(`Investigation escalated`, {
      investigationId,
      reason,
      claimId: investigation.claimId,
    });

    // TODO: Notify management/escalation queue

    return investigation;
  }

  /**
   * Close investigation
   */
  async closeInvestigation(
    investigationId: string,
    conclusion: string,
    recoveryAmount?: number
  ): Promise<Investigation> {
    const investigation = this.investigations.get(investigationId);

    if (!investigation) {
      throw new Error(`Investigation ${investigationId} not found`);
    }

    investigation.status = 'closed';
    investigation.conclusion = conclusion;
    investigation.closedAt = new Date().toISOString();
    investigation.updatedAt = investigation.closedAt;

    if (recoveryAmount !== undefined) {
      investigation.actualLoss = recoveryAmount;
    }

    this.investigations.set(investigationId, investigation);

    logger.info(`Investigation closed`, {
      investigationId,
      claimId: investigation.claimId,
      conclusion: conclusion.substring(0, 100),
    });

    // TODO: Trigger automated recovery if fraud confirmed

    return investigation;
  }

  /**
   * Get investigations for investigator
   */
  async getInvestigatorWorkload(investigatorId: number): Promise<Investigation[]> {
    const assigned = Array.from(this.investigations.values()).filter(
      inv => inv.assignedInvestigator === investigatorId && inv.status !== 'closed'
    );

    return assigned;
  }

  /**
   * Get open investigations by claim
   */
  async getInvestigationsByClaimId(claimId: number): Promise<Investigation[]> {
    return Array.from(this.investigations.values()).filter(inv => inv.claimId === claimId);
  }

  /**
   * Calculate target completion date based on priority
   */
  private calculateTargetDate(riskLevel: string): string {
    const now = new Date();
    const hoursToAdd = {
      low: 120,
      medium: 72,
      high: 24,
      critical: 1,
    }[riskLevel] || 72;

    const targetDate = new Date(now.getTime() + hoursToAdd * 60 * 60 * 1000);
    return targetDate.toISOString();
  }

  /**
   * Map risk level to priority
   */
  private mapRiskToPriority(riskLevel: string): Investigation['priority'] {
    const map: Record<string, Investigation['priority']> = {
      medium: 'medium',
      high: 'high',
      critical: 'critical',
    };
    return map[riskLevel] || 'medium';
  }
}

// Export singleton instance
export const investigationService = new InvestigationService();
