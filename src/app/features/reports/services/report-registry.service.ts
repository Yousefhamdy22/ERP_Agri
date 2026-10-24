import { Injectable } from '@angular/core';
import {
  REPORT_CATEGORIES,
  REPORT_DEFINITIONS,
  ReportCategory,
  ReportCategoryDef,
  ReportDefinition,
} from '../models/report-registry.model';

/**
 * Central registry for all reports in the system.
 * Provides lookup, filtering, and search capabilities.
 */
@Injectable({ providedIn: 'root' })
export class ReportRegistryService {
  /** All category definitions. */
  readonly categories: ReadonlyArray<ReportCategoryDef> = REPORT_CATEGORIES;

  /** All report definitions. */
  readonly reports: ReadonlyArray<ReportDefinition> = REPORT_DEFINITIONS;

  /** Find a report by its unique key. */
  getByKey(key: string): ReportDefinition | undefined {
    return this.reports.find((r) => r.key === key);
  }

  /** Get reports belonging to a specific category. */
  getByCategory(category: ReportCategory): ReadonlyArray<ReportDefinition> {
    return this.reports.filter((r) => r.category === category);
  }

  /** Get only reports that have a working backend endpoint. */
  getAvailable(): ReadonlyArray<ReportDefinition> {
    return this.reports.filter((r) => r.hasBackend);
  }

  /** Search reports by Arabic or English title/description. */
  search(term: string): ReadonlyArray<ReportDefinition> {
    if (!term.trim()) return this.reports;
    const lower = term.toLowerCase();
    return this.reports.filter(
      (r) =>
        r.titleAr.includes(term) ||
        r.titleEn.toLowerCase().includes(lower) ||
        r.descriptionAr.includes(term) ||
        r.key.includes(lower)
    );
  }

  /** Count of reports per category. */
  getCategoryCounts(): ReadonlyMap<ReportCategory, number> {
    const counts = new Map<ReportCategory, number>();
    for (const cat of this.categories) {
      counts.set(cat.id, this.getByCategory(cat.id).length);
    }
    return counts;
  }
}
