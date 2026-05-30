import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export type StatusMessageTone = 'info' | 'success' | 'error';

@Component({
  selector: 'app-status-message',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-message.html',
  styleUrl: './status-message.scss',
})
export class StatusMessageComponent {
  @Input() tone: StatusMessageTone = 'info';
}
