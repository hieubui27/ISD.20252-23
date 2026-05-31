import { Route } from '@angular/router';
import { ManagerLayoutComponent } from './layout/manager-layout.component';

export const managerRoutes: Route[] = [
  {
    path: '',
    component: ManagerLayoutComponent,
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
