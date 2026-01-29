import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import mime from 'mime-types';

// File validation constants
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'application/pdf'
];

export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.pdf'];

// Base uploads directory
export const UPLOADS_DIR = path.join(__dirname, '../../uploads');
export const TICKETS_UPLOADS_DIR = path.join(UPLOADS_DIR, 'tickets');

/**
 * Initialize uploads directory structure
 */
export async function initializeUploadsDirectory() {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    await fs.mkdir(TICKETS_UPLOADS_DIR, { recursive: true });
    console.log('✅ Uploads directories initialized');
  } catch (error) {
    console.error('❌ Failed to initialize uploads directories:', error);
    throw error;
  }
}

/**
 * Sanitize filename to prevent path traversal and special characters
 */
export function sanitizeFilename(filename: string): string {
  // Remove path components
  const basename = path.basename(filename);
  // Replace special characters and spaces
  return basename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
}

/**
 * Generate unique filename with timestamp and random hash
 */
export function generateUniqueFilename(originalFilename: string): string {
  const sanitized = sanitizeFilename(originalFilename);
  const timestamp = Date.now();
  const randomHash = crypto.randomBytes(8).toString('hex');
  const ext = path.extname(sanitized);
  const nameWithoutExt = path.basename(sanitized, ext);

  return `${timestamp}-${randomHash}-${nameWithoutExt}${ext}`;
}

/**
 * Validate file type by MIME type and extension
 */
export function validateFileType(file: Express.Multer.File): boolean {
  const ext = path.extname(file.originalname).toLowerCase();
  return (
    ALLOWED_MIME_TYPES.includes(file.mimetype) &&
    ALLOWED_EXTENSIONS.includes(ext)
  );
}

/**
 * Create ticket-specific upload directory
 */
export async function ensureTicketUploadDir(ticketId: number): Promise<string> {
  const ticketDir = path.join(TICKETS_UPLOADS_DIR, ticketId.toString());
  await fs.mkdir(ticketDir, { recursive: true });
  return ticketDir;
}

/**
 * Delete file from disk
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * Configure multer storage for ticket attachments
 */
export const ticketAttachmentStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const ticketId = req.params.id;
      if (!ticketId) {
        return cb(new Error('Ticket ID is required'), '');
      }
      const uploadDir = await ensureTicketUploadDir(parseInt(ticketId));
      cb(null, uploadDir);
    } catch (error: any) {
      cb(error, '');
    }
  },
  filename: (req, file, cb) => {
    const uniqueFilename = generateUniqueFilename(file.originalname);
    cb(null, uniqueFilename);
  }
});

/**
 * Multer file filter for validation
 */
export const ticketAttachmentFileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (validateFileType(file)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo file non consentito. Sono ammessi solo: ${ALLOWED_EXTENSIONS.join(', ')}`));
  }
};

/**
 * Create multer upload middleware for tickets
 */
export const uploadTicketAttachments = multer({
  storage: ticketAttachmentStorage,
  fileFilter: ticketAttachmentFileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10 // Max 10 files per request
  }
});
