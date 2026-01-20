import { Request, Response } from 'express';
import prisma from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { AuthRequest } from '../middleware/auth';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { sendEmail } from '../services/email.service';
import { generateTokenHash } from '../utils/token-hash';

export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;

    // Validazione campi obbligatori
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email e password sono obbligatori',
      });
    }

    // Verifica se username esiste già
    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username già in uso',
      });
    }

    // Verifica se email esiste già
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email già in uso',
      });
    }

    // Hash della password
    const hashedPassword = await hashPassword(password);

    // Crea nuovo utente
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        role: 'ADMIN', // Default role
      },
    });

    // Genera token JWT
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Crea sessione
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Token valido 7 giorni

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        tokenHash: generateTokenHash(token),
        expiresAt,
      },
    });

    // Log accesso
    await prisma.accessLog.create({
      data: {
        userId: user.id,
        username: user.username,
        action: 'REGISTER',
        status: 'SUCCESS',
      },
    });

    // Risposta senza password
    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({
      success: true,
      message: 'Registrazione completata con successo',
      data: {
        user: userWithoutPassword,
        token,
      },
    });
  } catch (error) {
    console.error('Errore durante la registrazione:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante la registrazione',
    });
  }
};

/**
 * UNIFIED LOGIN - Admin e Client
 * Controlla prima User table (admin), poi ClientAccess table (client)
 * Restituisce JWT con type: 'ADMIN' o type: 'CLIENT'
 */
export const login = async (req: Request, res: Response) => {
  const requestStartTime = Date.now();

  try {
    const { username, password } = req.body;

    // Validazione
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username e password sono obbligatori',
      });
    }

    // Normalizza username
    const normalizedUsername = username.toLowerCase().trim();

    // Log IP e User Agent per sicurezza
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // ============================================
    // STEP 1: Controlla tabella USER (ADMIN)
    // ============================================
    const user = await prisma.user.findUnique({
      where: { username: normalizedUsername },
      include: {
        permissions: {
          select: {
            id: true,
            moduleName: true,
            hasAccess: true,
          },
        },
      },
    });

    if (user) {
      // Verifica password ADMIN
      const isPasswordValid = await comparePassword(password, user.password);

      if (!isPasswordValid) {
        // Log accesso ADMIN fallito
        await prisma.accessLog.create({
          data: {
            userId: user.id,
            username: user.username,
            action: 'LOGIN',
            status: 'FAILED',
            details: `Failed admin login attempt from ${ipAddress}`,
          },
        });

        // Delay costante per prevenire timing attacks
        const elapsedTime = Date.now() - requestStartTime;
        const minResponseTime = 1000; // 1 secondo minimo
        if (elapsedTime < minResponseTime) {
          await new Promise(resolve => setTimeout(resolve, minResponseTime - elapsedTime));
        }

        return res.status(401).json({
          success: false,
          message: 'Credenziali non valide',
        });
      }

      // Verifica se utente ADMIN è attivo
      if (!user.isActive) {
        await prisma.accessLog.create({
          data: {
            userId: user.id,
            username: user.username,
            action: 'LOGIN',
            status: 'FAILED',
            details: 'Account disabilitato',
          },
        });

        return res.status(403).json({
          success: false,
          message: 'Account disabilitato',
        });
      }

      // Genera token ADMIN (senza type nel JWT per limitare dimensione)
      // Il type viene dedotto dalla presenza di userId vs clientAccessId
      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      // Crea sessione ADMIN
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await prisma.session.create({
        data: {
          userId: user.id,
          token,
          tokenHash: generateTokenHash(token),
          expiresAt,
        },
      });

      // Aggiorna ultimo login ADMIN
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });

      // Log accesso ADMIN riuscito
      await prisma.accessLog.create({
        data: {
          userId: user.id,
          username: user.username,
          action: 'LOGIN',
          status: 'SUCCESS',
          details: `Admin login from ${ipAddress}`,
        },
      });

      console.log(`✅ Admin login successful: ${user.username} from ${ipAddress}`);

      // Risposta ADMIN senza password
      const { password: _, ...userWithoutPassword } = user;

      return res.json({
        success: true,
        message: 'Login effettuato con successo',
        type: 'ADMIN',
        data: {
          user: userWithoutPassword,
          token,
        },
      });
    }

    // ============================================
    // STEP 2: Controlla tabella CLIENT_ACCESS (CLIENT)
    // ============================================
    const client = await prisma.clientAccess.findUnique({
      where: { username: normalizedUsername },
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

    if (client) {
      let isPasswordValid = false;
      const usingTemporaryPassword = !!client.temporaryPassword;

      // Controlla se usa password temporanea (accesso momentaneo)
      if (client.temporaryPassword) {
        // Password temporanea è in chiaro, confronto diretto
        isPasswordValid = password === client.temporaryPassword;
      } else if (client.passwordHash) {
        // Password normale con hash
        isPasswordValid = await comparePassword(password, client.passwordHash);
      } else {
        // Nessuna password impostata
        await prisma.clientActivityLog.create({
          data: {
            clientAccessId: client.id,
            action: 'login_failed',
            details: 'Account non attivato',
            ipAddress,
            userAgent,
          },
        });

        return res.status(403).json({
          success: false,
          message: 'Account non attivato. Completa prima l\'attivazione.',
        });
      }

      if (!isPasswordValid) {
        // Log accesso CLIENT fallito
        await prisma.clientActivityLog.create({
          data: {
            clientAccessId: client.id,
            action: 'login_failed',
            details: `Failed client login attempt from ${ipAddress}`,
            ipAddress,
            userAgent,
          },
        });

        // Delay costante per prevenire timing attacks
        const elapsedTime = Date.now() - requestStartTime;
        const minResponseTime = 1000; // 1 secondo minimo
        if (elapsedTime < minResponseTime) {
          await new Promise(resolve => setTimeout(resolve, minResponseTime - elapsedTime));
        }

        return res.status(401).json({
          success: false,
          message: 'Credenziali non valide',
        });
      }

      // Verifica se cliente è attivo
      if (!client.isActive) {
        await prisma.clientActivityLog.create({
          data: {
            clientAccessId: client.id,
            action: 'login_failed',
            details: 'Account disabilitato',
            ipAddress,
            userAgent,
          },
        });

        return res.status(403).json({
          success: false,
          message: 'Account disabilitato',
        });
      }

      // Se usa password temporanea, salta la verifica email
      if (!usingTemporaryPassword && !client.emailVerified) {
        await prisma.clientActivityLog.create({
          data: {
            clientAccessId: client.id,
            action: 'login_failed',
            details: 'Email non verificata',
            ipAddress,
            userAgent,
          },
        });

        return res.status(403).json({
          success: false,
          message: 'Email non verificata. Completa l\'attivazione.',
        });
      }

      // Genera token CLIENT con type
      const clientToken = jwt.sign(
        {
          clientAccessId: client.id,
          contactId: client.contactId,
          username: client.username,
          accessType: client.accessType,
          type: 'CLIENT', // IMPORTANTE: distingui tipo utente
        },
        process.env.JWT_SECRET || 'fallback-secret-key',
        { expiresIn: '7d' }
      );

      // Aggiorna ultimo login CLIENT
      await prisma.clientAccess.update({
        where: { id: client.id },
        data: { lastLogin: new Date() },
      });

      // Log accesso CLIENT riuscito
      await prisma.clientActivityLog.create({
        data: {
          clientAccessId: client.id,
          action: 'login_success',
          details: `Client login from ${ipAddress}`,
          ipAddress,
          userAgent,
        },
      });

      console.log(`✅ Client login successful: ${client.username} from ${ipAddress}`);

      return res.json({
        success: true,
        message: 'Login effettuato con successo',
        type: 'CLIENT',
        data: {
          token: clientToken,
          clientAccess: {
            id: client.id,
            username: client.username,
            accessType: client.accessType,
            contact: client.contact,
            linkedQuote: client.linkedQuote,
          },
        },
      });
    }

    // ============================================
    // STEP 3: Nessun utente trovato
    // ============================================

    // Log tentativo fallito generico
    console.warn(`⚠️ Failed login attempt for username: ${normalizedUsername} from ${ipAddress}`);

    // Delay costante per prevenire timing attacks e enumerazione username
    const elapsedTime = Date.now() - requestStartTime;
    const minResponseTime = 1000; // 1 secondo minimo
    if (elapsedTime < minResponseTime) {
      await new Promise(resolve => setTimeout(resolve, minResponseTime - elapsedTime));
    }

    return res.status(401).json({
      success: false,
      message: 'Credenziali non valide',
    });

  } catch (error) {
    console.error('❌ Errore durante il login:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il login',
    });
  }
};

export const logout = async (req: AuthRequest, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token non fornito',
      });
    }

    const token = authHeader.substring(7);
    const tokenHash = generateTokenHash(token);

    // Elimina la sessione dal database
    await prisma.session.deleteMany({
      where: { tokenHash },
    });

    // Log logout
    if (req.user) {
      await prisma.accessLog.create({
        data: {
          userId: req.user.userId,
          username: req.user.email,
          action: 'LOGOUT',
          status: 'SUCCESS',
        },
      });
    }

    res.json({
      success: true,
      message: 'Logout effettuato con successo',
    });
  } catch (error) {
    console.error('Errore durante il logout:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il logout',
    });
  }
};

export const getCurrentUser = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    // Recupera i dati completi dell'utente
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        username: true,
        email: true,
        emailVerified: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        profileImage: true,
        lastLogin: true,
        theme: true,
        language: true,
        selectedTheme: true,
        selectedTweakcnTheme: true,
        selectedRadius: true,
        importedThemeData: true,
        brandColors: true,
        sidebarVariant: true,
        sidebarCollapsible: true,
        sidebarSide: true,
        createdAt: true,
        updatedAt: true,
        permissions: {
          select: {
            id: true,
            moduleName: true,
            hasAccess: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utente non trovato',
      });
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error('Errore durante il recupero utente:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero dei dati utente',
    });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    const {
      firstName, lastName, email, username, currentPassword, newPassword,
      theme, language,
      selectedTheme, selectedTweakcnTheme, selectedRadius, importedThemeData, brandColors,
      sidebarVariant, sidebarCollapsible, sidebarSide
    } = req.body;

    // Recupera l'utente corrente
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utente non trovato',
      });
    }

    // Se si vuole cambiare l'email, verifica che non sia già in uso
    if (email && email !== user.email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email },
      });

      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email già in uso',
        });
      }
    }

    // Se si vuole cambiare username, verifica che non sia già in uso
    if (username && username !== user.username) {
      const existingUsername = await prisma.user.findUnique({
        where: { username },
      });

      if (existingUsername) {
        return res.status(400).json({
          success: false,
          message: 'Username già in uso',
        });
      }
    }

    // Prepara i dati da aggiornare
    const updateData: any = {
      firstName: firstName !== undefined ? firstName : user.firstName,
      lastName: lastName !== undefined ? lastName : user.lastName,
      email: email || user.email,
      username: username || user.username,
      theme: theme !== undefined ? theme : user.theme,
      language: language !== undefined ? language : user.language,
      selectedTheme: selectedTheme !== undefined ? selectedTheme : user.selectedTheme,
      selectedTweakcnTheme: selectedTweakcnTheme !== undefined ? selectedTweakcnTheme : user.selectedTweakcnTheme,
      selectedRadius: selectedRadius !== undefined ? selectedRadius : user.selectedRadius,
      importedThemeData: importedThemeData !== undefined ? importedThemeData : user.importedThemeData,
      brandColors: brandColors !== undefined ? brandColors : user.brandColors,
      sidebarVariant: sidebarVariant !== undefined ? sidebarVariant : user.sidebarVariant,
      sidebarCollapsible: sidebarCollapsible !== undefined ? sidebarCollapsible : user.sidebarCollapsible,
      sidebarSide: sidebarSide !== undefined ? sidebarSide : user.sidebarSide,
    };

    // Se l'email è cambiata, resetta il flag di verifica
    if (email && email !== user.email) {
      updateData.emailVerified = false;
    }

    // Se c'è una nuova password, verifica la password corrente e aggiorna
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Password corrente obbligatoria per cambiarla',
        });
      }

      // Verifica password corrente
      const isPasswordValid = await comparePassword(currentPassword, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Password corrente non valida',
        });
      }

      // Hash nuova password
      updateData.password = await hashPassword(newPassword);
    }

    // Aggiorna l'utente
    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        emailVerified: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        profileImage: true,
        lastLogin: true,
        theme: true,
        language: true,
        selectedTheme: true,
        selectedTweakcnTheme: true,
        selectedRadius: true,
        importedThemeData: true,
        brandColors: true,
        sidebarVariant: true,
        sidebarCollapsible: true,
        sidebarSide: true,
        createdAt: true,
        updatedAt: true,
        permissions: {
          select: {
            id: true,
            moduleName: true,
            hasAccess: true,
          },
        },
      },
    });

    // Log dell'aggiornamento
    await prisma.accessLog.create({
      data: {
        userId: user.id,
        username: user.username,
        action: 'UPDATE_PROFILE',
        status: 'SUCCESS',
      },
    });

    res.json({
      success: true,
      message: 'Profilo aggiornato con successo',
      data: { user: updatedUser },
    });
  } catch (error) {
    console.error('Errore durante l\'aggiornamento utente:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'aggiornamento del profilo',
    });
  }
};

export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email obbligatoria',
      });
    }

    // Verifica se l'utente esiste
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Per sicurezza, non rivelare se l'email esiste o meno
    if (!user) {
      return res.json({
        success: true,
        message: 'Se l\'email esiste, riceverai un link per il ripristino della password',
      });
    }

    // Genera token sicuro
    const token = crypto.randomBytes(32).toString('hex');

    // Scadenza: 1 ora
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Salva il token nel database
    await prisma.passwordResetToken.create({
      data: {
        email,
        token,
        expiresAt,
      },
    });

    // TODO: Invia email con il link di ripristino
    // Per ora logghiamo il token in console (in produzione invia email)
    console.log(`Password reset token for ${email}: ${token}`);
    console.log(`Reset link: http://localhost:5173/auth/reset-password?token=${token}`);

    // Log dell'azione
    await prisma.accessLog.create({
      data: {
        userId: user.id,
        username: user.username,
        action: 'PASSWORD_RESET_REQUEST',
        status: 'SUCCESS',
      },
    });

    res.json({
      success: true,
      message: 'Se l\'email esiste, riceverai un link per il ripristino della password',
      // In development, ritorna il token per testing
      ...(process.env.NODE_ENV === 'development' && { token }),
    });
  } catch (error) {
    console.error('Errore durante la richiesta di ripristino password:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante la richiesta di ripristino password',
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token e nuova password obbligatori',
      });
    }

    // Trova il token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      return res.status(400).json({
        success: false,
        message: 'Token non valido o scaduto',
      });
    }

    // Verifica se il token è scaduto
    if (resetToken.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Token scaduto',
      });
    }

    // Verifica se il token è già stato usato
    if (resetToken.used) {
      return res.status(400).json({
        success: false,
        message: 'Token già utilizzato',
      });
    }

    // Trova l'utente
    const user = await prisma.user.findUnique({
      where: { email: resetToken.email },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utente non trovato',
      });
    }

    // Hash nuova password
    const hashedPassword = await hashPassword(newPassword);

    // Aggiorna la password dell'utente
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Marca il token come usato
    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: {
        used: true,
        usedAt: new Date(),
      },
    });

    // Elimina tutte le sessioni attive dell'utente (per sicurezza)
    await prisma.session.deleteMany({
      where: { userId: user.id },
    });

    // Log dell'azione
    await prisma.accessLog.create({
      data: {
        userId: user.id,
        username: user.username,
        action: 'PASSWORD_RESET',
        status: 'SUCCESS',
      },
    });

    res.json({
      success: true,
      message: 'Password ripristinata con successo',
    });
  } catch (error) {
    console.error('Errore durante il ripristino password:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il ripristino password',
    });
  }
};

export const sendEmailVerificationCode = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email obbligatoria',
      });
    }

    // Verifica se l'email è già in uso da un altro utente
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        id: { not: req.user.userId },
      },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email già in uso',
      });
    }

    // Genera codice a 6 cifre
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Scadenza: 15 minuti
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    // Salva il codice nel database
    await prisma.emailVerificationCode.create({
      data: {
        email,
        code,
        expiresAt,
      },
    });

    // Invia email con il codice
    try {
      await sendEmail(
        email,
        'Verifica Email - Studio Mismo CRM',
        `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                <div style="text-align: center; margin-bottom: 32px;">
                  <h1 style="color: #18181b; font-size: 24px; margin: 0 0 8px 0;">Verifica la tua email</h1>
                  <p style="color: #71717a; font-size: 16px; margin: 0;">Studio Mismo CRM</p>
                </div>

                <div style="background-color: #f4f4f5; border-radius: 8px; padding: 24px; margin-bottom: 32px; text-align: center;">
                  <p style="color: #52525b; font-size: 14px; margin: 0 0 16px 0;">Il tuo codice di verifica è:</p>
                  <div style="background-color: #ffffff; border: 2px solid #e4e4e7; border-radius: 8px; padding: 16px; display: inline-block;">
                    <span style="color: #3b82f6; font-size: 32px; font-weight: bold; letter-spacing: 4px;">${code}</span>
                  </div>
                  <p style="color: #71717a; font-size: 12px; margin: 16px 0 0 0;">Questo codice scadrà tra 15 minuti</p>
                </div>

                <div style="border-top: 1px solid #e4e4e7; padding-top: 24px;">
                  <p style="color: #52525b; font-size: 14px; margin: 0 0 12px 0;">
                    Inserisci questo codice nella pagina di verifica per confermare il cambio email.
                  </p>
                  <p style="color: #71717a; font-size: 12px; margin: 0;">
                    Se non hai richiesto questa verifica, ignora questa email.
                  </p>
                </div>

                <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e4e4e7;">
                  <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
                    © ${new Date().getFullYear()} Studio Mismo. Tutti i diritti riservati.
                  </p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
        `Verifica Email - Studio Mismo CRM

Il tuo codice di verifica è: ${code}

Questo codice scadrà tra 15 minuti.

Inserisci questo codice nella pagina di verifica per confermare il cambio email.

Se non hai richiesto questa verifica, ignora questa email.

© ${new Date().getFullYear()} Studio Mismo. Tutti i diritti riservati.`
      );
      console.log(`Email verification code sent to ${email}: ${code}`);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Continue anyway - the code is saved in DB and shown in dev mode
    }

    // Log dell'azione
    await prisma.accessLog.create({
      data: {
        userId: req.user.userId,
        username: req.user.email,
        action: 'EMAIL_VERIFICATION_CODE_SENT',
        status: 'SUCCESS',
        details: `Code sent to ${email}`,
      },
    });

    res.json({
      success: true,
      message: 'Codice di verifica inviato alla tua email',
      // In development, ritorna il codice per testing
      ...(process.env.NODE_ENV === 'development' && { code }),
    });
  } catch (error) {
    console.error('Errore durante l\'invio del codice di verifica:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'invio del codice di verifica',
    });
  }
};

export const verifyEmailCode = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato',
      });
    }

    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email e codice obbligatori',
      });
    }

    // Trova il codice
    const verificationCode = await prisma.emailVerificationCode.findFirst({
      where: {
        email,
        code,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!verificationCode) {
      return res.status(400).json({
        success: false,
        message: 'Codice non valido',
      });
    }

    // Verifica se il codice è scaduto
    if (verificationCode.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Codice scaduto',
      });
    }

    // Verifica se il codice è già stato usato
    if (verificationCode.verified) {
      return res.status(400).json({
        success: false,
        message: 'Codice già utilizzato',
      });
    }

    // Aggiorna l'email dell'utente e marca come verificata
    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        email,
        emailVerified: true,
      },
      select: {
        id: true,
        username: true,
        email: true,
        emailVerified: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        profileImage: true,
        lastLogin: true,
        theme: true,
        language: true,
        selectedTheme: true,
        selectedTweakcnTheme: true,
        selectedRadius: true,
        importedThemeData: true,
        brandColors: true,
        sidebarVariant: true,
        sidebarCollapsible: true,
        sidebarSide: true,
        createdAt: true,
        updatedAt: true,
        permissions: {
          select: {
            id: true,
            moduleName: true,
            hasAccess: true,
          },
        },
      },
    });

    // Marca il codice come verificato
    await prisma.emailVerificationCode.update({
      where: { id: verificationCode.id },
      data: {
        verified: true,
        verifiedAt: new Date(),
      },
    });

    // Log dell'azione
    await prisma.accessLog.create({
      data: {
        userId: req.user.userId,
        username: req.user.email,
        action: 'EMAIL_VERIFIED',
        status: 'SUCCESS',
        details: `Email changed to ${email}`,
      },
    });

    res.json({
      success: true,
      message: 'Email verificata e aggiornata con successo',
      data: { user: updatedUser },
    });
  } catch (error) {
    console.error('Errore durante la verifica del codice:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante la verifica del codice',
    });
  }
};
