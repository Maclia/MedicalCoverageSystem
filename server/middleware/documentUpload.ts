import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

// Configuration for file uploads
const uploadConfig = {
  // File size limit: 10MB
  maxSize: 10 * 1024 * 1024,

  // Allowed file types
  allowedMimeTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/tiff',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ],

  // Allowed file extensions
  allowedExtensions: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.tiff', '.xls', '.xlsx'],

  // Upload directory
  uploadDir: './uploads/contracts',

  // Virus scanning (placeholder - would integrate with actual antivirus service)
  enableVirusScan: process.env.NODE_ENV === 'production'
};

// Configure multer storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      // Create upload directory if it doesn't exist
      const uploadDir = uploadConfig.uploadDir;
      await fs.mkdir(uploadDir, { recursive: true });

      // Create contract-specific subdirectory if contractId is provided
      const contractId = req.params.contractId || req.body.contractId;
      if (contractId) {
        const contractDir = path.join(uploadDir, contractId.toString());
        await fs.mkdir(contractDir, { recursive: true });
        return cb(null, contractDir);
      }

      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, uploadConfig.uploadDir);
    }
  },

  filename: (req, file, cb) => {
    try {
      // Generate secure filename with timestamp and hash
      const timestamp = Date.now();
      const randomString = crypto.randomBytes(8).toString('hex');
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');

      const filename = `${timestamp}_${randomString}_${sanitizedName}`;
      cb(null, filename);
    } catch (error) {
      cb(error as Error, 'default-filename');
    }
  }
});

// Configure multer file filter
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  try {
    // Check MIME type
    if (!uploadConfig.allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error(`File type ${file.mimetype} is not allowed`));
    }

    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!uploadConfig.allowedExtensions.includes(ext)) {
      return cb(new Error(`File extension ${ext} is not allowed`));
    }

    cb(null, true);
  } catch (error) {
    cb(error as Error);
  }
};

// Create multer upload instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: uploadConfig.maxSize,
    files: 5 // Maximum 5 files per request
  }
});

// Document upload middleware
export const uploadDocument = upload.single('document');

export const uploadMultipleDocuments = upload.array('documents', 5);

// File validation middleware
export const validateUploadedDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const file = req.file;

    // Calculate file hash for integrity verification
    const fileBuffer = await fs.readFile(file.path);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Add file metadata to request
    req.fileHash = fileHash;
    req.fileSize = fileBuffer.length;

    // Virus scanning (placeholder)
    if (uploadConfig.enableVirusScan) {
      const isClean = await scanForViruses(file.path);
      if (!isClean) {
        // Delete the infected file
        await fs.unlink(file.path);
        return res.status(400).json({
          success: false,
          error: 'File security scan failed'
        });
      }
    }

    // Document content validation
    const validationResult = await validateDocumentContent(file.path, file.mimetype);
    if (!validationResult.isValid) {
      // Delete the invalid file
      await fs.unlink(file.path);
      return res.status(400).json({
        success: false,
        error: validationResult.error || 'Invalid document content'
      });
    }

    next();
  } catch (error) {
    console.error('Document validation error:', error);

    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      error: 'Document validation failed'
    });
  }
};

// Multiple documents validation middleware
export const validateUploadedDocuments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    const files = req.files as Express.Multer.File[];
    const validatedFiles = [];
    const errors = [];

    for (const file of files) {
      try {
        // Calculate file hash
        const fileBuffer = await fs.readFile(file.path);
        const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

        // Virus scanning
        if (uploadConfig.enableVirusScan) {
          const isClean = await scanForViruses(file.path);
          if (!isClean) {
            await fs.unlink(file.path);
            errors.push(`${file.originalname}: Security scan failed`);
            continue;
          }
        }

        // Document content validation
        const validationResult = await validateDocumentContent(file.path, file.mimetype);
        if (!validationResult.isValid) {
          await fs.unlink(file.path);
          errors.push(`${file.originalname}: ${validationResult.error || 'Invalid content'}`);
          continue;
        }

        validatedFiles.push({
          ...file,
          hash: fileHash,
          size: fileBuffer.length
        });
      } catch (error) {
        console.error(`Error validating ${file.originalname}:`, error);
        errors.push(`${file.originalname}: Validation error`);
      }
    }

    if (validatedFiles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid files uploaded',
        details: errors
      });
    }

    req.validatedFiles = validatedFiles;
    if (errors.length > 0) {
      req.validationErrors = errors;
    }

    next();
  } catch (error) {
    console.error('Document validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Document validation failed'
    });
  }
};

// Placeholder virus scanning function
async function scanForViruses(filePath: string): Promise<boolean> {
  // In production, this would integrate with antivirus software like:
  // - ClamAV
  // - VirusTotal API
  // - Windows Defender
  // - Sophos
  // - McAfee

  try {
    // For now, just check if file exists and is readable
    await fs.access(filePath);
    return true;
  } catch (error) {
    console.error('Virus scan error:', error);
    return false;
  }
}

// Document content validation
async function validateDocumentContent(filePath: string, mimeType: string): Promise<{
  isValid: boolean;
  error?: string;
}> {
  try {
    const fileBuffer = await fs.readFile(filePath);

    // Check minimum file size (should not be empty)
    if (fileBuffer.length === 0) {
      return {
        isValid: false,
        error: 'File is empty'
      };
    }

    // Check maximum file size
    if (fileBuffer.length > uploadConfig.maxSize) {
      return {
        isValid: false,
        error: 'File size exceeds maximum limit'
      };
    }

    // Basic file header validation
    const fileHeader = fileBuffer.slice(0, 16);

    switch (mimeType) {
      case 'application/pdf':
        // PDF files should start with %PDF
        if (!fileHeader.toString('ascii').startsWith('%PDF')) {
          return {
            isValid: false,
            error: 'Invalid PDF file format'
          };
        }
        break;

      case 'image/jpeg':
        // JPEG files should start with 0xFFD8
        if (fileHeader[0] !== 0xFF || fileHeader[1] !== 0xD8) {
          return {
            isValid: false,
            error: 'Invalid JPEG file format'
          };
        }
        break;

      case 'image/png':
        // PNG files should start with PNG header
        const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
        if (!fileHeader.slice(0, 8).equals(pngHeader)) {
          return {
            isValid: false,
            error: 'Invalid PNG file format'
          };
        }
        break;

      default:
        // For other file types, basic validation only
        break;
    }

    // Additional validation for Office documents would go here
    // This could involve parsing the file structure to ensure it's valid

    return { isValid: true };
  } catch (error) {
    console.error('Document content validation error:', error);
    return {
      isValid: false,
      error: 'Unable to validate document content'
    };
  }
}

// File cleanup utility
export const cleanupOldFiles = async (maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<void> => {
  try {
    const uploadDir = uploadConfig.uploadDir;
    const files = await fs.readdir(uploadDir, { withFileTypes: true });

    for (const file of files) {
      if (file.isFile()) {
        const filePath = path.join(uploadDir, file.name);
        const stats = await fs.stat(filePath);

        // Delete files older than maxAge
        if (Date.now() - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          console.log(`Cleaned up old file: ${file.name}`);
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up old files:', error);
  }
};

// Generate file preview (for images)
export const generateImagePreview = async (filePath: string, maxWidth: number = 300, maxHeight: number = 300): Promise<Buffer> => {
  // In production, this would use an image processing library like Sharp
  // For now, just return the original file
  try {
    return await fs.readFile(filePath);
  } catch (error) {
    throw new Error('Unable to generate image preview');
  }
};

// Extract text content from documents (for OCR/indexing)
export const extractDocumentText = async (filePath: string, mimeType: string): Promise<string> => {
  // In production, this would integrate with:
  // - Tesseract OCR for images
  // - PDF parsing libraries for PDFs
  // - Office document parsers for Word/Excel files

  try {
    const fileBuffer = await fs.readFile(filePath);

    if (mimeType === 'application/pdf') {
      // PDF text extraction would go here
      return 'PDF text extraction not implemented';
    } else if (mimeType.startsWith('image/')) {
      // OCR would go here
      return 'OCR text extraction not implemented';
    } else {
      // Office document text extraction would go here
      return 'Office document text extraction not implemented';
    }
  } catch (error) {
    console.error('Text extraction error:', error);
    return '';
  }
};

export default upload;