// src/app/payment/payment.ts
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { PaymentPageFacade } from '../app/payment/facades/payment-page.facade';
import { AimsFooterComponent } from '../app/shared/layout/aims-footer/aims-footer';
import { AimsHeaderComponent } from '../app/shared/layout/aims-header/aims-header';
import { AimsButtonComponent } from '../app/shared/ui/aims-button/aims-button';
import { StatusMessageComponent } from '../app/shared/ui/status-message/status-message';

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
