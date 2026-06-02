import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatIcon } from '@angular/material/icon';

import { ContactMessageStats } from '../../../../../shared/models/contact-inbox.models';

@Component({
  selector: 'app-inbox-stats-bar',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatIcon],
  template: `
    <div class="stats-bar">

      <div class="stat-card">
        <div class="stat-top">
          <span class="stat-label">TOTAL</span>
          <mat-icon class="stat-card-icon">mail_outline</mat-icon>
        </div>
        <span class="stat-value">{{ (stats?.total ?? 0) | number:'2.0-0' }}</span>
        <div class="stat-footer">
          <mat-icon class="footer-icon footer-icon--up">trending_up</mat-icon>
          <span class="footer-text">+12% this week</span>
        </div>
      </div>

      <div class="stat-card stat-card--unread">
        <div class="stat-top">
          <span class="stat-label">UNREAD</span>
          <mat-icon class="stat-card-icon stat-card-icon--unread">mark_email_unread</mat-icon>
        </div>
        <span class="stat-value stat-value--unread">{{ (stats?.unread ?? 0) | number:'2.0-0' }}</span>
        <div class="stat-footer">
          <span class="footer-dot footer-dot--warn"></span>
          <span class="footer-text">Action required</span>
        </div>
      </div>

      <div class="stat-card stat-card--service">
        <div class="stat-top">
          <span class="stat-label">SERVICE</span>
          <mat-icon class="stat-card-icon stat-card-icon--service">build_circle</mat-icon>
        </div>
        <span class="stat-value stat-value--service">{{ (stats?.serviceQueries ?? 0) | number:'2.0-0' }}</span>
        <div class="stat-footer">
          <mat-icon class="footer-icon footer-icon--service">bolt</mat-icon>
          <span class="footer-text">High priority</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-top">
          <span class="stat-label">GENERAL</span>
          <mat-icon class="stat-card-icon">chat_bubble_outline</mat-icon>
        </div>
        <span class="stat-value">{{ (stats?.generalQueries ?? 0) | number:'2.0-0' }}</span>
        <div class="stat-footer">
          <mat-icon class="footer-icon">schedule</mat-icon>
          <span class="footer-text">Stable volume</span>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .stats-bar {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      margin-bottom: 20px;
    }

    .stat-card {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 18px 20px 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      transition: background 0.18s ease, border-color 0.18s ease;
      cursor: default;

      &:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(255, 255, 255, 0.14);
      }

      &--unread:hover { border-color: rgba(167, 139, 250, 0.3); }
      &--service:hover { border-color: rgba(0, 217, 255, 0.3); }
    }

    .stat-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    .stat-label {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 1.2px;
      color: rgba(255, 255, 255, 0.35);
    }

    .stat-card-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: rgba(255, 255, 255, 0.2);

      &--unread  { color: rgba(167, 139, 250, 0.5); }
      &--service { color: rgba(0, 217, 255, 0.5); }
    }

    .stat-value {
      font-size: 2.4rem;
      font-weight: 800;
      line-height: 1;
      color: rgba(255, 255, 255, 0.92);
      letter-spacing: -1px;
      font-variant-numeric: tabular-nums;

      &--unread  { color: #a78bfa; }
      &--service { color: #00d9ff; }
    }

    .stat-footer {
      display: flex;
      align-items: center;
      gap: 5px;
      margin-top: 2px;
    }

    .footer-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: rgba(255, 255, 255, 0.28);

      &--up      { color: #4ade80; }
      &--service { color: #00d9ff; }
    }

    .footer-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;

      &--warn { background: #fb923c; box-shadow: 0 0 6px rgba(251, 146, 60, 0.5); }
    }

    .footer-text {
      font-size: 0.72rem;
      color: rgba(255, 255, 255, 0.38);
    }

    @media (max-width: 700px) {
      .stats-bar { grid-template-columns: repeat(2, 1fr); }
    }
  `],
})
export class InboxStatsBarComponent {
  @Input() stats: ContactMessageStats | null = null;
}
