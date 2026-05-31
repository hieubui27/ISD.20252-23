import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostBinding, Input, Output } from '@angular/core';

export type AimsButtonVariant = 'primary' | 'ghost' | 'secondary';
export type AimsButtonSize = 'sm' | 'md' | 'lg';

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
  @Input() fullWidth = false;
  @Input() size: AimsButtonSize = 'md';

  @Output() pressed = new EventEmitter<void>();

  @HostBinding('style.width')
  get hostWidth(): string | null {
    return this.fullWidth ? '100%' : null;
  }

  onClick(): void {
    if (this.disabled || this.loading) return;
    this.pressed.emit();
  }
}
