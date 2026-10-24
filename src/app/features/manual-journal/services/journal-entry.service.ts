import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

// نطاق ضيق مقصود: فقط void هنا لإلغاء قيد مرحَّل من صفحة إدارة القيود اليومية (تحويله
// إلى Reversed) — reverse (بمرجع قيد عكسي مخصَّص) خارج نطاق هذه الشاشة حالياً.
@Injectable({ providedIn: 'root' })
export class JournalEntryService {
  private base = `${environment.apiUrl}/JournalEntry`;

  constructor(private http: HttpClient) {}

  void(entryId: string, userId: string): Observable<void> {
    const params = new HttpParams().set('userId', userId);
    return this.http.put<void>(`${this.base}/void/${entryId}`, null, { params });
  }
}
