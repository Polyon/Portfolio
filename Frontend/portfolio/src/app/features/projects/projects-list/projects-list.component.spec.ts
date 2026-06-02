import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideZonelessChangeDetection } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { ProjectsListComponent } from './projects-list.component';
import { ProjectsService } from '../../../core/services/projects.service';
import { Project, ProjectStatus } from '../../../core/models/project.model';
import { PaginatedResponse } from '../../../core/models/common.models';

describe('ProjectsListComponent', () => {
  let fixture: ComponentFixture<ProjectsListComponent>;
  let component: ProjectsListComponent;
  let projectsServiceSpy: jasmine.SpyObj<ProjectsService>;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;

  const mockProject: Project = {
    id: 'p1',
    userId: 'u1',
    name: 'Portfolio App',
    description: 'My portfolio',
    shortDescription: 'Portfolio',
    status: ProjectStatus.DEPLOYED,
    startDate: '2024-01-01T00:00:00Z',
    isFeatured: true,
    isPublished: true,
    displayOrder: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockPaged: PaginatedResponse<Project> = {
    data: [mockProject],
    pagination: { page: 1, limit: 9, total: 1, totalPages: 1 },
  };

  beforeEach(() => {
    projectsServiceSpy = jasmine.createSpyObj('ProjectsService', ['getProjects', 'deleteProject', 'setFeatured', 'updateProject']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    projectsServiceSpy.getProjects.and.returnValue(of(mockPaged));

    TestBed.configureTestingModule({
      imports: [ProjectsListComponent, ReactiveFormsModule, NoopAnimationsModule],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ProjectsService, useValue: projectsServiceSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MatDialog, useValue: dialogSpy },
      ],
    });
    // Override at component level so the spy shadows the module-provided MatSnackBar
    TestBed.overrideComponent(ProjectsListComponent, {
      add: { providers: [{ provide: MatSnackBar, useValue: snackBarSpy }] }
    });
    fixture = TestBed.createComponent(ProjectsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load projects on init', () => {
    expect(projectsServiceSpy.getProjects).toHaveBeenCalled();
    expect(component.projects().length).toBe(1);
    expect(component.projects()[0].name).toBe('Portfolio App');
  });

  it('should sort featured projects first', () => {
    const unfeatured: Project = { ...mockProject, id: 'p2', isFeatured: false, displayOrder: 1 };
    projectsServiceSpy.getProjects.and.returnValue(
      of({ data: [unfeatured, mockProject], pagination: mockPaged.pagination }),
    );
    component['loadProjects']();
    expect(component.projects()[0].isFeatured).toBeTrue();
  });

  it('should show snackbar on getProjects error', () => {
    projectsServiceSpy.getProjects.and.returnValue(throwError(() => new Error('fail')));
    component['loadProjects']();
    expect(snackBarSpy.open).toHaveBeenCalled();
    expect(component.isLoading()).toBeFalse();
  });

  describe('pagination', () => {
    it('should update page and pageSize on page change', () => {
      component.onPageChange({ pageIndex: 2, pageSize: 18, length: 50 });
      expect(component.currentPage()).toBe(2);
      expect(component.pageSize()).toBe(18);
    });
  });

  describe('resetFilters()', () => {
    it('should clear all filter fields', () => {
      component.filterForm.patchValue({ search: 'x', status: 'Deployed', featuredOnly: true });
      component.resetFilters();
      expect(component.filterForm.get('search')?.value).toBe('');
      expect(component.filterForm.get('featuredOnly')?.value).toBeFalse();
    });
  });
});
