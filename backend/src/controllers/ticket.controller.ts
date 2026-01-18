import { Request, Response } from 'express';
import prisma from '../config/database';
import { sendClientTicketReplyEmail } from '../services/email.service';

/**
 * Generate ticket number: T{YEAR}-{NUM}
 */
async function generateTicketNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.ticket.count({
    where: {
      ticketNumber: {
        startsWith: `T${year}-`,
      },
    },
  });
  return `T${year}-${String(count + 1).padStart(4, '0')}`;
}

/**
 * GET /api/tickets
 * Lista ticket con filtri (ADMIN)
 */
export const getTickets = async (req: Request, res: Response) => {
  try {
    const {
      status,
      priority,
      supportType,
      clientAccessId,
      assignedTo,
      search,
      page = '1',
      limit = '50',
    } = req.query;

    const where: any = {};

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (supportType) where.supportType = supportType;
    if (clientAccessId) where.clientAccessId = parseInt(clientAccessId as string);
    if (assignedTo) where.assignedTo = parseInt(assignedTo as string);

    if (search) {
      where.OR = [
        { ticketNumber: { contains: search as string } },
        { subject: { contains: search as string } },
        { description: { contains: search as string } },
      ];
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          clientAccess: {
            select: {
              id: true,
              username: true,
              contact: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          contact: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.ticket.count({ where }),
    ]);

    res.json({
      success: true,
      data: tickets,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error: any) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero dei ticket',
      error: error.message,
    });
  }
};

/**
 * GET /api/tickets/:id
 * Singolo ticket con tutti i messaggi
 */
export const getTicketById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const ticket = await prisma.ticket.findUnique({
      where: { id: parseInt(id) },
      include: {
        clientAccess: {
          select: {
            id: true,
            username: true,
            accessType: true,
            contact: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        contact: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            clientAccess: {
              select: {
                id: true,
                username: true,
                contact: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        activityLogs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket non trovato',
      });
    }

    res.json({
      success: true,
      data: ticket,
    });
  } catch (error: any) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero del ticket',
      error: error.message,
    });
  }
};

/**
 * POST /api/tickets
 * Crea nuovo ticket (ADMIN)
 */
export const createTicket = async (req: Request, res: Response) => {
  try {
    const {
      clientAccessId,
      supportType,
      subject,
      description,
      priority = 'NORMAL',
      assignedTo,
    } = req.body;

    if (!clientAccessId || !supportType || !subject || !description) {
      return res.status(400).json({
        success: false,
        message: 'Campi obbligatori mancanti',
      });
    }

    // Verifica che clientAccess esista
    const clientAccess = await prisma.clientAccess.findUnique({
      where: { id: clientAccessId },
      select: { contactId: true },
    });

    if (!clientAccess) {
      return res.status(404).json({
        success: false,
        message: 'Cliente non trovato',
      });
    }

    // Genera numero ticket
    const ticketNumber = await generateTicketNumber();

    // Crea ticket
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        clientAccessId,
        contactId: clientAccess.contactId,
        supportType,
        subject,
        description,
        priority,
        assignedTo,
        status: 'OPEN',
      },
      include: {
        clientAccess: {
          select: {
            username: true,
            contact: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Log creazione
    await prisma.ticketActivityLog.create({
      data: {
        ticketId: ticket.id,
        action: 'created',
        details: `Ticket creato da admin`,
      },
    });

    // TODO: Invia notifica al cliente
    await prisma.clientNotification.create({
      data: {
        clientAccessId,
        type: 'TICKET_REPLY',
        title: 'Nuovo ticket aperto',
        message: `È stato aperto un nuovo ticket: ${subject}`,
        relatedId: ticket.id,
        relatedType: 'ticket',
      },
    });

    res.status(201).json({
      success: true,
      message: 'Ticket creato con successo',
      data: ticket,
    });
  } catch (error: any) {
    console.error('Error creating ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella creazione del ticket',
      error: error.message,
    });
  }
};

/**
 * PUT /api/tickets/:id
 * Aggiorna ticket
 */
export const updateTicket = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      subject,
      description,
      priority,
      status,
      assignedTo,
      supportType,
    } = req.body;

    const ticket = await prisma.ticket.findUnique({
      where: { id: parseInt(id) },
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket non trovato',
      });
    }

    const updates: any = {};
    const activityDetails: string[] = [];

    if (subject !== undefined) {
      updates.subject = subject;
      activityDetails.push(`Oggetto modificato`);
    }
    if (description !== undefined) {
      updates.description = description;
      activityDetails.push(`Descrizione modificata`);
    }
    if (priority !== undefined && priority !== ticket.priority) {
      updates.priority = priority;
      activityDetails.push(`Priorità cambiata da ${ticket.priority} a ${priority}`);
    }
    if (status !== undefined && status !== ticket.status) {
      updates.status = status;
      activityDetails.push(`Status cambiato da ${ticket.status} a ${status}`);
    }
    if (assignedTo !== undefined && assignedTo !== ticket.assignedTo) {
      updates.assignedTo = assignedTo;
      activityDetails.push(`Assegnato a utente #${assignedTo}`);
    }
    if (supportType !== undefined && supportType !== ticket.supportType) {
      updates.supportType = supportType;
      activityDetails.push(`Tipo supporto cambiato a ${supportType}`);
    }

    const updated = await prisma.ticket.update({
      where: { id: parseInt(id) },
      data: updates,
      include: {
        clientAccess: {
          select: {
            username: true,
            contact: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Log modifiche
    if (activityDetails.length > 0) {
      await prisma.ticketActivityLog.create({
        data: {
          ticketId: updated.id,
          action: 'updated',
          details: activityDetails.join(', '),
        },
      });
    }

    res.json({
      success: true,
      message: 'Ticket aggiornato con successo',
      data: updated,
    });
  } catch (error: any) {
    console.error('Error updating ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'aggiornamento del ticket',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/tickets/:id
 * Elimina ticket (ADMIN)
 */
export const deleteTicket = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const ticket = await prisma.ticket.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket non trovato',
      });
    }

    // Verifica se ha messaggi
    if (ticket._count.messages > 0) {
      return res.status(400).json({
        success: false,
        message: 'Impossibile eliminare ticket con messaggi. Chiudilo invece.',
      });
    }

    await prisma.ticket.delete({
      where: { id: parseInt(id) },
    });

    res.json({
      success: true,
      message: 'Ticket eliminato con successo',
    });
  } catch (error: any) {
    console.error('Error deleting ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'eliminazione del ticket',
      error: error.message,
    });
  }
};

/**
 * POST /api/tickets/:id/messages
 * Aggiungi messaggio a ticket (ADMIN o CLIENT)
 */
export const addTicketMessage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { message, userId, clientAccessId, isInternal = false } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Messaggio richiesto',
      });
    }

    // Verifica che sia specificato userId (admin) O clientAccessId (client)
    if (!userId && !clientAccessId) {
      return res.status(400).json({
        success: false,
        message: 'Specificare userId (admin) o clientAccessId (client)',
      });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        clientAccessId: true,
        status: true,
        subject: true,
        ticketNumber: true,
        clientAccess: {
          select: {
            contact: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket non trovato',
      });
    }

    const isAdminReply = !!userId;

    // Crea messaggio
    const ticketMessage = await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        userId: userId || null,
        clientAccessId: clientAccessId || null,
        message,
        isInternal,
      },
      include: {
        clientAccess: {
          select: {
            username: true,
            contact: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Se è risposta admin, cambia status se è WAITING_CLIENT
    if (isAdminReply && ticket.status === 'WAITING_CLIENT') {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: 'IN_PROGRESS' },
      });
    }

    // Se è risposta cliente, cambia status se è IN_PROGRESS
    if (!isAdminReply && ticket.status === 'IN_PROGRESS') {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: 'WAITING_CLIENT' },
      });
    }

    // Log attività
    await prisma.ticketActivityLog.create({
      data: {
        ticketId: ticket.id,
        action: isAdminReply ? 'admin_replied' : 'client_replied',
        details: `Nuovo messaggio: ${message.substring(0, 50)}...`,
      },
    });

    // Notifica al cliente se è risposta admin (e non è nota interna)
    if (isAdminReply && !isInternal) {
      await prisma.clientNotification.create({
        data: {
          clientAccessId: ticket.clientAccessId,
          type: 'TICKET_REPLY',
          title: 'Nuova risposta al ticket',
          message: `Hai ricevuto una risposta al ticket #${id}`,
          relatedId: ticket.id,
          relatedType: 'ticket',
        },
      });

      // Send email notification to client
      if (ticket.clientAccess?.contact?.email) {
        try {
          await sendClientTicketReplyEmail(
            ticket.clientAccess.contact.email,
            ticket.clientAccess.contact.name,
            ticket.ticketNumber,
            ticket.subject
          );
          console.log(`Ticket reply email sent to ${ticket.clientAccess.contact.email}`);
        } catch (emailError) {
          console.error('Failed to send ticket reply email:', emailError);
          // Don't fail the request if email fails
        }
      }
    }

    res.status(201).json({
      success: true,
      message: 'Messaggio aggiunto con successo',
      data: ticketMessage,
    });
  } catch (error: any) {
    console.error('Error adding ticket message:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'aggiunta del messaggio',
      error: error.message,
    });
  }
};

/**
 * POST /api/tickets/:id/assign
 * Assegna ticket a utente admin
 */
export const assignTicket = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId richiesto',
      });
    }

    const ticket = await prisma.ticket.update({
      where: { id: parseInt(id) },
      data: {
        assignedTo: userId,
        status: 'IN_PROGRESS',
      },
    });

    await prisma.ticketActivityLog.create({
      data: {
        ticketId: ticket.id,
        action: 'assigned',
        details: `Ticket assegnato a utente #${userId}`,
      },
    });

    res.json({
      success: true,
      message: 'Ticket assegnato con successo',
      data: ticket,
    });
  } catch (error: any) {
    console.error('Error assigning ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'assegnazione del ticket',
      error: error.message,
    });
  }
};

/**
 * POST /api/tickets/:id/close
 * Chiudi ticket con note
 */
export const closeTicket = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { closingNotes, timeSpentMinutes } = req.body;

    const ticket = await prisma.ticket.update({
      where: { id: parseInt(id) },
      data: {
        status: 'CLOSED',
        closingNotes: closingNotes || null,
        timeSpentMinutes: timeSpentMinutes || 0,
        closedAt: new Date(),
      },
    });

    await prisma.ticketActivityLog.create({
      data: {
        ticketId: ticket.id,
        action: 'closed',
        details: `Ticket chiuso. Tempo impiegato: ${timeSpentMinutes || 0} minuti`,
      },
    });

    // Notifica cliente
    await prisma.clientNotification.create({
      data: {
        clientAccessId: ticket.clientAccessId,
        type: 'TICKET_CLOSED',
        title: 'Ticket risolto',
        message: `Il ticket #${id} è stato risolto`,
        relatedId: ticket.id,
        relatedType: 'ticket',
      },
    });

    // Se è un FULL_CLIENT e il supporto è a pagamento, aggiorna ore usate
    if (timeSpentMinutes && timeSpentMinutes > 0) {
      const clientAccess = await prisma.clientAccess.findUnique({
        where: { id: ticket.clientAccessId },
        select: {
          accessType: true,
          supportHoursUsed: true,
        },
      });

      if (clientAccess?.accessType === 'FULL_CLIENT') {
        const hoursUsed = timeSpentMinutes / 60;
        await prisma.clientAccess.update({
          where: { id: ticket.clientAccessId },
          data: {
            supportHoursUsed: clientAccess.supportHoursUsed + hoursUsed,
          },
        });
      }
    }

    res.json({
      success: true,
      message: 'Ticket chiuso con successo',
      data: ticket,
    });
  } catch (error: any) {
    console.error('Error closing ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella chiusura del ticket',
      error: error.message,
    });
  }
};

/**
 * POST /api/tickets/:id/reopen
 * Riapri ticket chiuso
 */
export const reopenTicket = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const ticket = await prisma.ticket.update({
      where: { id: parseInt(id) },
      data: {
        status: 'OPEN',
        closedAt: null,
      },
    });

    await prisma.ticketActivityLog.create({
      data: {
        ticketId: ticket.id,
        action: 'reopened',
        details: 'Ticket riaperto',
      },
    });

    res.json({
      success: true,
      message: 'Ticket riaperto con successo',
      data: ticket,
    });
  } catch (error: any) {
    console.error('Error reopening ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella riapertura del ticket',
      error: error.message,
    });
  }
};

/**
 * GET /api/client/tickets
 * Ottieni ticket del cliente autenticato (CLIENT)
 */
export const getClientTickets = async (req: Request, res: Response) => {
  try {
    const clientAccessId = (req as any).client.clientAccessId;

    const { status, page = '1', limit = '20' } = req.query;

    const where: any = { clientAccessId };
    if (status) where.status = status;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.ticket.count({ where }),
    ]);

    res.json({
      success: true,
      data: tickets,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error: any) {
    console.error('Error fetching client tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero dei ticket',
      error: error.message,
    });
  }
};

/**
 * POST /api/client/tickets
 * Crea ticket da parte del cliente (CLIENT)
 */
export const createClientTicket = async (req: Request, res: Response) => {
  try {
    const clientAccessId = (req as any).client.clientAccessId;
    const contactId = (req as any).client.contactId;

    const { supportType, subject, description, priority = 'NORMAL' } = req.body;

    if (!supportType || !subject || !description) {
      return res.status(400).json({
        success: false,
        message: 'Campi obbligatori mancanti',
      });
    }

    // Genera numero ticket
    const ticketNumber = await generateTicketNumber();

    // Crea ticket
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        clientAccessId,
        contactId,
        supportType,
        subject,
        description,
        priority,
        status: 'OPEN',
      },
    });

    // Log creazione
    await prisma.ticketActivityLog.create({
      data: {
        ticketId: ticket.id,
        action: 'created',
        details: 'Ticket creato da cliente',
      },
    });

    // TODO: Notifica admin

    res.status(201).json({
      success: true,
      message: 'Ticket creato con successo',
      data: ticket,
    });
  } catch (error: any) {
    console.error('Error creating client ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella creazione del ticket',
      error: error.message,
    });
  }
};

/**
 * GET /api/client/tickets/:id
 * Ottieni singolo ticket del cliente (CLIENT)
 */
export const getClientTicketById = async (req: Request, res: Response) => {
  try {
    const clientAccessId = (req as any).client.clientAccessId;
    const { id } = req.params;

    const ticket = await prisma.ticket.findFirst({
      where: {
        id: parseInt(id),
        clientAccessId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            clientAccess: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket non trovato',
      });
    }

    res.json({
      success: true,
      data: ticket,
    });
  } catch (error: any) {
    console.error('Error fetching client ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero del ticket',
      error: error.message,
    });
  }
};

/**
 * POST /api/client/tickets/:id/messages
 * Aggiungi messaggio a ticket (CLIENT)
 */
export const addClientTicketMessage = async (req: Request, res: Response) => {
  try {
    const clientAccessId = (req as any).client.clientAccessId;
    const { id } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Messaggio obbligatorio',
      });
    }

    // Verifica che il ticket appartenga al cliente
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: parseInt(id),
        clientAccessId,
      },
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket non trovato',
      });
    }

    // Crea messaggio
    const ticketMessage = await prisma.ticketMessage.create({
      data: {
        ticketId: parseInt(id),
        clientAccessId,
        message,
      },
    });

    // Log attività
    await prisma.ticketActivityLog.create({
      data: {
        ticketId: parseInt(id),
        action: 'message_added',
        details: 'Messaggio aggiunto da cliente',
      },
    });

    // TODO: Notifica admin di nuova risposta

    res.status(201).json({
      success: true,
      message: 'Messaggio inviato con successo',
      data: ticketMessage,
    });
  } catch (error: any) {
    console.error('Error adding client ticket message:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'invio del messaggio',
      error: error.message,
    });
  }
};
