import { Request, Response, NextFunction } from 'express';

/**
 * Debug middleware to log request details
 */
const REDACTED_FIELDS = ['password', 'currentPassword', 'newPassword', 'temporaryPassword', 'token'];

function redactBody(body: any): any {
  if (!body || typeof body !== 'object') return body;
  const redacted = { ...body };
  for (const field of REDACTED_FIELDS) {
    if (field in redacted) redacted[field] = '[REDACTED]';
  }
  return redacted;
}

export const debugLogger = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV !== 'development') return next();
  console.log(`[DEBUG] ${new Date().toISOString()} ${req.method} ${req.path}`);
  console.log(`[DEBUG] Body:`, JSON.stringify(redactBody(req.body), null, 2));
  next();
};
