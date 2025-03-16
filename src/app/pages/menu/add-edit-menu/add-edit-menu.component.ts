import {Component, inject, OnInit} from '@angular/core';
import {FormGroup, NonNullableFormBuilder, Validators} from '@angular/forms';

@Component({
    selector: 'app-add-edit-menu',
    templateUrl: './add-edit-menu.component.html',
    styleUrl: './add-edit-menu.component.scss'
})
export class AddEditMenuComponent implements OnInit {
    addEditForm: FormGroup = new FormGroup({});
    private readonly fb = inject(NonNullableFormBuilder);
    constructor() {
        this.initForm();
    }
    ngOnInit(): void {
    }

    initForm() {
        this.addEditForm = this.fb.group({
            name: this.fb.control('', {
                validators: [Validators.required],
            }),
            code: this.fb.control('', {
                validators: [Validators.required],
            }),
        });
    }
}
