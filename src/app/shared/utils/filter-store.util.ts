/**
 * Simple localStorage-based filter persistence.
 * Saves/restores filter state per page key.
 */
const PREFIX = 'erp_filter_';

export function saveFilters(pageKey: string, filters: Record<string, string>) {
  try {
    localStorage.setItem(PREFIX + pageKey, JSON.stringify(filters));
  } catch { /* quota or private mode */ }
}

export function loadFilters(pageKey: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(PREFIX + pageKey);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function clearSavedFilters(pageKey: string) {
  try {
    localStorage.removeItem(PREFIX + pageKey);
  } catch { /* ignore */ }
}
