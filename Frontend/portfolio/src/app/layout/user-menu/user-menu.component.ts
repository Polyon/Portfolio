import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatMenuModule],
  template: `
    <button class="user-trigger" [matMenuTriggerFor]="userMenu" aria-label="Open user menu">
      <div class="trigger-avatar">{{ userInitial }}</div>
      <div class="trigger-info">
        <span class="trigger-email">{{ currentUser?.email }}</span>
        <span class="trigger-role">{{ currentUser?.role ?? 'Admin' }}</span>
      </div>
      <mat-icon class="trigger-chevron">expand_more</mat-icon>
    </button>

    <mat-menu #userMenu="matMenu" class="admin-user-menu">
      <button mat-menu-item routerLink="/admin/profile">
        <mat-icon>person</mat-icon>
        <span>Profile</span>
      </button>
      <button mat-menu-item (click)="logout()">
        <mat-icon>logout</mat-icon>
        <span>Logout</span>
      </button>
    </mat-menu>
  `,
  styles: [`
    .user-trigger {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 5px 10px 5px 5px;
      border-radius: 10px;
      border: 1px solid rgba(0, 217, 255, 0.12);
      background: rgba(0, 217, 255, 0.05);
      cursor: pointer;
      transition: background 0.2s, border-color 0.2s;
      outline: none;

      &:hover {
        background: rgba(0, 217, 255, 0.1);
        border-color: rgba(0, 217, 255, 0.28);
      }
    }

    .trigger-avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0055cc, #00D9FF);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      font-weight: 700;
      color: #fff;
      flex-shrink: 0;
    }

    .trigger-info {
      display: flex;
      flex-direction: column;
      gap: 1px;
      text-align: left;
    }

    .trigger-email {
      font-size: 0.78rem;
      color: rgba(255, 255, 255, 0.85);
      white-space: nowrap;
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .trigger-role {
      font-size: 0.65rem;
      color: #00D9FF;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .trigger-chevron {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: rgba(255, 255, 255, 0.35);
      flex-shrink: 0;
    }

    @media (max-width: 768px) {
      .trigger-info, .trigger-chevron { display: none; }
      .user-trigger { border: none; background: none; padding: 4px; }
    }
  `],
})
/**
 * Toolbar user-menu button.
 * Shows the current user's email and role, and provides a logout action.
 */
export class UserMenuComponent {
  private authService = inject(AuthService);

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get userInitial(): string {
    return (this.currentUser?.email?.charAt(0) ?? 'A').toUpperCase();
  }

  /** Delegates to the auth service to clear the session and redirect to login. */
  logout(): void {
    this.authService.logout();
  }
}
