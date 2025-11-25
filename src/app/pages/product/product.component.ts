import {Component, OnInit} from '@angular/core';
import {Product, productRules} from './product.model';
import {createFormGroup} from '../../_utils/common/form-utils';
import {ApiService} from '../../_utils/common/services/api.service';
import {ReactiveFormsModule} from '@angular/forms';

@Component({
    selector: 'app-product',
    imports: [
        ReactiveFormsModule
    ],
    templateUrl: './product.component.html',
    styleUrl: './product.component.scss'
})
export class ProductComponent implements OnInit {
    form = createFormGroup<Product>({id: 1, name: '', price: 0, stock: 0});
    keys = Object.keys(this.form.controls);

    constructor(private api: ApiService) {
    }

    ngOnInit() {
    }

    getError(key: string): string {
        // @ts-ignore
        const control = this.form.controls[key];
        const rule = (productRules as any)[key];
        for (const r of rule) {
            if (r.type === 'required' && control.hasError('required')) return r.message;
            if (r.type === 'min' && control.hasError('min')) return r.message;
            if (r.type === 'max' && control.hasError('max')) return r.message;
            if (r.type === 'pattern' && control.hasError('pattern')) return r.message;
        }
        return '';
    }

    save() {
        if (this.form.valid) {
            console.log('Form submitted:', this.form.value);
            this.api.post<Product>('/api/products', this.form.value).subscribe(console.log);
        }
    }
}
