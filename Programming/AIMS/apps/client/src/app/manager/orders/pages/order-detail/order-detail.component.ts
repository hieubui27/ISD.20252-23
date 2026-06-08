import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import {
  OrderManagerService,
  OrderDetail,
} from '../../services/order-manager.service';
import { InputDialogService } from '../../../../shared/ui/input-dialog/input-dialog.service';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './order-detail.component.html',
  styleUrls: ['./order-detail.component.scss'],
})
export class OrderDetailComponent implements OnInit {
  order: OrderDetail | null = null;
  loading = true;
  isProcessing = false;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private orderManagerService = inject(OrderManagerService);
  private cdr = inject(ChangeDetectorRef);
  private inputDialogService = inject(InputDialogService);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadOrder(id);
    }
  }

  loadOrder(id: string): void {
    this.loading = true;
    this.orderManagerService.getOrderById(id).subscribe({
      next: (data) => {
        this.order = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading order details', err);
        this.loading = false;
        this.cdr.detectChanges();
        this.router.navigate(['/manager/orders']);
      },
    });
  }

  approveOrder(): void {
    if (!this.order) return;
    this.isProcessing = true;
    this.cdr.detectChanges();
    const orderId = this.order.id;
    this.orderManagerService.approveOrder(orderId).subscribe({
      next: () => {
        this.isProcessing = false;
        this.loadOrder(orderId);
      },
      error: (err) => {
        console.error(err);
        this.isProcessing = false;
        this.cdr.detectChanges();
      },
    });
  }

  async rejectOrder(): Promise<void> {
    if (!this.order) return;

    const reason = await this.inputDialogService.prompt({
      title: 'Reject Order',
      message: 'Vui lòng nhập lý do từ chối đơn hàng để xử lý hoàn tiền:',
      placeholder: 'Lý do từ chối...',
      confirmText: 'Xác nhận từ chối',
      cancelText: 'Hủy bỏ',
      requireInput: true,
    });

    if (!reason || reason.trim() === '') {
      return; // User cancelled or didn't input a reason
    }

    this.isProcessing = true;
    this.cdr.detectChanges();
    const orderId = this.order.id;
    this.orderManagerService.rejectOrder(orderId, reason).subscribe({
      next: () => {
        this.isProcessing = false;
        this.loadOrder(orderId);
      },
      error: (err) => {
        console.error(err);
        this.isProcessing = false;
        this.cdr.detectChanges();
      },
    });
  }
}
