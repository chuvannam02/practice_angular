import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {MenuRoutingModule} from './menu-routing.module';
import {ModuleShare} from '../../ng-zorror-antd.module';
import {ListMenuComponent} from './list-menu/list-menu.component';
import {ReactiveFormsModule} from '@angular/forms';
import {DirectiveModule} from '../../../utils/directive/directive.module';


@NgModule({
    declarations: [
        ListMenuComponent
    ],
    imports: [
        CommonModule,
        MenuRoutingModule,
        ModuleShare,
        ReactiveFormsModule,
        DirectiveModule
    ],
    // bootrap: dùng để khai báo component chính của module này
    bootstrap: [ListMenuComponent]
})
export class MenuModule {
}
