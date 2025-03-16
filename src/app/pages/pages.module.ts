import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {PagesRoutingModule} from './pages-routing.module';
import {PagesComponent} from './pages.component';
import {ModuleShare} from '../ng-zorror-antd.module';


@NgModule({
    declarations: [PagesComponent],
    imports: [
        CommonModule,
        PagesRoutingModule,
        ModuleShare
    ],
    exports: [PagesComponent],
})
export class PagesModule {
}
