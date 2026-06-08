import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ToastComponent } from './shared/ui/toast/toast.component';
import { ConfirmDialogComponent } from './shared/ui/confirm-dialog/confirm-dialog.component';
import { InputDialogComponent } from './shared/ui/input-dialog/input-dialog.component';

@Component({
  imports: [
    RouterModule,
    ToastComponent,
    ConfirmDialogComponent,
    InputDialogComponent,
  ],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'client';
}
