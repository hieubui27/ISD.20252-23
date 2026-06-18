import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ConfirmDialogService } from '../../ui/confirm-dialog/confirm-dialog.service';

@Component({
  selector: 'app-aims-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './aims-header.html',
  styleUrl: './aims-header.scss',
})
export class AimsHeaderComponent {
  @Input() cartItemCount = 0;
  @Input() showSearch = true;
  @Input() searchTerm = '';

  /** Controls the collapsible navigation menu on small screens. */
  menuOpen = false;

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  @Output() brandClicked = new EventEmitter<void>();
  @Output() browseClicked = new EventEmitter<void>();
  @Output() cartClicked = new EventEmitter<void>();
  /** Emitted on every keystroke so callers can filter live. */
  @Output() searchChanged = new EventEmitter<string>();
  /** Emitted when the user presses Enter or clicks the search icon. */
  @Output() searchSubmitted = new EventEmitter<string>();

  private router = inject(Router);
  private confirmDialogService = inject(ConfirmDialogService);

  onSearchInput(value: string): void {
    this.searchTerm = value;
    this.searchChanged.emit(value);
  }

  onSearchSubmit(): void {
    this.searchSubmitted.emit(this.searchTerm.trim());
  }

  handleBrandClick(): void {
    this.closeMenu();
    this.brandClicked.emit();
  }

  handleBrowseClick(): void {
    this.closeMenu();
    this.browseClicked.emit();
  }

  handleCartClick(): void {
    this.closeMenu();
    this.cartClicked.emit();
  }

  async handleLoginClick(): Promise<void> {
    const confirmed = await this.confirmDialogService.confirm({
      title: 'Restricted Access',
      message:
        'This is the administrative portal of the platform. If you are not an administrator, please return to continue your shopping experience.',
      confirmText: 'I am an Admin',
      cancelText: 'Back to Shopping',
    });

    if (confirmed) {
      this.router.navigate(['/auth/login']);
    } else {
      this.router.navigate(['/product-catalog']);
    }
  }
}
