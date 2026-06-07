// src/app/payment/payment.ts
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { PaymentPageFacade } from './facades/payment-page.facade';
import { AimsFooterComponent } from '../shared/layout/aims-footer/aims-footer';
import { AimsHeaderComponent } from '../shared/layout/aims-header/aims-header';
import { AimsButtonComponent } from '../shared/ui/aims-button/aims-button';
import { StatusMessageComponent } from '../shared/ui/status-message/status-message';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [
    CommonModule,
    AimsButtonComponent,
    AimsFooterComponent,
    AimsHeaderComponent,
    StatusMessageComponent,
  ],
  providers: [PaymentPageFacade],
  templateUrl: './payment.html',
  styleUrl: './payment.scss',
})
export class PaymentComponent implements OnInit, OnDestroy {
  readonly facade = inject(PaymentPageFacade);
  readonly state$ = this.facade.state$;

  ngOnInit(): void {
    this.facade.initialize();
  }

  ngOnDestroy(): void {
    this.facade.destroy();
  }
}
