/** POST /api/auth/login – request body */
export interface LoginRequest {
  email: string;
  password: string;
}

/** POST /api/auth/login – success response */
export interface LoginResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
  user: CurrentUserResponse;
}

/** POST /api/auth/refresh – request body */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/** POST /api/auth/refresh – success response */
export interface RefreshTokenResponse {
  token: string;
  expiresIn: number;
}

/** GET /api/auth/me – success response */
export interface CurrentUserResponse {
  id: string;
  email: string;
  role: string;
}

/** POST /api/auth/logout – success response */
export interface LogoutResponse {
  message: string;
}

// ─── Legacy / internal DTOs ───────────────────────────────────────────────────

export interface CreateUserDTO {
  email: string;
  password: string;
  role?: string;
}

export interface UpdateUserDTO {
  email?: string;
  password?: string;
}
