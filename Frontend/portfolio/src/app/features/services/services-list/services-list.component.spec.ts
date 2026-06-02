import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideZonelessChangeDetection } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { ServicesListComponent } from './services-list.component';
import { ServicesService } from '../../../core/services/services.service';
import { Service, ServiceCategory } from '../../../core/models/service.model';
import { PaginatedResponse } from '../../../core/models/common.models';

describe('ServicesListComponent', () => {
  let fixture: ComponentFixture<ServicesListComponent>;
  let component: ServicesListComponent;
  let servicesServiceSpy: jasmine.SpyObj<ServicesService>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;

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

  const mockPaged: PaginatedResponse<Service> = {
    data: [mockService],
    pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
  };

  beforeEach(() => {
    servicesServiceSpy = jasmine.createSpyObj('ServicesService', [
      'getServices',
      'createService',
      'updateService',
      'deleteService',
      'updateDisplayOrder',
    ]);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    servicesServiceSpy.getServices.and.returnValue(of(mockPaged));

    TestBed.configureTestingModule({
      imports: [ServicesListComponent, ReactiveFormsModule, NoopAnimationsModule],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ServicesService, useValue: servicesServiceSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MatDialog, useValue: dialogSpy },
      ],
    });
    TestBed.overrideComponent(ServicesListComponent, {
      add: {
        providers: [
          { provide: MatSnackBar, useValue: snackBarSpy },
          { provide: MatDialog, useValue: dialogSpy },
        ],
      },
    });
    fixture = TestBed.createComponent(ServicesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load services on init', () => {
    expect(servicesServiceSpy.getServices).toHaveBeenCalled();
    expect(component.services().length).toBe(1);
    expect(component.services()[0].name).toBe('Full-Stack Development');
  });

  it('should show snackbar on getServices error', () => {
    servicesServiceSpy.getServices.and.returnValue(throwError(() => new Error('Network error')));
    component['loadServices']();
    expect(snackBarSpy.open).toHaveBeenCalledWith('Failed to load services.', 'Dismiss', jasmine.anything());
  });

  it('should reset form values on resetFilters()', () => {
    component.filterForm.setValue({ search: 'api', category: 'Fullstack' });
    component.resetFilters();
    expect(component.filterForm.value).toEqual({ search: '', category: '' });
  });

  it('should update current page and reload on page change', () => {
    component.onPageChange({ pageIndex: 1, pageSize: 20, length: 100 } as any);
    expect(component.currentPage()).toBe(1);
    expect(component.pageSize()).toBe(20);
    expect(servicesServiceSpy.getServices).toHaveBeenCalledTimes(2);
  });

  it('should open add dialog and reload on success result', () => {
    const dialogRefSpy = jasmine.createSpyObj<MatDialogRef<any>>('MatDialogRef', ['afterClosed']);
    dialogRefSpy.afterClosed.and.returnValue(of(mockService));
    dialogSpy.open.and.returnValue(dialogRefSpy);

    component.openAddDialog();

    expect(dialogSpy.open).toHaveBeenCalled();
    expect(servicesServiceSpy.getServices).toHaveBeenCalledTimes(2);
  });

  it('should not reload when add dialog is cancelled', () => {
    const dialogRefSpy = jasmine.createSpyObj<MatDialogRef<any>>('MatDialogRef', ['afterClosed']);
    dialogRefSpy.afterClosed.and.returnValue(of(null));
    dialogSpy.open.and.returnValue(dialogRefSpy);

    component.openAddDialog();

    expect(servicesServiceSpy.getServices).toHaveBeenCalledTimes(1);
  });

  it('should open edit dialog with existing service data', () => {
    const dialogRefSpy = jasmine.createSpyObj<MatDialogRef<any>>('MatDialogRef', ['afterClosed']);
    dialogRefSpy.afterClosed.and.returnValue(of(null));
    dialogSpy.open.and.returnValue(dialogRefSpy);

    component.openEditDialog(mockService);

    const openArgs = dialogSpy.open.calls.mostRecent().args as any[];
    expect(openArgs[1].data.service).toEqual(mockService);
  });

  it('should delete service and show snackbar after confirmation', () => {
    servicesServiceSpy.deleteService.and.returnValue(of({ data: undefined } as any));
    const dialogRefSpy = jasmine.createSpyObj<MatDialogRef<any>>('MatDialogRef', ['afterClosed']);
    dialogRefSpy.afterClosed.and.returnValue(of(true));
    dialogSpy.open.and.returnValue(dialogRefSpy);

    component.confirmDelete(mockService);

    expect(servicesServiceSpy.deleteService).toHaveBeenCalledWith('s1');
    expect(snackBarSpy.open).toHaveBeenCalledWith('Service deleted.', 'Dismiss', jasmine.anything());
  });

  it('should not delete when confirmation dialog is cancelled', () => {
    const dialogRefSpy = jasmine.createSpyObj<MatDialogRef<any>>('MatDialogRef', ['afterClosed']);
    dialogRefSpy.afterClosed.and.returnValue(of(false));
    dialogSpy.open.and.returnValue(dialogRefSpy);

    component.confirmDelete(mockService);

    expect(servicesServiceSpy.deleteService).not.toHaveBeenCalled();
  });

  it('should call updateDisplayOrder on drag-drop reorder', () => {
    const second: Service = { ...mockService, id: 's2', displayOrder: 1 };
    component.services.set([mockService, second]);
    servicesServiceSpy.updateDisplayOrder.and.returnValue(of({ data: undefined } as any));

    component.onReorder({ previousIndex: 0, currentIndex: 1 } as any);

    expect(servicesServiceSpy.updateDisplayOrder).toHaveBeenCalledWith(['s2', 's1']);
  });

  it('should skip reorder when previous and current index are equal', () => {
    component.onReorder({ previousIndex: 1, currentIndex: 1 } as any);
    expect(servicesServiceSpy.updateDisplayOrder).not.toHaveBeenCalled();
  });

  it('should revert order and show snackbar if reorder request fails', () => {
    const second: Service = { ...mockService, id: 's2', displayOrder: 1 };
    component.services.set([mockService, second]);
    servicesServiceSpy.updateDisplayOrder.and.returnValue(throwError(() => new Error('error')));
    servicesServiceSpy.getServices.and.returnValue(of(mockPaged));

    component.onReorder({ previousIndex: 0, currentIndex: 1 } as any);

    expect(snackBarSpy.open).toHaveBeenCalledWith('Failed to save new order.', 'Dismiss', jasmine.anything());
  });
});
