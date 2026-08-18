import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Centralized security limiters.
 *
 * All limits are in-memory (fine for this single-process deployment). If the app
 * is ever scaled to multiple instances, switch to a shared store (e.g. Redis) via
 * the `store` option — the same limiter configs below work unchanged.
 */

/** Get the authenticated user id, or fall back to the request IP. */
function keyForUserOrIp(req: Request): string {
  const userId = (req as any).user?.userId;
  if (userId) return `u:${userId}`;
  return `ip:${ipKeyGenerator(req.ip || req.socket.remoteAddress || 'unknown')}`;
}

/** Key on IP + email/username for login endpoints (blocks credential stuffing per identity). */
function keyForLogin(req: Request): string {
  const identity = req.body?.email || req.body?.username || 'anon';
  return `login:${ipKeyGenerator(req.ip || req.socket.remoteAddress || 'unknown')}:${String(identity).toLowerCase()}`;
}

const defaultMessage = { success: false, message: 'Troppe richieste. Riprova più tardi.' };

/**
 * AI endpoints — the most sensitive to abuse (external LLM tokens cost money).
 * Per authenticated user (falls back to IP). Generous enough for normal use,
 * strict enough to stop an infinite token burn.
 */
export const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minuti
  max: 60, // 60 richieste AI per utente / 10 min
  keyGenerator: keyForUserOrIp,
  message: { success: false, message: 'Limite AI raggiunto. Attendi qualche minuto prima di nuove richieste.' },
  standardHeaders: true, // RateLimit-* headers
  legacyHeaders: false,
});

/** Tighter limit for the most expensive AI calls (idea generation, post-groups, review). */
export const aiHeavyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  keyGenerator: keyForUserOrIp,
  message: { success: false, message: 'Hai raggiunto il limite di generazioni AI. Riprova tra qualche minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Login / password-reset — blocks brute-force. Already existed in auth.routes,
 * centralized here and keyed by IP + identity so an attacker can't lock out
 * everyone behind a NAT, and can't rotate usernames to bypass.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuti
  max: 10, // 10 tentativi per identità/IP
  keyGenerator: keyForLogin,
  skipSuccessfulRequests: true, // don't count successful logins against the limit
  message: { success: false, message: 'Troppi tentativi di accesso. Riprova tra 15 minuti.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Global API safety net — every /api request, per IP. High ceiling so normal use
 * is unaffected, but stops an attacker flooding the server with any route.
 */
export const globalApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 300, // 300 richieste API al minuto per IP
  message: { success: false, message: 'Troppe richieste al server. Rallenta.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Small helper to send a 429 consistently (used where a limiter isn't enough). */
export function rateLimited(res: Response, message = 'Troppe richieste. Riprova più tardi.') {
  return res.status(429).json({ success: false, message });
}
