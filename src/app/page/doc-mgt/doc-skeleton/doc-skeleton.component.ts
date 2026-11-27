import { Component, Input } from '@angular/core';

// Data aane tak dikhne wale placeholder cards
@Component({
  selector: 'app-doc-skeleton',
  templateUrl: './doc-skeleton.component.html',
  styleUrls: ['./doc-skeleton.component.scss'],
})
export class DocSkeletonComponent {
  @Input() count = 4;

  get items(): number[] {
    return Array.from({ length: this.count }, (_, i) => i);
  }
}
