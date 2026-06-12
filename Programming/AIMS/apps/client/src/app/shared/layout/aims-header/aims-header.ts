import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-aims-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './aims-header.html',
  styleUrl: './aims-header.scss',
})
export class AimsHeaderComponent {
  @Input() cartItemCount = 0;
  @Input() showSearch = true;
  @Input() searchTerm = '';

  @Output() brandClicked = new EventEmitter<void>();
  @Output() browseClicked = new EventEmitter<void>();
  @Output() cartClicked = new EventEmitter<void>();
  /** Emitted on every keystroke so callers can filter live. */
  @Output() searchChanged = new EventEmitter<string>();
  /** Emitted when the user presses Enter or clicks the search icon. */
  @Output() searchSubmitted = new EventEmitter<string>();

  onSearchInput(value: string): void {
    this.searchTerm = value;
    this.searchChanged.emit(value);
  }

  onSearchSubmit(): void {
    this.searchSubmitted.emit(this.searchTerm.trim());
  }

  handleBrandClick(): void {
    this.brandClicked.emit();
  }

  handleBrowseClick(): void {
    this.browseClicked.emit();
  }

  handleCartClick(): void {
    this.cartClicked.emit();
  }
}
