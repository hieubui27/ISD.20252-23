import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmDialogService } from './confirm-dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (confirmService.config$ | async; as config) {
      <div class="modal-overlay">
        <div class="modal-card">
          <div class="icon-container">
            <div class="icon-bg">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  stroke="#C53030"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
          </div>
          <h3 class="modal-title">{{ config.title }}</h3>
          <p class="modal-message">{{ config.message }}</p>
          <div class="modal-actions">
            <button
              class="btn btn-danger"
              (click)="confirmService.respond(true)"
            >
              {{ config.confirmText || 'Delete' }}
            </button>
            <button
              class="btn btn-outline"
              (click)="confirmService.respond(false)"
            >
              {{ config.cancelText || 'Cancel' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      }
      .modal-card {
        background: white;
        border-radius: 12px;
        padding: 24px;
        width: 400px;
        max-width: 90vw;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        text-align: center;
        animation: scaleIn 0.2s ease-out;
      }
      .icon-container {
        display: flex;
        justify-content: center;
        margin-bottom: 16px;
      }
      .icon-bg {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: #fff5f5;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .modal-title {
        font-size: 18px;
        font-weight: 700;
        color: #1a202c;
        margin: 0 0 8px 0;
      }
      .modal-message {
        font-size: 14px;
        color: #4a5568;
        margin: 0 0 24px 0;
        line-height: 1.5;
      }
      .modal-actions {
        display: flex;
        gap: 12px;
      }
      .btn {
        flex: 1;
        padding: 10px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        border: 1px solid transparent;
      }
      .btn-danger {
        background: #c53030;
        color: white;
      }
      .btn-danger:hover {
        background: #9b2c2c;
      }
      .btn-outline {
        background: white;
        color: #4a5568;
        border-color: #e2e8f0;
      }
      .btn-outline:hover {
        background: #f7fafc;
      }
      @keyframes scaleIn {
        from {
          transform: scale(0.95);
          opacity: 0;
        }
        to {
          transform: scale(1);
          opacity: 1;
        }
      }
    `,
  ],
})
export class ConfirmDialogComponent {
  public confirmService = inject(ConfirmDialogService);
}
