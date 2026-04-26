import { Request, Response } from 'express';
import { LeadService } from '../services/LeadService';

export class LeadsController {
  private leadService: LeadService;

  constructor() {
    this.leadService = new LeadService();
  }

  /**
   * Create new lead
   */
  createLead = async (req: Request, res: Response) => {
    try {
      const lead = await this.leadService.createLead(req.body, { userId: (req as any).userId });
      res.status(201).json(lead);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  /**
   * Get lead by ID
   */
  getLeadById = async (req: Request, res: Response) => {
    try {
      const lead = await this.leadService.getLeadById(parseInt(req.params.id, 10));
      res.json(lead);
    } catch (error) {
      res.status(404).json({ error: (error as Error).message });
    }
  };

  /**
   * Update lead
   */
  updateLead = async (req: Request, res: Response) => {
    try {
      const lead = await this.leadService.updateLead(
        parseInt(req.params.id, 10),
        req.body,
        { userId: (req as any).userId }
      );
      res.json(lead);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  /**
   * Search leads
   */
  searchLeads = async (req: Request, res: Response) => {
    try {
      const results = await this.leadService.searchLeads(req.body);
      res.json(results);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };
}