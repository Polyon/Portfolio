import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideZonelessChangeDetection } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';

import { ExperienceFormComponent, ExperienceDialogData } from './experience-form.component';
import { ExperienceService } from '../../../core/services/experience.service';
import { Experience, EmploymentType } from '../../../core/models/experience.model';
import { SkillsService } from '../../../core/services/skills.service';

describe('ExperienceFormComponent', () => {
  let fixture: ComponentFixture<ExperienceFormComponent>;
  let component: ExperienceFormComponent;
  let experienceServiceSpy: jasmine.SpyObj<ExperienceService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<ExperienceFormComponent>>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let skillsServiceSpy: jasmine.SpyObj<SkillsService>;

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

  function createComponent(dialogData: ExperienceDialogData): void {
    experienceServiceSpy = jasmine.createSpyObj('ExperienceService', [
      'createExperience',
      'updateExperience',
    ]);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    skillsServiceSpy = jasmine.createSpyObj('SkillsService', ['searchSkills']);
    skillsServiceSpy.searchSkills.and.returnValue(of({ data: [], pagination: { page: 1, limit: 200, total: 0, totalPages: 0 } }));

    TestBed.configureTestingModule({
      imports: [ExperienceFormComponent, ReactiveFormsModule, NoopAnimationsModule],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ExperienceService, useValue: experienceServiceSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: SkillsService, useValue: skillsServiceSpy },
      ],
    });
    TestBed.overrideComponent(ExperienceFormComponent, {
      add: { providers: [{ provide: MatSnackBar, useValue: snackBarSpy }] },
    });
    fixture = TestBed.createComponent(ExperienceFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  describe('Add mode', () => {
    beforeEach(() => createComponent({}));

    it('should initialise in add mode', () => {
      expect(component.isEditMode()).toBeFalse();
    });

    it('should have empty company and title on init', () => {
      expect(component.form.get('company')?.value).toBe('');
      expect(component.form.get('title')?.value).toBe('');
    });

    it('should mark form invalid when required fields are missing', () => {
      component.save();
      expect(component.form.invalid).toBeTrue();
      expect(experienceServiceSpy.createExperience).not.toHaveBeenCalled();
    });

    it('should call createExperience and close dialog on success', () => {
      experienceServiceSpy.createExperience.and.returnValue(of({ data: mockExperience, success: true }));
      component.form.patchValue({
        company: 'Acme Corp',
        title: 'Senior Developer',
        startDate: new Date('2022-01-01'),
      });
      component.save();
      expect(experienceServiceSpy.createExperience).toHaveBeenCalled();
      expect(dialogRefSpy.close).toHaveBeenCalledWith(mockExperience);
    });

    it('should show error snackbar when createExperience fails', () => {
      experienceServiceSpy.createExperience.and.returnValue(throwError(() => new Error('fail')));
      component.form.patchValue({
        company: 'Acme Corp',
        title: 'Senior Developer',
        startDate: new Date('2022-01-01'),
      });
      component.save();
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        jasmine.stringContaining('Failed'),
        jasmine.any(String),
        jasmine.any(Object),
      );
      expect(component.isSaving()).toBeFalse();
    });

    it('should close dialog on cancel', () => {
      component.cancel();
      expect(dialogRefSpy.close).toHaveBeenCalledWith(null);
    });
  });

  describe('Edit mode', () => {
    beforeEach(() => createComponent({ experience: mockExperience }));

    it('should initialise in edit mode', () => {
      expect(component.isEditMode()).toBeTrue();
    });

    it('should pre-populate form with existing experience data', () => {
      expect(component.form.get('company')?.value).toBe('Acme Corp');
      expect(component.form.get('title')?.value).toBe('Senior Developer');
      expect(component.form.get('isCurrentRole')?.value).toBeFalse();
    });

    it('should call updateExperience on save', () => {
      experienceServiceSpy.updateExperience.and.returnValue(of({ data: mockExperience, success: true }));
      component.save();
      expect(experienceServiceSpy.updateExperience).toHaveBeenCalledWith(mockExperience.id, jasmine.any(Object));
    });
  });

  describe('Date validation', () => {
    beforeEach(() => createComponent({}));

    it('should have dateRange error when start date is after end date', () => {
      component.form.patchValue({
        company: 'Corp',
        title: 'Dev',
        isCurrentRole: false,
        startDate: new Date('2024-06-01'),
        endDate: new Date('2023-01-01'),
      });
      component.form.get('endDate')?.markAsDirty();
      expect(component.form.hasError('dateRange')).toBeTrue();
    });

    it('should not have dateRange error when start date is before end date', () => {
      component.form.patchValue({
        company: 'Corp',
        title: 'Dev',
        isCurrentRole: false,
        startDate: new Date('2022-01-01'),
        endDate: new Date('2024-01-01'),
      });
      expect(component.form.hasError('dateRange')).toBeFalse();
    });

    it('should skip date range validation when isCurrentRole is true', () => {
      component.form.patchValue({
        company: 'Corp',
        title: 'Dev',
        isCurrentRole: true,
        startDate: new Date('2024-06-01'),
        endDate: null,
      });
      expect(component.form.hasError('dateRange')).toBeFalse();
    });
  });

  describe('Current role toggle', () => {
    beforeEach(() => createComponent({}));

    it('should disable endDate field when isCurrentRole is toggled on', () => {
      component.onCurrentRoleChange(true);
      expect(component.form.get('endDate')?.disabled).toBeTrue();
      expect(component.form.get('endDate')?.value).toBeNull();
    });

    it('should re-enable endDate field when isCurrentRole is toggled off', () => {
      component.onCurrentRoleChange(true);
      component.onCurrentRoleChange(false);
      expect(component.form.get('endDate')?.enabled).toBeTrue();
    });
  });

  describe('Skill associations', () => {
    beforeEach(() => createComponent({ experience: mockExperience }));

    it('should initialise initialSkillIds as empty when experience has no skills', () => {
      expect(component.initialSkillIds).toEqual([]);
    });
  });
});
