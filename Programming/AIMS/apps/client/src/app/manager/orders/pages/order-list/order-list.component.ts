import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  OrderManagerService,
  OrderListItem,
  OrderListParams,
} from '../../services/order-manager.service';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './order-list.component.html',
  styleUrls: ['./order-list.component.scss'],
})
export class OrderListComponent implements OnInit {
  orders: OrderListItem[] = [];
  total = 0;
  params: OrderListParams = { page: 1, limit: 10 };
  loading = false;

  private orderManagerService = inject(OrderManagerService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading = true;
    this.orderManagerService.getOrders(this.params).subscribe({
      next: (response) => {
        this.orders = response.data;
        this.total = response.total;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading orders', err);
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  onSearch(): void {
    this.params.page = 1;
    this.loadOrders();
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.params.page = page;
    this.loadOrders();
  }

  get totalPages(): number {
    return Math.ceil(this.total / (this.params.limit || 10));
  }
}
