import { Route } from '@angular/router';
import { PaymentComponent } from '../payment/payment';
import { ProductDetailPageComponent } from './features/products/pages/product-detail-page/product-detail-page';
import { ProductListPageComponent } from './features/products/pages/product-list-page/product-list-page';
import { DeliveryComponent } from './place-order/delivery/delivery';
import { OrderResultComponent } from './place-order/order-result/order-result';
import { ProductSelectionComponent } from './products/product-selection/product-selection';

export const appRoutes: Route[] = [
  { path: '', redirectTo: 'products', pathMatch: 'full' },
  { path: 'product-catalog', component: ProductListPageComponent },
  { path: 'products', component: ProductSelectionComponent },
  { path: 'products/:id', component: ProductDetailPageComponent },
  { path: 'delivery', component: DeliveryComponent },
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth-module').then((m) => m.AuthModule),
  },
  {
    path: 'manager',
    loadChildren: () =>
      import('./manager/manager.routes').then((m) => m.managerRoutes),
  },
  { path: 'payment', component: PaymentComponent },
  { path: 'order-result', component: OrderResultComponent },
];
