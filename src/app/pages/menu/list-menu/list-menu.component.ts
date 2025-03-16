import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup} from '@angular/forms';

@Component({
    selector: 'app-list-menu',
    templateUrl: './list-menu.component.html',
    styleUrl: './list-menu.component.scss'
})
export class ListMenuComponent implements OnInit {
    searchForm: FormGroup = new FormGroup({});

    constructor(private readonly fb: FormBuilder) {
    }

    ngOnInit() {
    }

    initForm() {
        this.searchForm = this.fb.group({
            keySearch: ['', []]
        })
    }

}
