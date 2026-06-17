// src/app/payment/payment.ts
import { CommonModule } from '@angular/common';
import {
  Component,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
  inject,
} from '@angular/core';
import { PaymentActionBarComponent } from './components/payment-action-bar/payment-action-bar';
import { PaymentMethodSelectorComponent } from './components/payment-method-selector/payment-method-selector';
import { PaymentPageFacade } from './facades/payment-page.facade';
import { PaypalPaymentPageFlowService } from './flows/paypal-payment-page-flow.service';
import { VietQrPaymentPageFlowService } from './flows/vietqr-payment-page-flow.service';
import { PaymentCompletionService } from './services/payment-completion.service';
import { PendingPaymentSessionService } from './services/pending-payment-session.service';
import { PaymentPageStateStore } from './stores/payment-page-state.store';
import { AimsFooterComponent } from '../shared/layout/aims-footer/aims-footer';
import { AimsHeaderComponent } from '../shared/layout/aims-header/aims-header';
import { StatusMessageComponent } from '../shared/ui/status-message/status-message';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [
    CommonModule,
    AimsFooterComponent,
    AimsHeaderComponent,
    PaymentActionBarComponent,
    PaymentMethodSelectorComponent,
    StatusMessageComponent,
  ],
  providers: [
    PaymentPageFacade,
    PaymentCompletionService,
    PaymentPageStateStore,
    PendingPaymentSessionService,
    PaypalPaymentPageFlowService,
    VietQrPaymentPageFlowService,
  ],
  templateUrl: './payment.html',
  styleUrl: './payment.scss',
  encapsulation: ViewEncapsulation.None,
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
