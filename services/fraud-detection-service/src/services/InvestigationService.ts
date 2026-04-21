import logger from '../utils/logger';

type Investigation = any;
type InvestigationStatus = any;
type InvestigationConclusion = any;

export class InvestigationService {
  private investigations: Map<string, Investigation> = new Map();

  async createInvestigation(claimId: string, reason: string, riskLevel: string): Promise<Investigation> {
    const investigation: Investigation = {
      id: crypto.randomUUID(),
      claimId,
      reason,
      riskLevel,
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignedTo: null,
      findings: [],
      notes: [],
      timeline: [],
    };

    this.investigations.set(investigation.id, investigation);
    
    logger.info('Investigation created', {
      investigationId: investigation.id,
      claimId,
      riskLevel,
    });

    return investigation;
  }

  async getInvestigation(investigationId: string): Promise<Investigation | null> {
    return this.investigations.get(investigationId) || null;
  }

  async getInvestigationsByClaimId(claimId: string): Promise<Investigation[]> {
    return Array.from(this.investigations.values()).filter(i => i.claimId === claimId);
  }

  async updateInvestigationStatus(
    investigationId: string, 
    newStatus: InvestigationStatus, 
    conclusion?: InvestigationConclusion
  ): Promise<Investigation> {
    const investigation = this.investigations.get(investigationId);
    if (!investigation) {
      throw new Error(`Investigation ${investigationId} not found`);
    }

    investigation.status = newStatus;
    investigation.updatedAt = new Date().toISOString();

    if (newStatus === 'closed' && conclusion) {
      investigation.conclusion = conclusion;
      investigation.closedAt = new Date().toISOString();
    }

    this.investigations.set(investigationId, investigation);

    logger.info(`Investigation status updated`, {
      investigationId,
      newStatus,
      claimId: investigation.claimId,
    });

    return investigation;
  }

  async addFinding(investigationId: string, finding: string, evidence?: any): Promise<Investigation> {
    const investigation = this.investigations.get(investigationId);
    if (!investigation) {
      throw new Error(`Investigation ${investigationId} not found`);
    }

    investigation.findings.push({
      id: crypto.randomUUID(),
      description: finding,
      evidence,
      timestamp: new Date().toISOString(),
    });
    investigation.updatedAt = new Date().toISOString();

    this.investigations.set(investigationId, investigation);
    return investigation;
  }

  async addNote(investigationId: string, note: string, userId: string): Promise<Investigation> {
    const investigation = this.investigations.get(investigationId);
    if (!investigation) {
      throw new Error(`Investigation ${investigationId} not found`);
    }

    investigation.notes.push({
      id: crypto.randomUUID(),
      content: note,
      createdBy: userId,
      createdAt: new Date().toISOString(),
    });
    investigation.updatedAt = new Date().toISOString();

    this.investigations.set(investigationId, investigation);
    return investigation;
  }

  async assignInvestigation(investigationId: string, userId: string): Promise<Investigation> {
    const investigation = this.investigations.get(investigationId);
    if (!investigation) {
      throw new Error(`Investigation ${investigationId} not found`);
    }

    investigation.assignedTo = userId;
    investigation.updatedAt = new Date().toISOString();

    this.investigations.set(investigationId, investigation);

    logger.info(`Investigation assigned`, {
      investigationId,
      assignedTo: userId,
    });

    return investigation;
  }

  async getOpenInvestigations(): Promise<Investigation[]> {
    return Array.from(this.investigations.values()).filter(i => i.status === 'open');
  }

  async getInvestigationsByRiskLevel(riskLevel: string): Promise<Investigation[]> {
    return Array.from(this.investigations.values()).filter(i => i.riskLevel === riskLevel);
  }

  async generateInvestigationReport(investigationId: string): Promise<any> {
    const investigation = this.investigations.get(investigationId);
    if (!investigation) {
      throw new Error(`Investigation ${investigationId} not found`);
    }

    return {
      ...investigation,
      reportGeneratedAt: new Date().toISOString(),
      findingCount: investigation.findings.length,
      noteCount: investigation.notes.length,
      duration: investigation.closedAt 
        ? new Date(investigation.closedAt).getTime() - new Date(investigation.createdAt).getTime()
        : null,
    };
  }
}

export const investigationService = new InvestigationService();