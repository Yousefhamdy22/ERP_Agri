import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast { message: string; type: 'success' | 'error' | 'info'; }

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private _toast = new BehaviorSubject<Toast | null>(null);
  toast$ = this._toast.asObservable();
  private timer: any;

  show(message: string, type: Toast['type'] = 'success') {
    this._toast.next({ message, type });
    clearTimeout(this.timer);
    // المدة السابقة (2200ms ثابتة) كانت تختفي قبل إتمام قراءة رسائل الأخطاء التفصيلية الأطول
    // (مثل رسائل friendlyErrorMessage) — الآن تتناسب مع طول الرسالة نفسها: حد أدنى معقول +
    // وقت إضافي لكل حرف، وأخطاء تبقى أطول من النجاح/المعلومات لأنها عادة أهم وأطول نصاً،
    // بحد أقصى (12s) حتى لا يبقى التنبيه ظاهراً للأبد لو كانت الرسالة طويلة جداً.
    const base = type === 'error' ? 4000 : 3000;
    const duration = Math.min(base + message.length * 60, 12000);
    this.timer = setTimeout(() => this._toast.next(null), duration);
  }
  success(m: string) { this.show(m, 'success'); }
  error(m: string) { this.show(m, 'error'); }
  info(m: string) { this.show(m, 'info'); }
  dismiss() {
    clearTimeout(this.timer);
    this._toast.next(null);
  }
}
