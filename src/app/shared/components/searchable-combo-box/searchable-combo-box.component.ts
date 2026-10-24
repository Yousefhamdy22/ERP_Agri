import {
  ApplicationRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  forwardRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

export interface ComboBoxItem {
  id: string;
  /** Primary display label (e.g. customer name, account nameAr) */
  label: string;
  /** Secondary searchable text (e.g. code, phone) — displayed as a badge */
  code?: string;
  /** Tertiary searchable text (e.g. phone number, email) */
  extra?: string;
  /** Optional sub-label shown below the main label */
  subLabel?: string;
  /** Optional numeric value shown on the right (e.g. balance, price) */
  numericValue?: number | null;
  /** Optional numeric value format label (e.g. 'رصيد', 'سعر') */
  numericLabel?: string;
}

/**
 * Searchable ComboBox — يبحث في أي جزء من label/code/extra بمجرد الكتابة.
 * يدعم ControlValueAccessor (formControlName / ngModel) + (itemSelected) event.
 * يدعم التنقل بالأسهم (↑/↓) و Enter للاختيار و Escape للإغلاق.
 *
 * Usage:
 *   <app-searchable-combo-box
 *     [items]="customers"
 *     placeholder="ابحث عن عميل بالاسم أو الكود أو الهاتف…"
 *     (itemSelected)="onCustomerPicked($event)">
 *   </app-searchable-combo-box>
 */
@Component({
  selector: 'app-searchable-combo-box',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './searchable-combo-box.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableComboBoxComponent),
      multi: true,
    },
  ],
})
export class SearchableComboBoxComponent implements ControlValueAccessor, OnDestroy, OnChanges {
  @Input() items: ComboBoxItem[] = [];
  @Input() placeholder = '— اختر —';
  @Input() invalid = false;
  @Input() emptyMessage = 'لا توجد عناصر';
  /** Max items to show in dropdown (performance guard) */
  @Input() maxResults = 50;
  /** If set, remembers last 5 selected items in localStorage under this key */
  @Input() storageKey = '';
  @Output() itemSelected = new EventEmitter<ComboBoxItem>();

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  open = false;
  query = '';
  filteredItems: ComboBoxItem[] = [];
  loading = false;
  selectedLabel = '';
  value: string | null = null;
  disabled = false;
  highlightIndex = -1;

  recentItems: ComboBoxItem[] = [];

  private search$ = new Subject<string>();
  private destroy$ = new Subject<void>();
  private _onChange: (v: string | null) => void = () => {};
  private _onTouched: () => void = () => {};

  constructor(private appRef: ApplicationRef) {
    this.search$
      .pipe(debounceTime(120), takeUntil(this.destroy$))
      .subscribe((q) => {
        this.filterItems(q);
        this.loading = false;
        try { this.appRef.tick(); } catch { /* already ticking */ }
      });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['items'] && this.open) {
      this.filterItems(this.query);
    }
    // When items change and we have a value, try to update the label
    if (changes['items'] && this.value) {
      const found = this.items.find((i) => i.id === this.value);
      if (found) {
        this.selectedLabel = found.code ? `${found.code} — ${found.label}` : found.label;
      }
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private filterItems(q: string) {
    const term = q.trim().toLowerCase();
    if (!term) {
      this.filteredItems = this.items.slice(0, this.maxResults);
    } else {
      // Split search into individual words for multi-term matching
      const terms = term.split(/\s+/).filter(Boolean);
      this.filteredItems = this.items
        .filter((item) => {
          const haystack = [item.label, item.code, item.extra, item.subLabel]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return terms.every(t => haystack.includes(t));
        })
        .slice(0, this.maxResults);
    }
    this.highlightIndex = this.filteredItems.length > 0 ? 0 : -1;
  }

  highlightMatch(text: string): string {
    if (!this.query.trim()) return text;
    const terms = this.query.trim().split(/\s+/).filter(Boolean);
    let result = text;
    for (const t of terms) {
      const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escaped})`, 'gi');
      result = result.replace(regex, '<mark class="bg-[#fef3c7] rounded-[2px] px-0">$1</mark>');
    }
    return result;
  }

  toggle() {
    if (this.disabled) return;
    this.open = !this.open;
    if (this.open) {
      this._onTouched();
      this.query = '';
      this.highlightIndex = -1;
      this.recentItems = this.loadRecent();
      this.filterItems('');
    }
  }

  close() { this.open = false; }

  onQueryChange(q: string) {
    this.query = q;
    this.loading = true;
    this.search$.next(q);
  }

  select(item: ComboBoxItem) {
    this.value = item.id;
    this.selectedLabel = item.code ? `${item.code} — ${item.label}` : item.label;
    this._onChange(this.value);
    this._onTouched();
    this.saveRecent(item.id);
    this.itemSelected.emit(item);
    this.open = false;
  }

  clear(ev: Event) {
    ev.stopPropagation();
    this.value = null;
    this.selectedLabel = '';
    this._onChange(null);
    this.itemSelected.emit(undefined as any);
  }

  onArrowDown(ev: Event) {
    ev.preventDefault();
    if (this.highlightIndex < this.filteredItems.length - 1) this.highlightIndex++;
  }

  onArrowUp(ev: Event) {
    ev.preventDefault();
    if (this.highlightIndex > 0) this.highlightIndex--;
  }

  onEnter(ev: Event) {
    ev.preventDefault();
    if (this.highlightIndex >= 0 && this.highlightIndex < this.filteredItems.length) {
      this.select(this.filteredItems[this.highlightIndex]);
    }
  }

  // ── Recent items ──
  private loadRecent(): ComboBoxItem[] {
    if (!this.storageKey) return [];
    try {
      const raw = localStorage.getItem('erp_recent_' + this.storageKey);
      if (!raw) return [];
      const ids: string[] = JSON.parse(raw);
      return ids.map(id => this.items.find(i => i.id === id)).filter(Boolean) as ComboBoxItem[];
    } catch { return []; }
  }

  private saveRecent(itemId: string) {
    if (!this.storageKey) return;
    try {
      const raw = localStorage.getItem('erp_recent_' + this.storageKey);
      let ids: string[] = raw ? JSON.parse(raw) : [];
      ids = ids.filter(id => id !== itemId);
      ids.unshift(itemId);
      ids = ids.slice(0, 5);
      localStorage.setItem('erp_recent_' + this.storageKey, JSON.stringify(ids));
    } catch { /* quota or private mode */ }
  }

  // ── ControlValueAccessor ──
  writeValue(v: string | null) {
    this.value = v ?? null;
    if (!v) {
      this.selectedLabel = '';
    } else {
      const found = this.items.find((i) => i.id === v);
      if (found) {
        this.selectedLabel = found.code ? `${found.code} — ${found.label}` : found.label;
      }
    }
  }
  registerOnChange(fn: (v: string | null) => void) { this._onChange = fn; }
  registerOnTouched(fn: () => void) { this._onTouched = fn; }
  setDisabledState(d: boolean) { this.disabled = d; }
}
