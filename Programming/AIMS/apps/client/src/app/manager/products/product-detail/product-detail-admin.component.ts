import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ProductDetailAdminLogic } from './product-detail-admin.logic';

@Component({
  selector: 'app-product-detail-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-detail-admin.component.html',
  styleUrls: ['./product-detail-admin.component.scss'],
})
export class ProductDetailAdminComponent implements OnInit {
  public logic = inject(ProductDetailAdminLogic);
  private route = inject(ActivatedRoute);

  public product$ = this.logic.product$;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.logic.fetchProductDetail(id);
    }
  }
}
