import { Component, inject, OnInit } from '@angular/core';
import {
  RouterOutlet,
  RouterLink,
  RouterLinkActive,
  Router,
} from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth/auth.service';
import { Observable, map, filter } from 'rxjs';
import { NavigationEnd } from '@angular/router';

@Component({
  selector: 'app-manager-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './manager-layout.component.html',
  styleUrls: ['./manager-layout.component.scss'],
})
export class ManagerLayoutComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  isAdmin$: Observable<boolean> = new Observable<boolean>();
  isSidebarOpen = false;

  ngOnInit() {
    this.isAdmin$ = this.authService.user$.pipe(
      map((user) => {
        if (!user || !user.roles) return false;
        return user.roles.includes('Administrator');
      }),
    );

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.closeSidebar();
      });
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar() {
    this.isSidebarOpen = false;
  }

  logout() {
    this.authService.logout().subscribe({
      next: () => {
        this.authService.logoutLocal();
        this.router.navigate(['/auth/login']);
      },
      error: (err) => {
        console.error('Logout failed', err);
        // Fallback to local logout
        this.authService.logoutLocal();
        this.router.navigate(['/auth/login']);
      },
    });
  }
}
