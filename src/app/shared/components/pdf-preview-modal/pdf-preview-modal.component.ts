import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-pdf-preview-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pdf-preview-modal.component.html',
  styleUrls: ['./pdf-preview-modal.component.scss'],
})
export class PdfPreviewModalComponent implements OnChanges, OnDestroy {
  @Input() isOpen = false;
  @Input() title = 'معاينة التقرير';
  @Input() subtitle = '';
  @Input() pdfUrl: string | null = null;
  @Input() fileName = 'report.pdf';
  @Input() loading = false;
  @Input() error = '';

  @Output() close = new EventEmitter<void>();
  @Output() download = new EventEmitter<void>();
  @Output() print = new EventEmitter<void>();
  @Output() retry = new EventEmitter<void>();

  safeUrl: SafeResourceUrl | null = null;
  isFullscreen = false;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pdfUrl']) {
      if (this.pdfUrl) {
        this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfUrl);
      } else {
        this.safeUrl = null;
      }
    }
  }

  ngOnDestroy(): void {
    this.safeUrl = null;
  }

  toggleFullscreen(): void {
    this.isFullscreen = !this.isFullscreen;
  }

  onClose(): void {
    this.isFullscreen = false;
    this.close.emit();
  }

  onDownload(): void {
    this.download.emit();
  }

  onPrint(): void {
    // If iframe is loaded, try printing from iframe or trigger print event
    const iframe = document.getElementById('pdf-preview-iframe') as HTMLIFrameElement | null;
    if (iframe && iframe.contentWindow) {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        return;
      } catch {
        // cross-origin or sandbox fallback
      }
    }
    this.print.emit();
  }

  onRetry(): void {
    this.retry.emit();
  }

  openInNewTab(): void {
    if (this.pdfUrl) {
      window.open(this.pdfUrl, '_blank');
    }
  }
}
