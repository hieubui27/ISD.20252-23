import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-manager-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './manager-layout.component.html',
  styleUrls: ['./manager-layout.component.scss'],
})
export class ManagerLayoutComponent {}
