import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideZonelessChangeDetection } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { SkillFormComponent, SkillDialogData } from './skill-form.component';
import { SkillsService } from '../../../core/services/skills.service';
import { Skill, SkillCategory } from '../../../core/models/skill.model';

describe('SkillFormComponent', () => {
  let fixture: ComponentFixture<SkillFormComponent>;
  let component: SkillFormComponent;
  let skillsServiceSpy: jasmine.SpyObj<SkillsService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<SkillFormComponent>>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  const mockSkill: Skill = {
    id: 's1',
    userId: 'u1',
    name: 'TypeScript',
    category: SkillCategory.BACKEND,
    proficiencyLevel: 4,
    endorsementCount: 2,
    isPublished: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  };

  function createComponent(dialogData: SkillDialogData): void {
    skillsServiceSpy = jasmine.createSpyObj('SkillsService', ['createSkill', 'updateSkill']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    TestBed.configureTestingModule({
      imports: [SkillFormComponent, ReactiveFormsModule, NoopAnimationsModule],
      providers: [
        provideZonelessChangeDetection(),
        { provide: SkillsService, useValue: skillsServiceSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
        { provide: MatSnackBar, useValue: snackBarSpy },
      ],
    });
    // Override at component level so the spy shadows the module-provided MatSnackBar
    TestBed.overrideComponent(SkillFormComponent, {
      add: { providers: [{ provide: MatSnackBar, useValue: snackBarSpy }] }
    });
    fixture = TestBed.createComponent(SkillFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  describe('Add mode', () => {
    beforeEach(() => createComponent({}));

    it('should initialise with empty form', () => {
      expect(component.isEditMode()).toBeFalse();
      expect(component.form.get('name')?.value).toBe('');
    });

    it('should mark form invalid when name is empty and save is attempted', () => {
      component.save();
      expect(component.form.invalid).toBeTrue();
      expect(skillsServiceSpy.createSkill).not.toHaveBeenCalled();
    });

    it('should call createSkill and close dialog on success', () => {
      skillsServiceSpy.createSkill.and.returnValue(of({ data: mockSkill, success: true }));
      component.form.patchValue({ name: 'TypeScript', category: SkillCategory.BACKEND, proficiencyLevel: 4 });
      component.save();
      expect(skillsServiceSpy.createSkill).toHaveBeenCalled();
      expect(dialogRefSpy.close).toHaveBeenCalledWith(mockSkill);
    });

    it('should show error snackbar when createSkill fails', () => {
      skillsServiceSpy.createSkill.and.returnValue(throwError(() => new Error('fail')));
      component.form.patchValue({ name: 'TypeScript', category: SkillCategory.BACKEND, proficiencyLevel: 4 });
      component.save();
      expect(snackBarSpy.open).toHaveBeenCalled();
      expect(dialogRefSpy.close).not.toHaveBeenCalled();
    });
  });

  describe('Edit mode', () => {
    beforeEach(() => createComponent({ skill: mockSkill }));

    it('should pre-populate form with skill data', () => {
      expect(component.isEditMode()).toBeTrue();
      expect(component.form.get('name')?.value).toBe('TypeScript');
      expect(component.form.get('proficiencyLevel')?.value).toBe(4);
    });

    it('should call updateSkill on save', () => {
      skillsServiceSpy.updateSkill.and.returnValue(of({ data: mockSkill, success: true }));
      component.save();
      expect(skillsServiceSpy.updateSkill).toHaveBeenCalledWith('s1', jasmine.any(Object));
    });
  });

  describe('cancel()', () => {
    beforeEach(() => createComponent({}));
    it('should close dialog with null', () => {
      component.cancel();
      expect(dialogRefSpy.close).toHaveBeenCalledWith(null);
    });
  });
});
