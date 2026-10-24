import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonComponent } from '../../../../shared/components/buttons/button.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { QuickActionsPanelComponent } from '../../../../shared/components/quick-actions-panel/quick-actions-panel.component';
import { CustomerService } from '../../services/customer.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { CreateCustomerDto } from '../../models/customer.model';
import { UpdatePartyInfoDto } from '../../models/supplier.model';
import { SALES_QUICK_ACTIONS } from '../../../../shared/data/sales-quick-actions';

@Component({
  selector: 'app-customer-add-page',
  templateUrl: './customer-add-page.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonComponent, PageHeaderComponent, QuickActionsPanelComponent],
})
export class CustomerAddPageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  saving = false;
  loading = false;
  customerId: string | null = null;

  quickActions = SALES_QUICK_ACTIONS;
  topButton = { label: 'ادارة العملاء', icon: 'fa-solid fa-table-list', route: '/parties/customers/manage' };

  form = this.fb.group({
    nameAr: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', Validators.required],
    creditLimit: [null as number | null, [Validators.min(0)]],
  });

  get isEdit(): boolean { return !!this.customerId; }

  get breadcrumbs() {
    return [
      { label: 'التوريدات والمبيعات' },
      { label: 'العملاء', route: '/sales?module=sales&tab=def' },
      { label: this.isEdit ? 'تعديل عميل' : 'اضافة عميل' },
    ];
  }

  constructor(
    private customerService: CustomerService,
    private notify: NotificationService,
  ) {}

  ngOnInit() {
    this.customerId = this.route.snapshot.paramMap.get('id');
    if (this.customerId) {
      this.form.get('phone')?.clearValidators();
      this.form.get('phone')?.updateValueAndValidity();
      this.loadCustomer(this.customerId);
    }
  }

  loadCustomer(id: string) {
    this.loading = true;
    this.customerService.getById(id).subscribe({
      next: c => {
        this.form.patchValue({
          nameAr: c.nameAr ?? '',
          phone: c.phone ?? '',
          creditLimit: c.creditLimit ?? null,
        });
        this.loading = false;
      },
      error: () => {
        this.notify.error('تعذّر تحميل بيانات العميل');
        this.loading = false;
      },
    });
  }

  invalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!c && c.invalid && (c.touched || c.dirty);
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
      ? this.customerService.update(this.customerId!, this.buildUpdateDto(v))
      : this.customerService.create(this.buildCreateDto(v));

    req.subscribe({
      next: () => {
        this.notify.success(this.isEdit ? 'تم تحديث بيانات العميل بنجاح' : 'تم إضافة العميل بنجاح');
        this.router.navigate(['/parties/customers/manage']);
      },
      error: () => {
        this.notify.error(this.isEdit ? 'تعذّر تحديث بيانات العميل' : 'تعذّر إضافة العميل');
        this.saving = false;
      },
    });
  }

  private buildUpdateDto(v: typeof this.form.value): UpdatePartyInfoDto {
    return {
      name: this.orNull(v.nameAr),
      nameAr: this.orNull(v.nameAr),
      phone: this.orNull(v.phone),
    };
  }

  private buildCreateDto(v: typeof this.form.value): CreateCustomerDto {
    return {
      nameAr: this.orNull(v.nameAr),
      phone: this.orNull(v.phone),
      creditLimit: v.creditLimit ?? undefined,
    };
  }
}
