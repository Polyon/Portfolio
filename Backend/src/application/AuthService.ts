import bcrypt from 'bcryptjs';
import { UserRepository } from '../infrastructure/repositories/UserRepository';
import { AuthRepository } from '../infrastructure/repositories/AuthRepository';
import { UnauthorizedError, NotFoundError } from '../domain/errors/AppError';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../infrastructure/auth/jwt.service';
import { AuditLog, AuditAction } from '../infrastructure/database/models/AuditLog';
import { UserRole } from '../domain/entities/User.entity';
import type { LoginRequest, LoginResponse, CurrentUserResponse, LogoutResponse, RefreshTokenResponse } from './dtos/auth.dtos';
import type { IUser } from '../infrastructure/database/models/index';
import { TOKEN_EXPIRY_ACCESS } from '../infrastructure/constants/api.constants';

const userRepository = new UserRepository();
const authRepository = new AuthRepository();

const SALT_ROUNDS = 12;

export class AuthService {
  /** Hash a plain-text password. */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  /** Verify plain password against stored hash. */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /** Register the initial admin account (idempotent). */
  async registerAdmin(email: string, password: string): Promise<IUser> {
    const existing = await userRepository.findByEmail(email);
    if (existing) return existing;
    const passwordHash = await this.hashPassword(password);
    return userRepository.create({ email, passwordHash, role: UserRole.ADMIN });
  }

  /** Authenticate a user and return JWTs. */
  async login(dto: LoginRequest, ipAddress?: string, userAgent?: string): Promise<LoginResponse> {
    const user = await userRepository.findByEmail(dto.email);
    if (!user) {
      await authRepository.recordFailedLogin(dto.email);
      throw new UnauthorizedError('Invalid credentials');
    }

    const valid = await this.comparePassword(dto.password, user.passwordHash);
    if (!valid) {
      await authRepository.recordFailedLogin(dto.email);
      throw new UnauthorizedError('Invalid credentials');
    }

    const userId = (user._id as object).toString();
    const payload = { sub: userId, email: user.email, role: user.role };
    const token = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await authRepository.updateLastLogin(userId);

    await AuditLog.create({
      userId: user._id,
      action: AuditAction.CREATE,
      entityType: 'Session',
      entityId: user._id,
      ipAddress,
      userAgent,
    });

    return {
      token,
      refreshToken,
      expiresIn: TOKEN_EXPIRY_ACCESS,
      user: { id: userId, email: user.email, role: user.role },
    };
  }

  /** Refresh access token using a valid refresh token. */
  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    const payload = verifyRefreshToken(refreshToken);
    const user = await userRepository.findById(payload.sub);
    if (!user) throw new NotFoundError('User not found');

    const newPayload = { sub: (user._id as object).toString(), email: user.email, role: user.role };
    const token = signAccessToken(newPayload);
    return { token, expiresIn: TOKEN_EXPIRY_ACCESS };
  }

  /** Return the authenticated user's profile. */
  async getCurrentUser(userId: string): Promise<CurrentUserResponse | null> {
    const user = await userRepository.findById(userId);
    if (!user) return null;
    return { id: (user._id as object).toString(), email: user.email, role: user.role };
  }

  /**
   * Logout the user.
   * For JWT-based auth without a token blacklist, this is a soft operation
   * that records the logout in the audit log.
   */
  async logout(userId: string, ipAddress?: string, userAgent?: string): Promise<LogoutResponse> {
    const user = await userRepository.findById(userId);
    if (user) {
      await AuditLog.create({
        userId: user._id,
        action: AuditAction.DELETE,
        entityType: 'Session',
        entityId: user._id,
        ipAddress,
        userAgent,
      }).catch(() => { /* swallow – do not fail on audit log error */ });
    }
    return { message: 'Logged out successfully' };
  }
}
