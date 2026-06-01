import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ProductDetailAdminLogic } from './product-detail-admin.logic';
import { AimsButtonComponent } from '../../../shared/ui/aims-button/aims-button';
import { AimsIconComponent } from '../../../shared/ui/aims-icon/aims-icon';
import { AuthService } from '../../../auth/auth.service';

@Component({
  selector: 'app-product-detail-admin',
  standalone: true,
  imports: [CommonModule, AimsButtonComponent, AimsIconComponent],
  templateUrl: './product-detail-admin.component.html',
  styleUrls: ['./product-detail-admin.component.scss'],
})
export class ProductDetailAdminComponent implements OnInit {
  public logic = inject(ProductDetailAdminLogic);
  private route = inject(ActivatedRoute);
  public authService = inject(AuthService);

  public product$ = this.logic.product$;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.logic.fetchProductDetail(id);
    }
  }
}
