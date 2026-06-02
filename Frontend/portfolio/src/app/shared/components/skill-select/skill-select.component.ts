import {
  Component,
  inject,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  forwardRef,
  DestroyRef,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
  FormControl,
} from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { SkillsService } from '../../../core/services/skills.service';
import { Skill } from '../../../core/models/skill.model';

/**
 * Reusable skill multi-select component implementing ControlValueAccessor.
 * Accepts / emits an array of skill IDs.
 */
@Component({
  selector: 'app-skill-select',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SkillSelectComponent),
      multi: true,
    },
  ],
  template: `
    <mat-form-field appearance="outline" class="full-width">
      <mat-label>{{ label }}</mat-label>
      <mat-chip-grid #chipGrid aria-label="Selected skills">
        <mat-chip-row
          *ngFor="let skill of selectedSkills()"
          (removed)="removeSkill(skill)"
        >
          {{ skill.name }}
          <button matChipRemove aria-label="Remove {{ skill.name }}">
            <mat-icon>cancel</mat-icon>
          </button>
        </mat-chip-row>
        <input
          [placeholder]="placeholder"
          [matChipInputFor]="chipGrid"
          [matAutocomplete]="auto"
          [formControl]="searchControl"
          (focus)="loadSuggestions('')"
        />
      </mat-chip-grid>

      <mat-autocomplete #auto="matAutocomplete" (optionSelected)="onOptionSelected($event)">
        <mat-option *ngFor="let skill of suggestions()" [value]="skill">
          {{ skill.name }} <span class="category-tag">{{ skill.category }}</span>
        </mat-option>
        <mat-option *ngIf="suggestions().length === 0 && !isLoading()" disabled>
          No skills found
        </mat-option>
      </mat-autocomplete>
    </mat-form-field>
  `,
  styles: [`
    .full-width { width: 100%; }
    .category-tag { font-size: 11px; color: rgba(255,255,255,0.5); margin-left: 8px; }
  `],
})
export class SkillSelectComponent implements ControlValueAccessor, OnInit, OnChanges {
  @Input() label = 'Skills';
  @Input() placeholder = 'Type to search…';
  /** Pre-selected skill IDs (used to hydrate display names on edit). */
  @Input() initialSkillIds: string[] = [];

  @ViewChild(MatAutocompleteTrigger) autoTrigger!: MatAutocompleteTrigger;

  private skillsService = inject(SkillsService);
  private destroyRef = inject(DestroyRef);

  searchControl = new FormControl('');
  selectedSkills = signal<Skill[]>([]);
  suggestions = signal<Skill[]>([]);
  isLoading = signal(false);

  private onChange: (ids: string[]) => void = () => {};
  private onTouched: () => void = () => {};

  ngOnInit(): void {
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((term) => {
      if (typeof term === 'string') this.loadSuggestions(term);
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialSkillIds'] && this.initialSkillIds?.length) {
      this.hydrateInitialSkills();
    }
  }

  /** @inheritdoc */
  writeValue(ids: string[]): void {
    if (!ids?.length) {
      this.selectedSkills.set([]);
      return;
    }
    this.skillsService.searchSkills().subscribe({
      next: (res) => {
        const selected = res.data.filter((s) => ids.includes(s.id));
        this.selectedSkills.set(selected);
      },
    });
  }

  /** @inheritdoc */
  registerOnChange(fn: (ids: string[]) => void): void {
    this.onChange = fn;
  }

  /** @inheritdoc */
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  /** @inheritdoc */
  setDisabledState(isDisabled: boolean): void {
    if (isDisabled) this.searchControl.disable();
    else this.searchControl.enable();
  }

  /** Handles selection from autocomplete dropdown. */
  onOptionSelected(event: { option: { value: Skill } }): void {
    const skill = event.option.value;
    const current = this.selectedSkills();
    if (!current.find((s) => s.id === skill.id)) {
      this.selectedSkills.set([...current, skill]);
      this.emitChange();
    }
    this.searchControl.setValue('', { emitEvent: false });
    this.onTouched();
    // Reload remaining suggestions and keep the panel open
    this.loadSuggestions('', /* reopen */ true);
  }

  /** Removes a selected skill chip. */
  removeSkill(skill: Skill): void {
    this.selectedSkills.update((list) => list.filter((s) => s.id !== skill.id));
    this.emitChange();
    this.onTouched();
  }

  /** Fetches skill suggestions matching the search term. */
  loadSuggestions(term: string, reopen = false): void {
    this.isLoading.set(true);
    this.skillsService.searchSkills(term).subscribe({
      next: (res) => {
        const selectedIds = this.selectedSkills().map((s) => s.id);
        this.suggestions.set(res.data.filter((s) => !selectedIds.includes(s.id)));
        this.isLoading.set(false);
        if (reopen) {
          // Give Angular a tick to render the new options before opening
          setTimeout(() => this.autoTrigger?.openPanel());
        }
      },
      error: () => this.isLoading.set(false),
    });
  }

  private emitChange(): void {
    this.onChange(this.selectedSkills().map((s) => s.id));
  }

  private hydrateInitialSkills(): void {
    this.skillsService.searchSkills().subscribe({
      next: (res) => {
        const selected = res.data.filter((s) => this.initialSkillIds.includes(s.id));
        this.selectedSkills.set(selected);
      },
    });
  }
}
