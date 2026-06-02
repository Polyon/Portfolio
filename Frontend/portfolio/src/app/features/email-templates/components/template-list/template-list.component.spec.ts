import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { of, throwError } from 'rxjs';

import { TemplateListComponent } from './template-list.component';
import { EmailTemplateService } from '../../services/email-template.service';
import {
  EmailTemplateDescriptor,
  EmailTemplate,
  QueryType,
  ListEmailTemplatesResponse,
} from '../../../../shared/models/contact-inbox.models';

/** Fixture factory for EmailTemplateDescriptor */
function makeDescriptor(overrides: Partial<EmailTemplateDescriptor> = {}): EmailTemplateDescriptor {
  return {
    name:          EmailTemplate.GENERAL_INQUIRY_SENDER,
    queryType:     QueryType.GENERAL,
    recipientRole: 'SENDER',
    description:   'Test template',
    ...overrides,
  };
}

const MOCK_TEMPLATES: EmailTemplateDescriptor[] = [
  makeDescriptor({
    name:          EmailTemplate.GENERAL_INQUIRY_SENDER,
    queryType:     QueryType.GENERAL,
    recipientRole: 'SENDER',
    description:   'General inquiry — sender confirmation',
  }),
  makeDescriptor({
    name:          EmailTemplate.SERVICE_INQUIRY_RECEIVER,
    queryType:     QueryType.SERVICE,
    recipientRole: 'RECEIVER',
    description:   'Service inquiry — admin notification',
  }),
];

describe('TemplateListComponent', () => {
  let fixture: ComponentFixture<TemplateListComponent>;
  let component: TemplateListComponent;
  let templateServiceSpy: jasmine.SpyObj<EmailTemplateService>;

  const listResponse: ListEmailTemplatesResponse = { success: true, data: MOCK_TEMPLATES };

  beforeEach(async () => {
    templateServiceSpy = jasmine.createSpyObj<EmailTemplateService>(
      'EmailTemplateService',
      ['listTemplates', 'previewTemplate'],
    );
    templateServiceSpy.listTemplates.and.returnValue(of(listResponse));

    await TestBed.configureTestingModule({
      imports: [TemplateListComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideAnimationsAsync(),
        { provide: EmailTemplateService, useValue: templateServiceSpy },
      ],
    }).compileComponents();

    fixture  = TestBed.createComponent(TemplateListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('calls listTemplates() on init', () => {
    expect(templateServiceSpy.listTemplates).toHaveBeenCalledTimes(1);
  });

  it('populates the templates signal after init', fakeAsync(() => {
    tick();
    fixture.detectChanges();
    expect(component.templates()).toEqual(MOCK_TEMPLATES);
  }));

  it('isLoading is false after successful fetch', fakeAsync(() => {
    tick();
    fixture.detectChanges();
    expect(component.isLoading()).toBeFalse();
  }));

  it('renders one table row per template', fakeAsync(() => {
    tick();
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('tr.mat-mdc-row') as NodeList;
    expect(rows.length).toBe(MOCK_TEMPLATES.length);
  }));

  it('renders template name in first column', fakeAsync(() => {
    tick();
    fixture.detectChanges();
    const firstCell = fixture.nativeElement.querySelector('td.mat-column-name') as HTMLElement;
    expect(firstCell.textContent?.trim()).toBe(MOCK_TEMPLATES[0].name);
  }));

  it('clicking a row sets selectedTemplate signal', fakeAsync(() => {
    tick();
    fixture.detectChanges();
    const firstRow = fixture.nativeElement.querySelector('tr.mat-mdc-row') as HTMLElement;
    firstRow.click();
    fixture.detectChanges();
    expect(component.selectedTemplate()).toEqual(MOCK_TEMPLATES[0]);
  }));

  it('clicking a different row updates selectedTemplate signal', fakeAsync(() => {
    tick();
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('tr.mat-mdc-row') as NodeListOf<HTMLElement>;
    rows[0].click();
    fixture.detectChanges();
    rows[1].click();
    fixture.detectChanges();
    expect(component.selectedTemplate()).toEqual(MOCK_TEMPLATES[1]);
  }));

  it('sets loadError signal when fetch fails', fakeAsync(() => {
    component.isLoading.set(false);
    component.templates.set([]);
    templateServiceSpy.listTemplates.and.returnValue(throwError(() => new Error('Network error')));

    // Trigger a fresh ngOnInit
    component.ngOnInit();
    tick();
    fixture.detectChanges();

    expect(component.loadError()).toBeTruthy();
    expect(component.isLoading()).toBeFalse();
  }));
});
