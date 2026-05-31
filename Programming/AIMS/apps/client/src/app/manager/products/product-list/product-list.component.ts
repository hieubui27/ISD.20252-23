import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductListLogic } from './product-list.logic';
import { AimsButtonComponent } from '../../../shared/ui/aims-button/aims-button';
import { AimsIconComponent } from '../../../shared/ui/aims-icon/aims-icon';
import { AimsPaginationComponent } from '../../../shared/ui/aims-pagination/aims-pagination';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule,
    AimsButtonComponent,
    AimsIconComponent,
    AimsPaginationComponent,
  ],
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss'],
})
export class ProductListComponent implements OnInit {
  public logic = inject(ProductListLogic);
  public products$ = this.logic.products$;

  ngOnInit(): void {
    this.logic.fetchProducts();
  }
}
