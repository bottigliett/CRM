import { Request, Response } from 'express';
import prisma from '../config/database';
import path from 'path';
import fs from 'fs/promises';
import { TICKETS_UPLOADS_DIR, deleteFile } from '../utils/file-upload';

/**
 * POST /api/tickets/:id/attachments
 * Upload attachments to ticket (admin or client)
 */
export const uploadAttachments = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isInternal = 'false', ticketMessageId } = req.body;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nessun file caricato'
      });
    }

    // Determine if user is admin or client
    const userId = (req as any).user?.userId;
    const clientAccessId = (req as any).client?.clientAccessId;

    if (!userId && !clientAccessId) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato'
      });
    }

    const isAdmin = !!userId;
    const uploadedBy = isAdmin ? 'admin' : 'client';
    const uploadedById = isAdmin ? userId : clientAccessId;

    // Verify ticket exists and user has access
    const ticket = await prisma.ticket.findUnique({
      where: { id: parseInt(id) },
      select: { id: true, clientAccessId: true }
    });

    if (!ticket) {
      // Clean up uploaded files
      await Promise.all(files.map(f => deleteFile(f.path)));
      return res.status(404).json({
        success: false,
        message: 'Ticket non trovato'
      });
    }

    // Client can only upload to their own tickets
    if (!isAdmin && ticket.clientAccessId !== clientAccessId) {
      await Promise.all(files.map(f => deleteFile(f.path)));
      return res.status(403).json({
        success: false,
        message: 'Non autorizzato'
      });
    }

    // Clients cannot upload internal attachments
    const isInternalFlag = isAdmin && isInternal === 'true';

    // Create attachment records
    const attachmentData = files.map(file => ({
      ticketId: parseInt(id),
      ticketMessageId: ticketMessageId ? parseInt(ticketMessageId) : null,
      fileName: file.filename,
      originalFileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      storagePath: `tickets/${id}/${file.filename}`,
      isInternal: isInternalFlag,
      uploadedBy,
      uploadedById
    }));

    const attachments = await prisma.$transaction(
      attachmentData.map(data =>
        prisma.ticketAttachment.create({ data })
      )
    );

    // Log activity
    await prisma.ticketActivityLog.create({
      data: {
        ticketId: parseInt(id),
        userId: isAdmin ? userId : null,
        clientAccessId: !isAdmin ? clientAccessId : null,
        action: 'attachment_uploaded',
        details: `${files.length} ${files.length === 1 ? 'allegato caricato' : 'allegati caricati'}${isInternalFlag ? ' (interno)' : ''}`
      }
    });

    // Notify client if admin uploaded non-internal attachment
    if (isAdmin && !isInternalFlag) {
      await prisma.clientNotification.create({
        data: {
          clientAccessId: ticket.clientAccessId,
          type: 'TICKET_REPLY',
          title: 'Nuovi allegati',
          message: `Sono stati aggiunti ${files.length} ${files.length === 1 ? 'allegato' : 'allegati'} al ticket`,
          relatedId: ticket.id,
          relatedType: 'ticket'
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Allegati caricati con successo',
      data: attachments
    });
  } catch (error: any) {
    console.error('Error uploading attachments:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel caricamento degli allegati',
      error: error.message
    });
  }
};

/**
 * GET /api/tickets/attachments/:id
 * Download/view attachment (admin with auth check)
 */
export const downloadAttachment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;

    const attachment = await prisma.ticketAttachment.findUnique({
      where: { id: parseInt(id) },
      include: {
        ticket: {
          select: { clientAccessId: true }
        }
      }
    });

    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Allegato non trovato'
      });
    }

    const filePath = path.join(TICKETS_UPLOADS_DIR, attachment.storagePath.replace('tickets/', ''));

    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        message: 'File non trovato sul server'
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.originalFileName}"`);
    res.sendFile(filePath);
  } catch (error: any) {
    console.error('Error downloading attachment:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel download dell\'allegato',
      error: error.message
    });
  }
};

/**
 * GET /api/client/tickets/attachments/:id
 * Download attachment (client with ownership check)
 */
export const downloadClientAttachment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const clientAccessId = (req as any).client?.clientAccessId;

    const attachment = await prisma.ticketAttachment.findUnique({
      where: { id: parseInt(id) },
      include: {
        ticket: {
          select: { clientAccessId: true }
        }
      }
    });

    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Allegato non trovato'
      });
    }

    // Verify ownership
    if (attachment.ticket.clientAccessId !== clientAccessId) {
      return res.status(403).json({
        success: false,
        message: 'Non autorizzato'
      });
    }

    // Clients cannot see internal attachments
    if (attachment.isInternal) {
      return res.status(403).json({
        success: false,
        message: 'Allegato non accessibile'
      });
    }

    const filePath = path.join(TICKETS_UPLOADS_DIR, attachment.storagePath.replace('tickets/', ''));

    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        message: 'File non trovato sul server'
      });
    }

    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.originalFileName}"`);
    res.sendFile(filePath);
  } catch (error: any) {
    console.error('Error downloading client attachment:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel download dell\'allegato',
      error: error.message
    });
  }
};

/**
 * DELETE /api/tickets/attachments/:id
 * Delete attachment (admin only)
 */
export const deleteAttachment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;

    const attachment = await prisma.ticketAttachment.findUnique({
      where: { id: parseInt(id) }
    });

    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Allegato non trovato'
      });
    }

    // Delete file from disk
    const filePath = path.join(TICKETS_UPLOADS_DIR, attachment.storagePath.replace('tickets/', ''));
    await deleteFile(filePath);

    // Delete database record
    await prisma.ticketAttachment.delete({
      where: { id: parseInt(id) }
    });

    // Log activity
    await prisma.ticketActivityLog.create({
      data: {
        ticketId: attachment.ticketId,
        userId,
        action: 'attachment_deleted',
        details: `Allegato eliminato: ${attachment.originalFileName}`
      }
    });

    res.json({
      success: true,
      message: 'Allegato eliminato con successo'
    });
  } catch (error: any) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'eliminazione dell\'allegato',
      error: error.message
    });
  }
};
