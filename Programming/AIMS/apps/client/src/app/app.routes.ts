import { Route } from '@angular/router';
import { PaymentComponent } from '../payment/payment';

export const appRoutes: Route[] = [
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth-module').then((m) => m.AuthModule),
  },
  { path: 'payment', component: PaymentComponent },
];
