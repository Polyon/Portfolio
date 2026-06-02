import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideZonelessChangeDetection } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { ExperienceListComponent } from './experience-list.component';
import { ExperienceService } from '../../../core/services/experience.service';
import { Experience, EmploymentType } from '../../../core/models/experience.model';
import { PaginatedResponse } from '../../../core/models/common.models';

describe('ExperienceListComponent', () => {
  let fixture: ComponentFixture<ExperienceListComponent>;
  let component: ExperienceListComponent;
  let experienceServiceSpy: jasmine.SpyObj<ExperienceService>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;

  const mockExperience: Experience = {
    id: 'e1',
    userId: 'u1',
    company: 'Acme Corp',
    title: 'Senior Developer',
    description: 'Led team of 5',
    startDate: '2022-01-01T00:00:00.000Z',
    endDate: '2024-01-01T00:00:00.000Z',
    isCurrentRole: false,
    location: 'Cape Town',
    employmentType: EmploymentType.FULL_TIME,
    isPublished: true,
    displayOrder: 1,
    createdAt: '2022-01-01',
    updatedAt: '2024-01-01',
  };

  const mockPaged: PaginatedResponse<Experience> = {
    data: [mockExperience],
    pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
  };

  beforeEach(() => {
    experienceServiceSpy = jasmine.createSpyObj('ExperienceService', [
      'getExperiences',
      'deleteExperience',
    ]);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    experienceServiceSpy.getExperiences.and.returnValue(of(mockPaged));

    TestBed.configureTestingModule({
      imports: [ExperienceListComponent, ReactiveFormsModule, NoopAnimationsModule],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ExperienceService, useValue: experienceServiceSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MatDialog, useValue: dialogSpy },
      ],
    });
    TestBed.overrideComponent(ExperienceListComponent, {
      add: {
        providers: [
          { provide: MatSnackBar, useValue: snackBarSpy },
          { provide: MatDialog, useValue: dialogSpy },
        ],
      },
    });
    fixture = TestBed.createComponent(ExperienceListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load experiences on init', () => {
    expect(experienceServiceSpy.getExperiences).toHaveBeenCalled();
    expect(component.experiences().length).toBe(1);
    expect(component.experiences()[0].company).toBe('Acme Corp');
  });

  it('should set isLoading to false after successful load', () => {
    expect(component.isLoading()).toBeFalse();
  });

  it('should show error snackbar when getExperiences fails', () => {
    experienceServiceSpy.getExperiences.and.returnValue(throwError(() => new Error('fail')));
    component.loadExperiences(1);
    expect(snackBarSpy.open).toHaveBeenCalled();
    expect(component.isLoading()).toBeFalse();
  });

  it('should update pagination after loading', () => {
    expect(component.pagination().total).toBe(1);
    expect(component.pagination().page).toBe(1);
  });

  it('should pass search and employmentType filters to service', () => {
    component.filterForm.patchValue({
      search: 'acme',
      employmentType: EmploymentType.FULL_TIME,
    });
    component.loadExperiences(1);
    expect(experienceServiceSpy.getExperiences).toHaveBeenCalledWith(
      jasmine.objectContaining({ search: 'acme', employmentType: EmploymentType.FULL_TIME }),
    );
  });

  it('should reset filters and reload when resetFilters is called', () => {
    component.filterForm.patchValue({ search: 'test' });
    component.resetFilters();
    expect(component.filterForm.get('search')?.value).toBe('');
    expect(experienceServiceSpy.getExperiences).toHaveBeenCalledTimes(2);
  });

  it('should open add dialog when openAddDialog is called', () => {
    dialogSpy.open.and.returnValue({ afterClosed: () => of(null) } as any);
    component.openAddDialog();
    expect(dialogSpy.open).toHaveBeenCalled();
  });

  it('should reload experiences after dialog closes with a result', () => {
    dialogSpy.open.and.returnValue({ afterClosed: () => of(mockExperience) } as any);
    component.openAddDialog();
    expect(experienceServiceSpy.getExperiences).toHaveBeenCalledTimes(2);
  });

  it('should open confirm dialog and delete experience on confirmDelete', () => {
    dialogSpy.open.and.returnValue({ afterClosed: () => of(true) } as any);
    experienceServiceSpy.deleteExperience.and.returnValue(of({ data: undefined, success: true }));
    component.confirmDelete(mockExperience);
    expect(experienceServiceSpy.deleteExperience).toHaveBeenCalledWith('e1');
    expect(snackBarSpy.open).toHaveBeenCalledWith('Experience deleted.', 'OK', jasmine.any(Object));
  });

  it('should not delete when confirm dialog is cancelled', () => {
    dialogSpy.open.and.returnValue({ afterClosed: () => of(false) } as any);
    component.confirmDelete(mockExperience);
    expect(experienceServiceSpy.deleteExperience).not.toHaveBeenCalled();
  });

  it('should show error snackbar when delete fails', () => {
    dialogSpy.open.and.returnValue({ afterClosed: () => of(true) } as any);
    experienceServiceSpy.deleteExperience.and.returnValue(throwError(() => new Error('fail')));
    component.confirmDelete(mockExperience);
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      jasmine.stringContaining('Failed'),
      jasmine.any(String),
      jasmine.any(Object),
    );
  });
});
