import { Request, Response } from 'express';
import { BulkImportService } from '../services/BulkImportService';

export class BulkImportController {
  private bulkImportService: BulkImportService;

  constructor() {
    this.bulkImportService = new BulkImportService();
  }

  /**
   * Initiate bulk member upload
   */
  initiateUpload = async (req: Request, res: Response) => {
    try {
      const result = await this.bulkImportService.initiateBulkMemberUpload(
        parseInt(req.body.companyId, 10),
        req.body.fileData,
        req.body.dryRun || false
      );
      res.status(202).json(result);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  /**
   * Get upload status
   */
  getUploadStatus = async (req: Request, res: Response) => {
    try {
      const status = await this.bulkImportService.getBulkUploadStatus(req.params.uploadId);
      res.json(status);
    } catch (error) {
      res.status(404).json({ error: (error as Error).message });
    }
  };

  /**
   * Confirm and process upload
   */
  confirmUpload = async (req: Request, res: Response) => {
    try {
      const result = await this.bulkImportService.confirmBulkMemberUpload(req.params.uploadId);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  };

  /**
   * Get upload validation errors
   */
  getUploadErrors = async (req: Request, res: Response) => {
    try {
      const errors = await this.bulkImportService.getBulkUploadErrors(req.params.uploadId);
      res.json(errors);
    } catch (error) {
      res.status(404).json({ error: (error as Error).message });
    }
  };
}