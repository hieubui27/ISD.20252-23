import { Route } from '@angular/router';

export const adminRoutes: Route[] = [
  {
    path: 'users',
    loadComponent: () =>
      import('./pages/user-list/user-list.component').then(
        (m) => m.UserListComponent,
      ),
  },
  {
    path: 'users/new',
    loadComponent: () =>
      import('./pages/user-profile/user-profile.component').then(
        (m) => m.UserProfileComponent,
      ),
  },
  {
    path: 'users/:id',
    loadComponent: () =>
      import('./pages/user-profile/user-profile.component').then(
        (m) => m.UserProfileComponent,
      ),
  },
  { path: '', redirectTo: 'users', pathMatch: 'full' },
];
