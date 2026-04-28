import { Request, Response } from 'express';
import { CrmService } from '../services/CrmService';

export class ClientsController {
  private crmService: CrmService;

  constructor() {
    this.crmService = new CrmService();
  }

  /**
   * Convert prospect to client
   */
  convertToClient = async (req: Request, res: Response) => {
    try {
      const result = await this.crmService.convertToClient(
        parseInt(req.params.companyId, 10),
        req.body,
        { userId: (req as any).userId }
      );
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  /**
   * Get client by ID
   */
  getClientById = async (req: Request, res: Response) => {
    try {
      const client = await this.crmService.getClientById(parseInt(req.params.id, 10));
      res.json(client);
    } catch (error) {
      res.status(404).json({ error: (error as Error).message });
    }
  };

  /**
   * Upload KYC document for client
   */
  uploadClientDocument = async (req: Request, res: Response) => {
    try {
      const document = await this.crmService.uploadClientDocument(
        parseInt(req.params.id, 10),
        req.body,
        { userId: (req as any).userId }
      );
      res.status(201).json(document);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  /**
   * Attach SLA to client
   */
  attachSLA = async (req: Request, res: Response) => {
    try {
      const result = await this.crmService.attachClientSLA(
        parseInt(req.params.id, 10),
        req.body,
        { userId: (req as any).userId }
      );
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };
}