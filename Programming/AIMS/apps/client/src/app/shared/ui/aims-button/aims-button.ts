import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export type AimsButtonVariant = 'primary' | 'ghost' | 'secondary';

@Component({
  selector: 'app-aims-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './aims-button.html',
  styleUrl: './aims-button.scss',
})
export class AimsButtonComponent {
  @Input() variant: AimsButtonVariant = 'primary';
  @Input() type: 'button' | 'submit' = 'button';
  @Input() disabled = false;
  @Input() loading = false;

  @Output() pressed = new EventEmitter<void>();

  onClick(): void {
    if (this.disabled || this.loading) return;
    this.pressed.emit();
  }
}
