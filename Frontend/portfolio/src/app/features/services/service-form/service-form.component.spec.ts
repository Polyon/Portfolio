import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideZonelessChangeDetection } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { ServiceFormComponent } from './service-form.component';
import { ServicesService } from '../../../core/services/services.service';
import { Service, ServiceCategory } from '../../../core/models/service.model';

describe('ServiceFormComponent', () => {
  let fixture: ComponentFixture<ServiceFormComponent>;
  let component: ServiceFormComponent;
  let servicesServiceSpy: jasmine.SpyObj<ServicesService>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<ServiceFormComponent>>;

  const mockService: Service = {
    id: 's1',
    userId: 'u1',
    name: 'Full-Stack Development',
    description: 'End-to-end web application development.',
    category: ServiceCategory.FULLSTACK,
    isPublished: true,
    displayOrder: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  function createComponent(dialogData: { service?: Service } = {}) {
    servicesServiceSpy = jasmine.createSpyObj('ServicesService', ['createService', 'updateService']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    TestBed.configureTestingModule({
      imports: [ServiceFormComponent, ReactiveFormsModule, NoopAnimationsModule],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ServicesService, useValue: servicesServiceSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
      ],
    });
    TestBed.overrideComponent(ServiceFormComponent, {
      add: { providers: [{ provide: MatSnackBar, useValue: snackBarSpy }] },
    });
    fixture = TestBed.createComponent(ServiceFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  describe('Add mode', () => {
    beforeEach(() => createComponent());

    it('should initialise in add mode with empty form', () => {
      expect(component.isEditMode()).toBeFalse();
      expect(component.form.get('name')?.value).toBe('');
    });

    it('should mark form invalid when name is empty', () => {
      component.form.get('name')?.setValue('');
      expect(component.form.invalid).toBeTrue();
    });

    it('should mark form invalid when description is empty', () => {
      component.form.get('description')?.setValue('');
      expect(component.form.invalid).toBeTrue();
    });

    it('should enforce name maxlength of 200', () => {
      component.form.get('name')?.setValue('a'.repeat(201));
      expect(component.form.get('name')?.hasError('maxlength')).toBeTrue();
    });

    it('should enforce description maxlength of 2000', () => {
      component.form.get('description')?.setValue('a'.repeat(2001));
      expect(component.form.get('description')?.hasError('maxlength')).toBeTrue();
    });

    it('should call createService and close dialog on valid save', () => {
      servicesServiceSpy.createService.and.returnValue(of({ data: mockService, success: true }));
      component.form.setValue({
        name: 'API Design',
        description: 'REST API design consulting.',
        category: ServiceCategory.BACKEND_DEV,
        isPublished: true,
      });

      component.save();

      expect(servicesServiceSpy.createService).toHaveBeenCalled();
      expect(dialogRefSpy.close).toHaveBeenCalledWith(mockService);
    });

    it('should show error snackbar on createService failure', () => {
      servicesServiceSpy.createService.and.returnValue(throwError(() => new Error('error')));
      component.form.setValue({
        name: 'API Design',
        description: 'REST API design consulting.',
        category: ServiceCategory.BACKEND_DEV,
        isPublished: true,
      });

      component.save();

      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Failed to save service. Please try again.',
        'Dismiss',
        jasmine.anything(),
      );
    });

    it('should not call createService when form is invalid', () => {
      component.form.get('name')?.setValue('');
      component.save();
      expect(servicesServiceSpy.createService).not.toHaveBeenCalled();
    });

    it('should close dialog with null on cancel', () => {
      component.cancel();
      expect(dialogRefSpy.close).toHaveBeenCalledWith(null);
    });
  });

  describe('Edit mode', () => {
    beforeEach(() => createComponent({ service: mockService }));

    it('should initialise in edit mode with prefilled form', () => {
      expect(component.isEditMode()).toBeTrue();
      expect(component.form.get('name')?.value).toBe('Full-Stack Development');
      expect(component.form.get('category')?.value).toBe(ServiceCategory.FULLSTACK);
      expect(component.form.get('isPublished')?.value).toBeTrue();
    });

    it('should call updateService and close dialog on valid save', () => {
      servicesServiceSpy.updateService.and.returnValue(of({ data: mockService, success: true }));
      component.save();
      expect(servicesServiceSpy.updateService).toHaveBeenCalledWith('s1', jasmine.anything());
      expect(dialogRefSpy.close).toHaveBeenCalledWith(mockService);
    });
  });
});
