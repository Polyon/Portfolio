import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Hash a plain-text password using bcrypt with 10 salt rounds.
 * @param plainPassword  Raw password string
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Compare a plain-text password against a bcrypt hash.
 * Returns true if they match, false otherwise.
 *
 * @param plainPassword  Raw password to check
 * @param bcryptHash     Stored bcrypt hash
 */
export async function validatePassword(plainPassword: string, bcryptHash: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, bcryptHash);
}
