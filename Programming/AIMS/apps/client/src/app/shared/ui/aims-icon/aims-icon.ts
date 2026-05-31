import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type AimsIconName =
  | 'search'
  | 'plus'
  | 'menu'
  | 'chevron-left'
  | 'chevron-right'
  | 'spinner'
  | 'check'
  | 'eye'
  | 'eye-off'
  | 'close'
  | 'upload'
  | 'arrow-right';

@Component({
  selector: 'app-aims-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <i
      [class]="iconClass"
      [style.font-size]="fontSize"
      [style.color]="'currentColor'"
    ></i>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
    `,
  ],
})
export class AimsIconComponent {
  @Input() name!: AimsIconName;
  @Input() size: number | string = 16;

  get fontSize(): string {
    return typeof this.size === 'number' ? `${this.size}px` : this.size;
  }

  get iconClass(): string {
    const map: Record<AimsIconName, string> = {
      search: 'fa-solid fa-magnifying-glass',
      plus: 'fa-solid fa-plus',
      menu: 'fa-solid fa-bars',
      'chevron-left': 'fa-solid fa-chevron-left',
      'chevron-right': 'fa-solid fa-chevron-right',
      spinner: 'fa-solid fa-spinner fa-spin',
      check: 'fa-solid fa-check',
      eye: 'fa-solid fa-eye',
      'eye-off': 'fa-solid fa-eye-slash',
      close: 'fa-solid fa-xmark',
      upload: 'fa-solid fa-upload',
      'arrow-right': 'fa-solid fa-arrow-right',
    };
    return map[this.name] || 'fa-solid fa-circle-question';
  }
}
