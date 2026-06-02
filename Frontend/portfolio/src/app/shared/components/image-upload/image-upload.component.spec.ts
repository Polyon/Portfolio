import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ImageUploadComponent } from './image-upload.component';

describe('ImageUploadComponent', () => {
  let component: ImageUploadComponent;
  let fixture: ComponentFixture<ImageUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImageUploadComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(ImageUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit imageSelected on valid file', () => {
    spyOn(component.imageSelected, 'emit');
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    const event = { target: { files: [file], value: '' } } as unknown as Event;

    component.onFileSelected(event);
    expect(component.imageSelected.emit).toHaveBeenCalledWith(file);
    expect(component.error).toBeNull();
  });

  it('should reject invalid file types', () => {
    spyOn(component.imageSelected, 'emit');
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const event = { target: { files: [file], value: '' } } as unknown as Event;

    component.onFileSelected(event);
    expect(component.imageSelected.emit).not.toHaveBeenCalled();
    expect(component.error).toContain('Invalid file type');
  });

  it('should reject files exceeding max size', () => {
    spyOn(component.imageSelected, 'emit');
    const largeContent = new ArrayBuffer(6 * 1024 * 1024);
    const file = new File([largeContent], 'big.jpg', { type: 'image/jpeg' });
    const event = { target: { files: [file], value: '' } } as unknown as Event;

    component.onFileSelected(event);
    expect(component.imageSelected.emit).not.toHaveBeenCalled();
    expect(component.error).toContain('too large');
  });

  it('should clear preview and emit imageCleared', () => {
    spyOn(component.imageCleared, 'emit');
    component.previewUrl = 'data:image/jpg;base64,...';
    component.error = 'some error';

    component.clearPreview();
    expect(component.previewUrl).toBeNull();
    expect(component.error).toBeNull();
    expect(component.imageCleared.emit).toHaveBeenCalled();
  });

  it('should accept webp format', () => {
    spyOn(component.imageSelected, 'emit');
    const file = new File(['content'], 'test.webp', { type: 'image/webp' });
    const event = { target: { files: [file], value: '' } } as unknown as Event;

    component.onFileSelected(event);
    expect(component.imageSelected.emit).toHaveBeenCalledWith(file);
  });
});
