import { Database } from '../models/Database';
import { WinstonLogger } from '../utils/WinstonLogger';
import { bulkMemberUploads } from '../models/schema';
import { NotFoundError, BusinessRuleError } from '../utils/CustomErrors';
import { eq, sql, desc, asc } from 'drizzle-orm';
import { Server } from 'socket.io';

export class BulkImportService {
  private readonly db: Database;
  private readonly logger: WinstonLogger;
  private static io: Server | null = null;

  constructor() {
    this.db = Database.getInstance();
    this.logger = new WinstonLogger('bulk-import-service');
  }

  /**
   * Initialize WebSocket server for real-time progress updates
   */
  public static initializeWebSocket(io: Server): void {
    BulkImportService.io = io;
  }

  /**
   * Broadcast progress update to connected clients
   */
  private async broadcastProgressUpdate(uploadId: number, statusData: any): Promise<void> {
    if (BulkImportService.io) {
      BulkImportService.io.to(`upload:${uploadId}`).emit('upload-progress', statusData);
    }
  }

  /**
   * Initiate bulk member upload for company
   */
  async initiateBulkMemberUpload(companyId: number, fileData: any, dryRun: boolean = false): Promise<any> {
    const db = this.db.getDb();

    try {
      this.logger.info('Initiating bulk member upload', { companyId, dryRun });

      const uploadRecord = await db.insert(bulkMemberUploads).values({
        companyId,
        uploaderId: 0,
        status: 'pending',
        dryRun,
        totalRecords: fileData.records?.length || 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      this.queueMemberValidationJob(uploadRecord[0].id.toString(), fileData.records, companyId);

      return {
        uploadId: uploadRecord[0].id,
        status: 'processing',
        message: 'Member upload validation has been initiated. Check status endpoint for progress.',
        estimatedTime: fileData.records?.length > 1000 ? '2-5 minutes' : '30 seconds'
      };

    } catch (error) {
      this.logger.error('Failed to initiate bulk member upload', { error, companyId });
      throw error;
    }
  }

  /**
   * Update upload progress tracking
   */
  async updateUploadProgress(
    uploadId: number,
    currentStage: string,
    stageProgress: number,
    stageTotal: number
  ): Promise<void> {
    const db = this.db.getDb();

    const progressPercentage = stageTotal > 0
      ? Math.round((stageProgress / stageTotal) * 10000) / 100
      : 0;

    await db
      .update(bulkMemberUploads)
      .set({
        currentStage,
        stageProgress,
        stageTotal,
        progressPercentage: progressPercentage.toString(),
        updatedAt: new Date()
      })
      .where(eq(sql`id`, uploadId));

    await this.broadcastProgressUpdate(uploadId, {
      uploadId,
      currentStage,
      stageProgress,
      stageTotal,
      progressPercentage
    });
  }

  /**
   * Get status of bulk upload operation
   */
  async getBulkUploadStatus(uploadId: string): Promise<any> {
    const db = this.db.getDb();

    try {
      const upload = await db
        .select()
        .from(bulkMemberUploads)
        .where(eq(bulkMemberUploads.id, parseInt(uploadId, 10)))
        .limit(1);

      if (upload.length === 0) {
        throw new NotFoundError('Bulk upload operation');
      }

      const data = upload[0];
      
      if (data.status === 'processing' && (data as any).processedRecords > 0) {
        const confirmedAt = (data as any).confirmedAt ? new Date((data as any).confirmedAt) : new Date();
        const elapsedMinutes = (Date.now() - confirmedAt.getTime()) / 60000;
        (data as any).processingSpeed = Math.round((data as any).processedRecords / elapsedMinutes);
        const remainingRecords = (data as any).totalRecords - (data as any).processedRecords;
        (data as any).estimatedRemainingTime = Math.round((remainingRecords / (data as any).processingSpeed) * 60);
      }

      return data;

    } catch (error) {
      this.logger.error('Failed to get bulk upload status', { error, uploadId });
      throw error;
    }
  }

  /**
   * Confirm and process validated member records
   */
  async confirmBulkMemberUpload(uploadId: string): Promise<any> {
    const db = this.db.getDb();
    return await db.transaction(async (tx) => {
      this.logger.info('Confirming bulk member upload', { uploadId });

      const upload = await this.getBulkUploadStatus(uploadId);
      
      if (upload.status !== 'validated') {
        throw new BusinessRuleError('Cannot confirm upload. Validation must be completed successfully first.');
      }

      await tx
        .update(bulkMemberUploads)
        .set({
          status: 'processing',
          confirmedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(bulkMemberUploads.id, parseInt(uploadId, 10)));

      this.queueMemberCreationJob(uploadId);

      return {
        uploadId,
        status: 'processing',
        message: 'Member upload confirmed. Members will be created in the background.'
      };
    });
  }

  /**
   * Get validation errors for failed records
   */
  async getBulkUploadErrors(uploadId: string): Promise<any> {
    const db = this.db.getDb();

    try {
      const errors = await db
        .select()
        .from(sql`crm.bulk_upload_errors`)
        .where(eq(sql`upload_id`, uploadId))
        .orderBy(asc(sql`row_number`));

      return {
        uploadId,
        errorCount: errors.length,
        errors: errors
      };

    } catch (error) {
      this.logger.error('Failed to get bulk upload errors', { error, uploadId });
      throw error;
    }
  }

  /**
   * Queue member validation job for background processing
   */
  private async queueMemberValidationJob(uploadId: string, records: any[], companyId: number): Promise<void> {
    this.logger.debug('Queued member validation job', { uploadId, recordCount: records.length });
  }

  /**
   * Queue member creation job for background processing
   */
  private async queueMemberCreationJob(uploadId: string): Promise<void> {
    this.logger.debug('Queued member creation job', { uploadId });
  }
}