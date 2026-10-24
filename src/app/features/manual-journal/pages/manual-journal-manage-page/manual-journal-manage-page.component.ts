import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { QuickActionsPanelComponent } from '../../../../shared/components/quick-actions-panel/quick-actions-panel.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { AuthService } from '../../../../shared/services/auth.service';
import { friendlyErrorMessage } from '../../../../shared/utils/http-error.util';
import { ManualJournalService, ManualJournalListFilter } from '../../services/manual-journal.service';
import { JournalEntryService } from '../../services/journal-entry.service';
import {
  ManualJournalDetail,
  ManualJournalListItem,
  ManualJournalStatus,
  MANUAL_JOURNAL_STATUS_BADGE,
  MANUAL_JOURNAL_STATUS_LABELS,
} from '../../models/manual-journal.model';
import { MANUAL_JOURNAL_QUICK_ACTIONS } from '../../../../shared/data/manual-journal-quick-actions';
import { CustomSelectComponent } from '../../../../shared/components/custom-select/custom-select.component';

type StatusFilter = '' | ManualJournalStatus;

@Component({
  selector: 'app-manual-journal-manage-page',
  templateUrl: './manual-journal-manage-page.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, QuickActionsPanelComponent, CustomSelectComponent,],
})
export class ManualJournalManagePageComponent implements OnInit, OnDestroy {
  journals: ManualJournalListItem[] = [];
  loading = false;      // true only for the very first fetch (no rows to show yet)
  refreshing = false;   // true for every fetch after that — table stays visible underneath
  loadError = false;

  status: StatusFilter = '';
  search = '';

  statusOptions: { value: StatusFilter; label: string }[] = [
    { value: '', label: 'كل الحالات' },
    { value: 'Draft', label: 'مسودة' },
    { value: 'Posted', label: 'مرحّل' },
    { value: 'Reversed', label: 'معكوس' },
  ];

  page = 1;
  pageSize = 10;
  total = 0;
  totalPages = 1;

  get hasNextPage(): boolean { return this.page < this.totalPages; }
  get hasPreviousPage(): boolean { return this.page > 1; }

  quickActions = MANUAL_JOURNAL_QUICK_ACTIONS;
  topButton = { label: 'اضافة قيد يومية', icon: 'fa-solid fa-plus', route: '/manual-journal/add' };

  breadcrumbs = [
    { label: 'الحسابات' },
    { label: 'القيود اليومية' },
  ];

  selectedJournal: ManualJournalDetail | null = null;
  detailLoading = false;
  actionLoading = false;

  private search$ = new Subject<string>();

  constructor(
    private journalService: ManualJournalService,
    private journalEntryService: JournalEntryService,
    private notify: NotificationService,
    private auth: AuthService,
  ) {}

  ngOnInit() {
    this.search$.pipe(debounceTime(400)).subscribe(() => { this.page = 1; this.load(); });
    this.load();
  }

  ngOnDestroy() { this.search$.complete(); }

  private buildFilter(page: number): ManualJournalListFilter {
    return { page, pageSize: this.pageSize, search: this.search || undefined };
  }

  load() {
    this.loading = this.journals.length === 0 && !this.loadError;
    this.refreshing = true;
    this.loadError = false;
    this.journalService.getList(this.buildFilter(this.page)).subscribe({
      next: r => {
        // شكل استجابة GET /api/ManualJournal غير مؤكَّد حياً بعد (Swagger لا يوثِّق الـ body) —
        // هذا الـ log مؤقَّت لكشف الشكل الحقيقي أول استخدام فعلي، بدل تخمين شكل ثانٍ بلا دليل.
        const items = Array.isArray(r) ? r : (r as { items?: unknown })?.items;
        if (!Array.isArray(items)) {
          console.error('Unexpected GET /api/ManualJournal response shape:', r);
          this.notify.error('شكل استجابة القيود غير متوقَّع — راجع الـ console للتفاصيل');
          this.loadError = true;
          this.loading = false;
          this.refreshing = false;
          return;
        }
        this.journals = items.filter(j => !this.status || j.status === this.status);
        this.total = (r as { total?: number })?.total ?? items.length;
        this.totalPages = (r as { totalPages?: number })?.totalPages ?? 1;
        this.loading = false;
        this.refreshing = false;
        this.prefetchNextPage();
      },
      error: () => {
        this.notify.error('تعذّر تحميل القيود اليومية');
        this.loadError = true;
        this.loading = false;
        this.refreshing = false;
      },
    });
  }

  private prefetchNextPage() {
    if (this.page >= this.totalPages) return;
    this.journalService.getList(this.buildFilter(this.page + 1)).subscribe({ error: () => {} });
  }

  onSearchChange(value: string) {
    this.search = value;
    this.search$.next(value);
  }

  onFilterChange() {
    this.page = 1;
    this.load();
  }

  clearFilters() {
    this.status = '';
    this.search = '';
    this.page = 1;
    this.load();
  }

  nextPage() { if (this.hasNextPage && !this.refreshing) { this.page++; this.load(); } }
  prevPage() { if (this.hasPreviousPage && !this.refreshing) { this.page--; this.load(); } }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('ar-EG');
  }

  statusLabel(s: string): string { return MANUAL_JOURNAL_STATUS_LABELS[s] ?? s; }
  statusBadgeClass(s: string): string { return MANUAL_JOURNAL_STATUS_BADGE[s] ?? 'bg-gray-200 text-gray-800'; }

  openDetail(id: string) {
    this.detailLoading = true;
    this.selectedJournal = null;
    this.journalService.getDetail(id).subscribe({
      next: detail => { this.selectedJournal = detail; this.detailLoading = false; },
      error: () => { this.notify.error('تعذّر تحميل تفاصيل القيد'); this.detailLoading = false; },
    });
  }

  closeDetail() { this.selectedJournal = null; }

  postJournal() {
    if (!this.selectedJournal) return;
    const userId = this.auth.userId;
    if (!userId) { this.notify.error('لا يمكن ترحيل القيد: لم يتم ربط تسجيل دخول مستخدم حقيقي بعد'); return; }
    if (!confirm('هل تريد ترحيل هذا القيد؟ لن يمكن تعديله بعد الترحيل.')) return;

    this.actionLoading = true;
    this.journalService.post({ journalEntryId: this.selectedJournal.id, userId }).subscribe({
      next: () => {
        this.notify.success('تم ترحيل القيد');
        this.actionLoading = false;
        this.closeDetail();
        this.load();
      },
      error: err => {
        this.actionLoading = false;
        this.notify.error(friendlyErrorMessage(err, 'تعذّر ترحيل القيد'));
      },
    });
  }

  voidJournal() {
    if (!this.selectedJournal) return;
    const userId = this.auth.userId;
    if (!userId) { this.notify.error('لا يمكن إلغاء القيد: لم يتم ربط تسجيل دخول مستخدم حقيقي بعد'); return; }
    if (!confirm('هل تريد إلغاء (عكس) هذا القيد المرحَّل؟ هذا الإجراء لا يمكن التراجع عنه.')) return;

    this.actionLoading = true;
    this.journalEntryService.void(this.selectedJournal.id, userId).subscribe({
      next: () => {
        this.notify.success('تم إلغاء القيد');
        this.actionLoading = false;
        this.closeDetail();
        this.load();
      },
      error: err => {
        this.actionLoading = false;
        this.notify.error(friendlyErrorMessage(err, 'تعذّر إلغاء القيد'));
      },
    });
  }

  deleteJournal(journal: ManualJournalListItem) {
    if (!confirm(`تأكيد حذف القيد "${journal.entryNumber}"؟ هذا الإجراء لا يمكن التراجع عنه.`)) return;
    this.journalService.delete(journal.id).subscribe({
      next: () => { this.notify.success('تم حذف القيد'); this.load(); },
      error: err => this.notify.error(friendlyErrorMessage(err, 'تعذّر حذف القيد')),
    });
  }
}
