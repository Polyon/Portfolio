import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin, catchError, of } from 'rxjs';
import { ApiService } from '../../core/http/api.service';
import { PaginatedResponse } from '../../core/models/common.models';
import { AuthService } from '../../core/auth/auth.service';
import { Skill } from '../../core/models/skill.model';
import { Project } from '../../core/models/project.model';

interface StatCard {
  label: string;
  value: string | number;
  icon: string;
  badge?: { text: string; type: 'success' | 'warning' };
  subtitle: string;
}

interface RecentItem {
  icon: string;
  text: string;
  time: string;
  route: string;
}

interface ChartPoint {
  label: string;
  value1: number;
  value2: number;
}

interface ProfileData {
  isPublished: boolean;
  tagline?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="dashboard">
      <div class="page-header">
        <h2 class="welcome-text">Welcome back, {{ user?.email }}</h2>
      </div>

      @if (isLoading()) {
        <div class="loading-center">
          <mat-spinner diameter="48" color="accent"></mat-spinner>
        </div>
      } @else {
        <!-- Stat cards -->
        <div class="stats-row">
          @for (stat of stats; track stat.label) {
            <div class="stat-card glass-card">
              <div class="stat-top-row">
                <div class="stat-icon-wrap">
                  <mat-icon>{{ stat.icon }}</mat-icon>
                </div>
                @if (stat.badge) {
                  <span class="stat-badge badge-{{ stat.badge.type }}">
                    <span class="badge-dot"></span>{{ stat.badge.text }}
                  </span>
                }
              </div>
              <div class="stat-label">{{ stat.label }}</div>
              <div class="stat-value">{{ stat.value }}</div>
              <div class="stat-subtitle">{{ stat.subtitle }}</div>
            </div>
          }
        </div>

        <!-- Bottom row -->
        <div class="bottom-row">
          <!-- Chart panel -->
          <div class="chart-panel glass-card">
            <div class="panel-header">
              <span class="panel-title">Portfolio Analytics</span>
              <div class="mode-tabs">
                <button
                  class="mode-tab"
                  [class.active]="chartMode() === 'skills'"
                  (click)="setChartMode('skills')">
                  Projects vs Skills
                </button>
                <button
                  class="mode-tab"
                  [class.active]="chartMode() === 'experience'"
                  (click)="setChartMode('experience')">
                  Projects vs Experience
                </button>
              </div>
            </div>

            <!-- Clickable legend -->
            <div class="chart-legend">
              <button class="legend-btn" [class.dimmed]="!showSeries1()" (click)="showSeries1.set(!showSeries1())">
                <span class="legend-swatch cyan"></span>{{ series1Label }}
              </button>
              <button class="legend-btn" [class.dimmed]="!showSeries2()" (click)="showSeries2.set(!showSeries2())">
                <span
                  class="legend-swatch"
                  [class.purple]="chartMode() === 'skills'"
                  [class.orange]="chartMode() === 'experience'">
                </span>{{ series2Label }}
              </button>
              @if (activeIndex() !== null) {
                <span class="hover-hint">{{ chartData[activeIndex()!].label }}</span>
              }
            </div>

            <!-- SVG chart -->
            <div class="chart-wrap">
              <svg
                [attr.viewBox]="'0 0 ' + chartW + ' ' + chartH"
                preserveAspectRatio="xMidYMid meet"
                class="chart-svg"
                (mouseleave)="activeIndex.set(null)">

                <defs>
                  <linearGradient id="cg1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#00D9FF" stop-opacity="0.32"/>
                    <stop offset="100%" stop-color="#00D9FF" stop-opacity="0"/>
                  </linearGradient>
                  <linearGradient id="cg2p" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#7C4DFF" stop-opacity="0.26"/>
                    <stop offset="100%" stop-color="#7C4DFF" stop-opacity="0"/>
                  </linearGradient>
                  <linearGradient id="cg2e" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#FFA726" stop-opacity="0.26"/>
                    <stop offset="100%" stop-color="#FFA726" stop-opacity="0"/>
                  </linearGradient>
                </defs>

                <!-- Grid lines + Y labels -->
                @for (tick of yTicks; track tick) {
                  <line
                    [attr.x1]="padL" [attr.y1]="getY(tick)"
                    [attr.x2]="chartW - padR" [attr.y2]="getY(tick)"
                    stroke="rgba(255,255,255,0.055)" stroke-width="1"/>
                  <text
                    [attr.x]="padL - 6" [attr.y]="getY(tick) + 4"
                    text-anchor="end" fill="rgba(255,255,255,0.3)" font-size="9">{{ tick }}</text>
                }

                <!-- X axis labels -->
                @for (pt of chartData; track pt.label; let i = $index) {
                  <text
                    [attr.x]="getX(i)" [attr.y]="chartH - 6"
                    text-anchor="middle" fill="rgba(255,255,255,0.3)" font-size="9">{{ pt.label }}</text>
                }

                <!-- Hover crosshair -->
                @if (activeIndex() !== null) {
                  <line
                    [attr.x1]="getX(activeIndex()!)" [attr.y1]="padT"
                    [attr.x2]="getX(activeIndex()!)" [attr.y2]="chartH - padB"
                    stroke="rgba(255,255,255,0.16)" stroke-width="1" stroke-dasharray="4,3"/>
                }

                <!-- Area fills -->
                @if (showSeries2()) {
                  <path
                    [attr.d]="area2"
                    [attr.fill]="'url(#' + (chartMode() === 'skills' ? 'cg2p' : 'cg2e') + ')'"/>
                }
                @if (showSeries1()) {
                  <path [attr.d]="area1" fill="url(#cg1)"/>
                }

                <!-- Lines -->
                @if (showSeries2()) {
                  <path [attr.d]="line2" fill="none"
                        [attr.stroke]="series2Color"
                        stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                }
                @if (showSeries1()) {
                  <path [attr.d]="line1" fill="none" stroke="#00D9FF"
                        stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                }

                <!-- Data point dots -->
                @for (pt of chartData; track pt.label; let i = $index) {
                  @if (showSeries1()) {
                    <circle
                      [attr.cx]="getX(i)" [attr.cy]="getY(pt.value1)"
                      [attr.r]="activeIndex() === i ? 6 : 4"
                      fill="#00D9FF" stroke="#0a1628" stroke-width="2"/>
                  }
                  @if (showSeries2()) {
                    <circle
                      [attr.cx]="getX(i)" [attr.cy]="getY(pt.value2)"
                      [attr.r]="activeIndex() === i ? 6 : 4"
                      [attr.fill]="series2Color" stroke="#0a1628" stroke-width="2"/>
                  }
                }

                <!-- Tooltip -->
                @if (activeIndex() !== null) {
                  <g [attr.transform]="'translate(' + getTooltipX() + ',' + (padT + 6) + ')'">
                    <rect x="-60" y="-4" width="120" height="58" rx="7"
                          fill="rgba(6,14,30,0.96)"
                          stroke="rgba(0,217,255,0.25)" stroke-width="1"/>
                    <text x="0" y="12" text-anchor="middle"
                          fill="rgba(200,200,200,0.85)" font-size="10" font-weight="600">
                      {{ chartData[activeIndex()!].label }}
                    </text>
                    <rect x="-50" y="22" width="10" height="3" rx="1" fill="#00D9FF"/>
                    <text x="-36" y="28" fill="rgba(255,255,255,0.82)" font-size="10">
                      {{ series1Label }}: {{ chartData[activeIndex()!].value1 }}
                    </text>
                    <rect x="-50" y="38" width="10" height="3" rx="1" [attr.fill]="series2Color"/>
                    <text x="-36" y="44" fill="rgba(255,255,255,0.82)" font-size="10">
                      {{ series2Label }}: {{ chartData[activeIndex()!].value2 }}
                    </text>
                  </g>
                }

                <!-- Invisible hover hit-zones (drawn last = on top) -->
                @for (pt of chartData; track pt.label; let i = $index) {
                  <rect
                    [attr.x]="getHitX(i)" [attr.y]="padT"
                    [attr.width]="getHitWidth(i)" [attr.height]="chartH - padT - padB"
                    fill="transparent" style="cursor:crosshair"
                    (mouseenter)="activeIndex.set(i)"/>
                }
              </svg>
            </div>
          </div>

          <!-- Recent updates panel -->
          <div class="recent-panel glass-card">
            <div class="panel-header">
              <span class="panel-title">Recent Updates</span>
            </div>
            <div class="recent-list">
              @for (item of recentItems; track item.text) {
                <a class="recent-item" [routerLink]="item.route">
                  <div class="recent-icon-wrap">
                    <mat-icon>{{ item.icon }}</mat-icon>
                  </div>
                  <div class="recent-content">
                    <span class="recent-text">{{ item.text }}</span>
                    <span class="recent-time">{{ item.time }}</span>
                  </div>
                </a>
              }
              @if (!recentItems.length) {
                <p class="no-updates">No recent updates.</p>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard { padding: 0; }
    .page-header { margin-bottom: 28px; }
    .welcome-text { margin: 0; font-size: 1.7rem; font-weight: 600; color: var(--color-text-primary); }
    .loading-center { display: flex; justify-content: center; padding: 64px; }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-bottom: 24px;
    }
    .stat-card {
      padding: 22px 20px;
      background: linear-gradient(135deg, rgba(0,90,180,0.28) 0%, rgba(5,20,50,0.35) 100%);
      border-radius: var(--border-radius);
      border: var(--glass-border);
      backdrop-filter: var(--glass-blur);
      cursor: pointer;
      transition: var(--transition);
      &:hover { transform: translateY(-2px); border-color: rgba(0,217,255,0.4); }
    }
    .stat-top-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .stat-icon-wrap {
      width: 48px; height: 48px; border-radius: 12px;
      background: rgba(0,217,255,0.12);
      display: flex; align-items: center; justify-content: center;
      mat-icon { font-size: 26px; width: 26px; height: 26px; color: var(--color-accent); }
    }
    .stat-badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 500; }
    .badge-success { background: rgba(0,200,100,0.15); border: 1px solid rgba(0,200,100,0.35); color: #4cde8f; }
    .badge-warning { background: rgba(255,160,0,0.15); border: 1px solid rgba(255,160,0,0.3); color: #ffb84d; }
    .badge-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
    .stat-label { font-size: 0.78rem; color: var(--color-text-secondary); margin-bottom: 4px; }
    .stat-value { font-size: 1.9rem; font-weight: 700; color: var(--color-text-primary); line-height: 1.1; margin-bottom: 4px; }
    .stat-subtitle { font-size: 0.75rem; color: var(--color-text-secondary); }

    .bottom-row { display: grid; grid-template-columns: 3fr 2fr; gap: 20px; }

    .chart-panel, .recent-panel {
      padding: 22px;
      background: var(--glass-bg);
      border-radius: var(--border-radius);
      border: var(--glass-border);
      backdrop-filter: var(--glass-blur);
    }
    .panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; gap: 10px; flex-wrap: wrap; }
    .panel-title { font-size: 0.95rem; font-weight: 600; color: var(--color-text-primary); }

    .mode-tabs { display: flex; gap: 4px; }
    .mode-tab {
      padding: 4px 11px; border-radius: 6px;
      border: 1px solid rgba(255,255,255,0.1);
      background: transparent; color: rgba(255,255,255,0.42);
      font-size: 0.72rem; cursor: pointer; transition: all 0.18s; white-space: nowrap;
      &:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.72); }
      &.active { background: rgba(0,217,255,0.12); border-color: rgba(0,217,255,0.35); color: var(--color-accent); }
    }

    .chart-legend { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; flex-wrap: wrap; }
    .legend-btn {
      display: flex; align-items: center; gap: 7px;
      background: none; border: 1px solid transparent; cursor: pointer;
      font-size: 0.78rem; color: var(--color-text-secondary);
      padding: 3px 9px; border-radius: 5px; transition: all 0.18s;
      &:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); color: rgba(255,255,255,0.8); }
      &.dimmed { opacity: 0.35; }
    }
    .legend-swatch { width: 22px; height: 3px; border-radius: 2px; flex-shrink: 0; }
    .legend-swatch.cyan { background: #00D9FF; }
    .legend-swatch.purple { background: #7C4DFF; }
    .legend-swatch.orange { background: #FFA726; }
    .hover-hint {
      margin-left: auto; font-size: 0.75rem; color: var(--color-accent);
      background: rgba(0,217,255,0.08); padding: 2px 9px; border-radius: 10px;
    }

    .chart-wrap { width: 100%; }
    .chart-svg { width: 100%; height: auto; display: block; }

    .recent-list { display: flex; flex-direction: column; gap: 2px; }
    .recent-item {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 10px 8px; border-radius: 8px; text-decoration: none;
      color: inherit; transition: background 0.2s; cursor: pointer;
      &:hover { background: rgba(255,255,255,0.05); }
    }
    .recent-icon-wrap {
      width: 34px; height: 34px; flex-shrink: 0; border-radius: 8px;
      background: rgba(0,217,255,0.1);
      display: flex; align-items: center; justify-content: center;
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--color-accent); }
    }
    .recent-content { display: flex; flex-direction: column; gap: 2px; }
    .recent-text { font-size: 0.82rem; color: var(--color-text-primary); line-height: 1.3; }
    .recent-time { font-size: 0.72rem; color: var(--color-text-secondary); }
    .no-updates { color: var(--color-text-secondary); font-size: 0.85rem; padding: 8px; }

    @media (max-width: 1100px) { .stats-row { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 900px) { .bottom-row { grid-template-columns: 1fr; } }
    @media (max-width: 600px) {
      .stats-row { grid-template-columns: 1fr 1fr; }
      .welcome-text { font-size: 1.3rem; }
      .mode-tabs { flex-wrap: wrap; }
    }
    @media (max-width: 420px) {
      .stats-row { grid-template-columns: 1fr; }
    }
  `],
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private apiService = inject(ApiService);

  user = this.authService.getCurrentUser();
  isLoading = signal(true);

  chartMode = signal<'skills' | 'experience'>('skills');
  activeIndex = signal<number | null>(null);
  showSeries1 = signal(true);
  showSeries2 = signal(true);

  stats: StatCard[] = [
    { label: 'Profile Status', value: '—', icon: 'person', subtitle: '...' },
    { label: 'Total Skills', value: '—', icon: 'psychology', subtitle: 'Total skills' },
    { label: 'Total Experience', value: '—', icon: 'work', subtitle: 'Work experiences' },
    { label: 'Total Projects', value: '—', icon: 'rocket_launch', subtitle: 'Portfolio projects' },
  ];

  recentItems: RecentItem[] = [];

  private skillsData: ChartPoint[] = [
    { label: 'Nov', value1: 0, value2: 0 },
    { label: 'Dec', value1: 0, value2: 2 },
    { label: 'Jan', value1: 1, value2: 5 },
    { label: 'Feb', value1: 1, value2: 10 },
    { label: 'Mar', value1: 2, value2: 18 },
    { label: 'Apr', value1: 2, value2: 27 },
  ];

  private experienceData: ChartPoint[] = [
    { label: 'Nov', value1: 0, value2: 0 },
    { label: 'Dec', value1: 0, value2: 0 },
    { label: 'Jan', value1: 1, value2: 1 },
    { label: 'Feb', value1: 1, value2: 1 },
    { label: 'Mar', value1: 2, value2: 1 },
    { label: 'Apr', value1: 2, value2: 2 },
  ];

  get chartData(): ChartPoint[] {
    return this.chartMode() === 'skills' ? this.skillsData : this.experienceData;
  }

  get series1Label(): string { return 'Projects'; }
  get series2Label(): string { return this.chartMode() === 'skills' ? 'Skills' : 'Experience'; }
  get series2Color(): string { return this.chartMode() === 'skills' ? '#7C4DFF' : '#FFA726'; }

  readonly chartW = 580;
  readonly chartH = 220;
  readonly padL = 38;
  readonly padR = 16;
  readonly padT = 20;
  readonly padB = 28;
  yMax = 30;
  yTicks: number[] = [0, 6, 12, 18, 24, 30];

  setChartMode(mode: 'skills' | 'experience'): void {
    this.chartMode.set(mode);
    this.activeIndex.set(null);
    this.updateYScale();
  }

  getX(i: number): number {
    return this.padL + (i / (this.chartData.length - 1)) * (this.chartW - this.padL - this.padR);
  }

  getY(value: number): number {
    const innerH = this.chartH - this.padT - this.padB;
    return this.padT + innerH - (value / this.yMax) * innerH;
  }

  getHitX(i: number): number {
    return i > 0 ? (this.getX(i - 1) + this.getX(i)) / 2 : this.padL;
  }

  getHitWidth(i: number): number {
    const x1 = this.getHitX(i);
    const x2 = i < this.chartData.length - 1
      ? (this.getX(i) + this.getX(i + 1)) / 2
      : this.chartW - this.padR;
    return x2 - x1;
  }

  getTooltipX(): number {
    const idx = this.activeIndex();
    if (idx === null) return 0;
    return Math.min(Math.max(this.getX(idx), this.padL + 64), this.chartW - this.padR - 64);
  }

  get line1(): string {
    return this.chartData.map((p, i) => `${i === 0 ? 'M' : 'L'}${this.getX(i)},${this.getY(p.value1)}`).join(' ');
  }

  get line2(): string {
    return this.chartData.map((p, i) => `${i === 0 ? 'M' : 'L'}${this.getX(i)},${this.getY(p.value2)}`).join(' ');
  }

  get area1(): string {
    const bot = this.padT + (this.chartH - this.padT - this.padB);
    const pts = this.chartData.map((p, i) => `${this.getX(i)},${this.getY(p.value1)}`).join(' L');
    return `M${this.getX(0)},${bot} L${pts} L${this.getX(this.chartData.length - 1)},${bot}Z`;
  }

  get area2(): string {
    const bot = this.padT + (this.chartH - this.padT - this.padB);
    const pts = this.chartData.map((p, i) => `${this.getX(i)},${this.getY(p.value2)}`).join(' L');
    return `M${this.getX(0)},${bot} L${pts} L${this.getX(this.chartData.length - 1)},${bot}Z`;
  }

  private updateYScale(): void {
    const allVals = this.chartData.flatMap(p => [p.value1, p.value2]);
    const max = Math.max(...allVals, 5);
    this.yMax = Math.ceil(max / 5) * 5 + 5;
    this.yTicks = Array.from({ length: 6 }, (_, i) => Math.round((i / 5) * this.yMax));
  }

  ngOnInit(): void {
    forkJoin({
      profile: this.apiService.get<{ data: ProfileData }>('/admin/profile').pipe(catchError(() => of(null))),
      skills: this.apiService.get<PaginatedResponse<Skill>>('/admin/skills', { limit: 5 }).pipe(catchError(() => of(null))),
      experiences: this.apiService.get<PaginatedResponse<unknown>>('/admin/experiences', { limit: 1 }).pipe(catchError(() => of(null))),
      projects: this.apiService.get<PaginatedResponse<Project>>('/admin/projects', { limit: 3 }).pipe(catchError(() => of(null))),
    }).subscribe(({ profile, skills, experiences, projects }) => {
      if (profile?.data) {
        const pub = profile.data.isPublished;
        this.stats[0].value = pub ? 'Published' : 'Draft';
        this.stats[0].badge = pub ? { text: 'Published', type: 'success' } : { text: 'Draft', type: 'warning' };
        this.stats[0].subtitle = pub ? 'Visible to public' : 'Not visible';
      }
      if (skills?.pagination) {
        this.stats[1].value = skills.pagination.total;
        this.skillsData[this.skillsData.length - 1].value2 = skills.pagination.total as number;
      }
      if (experiences?.pagination) {
        this.stats[2].value = experiences.pagination.total;
        this.experienceData[this.experienceData.length - 1].value2 = experiences.pagination.total as number;
      }
      if (projects?.pagination) {
        this.stats[3].value = projects.pagination.total;
        const pTotal = projects.pagination.total as number;
        this.skillsData[this.skillsData.length - 1].value1 = pTotal;
        this.experienceData[this.experienceData.length - 1].value1 = pTotal;
      }
      this.updateYScale();

      const recent: RecentItem[] = [];
      if (profile?.data) {
        recent.push({ icon: 'edit', text: 'Updated Profile Bio', time: '2 hours ago', route: '/admin/profile' });
      }
      skills?.data?.slice(0, 3).forEach((s: Skill) =>
        recent.push({ icon: 'add_circle', text: `Added New Skill: ${s.name}`, time: this.timeAgo(s.createdAt), route: '/admin/skills' })
      );
      projects?.data?.slice(0, 3).forEach((p: Project) =>
        recent.push({ icon: 'check_circle', text: `Published Project: ${p.name}`, time: this.timeAgo(p.createdAt), route: '/admin/projects' })
      );
      this.recentItems = recent.slice(0, 7);
      this.isLoading.set(false);
    });
  }

  private timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86_400_000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  }
}
