import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputDialogService, InputDialogConfig } from './input-dialog.service';

@Component({
  selector: 'app-input-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (inputService.config$ | async; as config) {
      <div class="modal-overlay">
        <div class="modal-card">
          <div class="icon-container">
            <div class="icon-bg">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  stroke="#005fac"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
          </div>
          <h3 class="modal-title">{{ config.title }}</h3>
          <p class="modal-message">{{ config.message }}</p>

          <div class="input-container">
            <input
              type="text"
              class="modal-input"
              [(ngModel)]="inputValue"
              [placeholder]="config.placeholder || 'Enter value...'"
              (keyup.enter)="submit(config)"
            />
          </div>

          <div class="modal-actions">
            <button
              class="btn btn-primary"
              [disabled]="config.requireInput && !inputValue.trim()"
              (click)="submit(config)"
            >
              {{ config.confirmText || 'Submit' }}
            </button>
            <button class="btn btn-outline" (click)="cancel()">
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
        background: #e6f3ff;
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
        margin: 0 0 16px 0;
        line-height: 1.5;
      }
      .input-container {
        margin-bottom: 24px;
      }
      .modal-input {
        width: 100%;
        padding: 12px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        font-size: 14px;
        color: #1a202c;
        outline: none;
        box-sizing: border-box;
        transition: border-color 0.2s;
      }
      .modal-input:focus {
        border-color: #005fac;
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
        transition: all 0.2s;
      }
      .btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .btn-primary {
        background: #005fac;
        color: white;
      }
      .btn-primary:hover:not(:disabled) {
        background: #004b8a;
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
export class InputDialogComponent {
  public inputService = inject(InputDialogService);
  public inputValue = '';

  submit(config: InputDialogConfig) {
    if (config.requireInput && !this.inputValue.trim()) {
      return;
    }
    this.inputService.respond(this.inputValue);
    this.inputValue = '';
  }

  cancel() {
    this.inputService.respond(null);
    this.inputValue = '';
  }
}
