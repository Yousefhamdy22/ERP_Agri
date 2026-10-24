import { ApplicationRef, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { debounceTime, takeUntil, catchError, switchMap } from 'rxjs/operators';
import { MODULES } from '../../data/modules.config';
import { CustomerService } from '../../../features/parties/services/customer.service';
import { SupplierService } from '../../../features/parties/services/supplier.service';
import { SalesInvoiceService } from '../../../features/invoices/services/sales-invoice.service';
import { PurchaseInvoiceService } from '../../../features/invoices/services/purchase-invoice.service';

export interface SearchEntry {
  label: string;
  module: string;
  group: string;
  icon: string;
  route: string | null;
  searchText: string;
  type?: 'operation' | 'customer' | 'supplier' | 'invoice';
  subLabel?: string;
}

@Component({
  selector: 'app-global-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative min-w-0" #wrapper>
      <div (click)="open()"
        [ngClass]="isOpen ? 'relative z-[101] bg-white ring-2 ring-primary/30 border-primary' : 'bg-[#f3f4f7] border-line hover:border-primary/40'"
        class="flex items-center gap-1.5 sm:gap-2 border rounded-[9px] px-2 sm:px-3 py-1.5 sm:py-2 w-24 xs:w-32 sm:w-56 md:w-60 min-w-0 cursor-text transition">
        <i class="fa-solid fa-magnifying-glass text-[#a3a8b2] text-[12px] sm:text-[13px] shrink-0"></i>
        <span *ngIf="!isOpen" class="text-[11px] sm:text-[13px] text-[#a3a8b2] select-none truncate">بحث…</span>
        <input *ngIf="isOpen" #searchInput
          [(ngModel)]="query" (ngModelChange)="onQueryChange($event)" [ngModelOptions]="{standalone:true}"
          placeholder="ابحث عن عملية، عميل، فاتورة…" autofocus
          class="border-0 outline-none bg-transparent text-[12px] sm:text-[13px] w-full text-ink"
          (keydown.escape)="close()"
          (keydown.arrowdown)="onArrowDown($event)"
          (keydown.arrowup)="onArrowUp($event)"
          (keydown.enter)="onEnter($event)" />
        <kbd *ngIf="!isOpen" class="hidden sm:inline-block text-[10px] text-[#b3b9c2] bg-white border border-[#e3e6ea] rounded px-[5px] py-[1px] font-mono ms-auto shrink-0">Ctrl+K</kbd>
      </div>

      <div *ngIf="isOpen" class="fixed inset-0 z-[98] bg-black/20" (click)="close()"></div>

      <div *ngIf="isOpen"
        class="fixed sm:absolute top-[68px] sm:top-[calc(100%+6px)] inset-x-3 sm:inset-x-auto sm:end-0 z-[100] sm:w-[420px] max-w-[420px] bg-white border border-[#e3e6ea] rounded-[13px] shadow-[0_12px_40px_rgba(0,0,0,.16)] max-h-[70vh] sm:max-h-[420px] overflow-y-auto">

        <!-- Default shortcuts -->
        <div *ngIf="!query.trim()">
          <div class="px-[14px] pt-[12px] pb-[6px]">
            <div class="text-[11px] text-[#8a909c] font-semibold mb-[4px]">اختصارات سريعة</div>
          </div>
          <div *ngFor="let item of defaultItems; let i = index" (click)="navigate(item)"
            class="flex items-center gap-[10px] px-[14px] py-[10px] cursor-pointer border-b border-[#f4f5f7] last:border-b-0 transition-colors duration-100"
            [ngClass]="i === highlightIndex ? 'bg-[#eef0fb]' : 'hover:bg-[#f5f6fa]'">
            <div class="w-[32px] h-[32px] rounded-[8px] bg-[#eef0fb] flex items-center justify-center shrink-0">
              <i [class]="item.icon" class="text-[13px] text-[#5156be]"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-[13px] font-semibold truncate">{{ item.label }}</div>
              <div class="text-[11px] text-[#8a909c]">{{ item.module }} · {{ item.group }}</div>
            </div>
          </div>
        </div>

        <!-- No results -->
        <div *ngIf="query.trim() && !allResults.length && !apiLoading" class="p-[20px] text-center text-[#b3b9c2] text-[13px]">
          <i class="fa-solid fa-magnifying-glass text-[18px] block mb-2 opacity-40"></i>
          لا توجد نتائج لـ "{{ query }}"
        </div>

        <!-- Operation results -->
        <div *ngIf="query.trim() && results.length">
          <div class="px-[14px] pt-[10px] pb-[4px]">
            <div class="text-[11px] text-[#8a909c] font-semibold">شاشات وعمليات</div>
          </div>
          <div *ngFor="let item of results; let i = index" (click)="navigate(item)"
            class="flex items-center gap-[10px] px-[14px] py-[10px] cursor-pointer border-b border-[#f4f5f7] last:border-b-0 transition-colors duration-100"
            [ngClass]="getAbsoluteIndex('operation', i) === highlightIndex ? 'bg-[#eef0fb]' : 'hover:bg-[#f5f6fa]'">
            <div class="w-[32px] h-[32px] rounded-[8px] bg-[#eef0fb] flex items-center justify-center shrink-0">
              <i [class]="item.icon" class="text-[13px] text-[#5156be]"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-[13px] font-semibold truncate" [innerHTML]="highlight(item.label)"></div>
              <div class="text-[11px] text-[#8a909c]">{{ item.module }} · {{ item.group }}</div>
            </div>
            <i *ngIf="item.route" class="fa-solid fa-arrow-left text-[11px] text-[#c4c8cf] shrink-0"></i>
          </div>
        </div>

        <!-- Customer results -->
        <div *ngIf="query.trim() && customerResults.length">
          <div class="px-[14px] pt-[10px] pb-[4px]">
            <div class="text-[11px] text-[#8a909c] font-semibold">عملاء</div>
          </div>
          <div *ngFor="let item of customerResults; let i = index" (click)="navigate(item)"
            class="flex items-center gap-[10px] px-[14px] py-[10px] cursor-pointer border-b border-[#f4f5f7] last:border-b-0 transition-colors duration-100"
            [ngClass]="getAbsoluteIndex('customer', i) === highlightIndex ? 'bg-[#eef0fb]' : 'hover:bg-[#f5f6fa]'">
            <div class="w-[32px] h-[32px] rounded-[8px] bg-[#e8f5e9] flex items-center justify-center shrink-0">
              <i class="fa-solid fa-user text-[13px] text-[#43a047]"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-[13px] font-semibold truncate" [innerHTML]="highlight(item.label)"></div>
              <div class="text-[11px] text-[#8a909c]" *ngIf="item.subLabel">{{ item.subLabel }}</div>
            </div>
            <i class="fa-solid fa-arrow-left text-[11px] text-[#c4c8cf] shrink-0"></i>
          </div>
        </div>

        <!-- Supplier results -->
        <div *ngIf="query.trim() && supplierResults.length">
          <div class="px-[14px] pt-[10px] pb-[4px]">
            <div class="text-[11px] text-[#8a909c] font-semibold">موردين</div>
          </div>
          <div *ngFor="let item of supplierResults; let i = index" (click)="navigate(item)"
            class="flex items-center gap-[10px] px-[14px] py-[10px] cursor-pointer border-b border-[#f4f5f7] last:border-b-0 transition-colors duration-100"
            [ngClass]="getAbsoluteIndex('supplier', i) === highlightIndex ? 'bg-[#eef0fb]' : 'hover:bg-[#f5f6fa]'">
            <div class="w-[32px] h-[32px] rounded-[8px] bg-[#fff3e0] flex items-center justify-center shrink-0">
              <i class="fa-solid fa-truck text-[13px] text-[#ef6c00]"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-[13px] font-semibold truncate" [innerHTML]="highlight(item.label)"></div>
              <div class="text-[11px] text-[#8a909c]" *ngIf="item.subLabel">{{ item.subLabel }}</div>
            </div>
            <i class="fa-solid fa-arrow-left text-[11px] text-[#c4c8cf] shrink-0"></i>
          </div>
        </div>

        <!-- Invoice results -->
        <div *ngIf="query.trim() && invoiceResults.length">
          <div class="px-[14px] pt-[10px] pb-[4px]">
            <div class="text-[11px] text-[#8a909c] font-semibold">فواتير</div>
          </div>
          <div *ngFor="let item of invoiceResults; let i = index" (click)="navigate(item)"
            class="flex items-center gap-[10px] px-[14px] py-[10px] cursor-pointer border-b border-[#f4f5f7] last:border-b-0 transition-colors duration-100"
            [ngClass]="getAbsoluteIndex('invoice', i) === highlightIndex ? 'bg-[#eef0fb]' : 'hover:bg-[#f5f6fa]'">
            <div class="w-[32px] h-[32px] rounded-[8px] bg-[#e3f2fd] flex items-center justify-center shrink-0">
              <i class="fa-solid fa-file-invoice text-[13px] text-[#1976d2]"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-[13px] font-semibold truncate" [innerHTML]="highlight(item.label)"></div>
              <div class="text-[11px] text-[#8a909c]" *ngIf="item.subLabel">{{ item.subLabel }}</div>
            </div>
            <i class="fa-solid fa-arrow-left text-[11px] text-[#c4c8cf] shrink-0"></i>
          </div>
        </div>

        <!-- API loading indicator -->
        <div *ngIf="query.trim() && apiLoading && !customerResults.length && !supplierResults.length && !invoiceResults.length"
          class="px-[14px] py-[10px] text-center">
          <i class="fa-solid fa-spinner fa-spin text-[#5156be] text-[13px]"></i>
          <span class="text-[12px] text-[#8a909c] mr-2">جاري البحث...</span>
        </div>

        <div class="px-[14px] py-[8px] border-t border-[#f0f1f4] text-[11px] text-[#a3a8b2] flex items-center gap-[12px]">
          <span><kbd class="bg-[#f3f4f7] px-[4px] py-[1px] rounded text-[10px] border border-[#e3e6ea]">↑↓</kbd> للتنقل</span>
          <span><kbd class="bg-[#f3f4f7] px-[4px] py-[1px] rounded text-[10px] border border-[#e3e6ea]">Enter</kbd> للفتح</span>
          <span><kbd class="bg-[#f3f4f7] px-[4px] py-[1px] rounded text-[10px] border border-[#e3e6ea]">Esc</kbd> إغلاق</span>
        </div>
      </div>
    </div>
  `,
})
export class GlobalSearchComponent implements OnDestroy {
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  isOpen = false;
  query = '';
  results: SearchEntry[] = [];
  customerResults: SearchEntry[] = [];
  supplierResults: SearchEntry[] = [];
  invoiceResults: SearchEntry[] = [];
  apiLoading = false;
  highlightIndex = -1;
  defaultItems: SearchEntry[] = [];

  private allEntries: SearchEntry[] = [];
  private search$ = new Subject<string>();
  private apiSearch$ = new Subject<string>();
  private destroy$ = new Subject<void>();
  private keyboardListener: ((e: KeyboardEvent) => void) | null = null;

  private customerService = inject(CustomerService);
  private supplierService = inject(SupplierService);
  private salesInvoiceService = inject(SalesInvoiceService);
  private purchaseInvoiceService = inject(PurchaseInvoiceService);

  constructor(private router: Router, private appRef: ApplicationRef) {
    this.buildIndex();
    this.defaultItems = this.allEntries.filter(e => e.route).slice(0, 8);

    this.search$.pipe(debounceTime(100), takeUntil(this.destroy$)).subscribe(q => {
      this.filterEntries(q);
      try { this.appRef.tick(); } catch {}
    });

    // API search with longer debounce (300ms)
    this.apiSearch$.pipe(
      debounceTime(300),
      takeUntil(this.destroy$),
      switchMap(q => {
        const trimmed = q.trim();
        if (!trimmed || trimmed.length < 2) {
          this.customerResults = [];
          this.supplierResults = [];
          this.invoiceResults = [];
          this.apiLoading = false;
          try { this.appRef.tick(); } catch {}
          return of(null);
        }
        this.apiLoading = true;
        try { this.appRef.tick(); } catch {}

        return forkJoin({
          customers: this.customerService.getAll(trimmed, 1, 5).pipe(catchError(() => of({ items: [] }))),
          suppliers: this.supplierService.getAll(trimmed, 1, 5).pipe(catchError(() => of({ items: [] }))),
          salesInvoices: this.salesInvoiceService.getList({ search: trimmed, pageSize: 5 }).pipe(catchError(() => of({ items: [] }))),
          purchaseInvoices: this.purchaseInvoiceService.getList({ search: trimmed, pageSize: 5 }).pipe(catchError(() => of({ items: [] }))),
        });
      })
    ).subscribe(result => {
      if (!result) return;

      this.customerResults = (result.customers.items || []).slice(0, 5).map((c: any) => ({
        label: c.name,
        module: 'عميل',
        group: c.phone || '',
        icon: 'fa-solid fa-user',
        route: '/customers',
        searchText: c.name.toLowerCase(),
        type: 'customer' as const,
        subLabel: c.phone ? 'هاتف: ' + c.phone : (c.currentBalance ? 'رصيد: ' + c.currentBalance.toLocaleString() : ''),
      }));

      this.supplierResults = (result.suppliers.items || []).slice(0, 5).map((s: any) => ({
        label: s.name,
        module: 'مورد',
        group: s.phone || '',
        icon: 'fa-solid fa-truck',
        route: '/suppliers',
        searchText: s.name.toLowerCase(),
        type: 'supplier' as const,
        subLabel: s.phone ? 'هاتف: ' + s.phone : (s.currentBalance ? 'رصيد: ' + s.currentBalance.toLocaleString() : ''),
      }));

      const salesInvs = (result.salesInvoices.items || []).slice(0, 3).map((inv: any) => ({
        label: 'فاتورة بيع #' + inv.invoiceNumber,
        module: 'فاتورة بيع',
        group: inv.customerName || '',
        icon: 'fa-solid fa-file-invoice',
        route: '/sales-invoices',
        searchText: (inv.invoiceNumber + ' ' + (inv.customerName || '')).toLowerCase(),
        type: 'invoice' as const,
        subLabel: (inv.customerName || '') + ' · ' + (inv.grandTotal?.toLocaleString() || '0') + ' ج.م',
      }));

      const purchaseInvs = (result.purchaseInvoices.items || []).slice(0, 3).map((inv: any) => ({
        label: 'فاتورة شراء #' + inv.invoiceNumber,
        module: 'فاتورة شراء',
        group: inv.supplierName || '',
        icon: 'fa-solid fa-file-invoice',
        route: '/purchase-invoices',
        searchText: (inv.invoiceNumber + ' ' + (inv.supplierName || '')).toLowerCase(),
        type: 'invoice' as const,
        subLabel: (inv.supplierName || '') + ' · ' + (inv.grandTotal?.toLocaleString() || '0') + ' ج.م',
      }));

      this.invoiceResults = [...salesInvs, ...purchaseInvs];
      this.apiLoading = false;
      try { this.appRef.tick(); } catch {}
    });

    this.keyboardListener = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.isOpen ? this.close() : this.open();
        try { this.appRef.tick(); } catch {}
      }
    };
    document.addEventListener('keydown', this.keyboardListener);
  }

  get allResults(): SearchEntry[] {
    return [...this.results, ...this.customerResults, ...this.supplierResults, ...this.invoiceResults];
  }

  getAbsoluteIndex(type: string, localIndex: number): number {
    let offset = 0;
    if (type === 'customer') offset = this.results.length;
    else if (type === 'supplier') offset = this.results.length + this.customerResults.length;
    else if (type === 'invoice') offset = this.results.length + this.customerResults.length + this.supplierResults.length;
    return offset + localIndex;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.keyboardListener) {
      document.removeEventListener('keydown', this.keyboardListener);
    }
  }

  private buildIndex() {
    for (const mod of MODULES) {
      const tabs = mod.tabs;
      for (const tabKey of Object.keys(tabs) as ('def' | 'main' | 'sub' | 'reports')[]) {
        const groups = tabs[tabKey];
        if (!groups) continue;
        for (const group of groups) {
          for (const op of group.ops) {
            const searchText = [op.label, mod.name, group.title].filter(Boolean).join(' ').toLowerCase();
            this.allEntries.push({
              label: op.label,
              module: mod.name,
              group: group.title,
              icon: op.icon,
              route: op.route || null,
              searchText,
              type: 'operation',
            });
          }
        }
      }
    }
  }

  private filterEntries(q: string) {
    const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) {
      this.results = [];
      this.highlightIndex = -1;
      return;
    }

    const scored: { entry: SearchEntry; score: number }[] = [];
    for (const entry of this.allEntries) {
      let allMatch = true;
      let score = 0;
      for (const term of terms) {
        if (entry.searchText.includes(term)) {
          if (entry.label.toLowerCase().includes(term)) score += 3;
          else score += 1;
        } else {
          allMatch = false;
          break;
        }
      }
      if (allMatch) scored.push({ entry, score });
    }

    scored.sort((a, b) => b.score - a.score);
    this.results = scored.slice(0, 12).map(s => s.entry);
    this.highlightIndex = this.allResults.length ? 0 : -1;
  }

  highlight(text: string): string {
    if (!this.query.trim()) return text;
    const terms = this.query.trim().split(/\s+/).filter(Boolean);
    let result = text;
    for (const term of terms) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp('(' + escaped + ')', 'gi');
      result = result.replace(regex, '<mark class="bg-[#fef3c7] rounded-[2px] px-0">$1</mark>');
    }
    return result;
  }

  open() {
    this.isOpen = true;
    this.query = '';
    this.results = [];
    this.customerResults = [];
    this.supplierResults = [];
    this.invoiceResults = [];
    this.highlightIndex = this.defaultItems.length ? 0 : -1;
    setTimeout(() => {
      this.searchInput?.nativeElement?.focus();
      try { this.appRef.tick(); } catch {}
    }, 50);
  }

  close() {
    this.isOpen = false;
    this.query = '';
  }

  onQueryChange(q: string) {
    this.query = q;
    this.search$.next(q);
    this.apiSearch$.next(q);
  }

  navigate(item: SearchEntry) {
    if (item.route) {
      const [path, queryString] = item.route.split('?');
      if (queryString) {
        const params: Record<string, string> = {};
        queryString.split('&').forEach(p => {
          const [k, v] = p.split('=');
          params[k] = v;
        });
        this.router.navigate([path], { queryParams: params });
      } else {
        this.router.navigateByUrl(item.route);
      }
    }
    this.close();
    try { this.appRef.tick(); } catch {}
  }

  onArrowDown(ev: Event) {
    ev.preventDefault();
    const list = this.query.trim() ? this.allResults : this.defaultItems;
    if (this.highlightIndex < list.length - 1) this.highlightIndex++;
  }

  onArrowUp(ev: Event) {
    ev.preventDefault();
    if (this.highlightIndex > 0) this.highlightIndex--;
  }

  onEnter(ev: Event) {
    ev.preventDefault();
    const list = this.query.trim() ? this.allResults : this.defaultItems;
    if (this.highlightIndex >= 0 && this.highlightIndex < list.length) {
      this.navigate(list[this.highlightIndex]);
    }
  }
}
