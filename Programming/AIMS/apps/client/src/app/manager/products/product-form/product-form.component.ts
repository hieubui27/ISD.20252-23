import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ProductFormLogic } from './product-form.logic';
import { ProductFormFactory } from './product-form.factory';
import { AimsButtonComponent } from '../../../shared/ui/aims-button/aims-button';
import { AimsIconComponent } from '../../../shared/ui/aims-icon/aims-icon';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AimsButtonComponent,
    AimsIconComponent,
  ],
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.scss'],
  providers: [ProductFormLogic],
})
export class ProductFormComponent implements OnInit {
  public logic = inject(ProductFormLogic);
  public formFactory = inject(ProductFormFactory);
  private route = inject(ActivatedRoute);

  public isEditMode$ = this.logic.isEditMode$;
  public form = this.logic.form;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.logic.initForm(id);
  }
}
