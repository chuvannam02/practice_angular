import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {WelcomeRoutingModule} from './welcome-routing.module';
import {ModuleShare} from '../../ng-zorror-antd.module';
import {WelcomeComponent} from './welcome.component';


@NgModule({
    declarations: [WelcomeComponent],
    exports: [WelcomeComponent],
    providers: [], // Add your service here if you need.
    imports: [
        CommonModule,
        WelcomeRoutingModule,
        ModuleShare
    ],
})
export class WelcomeModule {
}
