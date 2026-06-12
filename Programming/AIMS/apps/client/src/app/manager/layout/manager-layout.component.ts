import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth/auth.service';
import { Observable, map } from 'rxjs';

@Component({
  selector: 'app-manager-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './manager-layout.component.html',
  styleUrls: ['./manager-layout.component.scss'],
})
export class ManagerLayoutComponent implements OnInit {
  private authService = inject(AuthService);
  isAdmin$: Observable<boolean> = new Observable<boolean>();

  ngOnInit() {
    this.isAdmin$ = this.authService.user$.pipe(
      map((user) => {
        if (!user || !user.roles) return false;
        return user.roles.includes('Administrator');
      }),
    );
  }
}
