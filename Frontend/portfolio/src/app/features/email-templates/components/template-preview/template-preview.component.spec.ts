import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { provideZonelessChangeDetection, SimpleChange } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { of, throwError } from 'rxjs';

import { TemplatePreviewComponent } from './template-preview.component';
import { EmailTemplateService } from '../../services/email-template.service';
import {
  EmailTemplateDescriptor,
  EmailTemplate,
  QueryType,
  PreviewTemplateResponse,
  TemplatePreviewVariables,
} from '../../../../shared/models/contact-inbox.models';

/** Builds a minimal EmailTemplateDescriptor for tests. */
function makeDescriptor(
  overrides: Partial<EmailTemplateDescriptor> = {},
): EmailTemplateDescriptor {
  return {
    name:          EmailTemplate.GENERAL_INQUIRY_SENDER,
    queryType:     QueryType.GENERAL,
    recipientRole: 'SENDER',
    description:   'Test template',
    ...overrides,
  };
}

const MOCK_PREVIEW_RESPONSE: PreviewTemplateResponse = {
  success: true,
  data: {
    html: '<p>Hello <strong>Jane Smith</strong></p>',
    text: 'Hello Jane Smith',
  },
};

describe('TemplatePreviewComponent', () => {
  let fixture:   ComponentFixture<TemplatePreviewComponent>;
  let component: TemplatePreviewComponent;
  let templateServiceSpy: jasmine.SpyObj<EmailTemplateService>;

  beforeEach(async () => {
    templateServiceSpy = jasmine.createSpyObj<EmailTemplateService>(
      'EmailTemplateService',
      ['listTemplates', 'previewTemplate'],
    );
    templateServiceSpy.previewTemplate.and.returnValue(of(MOCK_PREVIEW_RESPONSE));

    await TestBed.configureTestingModule({
      imports: [TemplatePreviewComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideAnimationsAsync(),
        { provide: EmailTemplateService, useValue: templateServiceSpy },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(TemplatePreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── Placeholder ──────────────────────────────────────────────────────────────

  it('shows placeholder when no template is provided', () => {
    component.template = null;
    fixture.detectChanges();
    const placeholder = fixture.nativeElement.querySelector('.preview-placeholder') as HTMLElement;
    expect(placeholder).toBeTruthy();
    expect(placeholder.textContent).toContain('Select a template to preview');
  });

  it('does not show placeholder when a template is provided', () => {
    component.template = makeDescriptor();
    fixture.detectChanges();
    const placeholder = fixture.nativeElement.querySelector('.preview-placeholder') as HTMLElement;
    expect(placeholder).toBeNull();
  });

  // ── Form ─────────────────────────────────────────────────────────────────────

  it('initialises the form with sample values', () => {
    const values: TemplatePreviewVariables = component.form.getRawValue() as TemplatePreviewVariables;
    expect(values.visitorName).toBe('Jane Smith');
    expect(values.visitorEmail).toBe('jane.smith@example.com');
    expect(values.subject).toBeTruthy();
    expect(values.messageBody).toBeTruthy();
    expect(values.replyBody).toBeTruthy();
  });

  it('all expected form controls exist', () => {
    const controls = [
      'visitorName', 'visitorEmail', 'subject', 'messageBody',
      'messageSummary', 'queryTypeLabel', 'replyBody', 'ownerName',
      'portfolioUrl', 'adminPortalUrl', 'submittedAt', 'replySlaHours',
    ];
    for (const name of controls) {
      expect(component.form.contains(name))
        .withContext(`control '${name}' should exist`)
        .toBeTrue();
    }
  });

  // ── Debounced preview call ────────────────────────────────────────────────────

  it('calls previewTemplate after 400ms debounce on form value change', fakeAsync(() => {
    component.template = makeDescriptor();
    fixture.detectChanges();

    // Reset call count from ngOnChanges trigger
    templateServiceSpy.previewTemplate.calls.reset();

    component.form.patchValue({ visitorName: 'Alice' });
    tick(400);
    fixture.detectChanges();

    expect(templateServiceSpy.previewTemplate).toHaveBeenCalledTimes(1);
  }));

  it('does NOT call previewTemplate before debounce elapses', fakeAsync(() => {
    component.template = makeDescriptor();
    fixture.detectChanges();
    templateServiceSpy.previewTemplate.calls.reset();

    component.form.patchValue({ visitorName: 'Bob' });
    tick(300); // less than 400ms
    fixture.detectChanges();

    expect(templateServiceSpy.previewTemplate).not.toHaveBeenCalled();

    // Clean up the pending timer
    tick(100);
  }));

  it('stores preview result in signal after successful call', fakeAsync(() => {
    component.template = makeDescriptor();
    fixture.detectChanges();

    component.form.patchValue({ visitorName: 'Carol' });
    tick(400);
    fixture.detectChanges();

    expect(component.previewResult()).toEqual(MOCK_PREVIEW_RESPONSE.data);
  }));

  // ── ngOnChanges ──────────────────────────────────────────────────────────────

  it('triggers previewTemplate when template input changes', fakeAsync(() => {
    const desc = makeDescriptor();
    component.template = desc;
    component.ngOnChanges({
      template: new SimpleChange(null, desc, true),
    });
    tick(0); // immediate push, no debounce on ngOnChanges path
    fixture.detectChanges();

    // The immediate push into _formChanges$ bypasses the 400ms debounce by going
    // through the subject; we advance the full debounce window here.
    tick(400);
    fixture.detectChanges();

    expect(templateServiceSpy.previewTemplate).toHaveBeenCalled();
  }));

  // ── HTML rendering ────────────────────────────────────────────────────────────

  it('binds sanitized HTML to [innerHTML] after preview loads', fakeAsync(() => {
    component.template = makeDescriptor();
    fixture.detectChanges();

    component.form.patchValue({ visitorName: 'Dave' });
    tick(400);
    fixture.detectChanges();

    const previewDiv = fixture.nativeElement.querySelector('.email-preview-html') as HTMLElement;
    expect(previewDiv).toBeTruthy();
    // innerHTML should contain the rendered paragraph
    expect(previewDiv.innerHTML).toContain('Jane Smith');
  }));

  // ── Tab switch ────────────────────────────────────────────────────────────────

  it('shows plain-text content in second tab', fakeAsync(() => {
    component.template = makeDescriptor();
    fixture.detectChanges();

    component.form.patchValue({ visitorName: 'Eve' });
    tick(400);
    fixture.detectChanges();

    // Click the "Plain Text" tab label
    const tabLabels = fixture.nativeElement.querySelectorAll(
      '.mat-mdc-tab',
    ) as NodeListOf<HTMLElement>;

    // Two tabs should be present
    expect(tabLabels.length).toBe(2);

    tabLabels[1].click();
    fixture.detectChanges();

    const pre = fixture.nativeElement.querySelector('pre.email-preview-text') as HTMLElement;
    expect(pre.textContent?.trim()).toContain('Hello Jane Smith');
  }));

  // ── Error handling ────────────────────────────────────────────────────────────

  it('shows error banner when preview API fails', fakeAsync(() => {
    templateServiceSpy.previewTemplate.and.returnValue(
      throwError(() => new Error('server error')),
    );

    component.template = makeDescriptor();
    fixture.detectChanges();

    component.form.patchValue({ visitorName: 'Failing User' });
    tick(400);
    fixture.detectChanges();

    const banner = fixture.nativeElement.querySelector('.error-banner') as HTMLElement;
    expect(banner).toBeTruthy();
    expect(banner.textContent).toContain('Preview failed');
  }));

  it('does NOT clear form values on API failure', fakeAsync(() => {
    templateServiceSpy.previewTemplate.and.returnValue(
      throwError(() => new Error('server error')),
    );

    component.template = makeDescriptor();
    component.form.patchValue({ visitorName: 'Persistent Name' });
    tick(400);
    fixture.detectChanges();

    expect(component.form.getRawValue().visitorName).toBe('Persistent Name');
  }));

  it('dismisses error banner on close button click', fakeAsync(() => {
    templateServiceSpy.previewTemplate.and.returnValue(
      throwError(() => new Error('server error')),
    );

    component.template = makeDescriptor();
    fixture.detectChanges();

    component.form.patchValue({ visitorName: 'Dismiss Test' });
    tick(400);
    fixture.detectChanges();

    const closeBtn = fixture.nativeElement.querySelector(
      '.error-banner button[aria-label="Dismiss error"]',
    ) as HTMLButtonElement;
    expect(closeBtn).toBeTruthy();
    closeBtn.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.error-banner')).toBeNull();
  }));

  // ── isLoading flag ────────────────────────────────────────────────────────────

  it('isLoading is false when no template is selected', () => {
    expect(component.isLoading()).toBeFalse();
  });
});
