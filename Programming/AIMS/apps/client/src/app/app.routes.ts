import { Route } from '@angular/router';
import { PaymentComponent } from '../payment/payment';
import { ProductSelectionComponent } from './products/product-selection/product-selection';

export const appRoutes: Route[] = [
  { path: '', redirectTo: 'products', pathMatch: 'full' },
  { path: 'products', component: ProductSelectionComponent },
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth-module').then((m) => m.AuthModule),
  },
  { path: 'payment', component: PaymentComponent },
];
