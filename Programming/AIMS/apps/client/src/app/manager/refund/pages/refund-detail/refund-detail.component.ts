import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import {
  RefundManagerService,
  RefundDetail,
} from '../../services/refund-manager.service';
import { InputDialogService } from '../../../../shared/ui/input-dialog/input-dialog.service';

@Component({
  selector: 'app-refund-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: 'refund-detail.component.html',
  styleUrls: ['refund-detail.component.scss'],
})
export class RefundDetailComponent implements OnInit {
  refund: RefundDetail | null = null;
  loading = true;
  isProcessing = false;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private refundService = inject(RefundManagerService);
  private cdr = inject(ChangeDetectorRef);
  private inputDialogService = inject(InputDialogService);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadRefund(id);
    }
  }

  loadRefund(id: string): void {
    this.loading = true;
    this.refundService.getRefundById(id).subscribe({
      next: (data) => {
        this.refund = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading refund details', err);
        this.loading = false;
        this.cdr.detectChanges();
        this.router.navigate(['/manager/refunds']);
      },
    });
  }

  approveRefund(): void {
    if (!this.refund) return;
    this.isProcessing = true;
    this.cdr.detectChanges();
    const refundId = this.refund.id;
    this.refundService.approveRefund(refundId).subscribe({
      next: () => {
        this.isProcessing = false;
        this.loadRefund(refundId);
      },
      error: (err) => {
        console.error(err);
        this.isProcessing = false;
        this.cdr.detectChanges();
      },
    });
  }

  async rejectRefund(): Promise<void> {
    if (!this.refund) return;

    const reason = await this.inputDialogService.prompt({
      title: 'Reject Refund',
      message: 'Vui lòng nhập lý do từ chối yêu cầu hoàn tiền:',
      placeholder: 'Lý do từ chối...',
      confirmText: 'Xác nhận từ chối',
      cancelText: 'Hủy bỏ',
      requireInput: true,
    });

    if (!reason || reason.trim() === '') {
      return;
    }

    this.isProcessing = true;
    this.cdr.detectChanges();
    const refundId = this.refund.id;
    this.refundService.rejectRefund(refundId, reason).subscribe({
      next: () => {
        this.isProcessing = false;
        this.loadRefund(refundId);
      },
      error: (err) => {
        console.error(err);
        this.isProcessing = false;
        this.cdr.detectChanges();
      },
    });
  }

  markAsDone(): void {
    if (!this.refund) return;
    this.isProcessing = true;
    this.cdr.detectChanges();
    const refundId = this.refund.id;
    this.refundService.markDone(refundId).subscribe({
      next: () => {
        this.isProcessing = false;
        this.loadRefund(refundId);
      },
      error: (err) => {
        console.error(err);
        this.isProcessing = false;
        this.cdr.detectChanges();
      },
    });
  }

  getStatusClass(status: string): string {
    return status.toLowerCase().replace(/\s+/g, '-');
  }
}
