import { Route } from '@angular/router';
import { OrderListComponent } from './pages/order-list/order-list.component';
import { OrderDetailComponent } from './pages/order-detail/order-detail.component';

export const orderManagerRoutes: Route[] = [
  { path: '', component: OrderListComponent },
  { path: ':id', component: OrderDetailComponent },
];
