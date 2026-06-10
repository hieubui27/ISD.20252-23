import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss'],
})
export class UserProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private adminService = inject(AdminService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  userForm!: FormGroup;
  userId: string | null = null;
  isEditMode = false;
  isLoading = false;
  isSubmitting = false;

  readonly avatarColors: Record<string, string> = {
    A: '#005fac',
    B: '#e65100',
    C: '#6a1b9a',
    D: '#1a6100',
    E: '#c2185b',
    F: '#00796b',
  };

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.userId;

    this.initForm();

    if (this.isEditMode) {
      this.loadUser();
    }
  }

  initForm(): void {
    this.userForm = this.fb.group({
      userName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      roleNames: [['Administrator']], // Default role
      status: ['ACTIVE'],
      password: [
        '',
        this.isEditMode ? [] : [Validators.required, Validators.minLength(6)],
      ],
    });
  }

  loadUser(): void {
    if (!this.userId) return;

    this.isLoading = true;
    this.cdr.detectChanges();
    this.adminService.getUser(this.userId).subscribe({
      next: (user) => {
        this.userForm.patchValue({
          userName: user.userName,
          email: user.email,
          roleNames: user.roles,
          status: user.status,
          password: '', // Do not populate password
        });
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.toastService.showError('Failed to load user profile');
        this.router.navigate(['/manager/admin/users']);
        this.cdr.detectChanges();
      },
    });
  }

  onSubmit(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formValue = this.userForm.value;

    // Only send password if it's provided
    const payload: any = {
      userName: formValue.userName,
      email: formValue.email,
      roleNames: Array.isArray(formValue.roleNames)
        ? formValue.roleNames
        : [formValue.roleNames],
      status: formValue.status,
    };

    if (formValue.password) {
      payload.password = formValue.password;
    }

    const request$ = this.isEditMode
      ? this.adminService.updateUser(this.userId!, payload)
      : this.adminService.createUser(payload);

    request$.subscribe({
      next: () => {
        this.toastService.showSuccess(
          `User ${this.isEditMode ? 'updated' : 'created'} successfully`,
        );
        this.router.navigate(['/manager/admin/users']);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.toastService.showError(
          err.error?.message ||
            `Failed to ${this.isEditMode ? 'update' : 'create'} user`,
        );
        this.isSubmitting = false;
        this.cdr.detectChanges();
      },
    });
  }

  getInitials(): string {
    const name = this.userForm.get('userName')?.value;
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  getAvatarColor(): string {
    const name = this.userForm.get('userName')?.value;
    const initial = name ? name.charAt(0).toUpperCase() : 'A';
    return this.avatarColors[initial] || '#414752';
  }
}
