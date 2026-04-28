import { Request, Response } from 'express';
import { CrmService } from '../services/CrmService';

export class QuotesController {
  private crmService: CrmService;

  constructor() {
    this.crmService = new CrmService();
  }

  /**
   * Create new quote
   */
  createQuote = async (req: Request, res: Response) => {
    try {
      const quote = await this.crmService.createQuote(req.body, { userId: (req as any).userId });
      res.status(201).json(quote);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  /**
   * Get quote by ID
   */
  getQuoteById = async (req: Request, res: Response) => {
    try {
      const quote = await this.crmService.getQuoteById(parseInt(req.params.id, 10));
      res.json(quote);
    } catch (error) {
      res.status(404).json({ error: (error as Error).message });
    }
  };

  /**
   * Send quote to multiple insurance providers
   */
  sendToInsurances = async (req: Request, res: Response) => {
    try {
      const result = await this.crmService.sendQuoteToInsurances(
        parseInt(req.params.id, 10),
        req.body.insuranceProviders,
        { userId: (req as any).userId }
      );
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  /**
   * Record received quote from insurance
   */
  recordReceivedQuote = async (req: Request, res: Response) => {
    try {
      const result = await this.crmService.recordReceivedQuote(
        parseInt(req.params.id, 10),
        req.body,
        { userId: (req as any).userId }
      );
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  /**
   * Approve quote and lock other quotes
   */
  approveQuote = async (req: Request, res: Response) => {
    try {
      const result = await this.crmService.approveQuote(
        parseInt(req.params.id, 10),
        req.body,
        { userId: (req as any).userId }
      );
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  /**
   * Reject quote with reason code
   */
  rejectQuote = async (req: Request, res: Response) => {
    try {
      const result = await this.crmService.rejectQuote(
        parseInt(req.params.id, 10),
        req.body.rejectCode,
        req.body.rejectReason,
        { userId: (req as any).userId }
      );
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  /**
   * Update quote during negotiation
   */
  updateNegotiation = async (req: Request, res: Response) => {
    try {
      const result = await this.crmService.updateQuoteNegotiation(
        parseInt(req.params.id, 10),
        req.body,
        { userId: (req as any).userId }
      );
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  /**
   * Attach document to quote (RFP, acceptance letter)
   */
  attachDocument = async (req: Request, res: Response) => {
    try {
      const document = await this.crmService.attachQuoteDocument(
        parseInt(req.params.id, 10),
        req.body,
        { userId: (req as any).userId }
      );
      res.status(201).json(document);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };
}