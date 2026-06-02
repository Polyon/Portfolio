export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface TokenResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
}
