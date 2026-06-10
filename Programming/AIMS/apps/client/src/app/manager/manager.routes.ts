import { Route } from '@angular/router';
import { ManagerLayoutComponent } from './layout/manager-layout.component';
import { authGuard } from '../core/guards/auth.guard';
import { roleGuard } from '../core/guards/role.guard';

export const managerRoutes: Route[] = [
  {
    path: '',
    component: ManagerLayoutComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Product Manager', 'Administrator'] },
    children: [
      {
        path: 'products',
        canActivate: [roleGuard],
        data: { roles: ['Product Manager'] },
        loadChildren: () =>
          import('./products/product-manager.routes').then(
            (m) => m.productManagerRoutes,
          ),
      },
      {
        path: 'orders',
        canActivate: [roleGuard],
        data: { roles: ['Product Manager'] },
        loadChildren: () =>
          import('./orders/order-manager.routes').then(
            (m) => m.orderManagerRoutes,
          ), // TS Server should pick this up
      },
      {
        path: 'admin',
        canActivate: [roleGuard],
        data: { roles: ['Administrator'] },
        loadChildren: () =>
          import('../admin/admin.routes').then((m) => m.adminRoutes),
      },
      { path: '', redirectTo: 'products', pathMatch: 'full' },
    ],
  },
];
