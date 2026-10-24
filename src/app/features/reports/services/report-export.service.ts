import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ExportFormat } from '../models/report-registry.model';

/**
 * Handles server-side report exports (PDF, Excel, CSV).
 * Downloads the file as a blob and triggers a browser save-as dialog.
 */
@Injectable({ providedIn: 'root' })
export class ReportExportService {
  private readonly baseUrl = `${environment.apiUrl}/Export`;

  constructor(private http: HttpClient) {}

  /**
   * Requests an export from the backend and triggers a file download.
   * @param reportKey  The report identifier (e.g. 'trial-balance')
   * @param format     Export format ('pdf' | 'excel' | 'csv' | 'print')
   * @param filters    Key-value pairs of filter parameters
   */
  export(
    reportKey: string,
    format: ExportFormat,
    filters: Record<string, unknown>
  ): Observable<void> {
    let params = new HttpParams().set('format', this.mapFormat(format));

    // Append all non-null filter values
    for (const [key, value] of Object.entries(filters)) {
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    }

    return this.http
      .get(`${this.baseUrl}/${reportKey}`, {
        params,
        responseType: 'blob',
        observe: 'response',
      })
      .pipe(
        tap((response) => {
          let blob = response.body;
          if (!blob) {
            throw new Error('Empty response body');
          }

          if (!(blob instanceof Blob)) {
            blob = new Blob([blob as any], {
              type: format === 'excel'
                ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                : format === 'csv'
                ? 'text/csv'
                : 'application/pdf'
            });
          }

          // Extract filename from Content-Disposition header
          const disposition = response.headers.get('Content-Disposition');
          const fileName = this.extractFileName(disposition, reportKey, format);

          // Trigger download
          this.downloadBlob(blob, fileName);
        }),
        map(() => void 0)
      );
  }

  /**
   * Fetches the report PDF as a Blob and creates an Object URL for in-browser preview,
   * without triggering a file download.
   */
  getReportPdf(
    reportKey: string,
    filters: Record<string, unknown>
  ): Observable<{ blob: Blob; fileName: string; url: string }> {
    let params = new HttpParams().set('format', 'Pdf');

    for (const [key, value] of Object.entries(filters)) {
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    }

    return this.http
      .get(`${this.baseUrl}/${reportKey}`, {
        params,
        responseType: 'blob',
        observe: 'response',
      })
      .pipe(
        map((response) => {
          let blob = response.body;
          if (!blob) throw new Error('الملف المسترجع فارغ');
          if (!(blob instanceof Blob)) {
            blob = new Blob([blob as any], { type: 'application/pdf' });
          }
          const disposition = response.headers.get('Content-Disposition');
          const fileName = this.extractFileName(disposition, reportKey, 'pdf');
          const url = URL.createObjectURL(blob);
          return { blob, fileName, url };
        })
      );
  }

  // ─────────────────────────────────────────────

  private mapFormat(format: ExportFormat): string {
    switch (format) {
      case 'pdf':
      case 'print':
        return 'Pdf';
      case 'excel':
        return 'Excel';
      case 'csv':
        return 'Csv';
      default:
        return 'Pdf';
    }
  }

  private extractFileName(
    disposition: string | null,
    reportKey: string,
    format: ExportFormat
  ): string {
    if (disposition) {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match?.[1]) return match[1].replace(/['"]/g, '');
    }
    const ext = format === 'excel' ? 'xlsx' : format === 'print' ? 'pdf' : format;
    return `${reportKey}_${new Date().toISOString().slice(0, 10)}.${ext}`;
  }

  downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();

    // Cleanup after a small delay
    setTimeout(() => {
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    }, 100);
  }
}
