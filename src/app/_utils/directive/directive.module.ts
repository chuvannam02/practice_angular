/**
 * @Project: Angular-project
 * @Author: CHUNAM
 * @Date: 3/16/2025
 * @Time: 11:30 AM
 * @File: directive.module.ts
 */
import {NgModule} from '@angular/core';
import {TrimDirective} from './trim.directive';

@NgModule({
    imports: [TrimDirective],
    exports: [TrimDirective]
})
export class DirectiveModule {
}
