import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

/** Marker emitted between non-adjacent page numbers. */
export const PAGINATION_ELLIPSIS = '…';
export type PaginationItem = number | typeof PAGINATION_ELLIPSIS;

@Component({
  selector: 'app-aims-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './aims-pagination.html',
  styleUrl: './aims-pagination.scss',
})
export class AimsPaginationComponent {
  @Input() currentPage = 1;
  @Input() totalPages = 1;
  @Input() infoText = 'Showing results';

  /**
   * Show every page number when the total is at or below this threshold.
   * Above it, the list is condensed with ellipses (e.g. 1 … 4 5 6 … 20).
   */
  @Input() maxVisiblePages = 7;

  @Output() pageChange = new EventEmitter<number>();

  readonly ellipsis = PAGINATION_ELLIPSIS;

  /**
   * Pages to render. When there are only a few pages, all of them are shown.
   * Otherwise the first page, the last page and a small window around the
   * current page are kept, with ellipsis markers filling the gaps.
   */
  get pages(): PaginationItem[] {
    const total = this.totalPages;

    if (total <= this.maxVisiblePages) {
      return this.range(1, total);
    }

    const current = Math.min(Math.max(this.currentPage, 1), total);

    // Keep first, last and the current page +/- 1.
    const windowPages = new Set<number>([
      1,
      total,
      current - 1,
      current,
      current + 1,
    ]);

    const visible = Array.from(windowPages)
      .filter((page) => page >= 1 && page <= total)
      .sort((left, right) => left - right);

    // Insert an ellipsis wherever consecutive kept pages are not adjacent.
    const items: PaginationItem[] = [];
    let previous = 0;
    for (const page of visible) {
      if (previous && page - previous > 1) {
        items.push(PAGINATION_ELLIPSIS);
      }
      items.push(page);
      previous = page;
    }

    return items;
  }

  /** Type guard used by the template to distinguish numbers from the ellipsis. */
  isPage(item: PaginationItem): item is number {
    return item !== PAGINATION_ELLIPSIS;
  }

  private range(start: number, end: number): number[] {
    const pages: number[] = [];
    for (let page = start; page <= end; page++) {
      pages.push(page);
    }
    return pages;
  }

  onPrev(): void {
    if (this.currentPage > 1) {
      this.pageChange.emit(this.currentPage - 1);
    }
  }

  onNext(): void {
    if (this.currentPage < this.totalPages) {
      this.pageChange.emit(this.currentPage + 1);
    }
  }

  onPage(page: number): void {
    if (page !== this.currentPage) {
      this.pageChange.emit(page);
    }
  }
}
