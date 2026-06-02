import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';

import { InboxStatsBarComponent } from './inbox-stats-bar.component';
import { ContactMessageStats } from '../../../../../shared/models/contact-inbox.models';

const mockStats: ContactMessageStats = {
  total:          42,
  unread:         7,
  serviceQueries: 18,
  generalQueries: 24,
};

describe('InboxStatsBarComponent', () => {
  let fixture: ComponentFixture<InboxStatsBarComponent>;
  let component: InboxStatsBarComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InboxStatsBarComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture   = TestBed.createComponent(InboxStatsBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display "0" for all tiles when stats is null (zero-state)', () => {
    component.stats = null;
    fixture.detectChanges();

    const values = fixture.debugElement.queryAll(By.css('.stat-value'));
    values.forEach(v => expect(v.nativeElement.textContent.trim()).toBe('0'));
  });

  it('should render total stat value', () => {
    component.stats = mockStats;
    fixture.detectChanges();

    const values = fixture.debugElement.queryAll(By.css('.stat-value'));
    expect(values[0].nativeElement.textContent.trim()).toBe('42');
  });

  it('should render unread stat value', () => {
    component.stats = mockStats;
    fixture.detectChanges();

    const values = fixture.debugElement.queryAll(By.css('.stat-value'));
    expect(values[1].nativeElement.textContent.trim()).toBe('7');
  });

  it('should render service queries stat value', () => {
    component.stats = mockStats;
    fixture.detectChanges();

    const values = fixture.debugElement.queryAll(By.css('.stat-value'));
    expect(values[2].nativeElement.textContent.trim()).toBe('18');
  });

  it('should render general queries stat value', () => {
    component.stats = mockStats;
    fixture.detectChanges();

    const values = fixture.debugElement.queryAll(By.css('.stat-value'));
    expect(values[3].nativeElement.textContent.trim()).toBe('24');
  });

  it('should display four stat tiles', () => {
    component.stats = mockStats;
    fixture.detectChanges();

    const tiles = fixture.debugElement.queryAll(By.css('.stat-tile'));
    expect(tiles.length).toBe(4);
  });

  it('should update values reactively when stats input changes', () => {
    component.stats = { total: 1, unread: 0, serviceQueries: 1, generalQueries: 0 };
    fixture.detectChanges();

    let values = fixture.debugElement.queryAll(By.css('.stat-value'));
    expect(values[0].nativeElement.textContent.trim()).toBe('1');

    component.stats = mockStats;
    fixture.detectChanges();

    values = fixture.debugElement.queryAll(By.css('.stat-value'));
    expect(values[0].nativeElement.textContent.trim()).toBe('42');
  });
});
