import { Route } from '@angular/router';
import { RefundListComponent } from './pages/refund-list/refund-list.component';
import { RefundDetailComponent } from './pages/refund-detail/refund-detail.component';

export const refundManagerRoutes: Route[] = [
  { path: '', component: RefundListComponent },
  { path: ':id', component: RefundDetailComponent },
];
