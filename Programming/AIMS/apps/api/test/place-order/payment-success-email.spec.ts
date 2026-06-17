import {
  ORDER_STATUS_PENDING_PAYMENT,
  ORDER_STATUS_PENDING_PROCESSING,
} from '../../src/place-order/constants/place-order.constants';
import {
  IOrderRepository,
  PersistedOrderDetail,
} from '../../src/place-order/domain/ports/order-repository.port';
import { InvoiceCalculator } from '../../src/place-order/domain/services/invoice-calculator.service';
import { OrderEventPublisher } from '../../src/place-order/domain/services/order-event-publisher';
import { OrderStateFactory } from '../../src/place-order/domain/states/order-state.factory';
import { EmailNotificationObserver } from '../../src/place-order/infrastructure/adapter/email-notification.observer';
import { PlaceOrderPaymentAdapter } from '../../src/place-order/infrastructure/adapter/place-order-payment.adapter';
import { WeightBasedShippingStrategy } from '../../src/place-order/infrastructure/adapter/weight-based-shipping.strategy';
import { MailService } from '../../src/mail/mail.service';
import { PaidOrderContext } from '../../src/payment/ports/place-order-payment.port';

/**
 * Proves the "payment succeeds -> confirmation e-mail" behaviour end-to-end
 * through the real Observer chain (OrderEventPublisher + EmailNotificationObserver),
 * with only MailService and the repository mocked. No real SMTP / Gmail needed.
 */
describe('Payment success -> confirmation email', () => {
  let adapter: PlaceOrderPaymentAdapter;
  let publisher: OrderEventPublisher;
  let sendMail: jest.Mock;
  let repository: jest.Mocked<
    Pick<IOrderRepository, 'findOrderDetailByOrderId' | 'applyPaidTransition'>
  >;

  const buildOrder = (
    overrides: Partial<PersistedOrderDetail> = {},
  ): PersistedOrderDetail => ({
    orderId: 'order-1',
    status: ORDER_STATUS_PENDING_PAYMENT,
    customerName: 'Nguyen Van A',
    phoneNumber: '0981413168',
    email: 'buyer@example.com',
    streetAddress: '1 Dai Co Viet',
    province: 'Hanoi',
    subtotal: 90000,
    deliveryFee: 22000,
    invoice: { id: 'inv-1', vatSubtotal: 99000, totalAmount: 121000 },
    lines: [
      {
        productId: 1,
        quantity: 1,
        price: 90000,
        title: 'Clean Code',
        weightGrams: 500,
      },
    ],
    ...overrides,
  });

  const context: PaidOrderContext = {
    orderId: 'order-1',
    invoiceId: 'inv-1',
    paymentMethod: 'VIETQR',
    amount: 121000, // must equal Math.round(order.invoice.totalAmount)
    transactionId: 'TXN-123',
    transactionContent: 'Purchase of Media Product',
    transactionDateTime: new Date('2026-03-16T10:00:00Z'),
  };

  // Awaits the fire-and-forget publish the adapter kicks off with `void`.
  const flushNotifications = async (
    publishSpy: jest.SpyInstance,
  ): Promise<void> => {
    await Promise.all(publishSpy.mock.results.map((result) => result.value));
  };

  beforeEach(() => {
    sendMail = jest.fn().mockResolvedValue(undefined);
    const mailService = { sendMail } as unknown as MailService;

    // Real Observer wiring, only the e-mail transport is faked.
    const observer = new EmailNotificationObserver(mailService);
    publisher = new OrderEventPublisher([observer]);

    repository = {
      findOrderDetailByOrderId: jest.fn(),
      applyPaidTransition: jest.fn(),
    };

    adapter = new PlaceOrderPaymentAdapter(
      repository as unknown as IOrderRepository,
      new OrderStateFactory(),
      new InvoiceCalculator(new WeightBasedShippingStrategy()),
      publisher,
    );
  });

  it('sends a confirmation email to the email entered in the delivery form', async () => {
    repository.findOrderDetailByOrderId.mockResolvedValue(buildOrder());
    repository.applyPaidTransition.mockResolvedValue(
      buildOrder({ status: ORDER_STATUS_PENDING_PROCESSING }),
    );
    const publishSpy = jest.spyOn(publisher, 'publish');

    await adapter.markPaidAndPendingProcessing(context);
    await flushNotifications(publishSpy);

    // Stock is decremented exactly once.
    expect(repository.applyPaidTransition).toHaveBeenCalledTimes(1);

    // E-mail goes to the customer's address with the right subject.
    expect(sendMail).toHaveBeenCalledTimes(1);
    const sent = sendMail.mock.calls[0][0];
    expect(sent.recipientEmail).toEqual(['buyer@example.com']);
    expect(sent.subject).toContain('TXN-123');
  });

  it('renders the customer + transaction fields into the email body', async () => {
    repository.findOrderDetailByOrderId.mockResolvedValue(buildOrder());
    repository.applyPaidTransition.mockResolvedValue(
      buildOrder({ status: ORDER_STATUS_PENDING_PROCESSING }),
    );
    const publishSpy = jest.spyOn(publisher, 'publish');

    await adapter.markPaidAndPendingProcessing(context);
    await flushNotifications(publishSpy);

    const html: string = sendMail.mock.calls[0][0].html;
    expect(html).toContain('Nguyen Van A'); // customer name
    expect(html).toContain('0981413168'); // phone number
    expect(html).toContain('Hanoi'); // province
    expect(html).toContain('1 Dai Co Viet'); // address
    expect(html).toContain('TXN-123'); // transaction id
    expect(html).toContain('Purchase of Media Product'); // transaction content
  });

  it('does not send an email when the order has no email', async () => {
    repository.findOrderDetailByOrderId.mockResolvedValue(buildOrder());
    repository.applyPaidTransition.mockResolvedValue(
      buildOrder({ status: ORDER_STATUS_PENDING_PROCESSING, email: '' }),
    );
    const publishSpy = jest.spyOn(publisher, 'publish');

    await adapter.markPaidAndPendingProcessing(context);
    await flushNotifications(publishSpy);

    expect(sendMail).not.toHaveBeenCalled();
  });

  it('is idempotent: a duplicate payment callback does not decrement stock twice', async () => {
    // Order is already PENDING_PROCESSING (callback fired a second time).
    repository.findOrderDetailByOrderId.mockResolvedValue(
      buildOrder({ status: ORDER_STATUS_PENDING_PROCESSING }),
    );
    const publishSpy = jest.spyOn(publisher, 'publish');

    await adapter.markPaidAndPendingProcessing(context);
    await flushNotifications(publishSpy);

    // State pattern short-circuits the transition: stock is NOT touched again.
    expect(repository.applyPaidTransition).not.toHaveBeenCalled();
    // The customer is still notified.
    expect(sendMail).toHaveBeenCalledTimes(1);
  });
});
