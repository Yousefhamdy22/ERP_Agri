import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { Workbook } from 'exceljs';
import { ProductSearchSelectComponent, ProductPickResult } from '../../../../shared/components/product-search-select/product-search-select.component';
import { ButtonComponent } from '../../../../shared/components/buttons/button.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { QuickActionsPanelComponent } from '../../../../shared/components/quick-actions-panel/quick-actions-panel.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { AuthService } from '../../../../shared/services/auth.service';
import { FiscalPeriodService } from '../../../../shared/services/fiscal-period.service';
import { FiscalPeriod } from '../../../../shared/models/fiscal-period.model';
import { BranchService } from '../../../inventory/services/branch.service';
import { BranchListItem } from '../../../inventory/models/branch.model';
import { AccountService } from '../../../../shared/services/account.service';
import { Account } from '../../../../shared/models/account.model';
import { ProductService } from '../../../inventory/services/product.service';
import { ProductOption } from '../../../inventory/models/product.model';
import { WarehouseService } from '../../../invoices/services/warehouse.service';
import { Warehouse } from '../../../invoices/models/warehouse.model';
import { SupplierService } from '../../../parties/services/supplier.service';
import { CustomerService } from '../../../parties/services/customer.service';
import { PartyListItem } from '../../../parties/models/supplier.model';
import { OpeningBalanceService } from '../../services/opening-balance.service';
import {
  BalanceSide,
  BALANCE_SIDE_LABELS,
  OpeningBalanceImportLineResult,
  OpeningBalanceImportResult,
  OpeningBalanceType,
  OPENING_BALANCE_TYPE_LABELS,
  OPENING_BALANCE_TYPE_ICONS,
  OPENING_BALANCE_CURRENCIES,
} from '../../models/opening-balance.model';
import { OPENING_BALANCE_QUICK_ACTIONS } from '../../../../shared/data/opening-balance-quick-actions';
import { friendlyErrorMessage } from '../../../../shared/utils/http-error.util';
import { CustomSelectComponent } from '../../../../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-opening-balance-add-page',
  templateUrl: './opening-balance-add-page.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, ButtonComponent, PageHeaderComponent, QuickActionsPanelComponent, ProductSearchSelectComponent, CustomSelectComponent,],
})
export class OpeningBalanceAddPageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);

  saving = false;
  branches: BranchListItem[] = [];
  accounts: Account[] = [];
  accountsLoading = true;
  fiscalPeriods: FiscalPeriod[] = [];
  suppliers: PartyListItem[] = [];
  customers: PartyListItem[] = [];
  products: ProductOption[] = [];
  warehouses: Warehouse[] = [];

  branchId = '';
  fiscalPeriodId = '';
  type: OpeningBalanceType = 'Manual';

  inventoryWorkflow: 'single' | 'bulk' = 'single';
  importFile: File | null = null;
  importRows: any[] = [];
  importTotalRows = 0;
  importSuccessCount = 0;
  importErrorCount = 0;
  importTotalValue = 0;
  importHasError = false;
  importPreviewLoading = false;
  importing = false;

  // استيراد Excel جماعي لأرصدة موردين/عملاء افتتاحية — نفس نمط تبويب "صنف فردي/استيراد جماعي"
  // المستخدَم لأرصدة المخزون (Inventory) بالضبط، بدل مودال منفصل كما كان سابقاً.
  partyImportWorkflow: 'single' | 'bulk' = 'single';
  partyImportFile: File | null = null;
  partyImportDragging = false;
  partyImportBalanceDate = new Date().toISOString().slice(0, 10);
  partyImporting = false;
  partyImportResult: OpeningBalanceImportResult | null = null;
  partyImportResultFilter: 'all' | 'success' | 'error' = 'all';

  typeOptions = (Object.entries(OPENING_BALANCE_TYPE_LABELS) as [OpeningBalanceType, string][])
    .map(([value, label]) => ({ value, label, icon: OPENING_BALANCE_TYPE_ICONS[value] }));
  sideOptions = (Object.entries(BALANCE_SIDE_LABELS) as [BalanceSide, string][]).map(([value, label]) => ({ value, label }));
  currencies = OPENING_BALANCE_CURRENCIES;

  quickActions = OPENING_BALANCE_QUICK_ACTIONS;
  topButton = { label: 'ادارة الأرصدة الافتتاحية', icon: 'fa-solid fa-table-list', route: '/opening-balance/manage' };

  breadcrumbs = [
    { label: 'الحسابات' },
    { label: 'رصيد اول المدة', route: '/sales?module=opening-balance&tab=def' },
    { label: 'اضافة رصيد افتتاحي' },
  ];

  manualForm = this.fb.group({
    accountId: ['', Validators.required],
    balance: [null as number | null, [Validators.required, Validators.min(0.01)]],
    side: ['Debit' as BalanceSide, Validators.required],
    balanceDate: [new Date().toISOString().slice(0, 10), Validators.required],
    description: [''],
    notes: [''],
  });

  bankForm = this.fb.group({
    bankName: ['', Validators.required],
    bankAccountNumber: ['', Validators.required],
    bankAccountCode: ['', Validators.required],
    balance: [null as number | null, [Validators.required, Validators.min(0.01)]],
    currency: ['EGP', Validators.required],
    balanceDate: [new Date().toISOString().slice(0, 10), Validators.required],
    notes: [''],
  });

  // مستخدم لكل من المورد والعميل — نفس البنية تماماً، يختلف فقط مصدر partyOptions والقيمة
  // الافتراضية للجانب (دائن للمورد، مدين للعميل).
  partyForm = this.fb.group({
    partyId: ['', Validators.required],
    balance: [null as number | null, [Validators.required, Validators.min(0.01)]],
    side: ['Credit' as BalanceSide, Validators.required],
    balanceDate: [new Date().toISOString().slice(0, 10), Validators.required],
    notes: [''],
  });

  inventoryForm = this.fb.group({
    productId: ['', Validators.required],
    warehouseId: ['', Validators.required],
    quantity: [null as number | null, [Validators.required, Validators.min(0.0001)]],
    unitPrice: [null as number | null, [Validators.required, Validators.min(0.01)]],
    balanceDate: [new Date().toISOString().slice(0, 10), Validators.required],
    notes: [''],
  });

  constructor(
    private openingBalanceService: OpeningBalanceService,
    private branchService: BranchService,
    private accountService: AccountService,
    private fiscalPeriodService: FiscalPeriodService,
    private supplierService: SupplierService,
    private customerService: CustomerService,
    private productService: ProductService,
    private warehouseService: WarehouseService,
    private notify: NotificationService,
    private auth: AuthService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.branchService.getAll().subscribe({
      next: b => {
        this.branches = b;
        if (b.length && !this.branchId) {
          this.branchId = b[0].id;
          this.onBranchChange();
        }
      },
      error: () => {},
    });
    this.accountService.getSelectable().subscribe({
      next: a => { this.accounts = a; this.accountsLoading = false; },
      error: () => { this.accountsLoading = false; },
    });
    this.fiscalPeriodService.getAll().subscribe({
      next: p => {
        this.fiscalPeriods = p;
        const open = p.find(x => x.status === 'Open');
        if (open && !this.fiscalPeriodId) this.fiscalPeriodId = open.id;
      },
      error: () => {},
    });
    this.supplierService.getAll().subscribe({ next: r => { this.suppliers = r.items; }, error: () => {} });
    this.customerService.getAll().subscribe({ next: r => { this.customers = r.items; }, error: () => {} });
    this.productService.getAllForDropdown().subscribe({ next: p => { this.products = p; }, error: () => {} });

    this.route.queryParams.subscribe(params => {
      if (params['type']) {
        const t = params['type'] as OpeningBalanceType;
        if (['Manual', 'Bank', 'Supplier', 'Customer', 'Inventory'].includes(t)) {
          this.type = t;
        }
      }
      if (params['workflow']) {
        const w = params['workflow'] as 'single' | 'bulk';
        if (['single', 'bulk'].includes(w)) {
          this.inventoryWorkflow = w;
        }
      }
    });
  }

  onBranchChange() {
    this.warehouses = [];
    this.inventoryForm.patchValue({ warehouseId: '' });
    if (!this.branchId) return;
    this.branchService.getBranchWithWarehouses(this.branchId).subscribe({
      next: res => {
        this.warehouses = res.warehouses.map(w => ({
          warehouseId: w.warehouseId,
          name: w.name,
          location: w.location,
          isActive: w.isActive,
          isDefault: w.isDefault
        } as any));
        const preferred = res.warehouses.find(w => w.isDefault) ?? res.warehouses[0];
        if (preferred) this.inventoryForm.patchValue({ warehouseId: preferred.warehouseId });
      },
      error: () => { this.notify.error('تعذّر تحميل مخازن هذا الفرع'); }
    });
  }

  onProductPicked(item: ProductPickResult) {
    if (item.costPrice != null) {
      this.inventoryForm.patchValue({ unitPrice: item.costPrice });
    }
  }

  get partyLabel(): string { return this.type === 'Supplier' ? 'المورد' : 'العميل'; }
  get partyOptions(): PartyListItem[] { return this.type === 'Supplier' ? this.suppliers : this.customers; }

  get selectedBranchLabel(): string {
    const b = this.branches.find(x => x.id === this.branchId);
    return b ? (b.nameAr || b.name) : '—';
  }

  get selectedFiscalPeriodLabel(): string {
    const p = this.fiscalPeriods.find(x => x.id === this.fiscalPeriodId);
    return p ? p.periodCode : '—';
  }

  get inventoryTotalValue(): number {
    const v = this.inventoryForm.value;
    return (Number(v.quantity) || 0) * (Number(v.unitPrice) || 0);
  }

  setType(t: OpeningBalanceType) {
    this.type = t;
    if (t === 'Supplier') this.partyForm.patchValue({ partyId: '', side: 'Credit' });
    if (t === 'Customer') this.partyForm.patchValue({ partyId: '', side: 'Debit' });
    if (t === 'Supplier' || t === 'Customer') this.removePartyImportFile();
  }

  invalid(form: 'manual' | 'bank' | 'party' | 'inventory', ctrl: string): boolean {
    const group: FormGroup = form === 'manual' ? this.manualForm : form === 'bank' ? this.bankForm : form === 'party' ? this.partyForm : this.inventoryForm;
    const c = group.get(ctrl);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  private activeForm() {
    switch (this.type) {
      case 'Manual': return this.manualForm;
      case 'Bank': return this.bankForm;
      case 'Supplier':
      case 'Customer': return this.partyForm;
      case 'Inventory': return this.inventoryForm;
    }
  }

  submit() {
    const form = this.activeForm();
    if (form.invalid) { form.markAllAsTouched(); return; }
    if (!this.branchId || !this.fiscalPeriodId) {
      this.notify.error('اختر الفرع والفترة المالية أولاً');
      return;
    }
    const userId = this.auth.userId;
    if (!userId) {
      this.notify.error('لا يمكن حفظ الرصيد الافتتاحي: لم يتم ربط تسجيل دخول مستخدم حقيقي بعد');
      return;
    }

    this.saving = true;
    const common = { branchId: this.branchId, fiscalPeriodId: this.fiscalPeriodId, userId };

    let call$: Observable<{ id: string }>;
    if (this.type === 'Manual') {
      const v = this.manualForm.value;
      call$ = this.openingBalanceService.createManual({
        ...common,
        accountId: v.accountId!,
        balance: Number(v.balance),
        side: v.side!,
        balanceDate: v.balanceDate!,
        description: v.description || null,
        notes: v.notes || null,
      });
    } else if (this.type === 'Bank') {
      const v = this.bankForm.value;
      call$ = this.openingBalanceService.createBank({
        ...common,
        bankName: v.bankName!.trim(),
        bankAccountNumber: v.bankAccountNumber!.trim(),
        bankAccountCode: v.bankAccountCode!.trim(),
        balance: Number(v.balance),
        currency: v.currency!,
        balanceDate: v.balanceDate!,
        notes: v.notes || null,
      });
    } else if (this.type === 'Supplier') {
      const v = this.partyForm.value;
      call$ = this.openingBalanceService.createSupplier({
        ...common,
        supplierId: v.partyId!,
        balance: Number(v.balance),
        side: v.side!,
        balanceDate: v.balanceDate!,
        notes: v.notes || null,
      });
    } else if (this.type === 'Customer') {
      const v = this.partyForm.value;
      call$ = this.openingBalanceService.createCustomer({
        ...common,
        customerId: v.partyId!,
        balance: Number(v.balance),
        side: v.side!,
        balanceDate: v.balanceDate!,
        notes: v.notes || null,
      });
    } else {
      const v = this.inventoryForm.value;
      call$ = this.openingBalanceService.createInventory({
        ...common,
        itemId: v.productId!,
        warehouseId: v.warehouseId!,
        quantity: Number(v.quantity),
        unitPrice: Number(v.unitPrice),
        balanceDate: v.balanceDate!,
        notes: v.notes || null,
      });
    }

    call$.subscribe({
      next: () => {
        this.saving = false;
        this.notify.success('تم إضافة الرصيد الافتتاحي بنجاح');
        this.router.navigate(['/opening-balance/manage']);
      },
      error: (err) => {
        this.saving = false;
        this.notify.error(friendlyErrorMessage(err, 'تعذّر إضافة الرصيد الافتتاحي'));
      },
    });
  }

  async downloadTemplate() {
    // لا عمود مخزن هنا بعد الآن — المخزن أصبح حقلاً واحداً على مستوى الطلب كله (يُختار فوق
    // مرة واحدة) بدل عمود لكل صف، بعد تحديث الباك ايند (WarehouseId أُضيف لِـ
    // ImportInventoryOpeningBalanceCommand، مؤكَّد حياً 2026-08-04).
    const columns = [
      { header: 'رمز الصنف (SKU)', key: 'sku', width: 18 },
      { header: 'الكمية', key: 'quantity', width: 14 },
      { header: 'سعر التكلفة', key: 'unitPrice', width: 16 },
      { header: 'رقم التشغيلة (Batch)', key: 'batchNumber', width: 20 },
      { header: 'تاريخ الإنتاج (YYYY-MM-DD)', key: 'productionDate', width: 24 },
      { header: 'تاريخ انتهاء الصلاحية (YYYY-MM-DD)', key: 'expiryDate', width: 28 },
      { header: 'ملاحظات', key: 'notes', width: 30 }
    ];

    const workbook = new Workbook();
    workbook.creator = 'نظام الفواتير والمخزون';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('الأرصدة الافتتاحية للمخزون', {
      views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }],
    });
    sheet.columns = columns;

    const headerRow = sheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCEEFB' } };
      cell.font = { bold: true, size: 12, name: 'Arial', color: { argb: 'FF1F4E78' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFB8D9F0' } },
        bottom: { style: 'thin', color: { argb: 'FFB8D9F0' } },
        left: { style: 'thin', color: { argb: 'FFB8D9F0' } },
        right: { style: 'thin', color: { argb: 'FFB8D9F0' } },
      };
    });

    sheet.addRow({
      sku: 'PROD-001',
      quantity: 100,
      unitPrice: 50.00,
      batchNumber: 'BATCH-2026-01',
      productionDate: '2026-01-01',
      expiryDate: '2027-01-01',
      notes: 'رصيد افتتاحي للمخزون'
    });

    const exampleRow = sheet.getRow(2);
    exampleRow.eachCell(cell => {
      cell.font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF7F8C8D' } };
    });

    const EMPTY_ROWS = 20;
    const rowBorder = { style: 'thin' as const, color: { argb: 'FFE7ECF2' } };
    for (let i = 0; i < EMPTY_ROWS; i++) {
      const row = sheet.addRow({});
      row.eachCell({ includeEmpty: true }, cell => {
        cell.border = { top: rowBorder, bottom: rowBorder, left: rowBorder, right: rowBorder };
        cell.font = { name: 'Arial', size: 11 };
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `InventoryOpeningBalance_Template_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  onExcelFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;
    
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (ext !== '.xlsx') {
      this.notify.error('صيغة الملف غير مدعومة — استخدم xlsx.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.notify.error('حجم الملف أكبر من الحد المسموح (10 ميجابايت)');
      return;
    }
    
    this.importFile = file;
    this.parseExcelFile(file);
  }

  async parseExcelFile(file: File) {
    try {
      this.importPreviewLoading = true;
      const workbook = new Workbook();
      const arrayBuffer = await file.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);
      const sheet = workbook.worksheets[0];
      
      const rows: any[] = [];
      let hasError = false;
      let totalValue = 0;

      const header4 = sheet.getRow(1).getCell(4).value?.toString()?.trim() || '';
      const isLegacy = sheet.columnCount <= 4 || header4.includes('ملاحظات') || header4.toLowerCase().includes('note');

      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // skip header
        const sku = row.getCell(1).value?.toString()?.trim();
        const qtyVal = row.getCell(2).value;
        const priceVal = row.getCell(3).value;

        if (!sku && qtyVal === null && priceVal === null) {
          return; // skip empty rows
        }

        let batchNumber: string | null = null;
        let productionDateStr: string | null = null;
        let expiryDateStr: string | null = null;
        let notes = '';

        if (isLegacy) {
          notes = row.getCell(4).value?.toString()?.trim() || '';
        } else {
          batchNumber = row.getCell(4).value?.toString()?.trim() || null;
          const prodVal = row.getCell(5).value;
          const expVal = row.getCell(6).value;
          productionDateStr = this.formatDateCell(prodVal);
          expiryDateStr = this.formatDateCell(expVal);
          notes = row.getCell(7).value?.toString()?.trim() || '';
        }

        const quantity = Number(qtyVal);
        const unitPrice = Number(priceVal);

        let rowError: string | null = null;
        if (!sku) {
          rowError = 'رمز الصنف (SKU) مطلوب';
        } else if (qtyVal === null || qtyVal === undefined || isNaN(quantity) || quantity <= 0) {
          rowError = 'الكمية مطلوبة ويجب أن تكون أكبر من 0';
        } else if (priceVal === null || priceVal === undefined || isNaN(unitPrice) || unitPrice <= 0) {
          rowError = 'سعر الوحدة مطلوب ويجب أن يكون أكبر من 0';
        } else if (productionDateStr && expiryDateStr && new Date(expiryDateStr) <= new Date(productionDateStr)) {
          rowError = 'تاريخ انتهاء الصلاحية يجب أن يكون بعد تاريخ الإنتاج';
        }

        const rowValue = isNaN(quantity) || isNaN(unitPrice) ? 0 : quantity * unitPrice;
        totalValue += rowValue;

        if (rowError) hasError = true;

        rows.push({
          rowNumber,
          productCode: sku,
          productName: sku,
          quantity: isNaN(quantity) ? qtyVal : quantity,
          unitPrice: isNaN(unitPrice) ? priceVal : unitPrice,
          totalValue: rowValue,
          batchNumber: batchNumber || '—',
          productionDate: productionDateStr || '—',
          expiryDate: expiryDateStr || '—',
          notes: notes || '',
          isSuccess: !rowError,
          errorMessage: rowError
        });
      });

      this.importRows = rows;
      this.importTotalRows = rows.length;
      this.importSuccessCount = rows.filter(r => r.isSuccess).length;
      this.importErrorCount = rows.filter(r => !r.isSuccess).length;
      this.importTotalValue = totalValue;
      this.importHasError = hasError;
      this.importPreviewLoading = false;
    } catch (err) {
      this.importPreviewLoading = false;
      this.notify.error('حدث خطأ أثناء قراءة ملف Excel');
    }
  }

  private formatDateCell(val: any): string | null {
    if (!val) return null;
    if (val instanceof Date) {
      return val.toISOString().slice(0, 10);
    }
    if (typeof val === 'object' && val.result instanceof Date) {
      return val.result.toISOString().slice(0, 10);
    }
    const str = val.toString().trim();
    if (!str) return null;
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
    return str;
  }

  removeImportFile() {
    this.importFile = null;
    this.importRows = [];
    this.importTotalRows = 0;
    this.importSuccessCount = 0;
    this.importErrorCount = 0;
    this.importTotalValue = 0;
    this.importHasError = false;
  }

  importConfirmed() {
    if (!this.importFile) return;
    if (this.importHasError) {
      this.notify.error('لا يمكن استيراد الملف لوجود أخطاء في البيانات');
      return;
    }
    if (!this.branchId || !this.fiscalPeriodId) {
      this.notify.error('اختر الفرع والفترة المالية أولاً');
      return;
    }
    const warehouseId = this.inventoryForm.get('warehouseId')?.value;
    if (!warehouseId) {
      this.notify.error('اختر المخزن أولاً');
      return;
    }
    const userId = this.auth.userId;
    if (!userId) {
      this.notify.error('لا يمكن إتمام الاستيراد: لم يتم ربط تسجيل دخول مستخدم حقيقي بعد');
      return;
    }

    this.importing = true;
    const dateVal = this.inventoryForm.get('balanceDate')?.value || new Date().toISOString().slice(0, 10);
    const isoDate = new Date(dateVal).toISOString();

    this.openingBalanceService.importInventory(
      this.importFile,
      isoDate,
      this.fiscalPeriodId,
      this.branchId,
      warehouseId,
      userId
    ).subscribe({
      next: res => {
        this.importing = false;
        this.notify.success(`تم استيراد الرصيد الافتتاحي بنجاح! رقم القيد: ${res.journalNumber || 'OB-2026-001'}`);
        this.router.navigate(['/opening-balance/manage']);
      },
      error: err => {
        this.importing = false;
        this.notify.error(friendlyErrorMessage(err, 'تعذّر استيراد الرصيد الافتتاحي'));
      }
    });
  }

  // ── استيراد Excel جماعي — موردين/عملاء (نمط تبويب مطابق لأرصدة المخزون) ───────

  onPartyImportFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.setPartyImportFile(input.files?.[0] ?? null);
    input.value = '';
  }

  onPartyImportDrop(event: DragEvent) {
    event.preventDefault();
    this.partyImportDragging = false;
    this.setPartyImportFile(event.dataTransfer?.files?.[0] ?? null);
  }

  onPartyImportDragOver(event: DragEvent) {
    event.preventDefault();
    this.partyImportDragging = true;
  }

  onPartyImportDragLeave() {
    this.partyImportDragging = false;
  }

  private setPartyImportFile(file: File | null) {
    if (!file) return;
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (ext !== '.xlsx' && ext !== '.xls') {
      this.notify.error('صيغة الملف غير مدعومة — استخدم xlsx أو xls.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.notify.error('حجم الملف أكبر من الحد المسموح (10 ميجابايت)');
      return;
    }
    this.partyImportFile = file;
    this.partyImportResult = null;
    this.partyImportResultFilter = 'all';
  }

  removePartyImportFile() {
    this.partyImportFile = null;
    this.partyImportResult = null;
    this.partyImportResultFilter = 'all';
  }

  get partyImportSuccessRatio(): number {
    const r = this.partyImportResult;
    if (!r || !r.totalRows) return 0;
    return Math.round((r.successCount / r.totalRows) * 100);
  }

  get filteredPartyImportLines(): OpeningBalanceImportLineResult[] {
    const lines = this.partyImportResult?.lineResults ?? [];
    if (this.partyImportResultFilter === 'success') return lines.filter(l => l.isSuccess);
    if (this.partyImportResultFilter === 'error') return lines.filter(l => !l.isSuccess);
    return lines;
  }

  // هل الحقول الأساسية المطلوبة قبل تفعيل زر الرفع مكتملة (فرع + فترة مالية + تاريخ رصيد)؟
  get partyImportMetaComplete(): boolean {
    return !!this.branchId && !!this.fiscalPeriodId && !!this.partyImportBalanceDate;
  }

  async downloadPartyImportTemplate() {
    const isSupplier = this.type === 'Supplier';
    const columns = [
      { header: 'اسم الطرف (Name)', key: 'name', width: 30 },
      { header: 'المبلغ (Amount)', key: 'amount', width: 16 },
      { header: 'الجانب (Side)', key: 'side', width: 14 },
      { header: 'ملاحظات (Notes)', key: 'notes', width: 30 },
    ];

    const workbook = new Workbook();
    workbook.creator = 'نظام الفواتير والمخزون';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(isSupplier ? 'الأرصدة الافتتاحية للموردين' : 'الأرصدة الافتتاحية للعملاء', {
      views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }],
    });
    sheet.columns = columns;

    const headerRow = sheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCEEFB' } };
      cell.font = { bold: true, size: 12, name: 'Arial', color: { argb: 'FF1F4E78' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFB8D9F0' } },
        bottom: { style: 'thin', color: { argb: 'FFB8D9F0' } },
        left: { style: 'thin', color: { argb: 'FFB8D9F0' } },
        right: { style: 'thin', color: { argb: 'FFB8D9F0' } },
      };
    });

    sheet.addRow({
      name: isSupplier ? 'مثال: شركة التوريد المتحدة' : 'مثال: عميل تجريبي',
      amount: 5000,
      side: isSupplier ? 'Credit' : 'Debit',
      notes: 'رصيد افتتاحي',
    });
    const exampleRow = sheet.getRow(2);
    exampleRow.eachCell(cell => {
      cell.font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF7F8C8D' } };
    });

    const EMPTY_ROWS = 20;
    const rowBorder = { style: 'thin' as const, color: { argb: 'FFE7ECF2' } };
    for (let i = 0; i < EMPTY_ROWS; i++) {
      const row = sheet.addRow({});
      row.eachCell({ includeEmpty: true }, cell => {
        cell.border = { top: rowBorder, bottom: rowBorder, left: rowBorder, right: rowBorder };
        cell.font = { name: 'Arial', size: 11 };
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.type}OpeningBalance_Template_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  submitPartyImport() {
    if (!this.partyImportFile) { this.notify.error('اختر ملف Excel أولاً'); return; }
    if (!this.branchId || !this.fiscalPeriodId) { this.notify.error('اختر الفرع والفترة المالية أولاً'); return; }
    if (!this.partyImportBalanceDate) { this.notify.error('اختر تاريخ الرصيد الافتتاحي'); return; }
    const userId = this.auth.userId;
    if (!userId) {
      this.notify.error('لا يمكن إتمام الاستيراد: لم يتم ربط تسجيل دخول مستخدم حقيقي بعد');
      return;
    }

    this.partyImporting = true;
    const isoDate = new Date(this.partyImportBalanceDate).toISOString();
    const call$ = this.type === 'Supplier'
      ? this.openingBalanceService.importSupplier(this.partyImportFile, isoDate, this.fiscalPeriodId, this.branchId, userId)
      : this.openingBalanceService.importCustomer(this.partyImportFile, isoDate, this.fiscalPeriodId, this.branchId, userId);

    call$.subscribe({
      next: res => {
        this.partyImporting = false;
        this.partyImportResult = res;
        if (res.successCount > 0) {
          this.notify.success(`تم استيراد ${res.successCount} من ${res.totalRows} رصيد بنجاح`);
        } else {
          this.notify.error('لم يتم استيراد أي رصيد — راجع تفاصيل الأخطاء أدناه');
        }
      },
      error: err => {
        this.partyImporting = false;
        this.notify.error(friendlyErrorMessage(err, 'تعذّر استيراد الأرصدة الافتتاحية'));
      },
    });
  }
}
