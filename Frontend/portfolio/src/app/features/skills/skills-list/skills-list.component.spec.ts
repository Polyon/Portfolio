import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideZonelessChangeDetection } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { SkillsListComponent } from './skills-list.component';
import { SkillsService } from '../../../core/services/skills.service';
import { Skill, SkillCategory } from '../../../core/models/skill.model';
import { PaginatedResponse } from '../../../core/models/common.models';

describe('SkillsListComponent', () => {
  let fixture: ComponentFixture<SkillsListComponent>;
  let component: SkillsListComponent;
  let skillsServiceSpy: jasmine.SpyObj<SkillsService>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;

  const mockSkill: Skill = {
    id: 's1',
    userId: 'u1',
    name: 'TypeScript',
    category: SkillCategory.BACKEND,
    proficiencyLevel: 5,
    endorsementCount: 0,
    isPublished: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  };

  const mockPaged: PaginatedResponse<Skill> = {
    data: [mockSkill],
    pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
  };

  beforeEach(() => {
    skillsServiceSpy = jasmine.createSpyObj('SkillsService', ['getSkills', 'deleteSkill']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    skillsServiceSpy.getSkills.and.returnValue(of(mockPaged));

    TestBed.configureTestingModule({
      imports: [SkillsListComponent, ReactiveFormsModule, NoopAnimationsModule],
      providers: [
        provideZonelessChangeDetection(),
        { provide: SkillsService, useValue: skillsServiceSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MatDialog, useValue: dialogSpy },
      ],
    });
    // Override at component level so the spy shadows the module-provided MatSnackBar
    TestBed.overrideComponent(SkillsListComponent, {
      add: { providers: [{ provide: MatSnackBar, useValue: snackBarSpy }] }
    });
    fixture = TestBed.createComponent(SkillsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load skills on init', () => {
    expect(skillsServiceSpy.getSkills).toHaveBeenCalled();
    expect(component.skills().length).toBe(1);
    expect(component.skills()[0].name).toBe('TypeScript');
  });

  it('should set isLoading to false after loading', () => {
    expect(component.isLoading()).toBeFalse();
  });

  it('should show error snackbar when getSkills fails', () => {
    skillsServiceSpy.getSkills.and.returnValue(throwError(() => new Error('fail')));
    component['loadSkills']();
    expect(snackBarSpy.open).toHaveBeenCalled();
    expect(component.isLoading()).toBeFalse();
  });

  it('should reset page to 0 when filters change', (done) => {
    component.currentPage.set(2);
    component.filterForm.patchValue({ search: 'Type' });
    setTimeout(() => {
      expect(component.currentPage()).toBe(0);
      done();
    }, 500);
  });

  describe('pagination', () => {
    it('should update page and pageSize on page change', () => {
      component.onPageChange({ pageIndex: 1, pageSize: 25, length: 100 });
      expect(component.currentPage()).toBe(1);
      expect(component.pageSize()).toBe(25);
    });
  });

  describe('getCategoryColor()', () => {
    it('should return a colour for each known category', () => {
      Object.values(SkillCategory).forEach((cat) => {
        const color = component.getCategoryColor(cat);
        expect(color).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });
  });

  describe('resetFilters()', () => {
    it('should clear search and category fields', () => {
      component.filterForm.patchValue({ search: 'foo', category: 'BACKEND' });
      component.resetFilters();
      expect(component.filterForm.get('search')?.value).toBe('');
      expect(component.filterForm.get('category')?.value).toBe('');
    });
  });
});
