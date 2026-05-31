import { Route } from '@angular/router';
import { PaymentComponent } from '../payment/payment';
import { ProductDetailPageComponent } from './features/products/pages/product-detail-page/product-detail-page';
import { ProductListPageComponent } from './features/products/pages/product-list-page/product-list-page';

export const appRoutes: Route[] = [
  { path: '', component: ProductListPageComponent },
  { path: 'products', component: ProductListPageComponent },
  { path: 'products/:id', component: ProductDetailPageComponent },
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth-module').then((m) => m.AuthModule),
  },
  { path: 'payment', component: PaymentComponent },
  { path: '**', redirectTo: '' },
];
