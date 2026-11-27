import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

/**
 * Reusable shimmer skeleton placeholder shown while API data loads.
 *
 *   <app-skeleton variant="dashboard"></app-skeleton>
 *   <app-skeleton variant="list" [count]="6"></app-skeleton>
 */
@Component({
  selector: 'app-vms-skeleton',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './vms-skeleton.component.html',
  styleUrls: ['./vms-skeleton.component.scss'],
})
export class VmsSkeletonComponent {
  /** layout to render */
  @Input() variant: 'dashboard' | 'list' | 'rows' = 'list';
  /** number of rows for the list variant */
  @Input() count = 5;

  get rows(): number[] {
    return Array.from({ length: this.count }, (_, i) => i);
  }
}
