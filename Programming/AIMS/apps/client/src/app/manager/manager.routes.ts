import { Route } from '@angular/router';
import { ManagerLayoutComponent } from './layout/manager-layout.component';
import { authGuard } from '../core/guards/auth.guard';
import { roleGuard } from '../core/guards/role.guard';

export const managerRoutes: Route[] = [
  {
    path: '',
    component: ManagerLayoutComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Product Manager'] },
    children: [
      {
        path: 'products',
        loadChildren: () =>
          import('./products/product-manager.routes').then(
            (m) => m.productManagerRoutes,
          ),
      },
      { path: '', redirectTo: 'products', pathMatch: 'full' },
    ],
  },
];
