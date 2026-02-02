import { Request, Response } from 'express';
import prisma from '../config/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendClientActivationCodeEmail } from '../services/email.service';

/**
 * CLIENT JWT PAYLOAD
 * Separato da admin JWT per maggiore sicurezza
 */
interface ClientJwtPayload {
  clientAccessId: number;
  contactId: number;
  username: string;
  accessType: string;
}

/**
 * Generate Client JWT Token
 */
function generateClientToken(payload: ClientJwtPayload): string {
  const secret = process.env.JWT_SECRET || 'fallback-secret-key';
  return jwt.sign(
    { ...payload, type: 'CLIENT' }, // Aggiungi type per distinguere da admin
    secret,
    { expiresIn: '7d' }
  );
}

/**
 * Generate 6-digit verification code
 */
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * POST /api/client-auth/verify-token
 * Step 1: Verifica token attivazione
 */
export const verifyActivationToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token mancante',
      });
    }

    // Trova client access con questo token
    const clientAccess = await prisma.clientAccess.findUnique({
      where: { activationToken: token },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!clientAccess) {
      return res.status(404).json({
        success: false,
        message: 'Token non valido',
      });
    }

    // Verifica scadenza token
    if (clientAccess.activationExpires && clientAccess.activationExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Token scaduto. Contatta il supporto per richiederne uno nuovo.',
      });
    }

    // Verifica se già attivato
    if (clientAccess.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Account già attivato. Effettua il login.',
      });
    }

    res.json({
      success: true,
      data: {
        username: clientAccess.username,
        contactName: clientAccess.contact.name,
        email: clientAccess.contact.email,
      },
    });
  } catch (error: any) {
    console.error('Error verifying activation token:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella verifica del token',
      error: error.message,
    });
  }
};

/**
 * POST /api/client-auth/send-verification-code
 * Step 2: Invia codice verifica email
 */
export const sendVerificationCode = async (req: Request, res: Response) => {
  try {
    const { token, email } = req.body;

    if (!token || !email) {
      return res.status(400).json({
        success: false,
        message: 'Token ed email sono obbligatori',
      });
    }

    // Trova client access
    const clientAccess = await prisma.clientAccess.findUnique({
      where: { activationToken: token },
      include: { contact: true },
    });

    if (!clientAccess) {
      return res.status(404).json({
        success: false,
        message: 'Token non valido',
      });
    }

    // Verifica email
    if (clientAccess.contact.email?.toLowerCase() !== email.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: 'Email non corrisponde',
      });
    }

    // Genera codice 6 cifre
    const code = generateVerificationCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // Valido 10 minuti

    // Salva codice nel database
    await prisma.emailVerificationCode.create({
      data: {
        email: email.toLowerCase(),
        code,
        expiresAt,
      },
    });

    // Invia email con codice
    const emailService = await import('../services/email.service');
    const emailSent = await emailService.sendClientActivationCodeEmail(
      email,
      clientAccess.contact.name,
      code
    );

    if (!emailSent) {
      console.warn(`⚠️ Impossibile inviare email a ${email}, ma il codice è stato generato`);
    } else {
      console.log(`✅ Email di verifica inviata a ${email}`);
    }

    res.json({
      success: true,
      message: 'Codice di verifica inviato via email',
      // REMOVE IN PRODUCTION - Show code in development for testing
      debug: process.env.NODE_ENV === 'development' ? { code } : undefined,
    });
  } catch (error: any) {
    console.error('Error sending verification code:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'invio del codice di verifica',
      error: error.message,
    });
  }
};

/**
 * POST /api/client-auth/verify-code
 * Step 2.5: Verifica codice email
 */
export const verifyCode = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email e codice sono obbligatori',
      });
    }

    // Trova codice valido
    const verification = await prisma.emailVerificationCode.findFirst({
      where: {
        email: email.toLowerCase(),
        code,
        verified: false,
        expiresAt: {
          gte: new Date(),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verification) {
      return res.status(400).json({
        success: false,
        message: 'Codice non valido o scaduto',
      });
    }

    // Marca come verificato
    await prisma.emailVerificationCode.update({
      where: { id: verification.id },
      data: {
        verified: true,
        verifiedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Email verificata con successo',
    });
  } catch (error: any) {
    console.error('Error verifying code:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella verifica del codice',
      error: error.message,
    });
  }
};

/**
 * POST /api/client-auth/complete-activation
 * Step 3: Completa attivazione con password
 */
export const completeActivation = async (req: Request, res: Response) => {
  try {
    const { token, email, password } = req.body;

    // Validations
    if (!token || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Tutti i campi sono obbligatori',
      });
    }

    // Password strength check
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'La password deve essere di almeno 8 caratteri',
      });
    }

    // Verifica che email sia stata verificata
    const emailVerification = await prisma.emailVerificationCode.findFirst({
      where: {
        email: email.toLowerCase(),
        verified: true,
      },
      orderBy: { verifiedAt: 'desc' },
    });

    if (!emailVerification) {
      return res.status(400).json({
        success: false,
        message: 'Email non verificata. Completa prima la verifica email.',
      });
    }

    // Trova client access
    const clientAccess = await prisma.clientAccess.findUnique({
      where: { activationToken: token },
      include: {
        contact: true,
        linkedQuote: true,
      },
    });

    if (!clientAccess) {
      return res.status(404).json({
        success: false,
        message: 'Token non valido',
      });
    }

    // Verifica email match
    if (clientAccess.contact.email?.toLowerCase() !== email.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: 'Email non corrisponde',
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Attiva account
    const activated = await prisma.clientAccess.update({
      where: { id: clientAccess.id },
      data: {
        passwordHash,
        emailVerified: true,
        activationToken: null, // Rimuovi token usato
        activationExpires: null,
      },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        linkedQuote: {
          select: {
            id: true,
            quoteNumber: true,
            title: true,
          },
        },
      },
    });

    // Log attivazione
    await prisma.clientActivityLog.create({
      data: {
        clientAccessId: activated.id,
        action: 'account_activated',
        details: 'Account attivato con successo',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    // Genera JWT per login automatico
    const jwtPayload: ClientJwtPayload = {
      clientAccessId: activated.id,
      contactId: activated.contactId,
      username: activated.username,
      accessType: activated.accessType,
    };

    const authToken = generateClientToken(jwtPayload);

    res.json({
      success: true,
      message: 'Account attivato con successo',
      data: {
        token: authToken,
        user: {
          username: activated.username,
          accessType: activated.accessType,
          contact: activated.contact,
          linkedQuote: activated.linkedQuote,
        },
      },
    });
  } catch (error: any) {
    console.error('Error completing activation:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel completamento dell\'attivazione',
      error: error.message,
    });
  }
};

/**
 * POST /api/client/auth/verify-username
 * Manual Flow Step 1: Verifica username esiste e non è attivato
 */
export const verifyUsername = async (req: Request, res: Response) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username obbligatorio',
      });
    }

    // Trova client access con questo username
    const clientAccess = await prisma.clientAccess.findUnique({
      where: { username: username.toLowerCase() },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!clientAccess) {
      return res.status(404).json({
        success: false,
        message: 'Username non trovato',
      });
    }

    // Verifica se già attivato
    if (clientAccess.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Account già attivato. Effettua il login.',
      });
    }

    // Verifica se ha activation token
    if (!clientAccess.activationToken) {
      return res.status(400).json({
        success: false,
        message: 'Account non configurato per l\'attivazione',
      });
    }

    res.json({
      success: true,
      data: {
        clientAccess: {
          id: clientAccess.id,
          username: clientAccess.username,
          accessType: clientAccess.accessType,
          emailVerified: clientAccess.emailVerified,
          isActive: clientAccess.isActive,
          contactId: clientAccess.contactId,
          contact: clientAccess.contact,
        },
        email: clientAccess.contact.email || '',
      },
    });
  } catch (error: any) {
    console.error('Error verifying username:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella verifica dell\'username',
      error: error.message,
    });
  }
};

/**
 * POST /api/activate/send-code
 * Send activation code via email
 */
export const sendActivationCode = async (req: Request, res: Response) => {
  try {
    const { username, email } = req.body;

    if (!username || !email) {
      return res.status(400).json({
        success: false,
        message: 'Username e email sono obbligatori',
      });
    }

    // Trova client access
    const clientAccess = await prisma.clientAccess.findUnique({
      where: { username: username.toLowerCase() },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!clientAccess) {
      return res.status(404).json({
        success: false,
        message: 'Username non trovato',
      });
    }

    // Verifica se già attivato
    if (clientAccess.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Account già attivato',
      });
    }

    // Genera codice a 6 cifre
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Salva il codice con timestamp (scade dopo 15 minuti)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minuti
    const activationData = JSON.stringify({
      code: verificationCode,
      expiresAt: expiresAt.toISOString(),
    });

    await prisma.clientAccess.update({
      where: { id: clientAccess.id },
      data: {
        activationToken: activationData,
      },
    });

    // Invia email con il codice
    const emailSent = await sendClientActivationCodeEmail(
      email,
      clientAccess.contact.name,
      verificationCode
    );

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: "Errore nell'invio dell'email",
      });
    }

    res.json({
      success: true,
      message: `Codice inviato a ${email}`,
    });
  } catch (error: any) {
    console.error('Error sending activation code:', error);
    res.status(500).json({
      success: false,
      message: "Errore nell'invio del codice",
      error: error.message,
    });
  }
};

/**
 * POST /api/client/auth/verify-activation-code
 * Manual Flow Step 2: Verifica codice di attivazione
 */
export const verifyActivationCode = async (req: Request, res: Response) => {
  try {
    const { username, activationCode } = req.body;

    if (!username || !activationCode) {
      return res.status(400).json({
        success: false,
        message: 'Username e codice di attivazione sono obbligatori',
      });
    }

    // Trova client access
    const clientAccess = await prisma.clientAccess.findUnique({
      where: { username: username.toLowerCase() },
    });

    if (!clientAccess) {
      return res.status(404).json({
        success: false,
        message: 'Username non trovato',
      });
    }

    // Verifica che ci sia un activation token
    if (!clientAccess.activationToken) {
      return res.status(400).json({
        success: false,
        message: 'Nessun codice di attivazione generato. Richiedi un nuovo codice.',
      });
    }

    // Parse activation data (può essere JSON o stringa semplice per retrocompatibilità)
    let savedCode: string;
    let expiresAt: Date | null = null;

    try {
      const activationData = JSON.parse(clientAccess.activationToken);
      savedCode = activationData.code;
      expiresAt = new Date(activationData.expiresAt);
    } catch {
      // Retrocompatibilità: se non è JSON, usa il valore diretto
      savedCode = clientAccess.activationToken;
    }

    // Verifica codice
    if (savedCode !== activationCode) {
      return res.status(400).json({
        success: false,
        message: 'Codice di attivazione non valido',
      });
    }

    // Verifica scadenza
    if (expiresAt && expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Codice di attivazione scaduto. Richiedi un nuovo codice.',
      });
    }

    // Verifica se già attivato
    if (clientAccess.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Account già attivato',
      });
    }

    res.json({
      success: true,
      message: 'Codice di attivazione verificato',
    });
  } catch (error: any) {
    console.error('Error verifying activation code:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella verifica del codice',
      error: error.message,
    });
  }
};

/**
 * POST /api/client/auth/complete-manual-activation
 * Manual Flow Step 3: Completa attivazione con password
 */
export const completeManualActivation = async (req: Request, res: Response) => {
  try {
    const { username, activationCode, password } = req.body;

    // Validations
    if (!username || !activationCode || !password) {
      return res.status(400).json({
        success: false,
        message: 'Tutti i campi sono obbligatori',
      });
    }

    // Password strength check
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'La password deve essere di almeno 8 caratteri',
      });
    }

    // Trova client access
    const clientAccess = await prisma.clientAccess.findUnique({
      where: { username: username.toLowerCase() },
      include: {
        contact: true,
        linkedQuote: true,
      },
    });

    if (!clientAccess) {
      return res.status(404).json({
        success: false,
        message: 'Username non trovato',
      });
    }

    // Verifica che ci sia un activation token
    if (!clientAccess.activationToken) {
      return res.status(400).json({
        success: false,
        message: 'Nessun codice di attivazione generato. Richiedi un nuovo codice.',
      });
    }

    // Parse activation data (può essere JSON o stringa semplice per retrocompatibilità)
    let savedCode: string;
    let expiresAt: Date | null = null;

    try {
      const activationData = JSON.parse(clientAccess.activationToken);
      savedCode = activationData.code;
      expiresAt = new Date(activationData.expiresAt);
    } catch {
      // Retrocompatibilità: se non è JSON, usa il valore diretto
      savedCode = clientAccess.activationToken;
      // Usa il campo activationExpires per vecchi token
      expiresAt = clientAccess.activationExpires;
    }

    // Verifica codice di attivazione
    if (savedCode !== activationCode) {
      return res.status(400).json({
        success: false,
        message: 'Codice di attivazione non valido',
      });
    }

    // Verifica scadenza
    if (expiresAt && expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Codice di attivazione scaduto. Richiedi un nuovo codice.',
      });
    }

    // Verifica se già attivato
    if (clientAccess.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Account già attivato',
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Attiva account
    const activated = await prisma.clientAccess.update({
      where: { id: clientAccess.id },
      data: {
        passwordHash,
        emailVerified: true,
        activationToken: null, // Rimuovi token usato
        activationExpires: null,
      },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        linkedQuote: {
          select: {
            id: true,
            quoteNumber: true,
            title: true,
          },
        },
      },
    });

    // Log attivazione
    await prisma.clientActivityLog.create({
      data: {
        clientAccessId: activated.id,
        action: 'account_activated_manual',
        details: 'Account attivato manualmente con codice',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    // Genera JWT per login automatico
    const jwtPayload: ClientJwtPayload = {
      clientAccessId: activated.id,
      contactId: activated.contactId,
      username: activated.username,
      accessType: activated.accessType,
    };

    const authToken = generateClientToken(jwtPayload);

    res.json({
      success: true,
      message: 'Account attivato con successo',
      data: {
        token: authToken,
        clientAccess: {
          id: activated.id,
          username: activated.username,
          accessType: activated.accessType,
          contact: activated.contact,
          linkedQuote: activated.linkedQuote,
        },
      },
    });
  } catch (error: any) {
    console.error('Error completing manual activation:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel completamento dell\'attivazione',
      error: error.message,
    });
  }
};

/**
 * POST /api/client-auth/login
 * Login per clienti
 */
export const clientLogin = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username e password sono obbligatori',
      });
    }

    // Trova client access
    const clientAccess = await prisma.clientAccess.findUnique({
      where: { username: username.toLowerCase() },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        linkedQuote: {
          select: {
            id: true,
            quoteNumber: true,
            title: true,
            status: true,
          },
        },
      },
    });

    if (!clientAccess) {
      return res.status(401).json({
        success: false,
        message: 'Credenziali non valide',
      });
    }

    // Verifica account attivo
    if (!clientAccess.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account disabilitato. Contatta il supporto.',
      });
    }

    // Verifica email verificata
    if (!clientAccess.emailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Account non attivato. Completa prima l\'attivazione.',
      });
    }

    // Verifica password
    if (!clientAccess.passwordHash) {
      return res.status(403).json({
        success: false,
        message: 'Account non completamente configurato',
      });
    }

    const validPassword = await bcrypt.compare(password, clientAccess.passwordHash);

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Credenziali non valide',
      });
    }

    // Aggiorna last login
    await prisma.clientAccess.update({
      where: { id: clientAccess.id },
      data: { lastLogin: new Date() },
    });

    // Log login
    await prisma.clientActivityLog.create({
      data: {
        clientAccessId: clientAccess.id,
        action: 'login',
        details: 'Login effettuato',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    // Genera JWT
    const jwtPayload: ClientJwtPayload = {
      clientAccessId: clientAccess.id,
      contactId: clientAccess.contactId,
      username: clientAccess.username,
      accessType: clientAccess.accessType,
    };

    const authToken = generateClientToken(jwtPayload);

    res.json({
      success: true,
      message: 'Login effettuato con successo',
      data: {
        token: authToken,
        clientAccess: {
          id: clientAccess.id,
          username: clientAccess.username,
          accessType: clientAccess.accessType,
          contact: clientAccess.contact,
          linkedQuote: clientAccess.linkedQuote,
          projectName: clientAccess.projectName,
          supportHoursIncluded: clientAccess.supportHoursIncluded,
          supportHoursUsed: clientAccess.supportHoursUsed,
        },
      },
    });
  } catch (error: any) {
    console.error('Error during client login:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il login',
      error: error.message,
    });
  }
};

/**
 * GET /api/client-auth/me
 * Ottieni dati cliente autenticato
 */
export const getClientMe = async (req: Request, res: Response) => {
  try {
    const clientAccessId = (req as any).client.clientAccessId;

    const clientAccess = await prisma.clientAccess.findUnique({
      where: { id: clientAccessId },
      include: {
        contact: true,
        linkedQuote: {
          include: {
            items: true,
            packages: {
              include: {
                items: true,
              },
            },
          },
        },
      },
    });

    if (!clientAccess) {
      return res.status(404).json({
        success: false,
        message: 'Cliente non trovato',
      });
    }

    res.json({
      success: true,
      data: {
        id: clientAccess.id,
        username: clientAccess.username,
        accessType: clientAccess.accessType,
        contact: clientAccess.contact,
        linkedQuoteId: clientAccess.linkedQuoteId,
        linkedQuote: clientAccess.linkedQuote,
        projectName: clientAccess.projectName,
        projectDescription: clientAccess.projectDescription,
        projectObjectives: clientAccess.projectObjectives,
        projectBudget: clientAccess.projectBudget,
        budgetDisplayType: clientAccess.budgetDisplayType,
        projectStartDate: clientAccess.projectStartDate,
        projectEndDate: clientAccess.projectEndDate,
        monthlyFee: clientAccess.monthlyFee,
        supportHoursIncluded: clientAccess.supportHoursIncluded,
        supportHoursUsed: clientAccess.supportHoursUsed,
        driveFolderLink: clientAccess.driveFolderLink,
        driveFolderLinkTitle: clientAccess.driveFolderLinkTitle,
        driveFolderLinkDescription: clientAccess.driveFolderLinkDescription,
        documentsFolder: clientAccess.documentsFolder,
        documentsFolderTitle: clientAccess.documentsFolderTitle,
        documentsFolderDescription: clientAccess.documentsFolderDescription,
        assetsFolder: clientAccess.assetsFolder,
        assetsFolderTitle: clientAccess.assetsFolderTitle,
        assetsFolderDescription: clientAccess.assetsFolderDescription,
        invoiceFolder: clientAccess.invoiceFolder,
        invoiceFolderTitle: clientAccess.invoiceFolderTitle,
        invoiceFolderDescription: clientAccess.invoiceFolderDescription,
        bespokeDetails: clientAccess.bespokeDetails ? JSON.parse(clientAccess.bespokeDetails) : null,
        lastLogin: clientAccess.lastLogin,
      },
    });
  } catch (error: any) {
    console.error('Error fetching client data:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero dei dati cliente',
      error: error.message,
    });
  }
};

/**
 * POST /api/client-auth/change-password
 * Cambio password per cliente autenticato
 */
export const changePassword = async (req: Request, res: Response) => {
  try {
    const clientAccessId = (req as any).client.clientAccessId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password corrente e nuova password sono obbligatorie',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'La nuova password deve essere di almeno 8 caratteri',
      });
    }

    const clientAccess = await prisma.clientAccess.findUnique({
      where: { id: clientAccessId },
    });

    if (!clientAccess || !clientAccess.passwordHash) {
      return res.status(404).json({
        success: false,
        message: 'Cliente non trovato',
      });
    }

    // Verifica password corrente
    const validPassword = await bcrypt.compare(currentPassword, clientAccess.passwordHash);

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Password corrente non corretta',
      });
    }

    // Hash nuova password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Aggiorna password
    await prisma.clientAccess.update({
      where: { id: clientAccessId },
      data: { passwordHash: newPasswordHash },
    });

    // Log cambio password
    await prisma.clientActivityLog.create({
      data: {
        clientAccessId,
        action: 'password_changed',
        details: 'Password modificata',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    res.json({
      success: true,
      message: 'Password modificata con successo',
    });
  } catch (error: any) {
    console.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel cambio password',
      error: error.message,
    });
  }
};
