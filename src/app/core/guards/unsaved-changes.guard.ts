import { Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';

export interface CanComponentDeactivate {
  canDeactivate: () => boolean | Promise<boolean>;
}

@Injectable({ providedIn: 'root' })
export class UnsavedChangesGuard implements CanDeactivate<CanComponentDeactivate> {
  canDeactivate(component: CanComponentDeactivate): boolean | Promise<boolean> {
    if (component.canDeactivate && !component.canDeactivate()) {
      return confirm('توجد تغييرات غير محفوظة. هل تريد المغادرة؟');
    }
    return true;
  }
}
