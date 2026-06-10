import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  RefundManagerService,
  RefundListItem,
  RefundListParams,
  REFUND_STATUSES,
} from '../../services/refund-manager.service';

@Component({
  selector: 'app-refund-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: 'refund-list.component.html',
  styleUrls: ['refund-list.component.scss'],
})
export class RefundListComponent implements OnInit {
  refunds: RefundListItem[] = [];
  total = 0;
  params: RefundListParams = { page: 1, limit: 10 };
  loading = false;
  searchQuery = '';
  activeTab = 'All';
  statuses = REFUND_STATUSES;

  private refundService = inject(RefundManagerService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.loadRefunds();
  }

  loadRefunds(): void {
    this.loading = true;
    this.refundService.getRefunds(this.params).subscribe({
      next: (response) => {
        this.refunds = response.data;
        this.total = response.total;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading refunds', err);
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  onSearch(): void {
    this.params.page = 1;
    this.params.search = this.searchQuery;
    this.loadRefunds();
  }

  onTabChange(tab: string): void {
    this.activeTab = tab;
    this.params.status = tab === 'All' ? undefined : tab;
    this.params.page = 1;
    this.loadRefunds();
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.params.page = page;
    this.loadRefunds();
  }

  get totalPages(): number {
    return Math.ceil(this.total / (this.params.limit || 10));
  }

  getStatusClass(status: string): string {
    return status.toLowerCase().replace(/\s+/g, '-');
  }
}
