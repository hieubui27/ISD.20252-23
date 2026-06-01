import { Route } from '@angular/router';

export const productManagerRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./product-list/product-list.component').then(
        (m) => m.ProductListComponent,
      ),
  },
  {
    path: 'add',
    loadComponent: () =>
      import('./product-form/product-form.component').then(
        (m) => m.ProductFormComponent,
      ),
  },
  {
    path: 'edit/:id',
    loadComponent: () =>
      import('./product-form/product-form.component').then(
        (m) => m.ProductFormComponent,
      ),
  },
  {
    path: 'view/:id',
    loadComponent: () =>
      import('./product-detail/product-detail-admin.component').then(
        (m) => m.ProductDetailAdminComponent,
      ),
  },
  {
    path: 'history',
    loadComponent: () =>
      import('./product-history/product-history.component').then(
        (m) => m.ProductHistoryComponent,
      ),
  },
];
