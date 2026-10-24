import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ReportFilter } from '../../models/report-registry.model';
import { FiscalPeriodService } from '../../../../shared/services/fiscal-period.service';
import { FiscalPeriod } from '../../../../shared/models/fiscal-period.model';
import { BranchService } from '../../../inventory/services/branch.service';
import { WarehouseService } from '../../../invoices/services/warehouse.service';
import { CustomerService } from '../../../parties/services/customer.service';
import { SupplierService } from '../../../parties/services/supplier.service';
import { AccountService } from '../../../../shared/services/account.service';
import { CategoryService } from '../../../inventory/services/category.service';
import { FlatCategory } from '../../../inventory/models/category.model';
import { ProductService } from '../../../inventory/services/product.service';
import { CustomSelectComponent } from '../../../../shared/components/custom-select/custom-select.component';

/** Simple id+name pair for dropdown options loaded from services */
interface LookupOption {
  id: string;
  label: string;
}

/**
 * Dynamic filter panel that renders controls based on ReportFilter[] definitions.
 * Lookup-type filters (branch, warehouse, customer, supplier, account, product,
 * category) are rendered as proper <select> dropdowns loaded from their services.
 *
 * All required lookups are loaded in parallel using forkJoin for faster initial load.
 */
@Component({
  selector: 'app-report-filter-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, CustomSelectComponent,],
  templateUrl: './report-filter-panel.component.html',
  styleUrls: ['./report-filter-panel.component.scss'],
})
export class ReportFilterPanelComponent implements OnInit, OnChanges {
  @Input() filters: ReadonlyArray<ReportFilter> = [];
  @Input() submitLabel: string = 'عرض التقرير';
  @Input() showPdfPreview = true;
  @Input() pdfPreviewLoading = false;
  @Output() filtersChange = new EventEmitter<Record<string, unknown>>();
  @Output() submitReport = new EventEmitter<Record<string, unknown>>();
  @Output() previewPdf = new EventEmitter<Record<string, unknown>>();

  /** Current filter values keyed by filter.key */
  values: Record<string, unknown> = {};

  /** Loaded fiscal periods for the period selector */
  fiscalPeriods: FiscalPeriod[] = [];

  get periodSelectOptions(): { value: string; label: string }[] {
    return this.fiscalPeriods.map((p) => ({
      value: p.id,
      label: p.periodCode || p.id,
    }));
  }
  periodsLoading = false;

  /** Lookup data for dropdown selectors */
  branches: LookupOption[] = [];
  warehouses: LookupOption[] = [];
  customers: LookupOption[] = [];
  suppliers: LookupOption[] = [];
  accounts: LookupOption[] = [];
  categories: LookupOption[] = [];
  products: LookupOption[] = [];

  /** Loading flags for each lookup type */
  lookupsLoading: Record<string, boolean> = {};

  /** Track which lookups have been loaded to avoid re-fetching */
  private loadedLookups = new Set<string>();

  constructor(
    private fiscalPeriodService: FiscalPeriodService,
    private branchService: BranchService,
    private warehouseService: WarehouseService,
    private customerService: CustomerService,
    private supplierService: SupplierService,
    private accountService: AccountService,
    private categoryService: CategoryService,
    private productService: ProductService
  ) {}

  ngOnInit(): void {
    this.loadFiscalPeriods();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filters']) {
      this.initDefaults();
      this.loadLookupData();
    }
  }

  onFilterChange(): void {
    this.filtersChange.emit({ ...this.values });
  }

  onSubmit(): void {
    this.submitReport.emit({ ...this.values });
  }

  onPreview(): void {
    this.previewPdf.emit({ ...this.values });
  }

  /** Check whether all required filters have a value. */
  get isValid(): boolean {
    return this.filters
      .filter((f) => f.required)
      .every((f) => {
        const val = this.values[f.key];
        return val !== null && val !== undefined && val !== '';
      });
  }

  /** Get the lookup options for a given filter type */
  getLookupOptions(type: string): LookupOption[] {
    switch (type) {
      case 'branch': return this.branches;
      case 'warehouse': return this.warehouses;
      case 'customer': return this.customers;
      case 'supplier': return this.suppliers;
      case 'account': return this.accounts;
      case 'category': return this.categories;
      case 'product': return this.products;
      case 'party': return [...this.customers, ...this.suppliers];
      default: return [];
    }
  }

  isLookupLoading(type: string): boolean {
    return this.lookupsLoading[type] ?? false;
  }

  // ─────────────────────────────────────────────

  private initDefaults(): void {
    this.values = {};
    for (const filter of this.filters) {
      if (filter.defaultValue !== undefined) {
        this.values[filter.key] = filter.defaultValue;
      } else {
        this.values[filter.key] = null;
      }
    }
  }

  private loadFiscalPeriods(): void {
    const hasPeriodFilter = this.filters.some(
      (f) => f.type === 'fiscalPeriod'
    );
    if (!hasPeriodFilter) return;

    this.periodsLoading = true;
    this.fiscalPeriodService.getAll().subscribe({
      next: (periods) => {
        this.fiscalPeriods = periods;
        this.periodsLoading = false;
        // Auto-select the open period
        const open = periods.find((p) => p.status === 'Open');
        if (open) {
          const periodFilter = this.filters.find(
            (f) => f.type === 'fiscalPeriod'
          );
          if (periodFilter) {
            this.values[periodFilter.key] = open.id;
            this.onFilterChange();
          }
        }
      },
      error: () => (this.periodsLoading = false),
    });
  }

  /**
   * Detect which lookup filter types are present and load ALL of them
   * in parallel using forkJoin. Each type is loaded only once (cached
   * in loadedLookups set + the underlying services use shareReplay(1)).
   */
  private loadLookupData(): void {
    const filterTypes = new Set(this.filters.map((f) => f.type));

    // Build a map of type -> Observable that we need to load
    const loaders: Record<string, Observable<LookupOption[]>> = {};

    if (filterTypes.has('branch') && !this.loadedLookups.has('branch')) {
      this.lookupsLoading['branch'] = true;
      loaders['branch'] = this.branchService.getAll().pipe(
        map((items) =>
          items.map((b) => ({ id: b.id, label: b.nameAr ?? b.name }))
        ),
        catchError(() => of([] as LookupOption[]))
      );
    }

    if (filterTypes.has('warehouse') && !this.loadedLookups.has('warehouse')) {
      this.lookupsLoading['warehouse'] = true;
      loaders['warehouse'] = this.warehouseService.getAll().pipe(
        map((items) =>
          items.map((w) => ({
            id: w.warehouseId,
            label: w.nameAr || w.name || w.warehouseId,
          }))
        ),
        catchError(() => of([] as LookupOption[]))
      );
    }

    if (
      (filterTypes.has('customer') || filterTypes.has('party')) &&
      !this.loadedLookups.has('customer')
    ) {
      this.lookupsLoading['customer'] = true;
      loaders['customer'] = this.customerService.getAll().pipe(
        map((result) =>
          result.items.map((c) => ({ id: c.id, label: c.name }))
        ),
        catchError(() => of([] as LookupOption[]))
      );
    }

    if (
      (filterTypes.has('supplier') || filterTypes.has('party')) &&
      !this.loadedLookups.has('supplier')
    ) {
      this.lookupsLoading['supplier'] = true;
      loaders['supplier'] = this.supplierService.getAll().pipe(
        map((result) =>
          result.items.map((s) => ({ id: s.id, label: s.name }))
        ),
        catchError(() => of([] as LookupOption[]))
      );
    }

    if (filterTypes.has('account') && !this.loadedLookups.has('account')) {
      this.lookupsLoading['account'] = true;
      loaders['account'] = this.accountService.getSelectable().pipe(
        map((items) =>
          items.map((a) => ({
            id: a.id,
            label: `${a.accountCode} - ${a.nameAr ?? a.name}`,
          }))
        ),
        catchError(() => of([] as LookupOption[]))
      );
    }

    if (filterTypes.has('category') && !this.loadedLookups.has('category')) {
      this.lookupsLoading['category'] = true;
      loaders['category'] = this.categoryService.getTree().pipe(
        map((tree) => {
          const flat: FlatCategory[] = CategoryService.flattenTree(tree);
          return flat.map((c) => ({
            id: c.categoryId,
            label: '─'.repeat(c.level) + ' ' + (c.nameAr ?? c.name),
          }));
        }),
        catchError(() => of([] as LookupOption[]))
      );
    }

    if (filterTypes.has('product') && !this.loadedLookups.has('product')) {
      this.lookupsLoading['product'] = true;
      loaders['product'] = this.productService.getAllForDropdown().pipe(
        map((items) =>
          items.map((p) => ({ id: p.id, label: p.name }))
        ),
        catchError(() => of([] as LookupOption[]))
      );
    }

    // Reload fiscal periods if the new set of filters includes one
    if (filterTypes.has('fiscalPeriod') && this.fiscalPeriods.length === 0) {
      this.loadFiscalPeriods();
    }

    // If nothing needs loading, we're done
    const keys = Object.keys(loaders);
    if (keys.length === 0) return;

    // Fire ALL lookups in parallel with forkJoin
    forkJoin(loaders).subscribe((results) => {
      for (const key of keys) {
        const options = results[key] ?? [];
        switch (key) {
          case 'branch':
            this.branches = options;
            break;
          case 'warehouse':
            this.warehouses = options;
            break;
          case 'customer':
            this.customers = options;
            break;
          case 'supplier':
            this.suppliers = options;
            break;
          case 'account':
            this.accounts = options;
            break;
          case 'category':
            this.categories = options;
            break;
          case 'product':
            this.products = options;
            break;
        }
        this.lookupsLoading[key] = false;
        this.loadedLookups.add(key);
      }
    });
  }
}
