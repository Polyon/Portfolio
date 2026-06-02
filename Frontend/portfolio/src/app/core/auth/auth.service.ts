import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TokenResponse } from '../models/jwt.model';

const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

interface ApiEnvelope<T> {
  data: T;
  timestamp: string;
}

/**
 * Handles authentication operations: login, logout, token storage and decoding.
 * Tokens are persisted in sessionStorage to limit exposure to the current browser tab.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}${environment.apiPrefix}`;
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  /**
   * Authenticates the user against the backend and stores the returned tokens.
   *
   * @param email - Admin email address.
   * @param password - Plaintext password (transmitted over HTTPS).
   * @returns Observable emitting the token response on success.
   */
  login(email: string, password: string): Observable<TokenResponse> {
    return this.http
      .post<ApiEnvelope<TokenResponse>>(`${this.apiUrl}/auth/login`, { email, password })
      .pipe(
        map((envelope) => envelope.data),
        tap((response) => {
          if (this.isBrowser) {
            sessionStorage.setItem(TOKEN_KEY, response.token);
            sessionStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
          }
        }),
      );
  }

  /**
   * Clears stored tokens and redirects the user to the login page.
   */
  logout(): void {
    if (this.isBrowser) {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    }
    this.router.navigate(['/login']);
  }

  /**
   * Checks whether the current session has a valid, non-expired JWT.
   *
   * @returns `true` if the user is authenticated and the token has not expired.
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    try {
      const payload = this.decodeToken(token);
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  /**
   * Returns the stored access token, or `null` in SSR contexts or when not logged in.
   *
   * @returns The raw JWT string or `null`.
   */
  getToken(): string | null {
    return this.isBrowser ? sessionStorage.getItem(TOKEN_KEY) : null;
  }

  /**
   * Returns the stored refresh token, or `null` in SSR contexts or when not logged in.
   *
   * @returns The raw refresh JWT string or `null`.
   */
  getRefreshToken(): string | null {
    return this.isBrowser ? sessionStorage.getItem(REFRESH_TOKEN_KEY) : null;
  }

  /**
   * Exchanges the stored refresh token for a new access token.
   *
   * @returns Observable emitting the refreshed token response.
   */
  refreshToken(): Observable<TokenResponse> {
    const refreshToken = this.getRefreshToken();
    return this.http
      .post<ApiEnvelope<TokenResponse>>(`${this.apiUrl}/auth/refresh`, { refreshToken })
      .pipe(
        map((envelope) => envelope.data),
        tap((response) => {
          if (this.isBrowser) {
            sessionStorage.setItem(TOKEN_KEY, response.token);
            sessionStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
          }
        }),
      );
  }

  /**
   * Decodes the stored access token and returns basic user information.
   *
   * @returns Object with `userId`, `email`, and `role`, or `null` if not authenticated.
   */
  getCurrentUser(): { userId: string; email: string; role: string } | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      return this.decodeToken(token);
    } catch {
      return null;
    }
  }

  /**
   * Base64-decodes the JWT payload and returns typed claims.
   *
   * @param token - Raw JWT string.
   * @returns Decoded payload object.
   * @throws {Error} If the token is malformed.
   */
  private decodeToken(token: string): { userId: string; email: string; role: string; exp: number } {
    const segment = token.split('.')[1];
    const decoded = JSON.parse(atob(segment)) as {
      sub: string;
      email: string;
      role: string;
      exp: number;
    };
    return {
      userId: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      exp: decoded.exp,
    };
  }
}
