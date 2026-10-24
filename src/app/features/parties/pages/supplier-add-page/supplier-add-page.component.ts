import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonComponent } from '../../../../shared/components/buttons/button.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { QuickActionsPanelComponent } from '../../../../shared/components/quick-actions-panel/quick-actions-panel.component';
import { SupplierService } from '../../services/supplier.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { CreateSupplierDto, SUPPLIER_CATEGORY_LABELS, SUPPLIER_COUNTRIES, UpdatePartyInfoDto } from '../../models/supplier.model';
import { parseLocationInput } from '../../utils/location-parser';
import { PURCHASES_QUICK_ACTIONS } from '../../../../shared/data/purchases-quick-actions';
import { CustomSelectComponent } from '../../../../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-supplier-add-page',
  templateUrl: './supplier-add-page.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonComponent, PageHeaderComponent, QuickActionsPanelComponent, CustomSelectComponent,],
})
export class SupplierAddPageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  saving = false;
  loading = false;
  supplierId: string | null = null;
  countries = SUPPLIER_COUNTRIES;
  categories = Object.entries(SUPPLIER_CATEGORY_LABELS).map(([value, label]) => ({ value: +value, label }));

  quickActions = PURCHASES_QUICK_ACTIONS;
  topButton = { label: 'ادارة مورد', icon: 'fa-solid fa-gear', route: '/parties/suppliers/manage' };

  form = this.fb.group({
    nameAr: ['', [Validators.required, Validators.minLength(2)]],
    phone: [''],
    secondaryPhone: [''],
    countryCode: [''],
    email: [''],
    category: [null as number | null],
    responsibleName: [''],
    responsiblePosition: [''],
    city: [''],
    address: [''],
    location: [''],
    taxNumber: [''],
    commercialRegister: [''],
    notes: [''],
  });

  get isEdit(): boolean { return !!this.supplierId; }

  get breadcrumbs() {
    return [
      { label: 'التوريدات والمبيعات' },
      { label: 'الموردين', route: '/sales?module=purchases&tab=def' },
      { label: this.isEdit ? 'تعديل مورد' : 'اضافة مورد' },
    ];
  }

  constructor(
    private supplierService: SupplierService,
    private notify: NotificationService,
  ) {}

  ngOnInit() {
    this.supplierId = this.route.snapshot.paramMap.get('id');
    if (this.supplierId) {
      this.loadSupplier(this.supplierId);
    }
  }

  loadSupplier(id: string) {
    this.loading = true;
    this.supplierService.getById(id).subscribe({
      next: s => {
        this.form.patchValue({
          nameAr: s.nameAr ?? '',
          phone: s.phone ?? '',
          email: s.email ?? '',
          address: s.address ?? '',
        });
        this.loading = false;
      },
      error: () => {
        this.notify.error('تعذّر تحميل بيانات المورد');
        this.loading = false;
      },
    });
  }

  invalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  get parsedLocation() {
    return parseLocationInput(this.form.value.location || '');
  }

  get locationHasValueButUnparsed(): boolean {
    const v = (this.form.value.location || '').trim();
    return !!v && !this.parsedLocation;
  }

  private orNull(v: string | null | undefined): string | null {
    const t = (v ?? '').trim();
    return t ? t : null;
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const v = this.form.value;

    const req = this.isEdit
      ? this.supplierService.update(this.supplierId!, this.buildUpdateDto(v))
      : this.supplierService.create(this.buildCreateDto(v));

    req.subscribe({
      next: () => {
        this.notify.success(this.isEdit ? 'تم تحديث بيانات المورد بنجاح' : 'تم إضافة المورد بنجاح');
        this.router.navigate(['/parties/suppliers/manage']);
      },
      error: () => {
        this.notify.error(this.isEdit ? 'تعذّر تحديث بيانات المورد' : 'تعذّر إضافة المورد');
        this.saving = false;
      },
    });
  }

  private buildUpdateDto(v: typeof this.form.value): UpdatePartyInfoDto {
    return {
      nameAr: this.orNull(v.nameAr),
      phone: this.orNull(v.phone),
      email: this.orNull(v.email),
      address: this.orNull(v.address),
    };
  }

  private buildCreateDto(v: typeof this.form.value): CreateSupplierDto {
    const loc = this.parsedLocation;
    return {
      nameAr: this.orNull(v.nameAr),
      phone: this.orNull(v.phone),
      email: this.orNull(v.email),
      countryCode: this.orNull(v.countryCode),
      responsibleName: this.orNull(v.responsibleName),
      responsiblePosition: this.orNull(v.responsiblePosition),
      category: v.category ?? null,
      secondaryPhone: this.orNull(v.secondaryPhone),
      city: this.orNull(v.city),
      address: this.orNull(v.address),
      latitude: loc?.latitude ?? null,
      longitude: loc?.longitude ?? null,
      taxNumber: this.orNull(v.taxNumber),
      commercialRegister: this.orNull(v.commercialRegister),
      notes: this.orNull(v.notes),
    };
  }
}
