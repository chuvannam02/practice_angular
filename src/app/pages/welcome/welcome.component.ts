import {Component} from '@angular/core';
import {NzModalService} from 'ng-zorro-antd/modal';

@Component({
    selector: 'app-welcome',
    templateUrl: './welcome.component.html',
    styleUrl: './welcome.component.scss',
    standalone: false
})
export class WelcomeComponent {
    constructor(private readonly nzModalService: NzModalService) {
    }
}
