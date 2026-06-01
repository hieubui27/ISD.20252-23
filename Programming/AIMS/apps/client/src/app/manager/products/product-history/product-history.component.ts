import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductManagerService } from '../services/product-manager.service';
import { AimsIconComponent } from '../../../shared/ui/aims-icon/aims-icon';
import { AimsButtonComponent } from '../../../shared/ui/aims-button/aims-button';

@Component({
  selector: 'app-product-history',
  standalone: true,
  imports: [CommonModule, FormsModule, AimsIconComponent, AimsButtonComponent],
  templateUrl: './product-history.component.html',
  styleUrls: ['./product-history.component.scss'],
})
export class ProductHistoryComponent implements OnInit {
  private productManagerService = inject(ProductManagerService);
  private cdr = inject(ChangeDetectorRef);

  public logs: any[] = [];
  public filteredLogs: any[] = [];
  public isLoading = false;

  public filterAction = 'All Actions';
  public startDate = '';
  public endDate = '';
  public searchQuery = '';

  public get badgeStyle(): Record<string, string> {
    return {
      CREATE: 'badge-create',
      UPDATE: 'badge-update',
      DELETE: 'badge-delete',
      DEACTIVATE: 'badge-deactivate',
      UPDATE_IMAGE: 'badge-info',
    };
  }

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs() {
    this.isLoading = true;
    this.productManagerService.getAllLogs().subscribe({
      next: (data) => {
        this.logs = data || [];
        this.applyFilters();
        this.isLoading = false;

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load logs', err);
        this.isLoading = false;

        this.cdr.detectChanges();
      },
    });
  }

  applyFilters() {
    let tempLogs = this.logs || [];

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase().trim();
      tempLogs = tempLogs.filter((log) => {
        const barcode = log.product?.barcode?.toLowerCase() || '';
        const title = log.product?.title?.toLowerCase() || '';
        const details = log.details?.toLowerCase() || '';
        const createdBy = log.createdBy?.userName?.toLowerCase() || '';
        const action = log.action?.toLowerCase() || '';
        return (
          barcode.includes(query) ||
          title.includes(query) ||
          details.includes(query) ||
          createdBy.includes(query) ||
          action.includes(query)
        );
      });
    }

    if (this.filterAction !== 'All Actions') {
      tempLogs = tempLogs.filter((log) => log.action === this.filterAction);
    }

    if (this.startDate) {
      const startTimestamp = new Date(this.startDate).setHours(0, 0, 0, 0);
      tempLogs = tempLogs.filter((log) => {
        const logTime = new Date(log.createdDate).getTime();
        return logTime >= startTimestamp;
      });
    }

    if (this.endDate) {
      const endTimestamp = new Date(this.endDate).setHours(23, 59, 59, 999);
      tempLogs = tempLogs.filter((log) => {
        const logTime = new Date(log.createdDate).getTime();
        return logTime <= endTimestamp;
      });
    }

    this.filteredLogs = tempLogs;
  }

  formatDate(dateStr: string): string[] {
    if (!dateStr) return ['-', '-'];
    const d = new Date(dateStr);
    const date = d.toLocaleDateString('en-GB');
    const time = d.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return [date, time];
  }
}
