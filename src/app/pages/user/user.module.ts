import {NgModule} from '@angular/core';
import {CommonModule, JsonPipe} from '@angular/common';

import {UserRoutingModule} from './user-routing.module';
import {UserComponent} from './user.component';
import {ReactiveFormsModule} from '@angular/forms';
import {NzButtonModule} from 'ng-zorro-antd/button';


@NgModule({
    declarations: [UserComponent],
    imports: [
        CommonModule,
        UserRoutingModule,
        ReactiveFormsModule,
        JsonPipe,
        NzButtonModule, // Import module nút của Antd
    ],
    // bootrap: dùng để khai báo component chính của module này
    bootstrap: [UserComponent]
})
export class UserModule {
}
