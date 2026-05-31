import { Route } from '@angular/router';
import { PaymentComponent } from '../payment/payment';
import { DeliveryComponent } from './place-order/delivery/delivery';
import { OrderResultComponent } from './place-order/order-result/order-result';
import { ProductSelectionComponent } from './products/product-selection/product-selection';

export const appRoutes: Route[] = [
  { path: '', redirectTo: 'products', pathMatch: 'full' },
  { path: 'products', component: ProductSelectionComponent },
  { path: 'delivery', component: DeliveryComponent },
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth-module').then((m) => m.AuthModule),
  },
  { path: 'payment', component: PaymentComponent },
  { path: 'order-result', component: OrderResultComponent },
];
