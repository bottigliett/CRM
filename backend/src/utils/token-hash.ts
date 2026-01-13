import crypto from 'crypto';

/**
 * Generates a SHA-256 hash of a token for database storage
 * @param token - The JWT token to hash
 * @returns The hex-encoded SHA-256 hash
 */
export const generateTokenHash = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};
