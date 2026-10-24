import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface TreeSelectOption {
  value: string;
  label: string;
  level: number;
}

@Component({
  selector: 'app-tree-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tree-select.component.html',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => TreeSelectComponent),
    multi: true,
  }],
})
export class TreeSelectComponent implements ControlValueAccessor {
  @Input() options: TreeSelectOption[] = [];
  @Input() placeholder = '— اختر —';
  @Input() emptyValue: string | null = null;
  @Input() invalid = false;

  open     = false;
  value:   string | null = null;
  disabled = false;
  search   = '';

  private _onChange:   (v: string | null) => void = () => {};
  private _onTouched:  () => void                 = () => {};

  get selectedOption(): TreeSelectOption | undefined {
    if (this.value === null || this.value === '') return undefined;
    return this.options.find(o => o.value === this.value);
  }

  get filteredOptions(): TreeSelectOption[] {
    const term = this.search.trim().toLowerCase();
    if (!term) return this.options;
    return this.options.filter(o => o.label.toLowerCase().includes(term));
  }

  toggle() {
    if (this.disabled) return;
    this.open = !this.open;
    if (this.open) {
      this.search = '';
      this._onTouched();
    }
  }

  close() { this.open = false; this.search = ''; }

  select(val: string | null) {
    this.value = val;
    this._onChange(val);
    this._onTouched();
    this.open = false;
    this.search = '';
  }

  dashes(level: number): string {
    return '—'.repeat(level);
  }

  writeValue(v: string | null | undefined)         { this.value = v ?? null; }
  registerOnChange(fn: (v: string | null) => void) { this._onChange = fn; }
  registerOnTouched(fn: () => void)                { this._onTouched = fn; }
  setDisabledState(d: boolean)                     { this.disabled = d; }
}
