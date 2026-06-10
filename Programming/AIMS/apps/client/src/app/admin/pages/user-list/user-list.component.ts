import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AdminService, User, UserFilters } from '../../services/admin.service';
import { AimsPaginationComponent } from '../../../shared/ui/aims-pagination/aims-pagination';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, RouterModule, AimsPaginationComponent],
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss'],
})
export class UserListComponent implements OnInit {
  private adminService = inject(AdminService);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  users: User[] = [];
  totalUsers = 0;
  totalPages = 1;

  filters: UserFilters = {
    page: 1,
    limit: 10,
    search: '',
    status: 'All',
  };

  searchSubject = new Subject<string>();
  isLoading = false;

  readonly avatarColors: Record<string, string> = {
    A: '#005fac',
    B: '#e65100',
    C: '#6a1b9a',
    D: '#1a6100',
    E: '#c2185b',
    F: '#00796b',
  };

  ngOnInit(): void {
    this.loadUsers();

    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((searchTerm) => {
        this.filters.search = searchTerm;
        this.filters.page = 1;
        this.loadUsers();
      });
  }

  loadUsers(): void {
    this.isLoading = true;
    this.cdr.detectChanges();
    this.adminService.getUsers(this.filters).subscribe({
      next: (res) => {
        this.users = res.data;
        this.totalUsers = res.total;
        this.totalPages = Math.ceil(this.totalUsers / this.filters.limit);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.toastService.showError('Failed to load users');
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchSubject.next(target.value);
  }

  onPageChange(page: number): void {
    this.filters.page = page;
    this.loadUsers();
  }

  getInitials(name: string): string {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  getAvatarColor(name: string): string {
    const initial = name ? name.charAt(0).toUpperCase() : 'A';
    return this.avatarColors[initial] || '#414752';
  }

  goToProfile(id: string): void {
    this.router.navigate(['/manager/admin/users', id]);
  }

  deleteUser(id: string, event: Event): void {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this user?')) {
      this.adminService.deleteUser(id).subscribe({
        next: () => {
          this.toastService.showSuccess('User deleted successfully');
          this.loadUsers();
        },
        error: () => {
          this.toastService.showError('Failed to delete user');
        },
      });
    }
  }
}
