import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductListLogic } from './product-list.logic';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule],
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
