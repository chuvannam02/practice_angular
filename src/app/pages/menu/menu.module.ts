import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {MenuRoutingModule} from './menu-routing.module';
import {ModuleShare} from '../../ng-zorror-antd.module';


@NgModule({
    declarations: [],
    imports: [
        CommonModule,
        MenuRoutingModule,
        ModuleShare
    ]
})
export class MenuModule {
}
