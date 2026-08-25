import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * CLIENT JWT PAYLOAD
 * Deve corrispondere a quello nel controller
 */
interface ClientJwtPayload {
  clientAccessId: number;
  contactId: number;
  username: string;
  accessType: string;
  type: string; // Deve essere 'CLIENT'
}

export interface ClientAuthRequest extends Request {
  client?: ClientJwtPayload;
}

/**
 * Middleware di autenticazione per CLIENT
 * Verifica che il token sia valido E che sia di tipo CLIENT
 */
export const authenticateClient = (
  req: ClientAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token non fornito',
      });
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ success: false, message: 'Server configuration error' });
    }

    const decoded = jwt.verify(token, secret) as ClientJwtPayload;

    // IMPORTANTE: Verifica che sia un token CLIENT, non ADMIN
    if (decoded.type !== 'CLIENT') {
      return res.status(403).json({
        success: false,
        message: 'Token non valido per accesso client',
      });
    }

    req.client = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token non valido o scaduto',
    });
  }
};
