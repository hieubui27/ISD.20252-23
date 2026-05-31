import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

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

  @Output() pageChange = new EventEmitter<number>();

  get pages(): number[] {
    const pages = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
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
