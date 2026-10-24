import {
  Component, Input, Output, EventEmitter, forwardRef,
  ViewChild, ElementRef, HostListener, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectOption {
  value: any;
  label: string;
  group?: string;
  icon?: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './custom-select.component.html',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => CustomSelectComponent),
    multi: true,
  }],
})
export class CustomSelectComponent implements ControlValueAccessor {
  @Input() options: SelectOption[] = [];
  @Input() placeholder = '— اختر —';
  @Input() searchable = false;
  @Input() invalid = false;
  @Input() size: 'sm' | 'md' = 'md';

  @Output() changed = new EventEmitter<any>();

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  open = false;
  value: any = '';
  disabled = false;
  search = '';
  highlightIndex = -1;

  private _onChange: (v: any) => void = () => {};
  private _onTouched: () => void = () => {};

  constructor(private cdr: ChangeDetectorRef) {}

  get selectedOption(): SelectOption | undefined {
    if (this.value === null || this.value === undefined || this.value === '') return undefined;
    return this.options.find(o => String(o.value) === String(this.value));
  }

  get filteredOptions(): SelectOption[] {
    const term = this.search.trim().toLowerCase();
    if (!term) return this.options;
    return this.options.filter(o => o.label.toLowerCase().includes(term));
  }

  get hasGroups(): boolean {
    return this.options.some(o => !!o.group);
  }

  get groupedOptions(): { group: string; options: SelectOption[] }[] {
    const map = new Map<string, SelectOption[]>();
    for (const opt of this.filteredOptions) {
      const g = opt.group || '';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(opt);
    }
    return Array.from(map.entries()).map(([group, options]) => ({ group, options }));
  }

  toggle() {
    if (this.disabled) return;
    this.open = !this.open;
    if (this.open) {
      this.search = '';
      this.highlightIndex = -1;
      this._onTouched();
      setTimeout(() => {
        if (this.searchable && this.searchInput) {
          this.searchInput.nativeElement.focus();
        }
      }, 30);
    }
  }

  close() {
    this.open = false;
    this.search = '';
    this.highlightIndex = -1;
  }

  select(opt: SelectOption) {
    if (opt.disabled) return;
    this.value = opt.value;
    this._onChange(opt.value);
    this._onTouched();
    this.changed.emit(opt.value);
    this.close();
  }

  selectEmpty() {
    this.value = '';
    this._onChange('');
    this._onTouched();
    this.changed.emit('');
    this.close();
  }

  onKeydown(event: KeyboardEvent) {
    const opts = this.filteredOptions;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.highlightIndex = Math.min(this.highlightIndex + 1, opts.length - 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.highlightIndex = Math.max(this.highlightIndex - 1, 0);
    } else if (event.key === 'Enter' && this.highlightIndex >= 0 && this.highlightIndex < opts.length) {
      event.preventDefault();
      this.select(opts[this.highlightIndex]);
    } else if (event.key === 'Escape') {
      this.close();
    }
  }

  String(v: any): string { return String(v); }

  writeValue(v: any) { this.value = v ?? ''; }
  registerOnChange(fn: (v: any) => void) { this._onChange = fn; }
  registerOnTouched(fn: () => void) { this._onTouched = fn; }
  setDisabledState(d: boolean) { this.disabled = d; }
}
