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

  @Output() brandClicked = new EventEmitter<void>();
  @Output() browseClicked = new EventEmitter<void>();
  @Output() cartClicked = new EventEmitter<void>();

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
