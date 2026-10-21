/**
 * @Project: Angular-project
 * @Author: CHUNAM
 * @Date: 3/16/2025
 * @Time: 11:19 AM
 * @File: pipe.module.ts
 */
import {NgModule} from '@angular/core';
import {HighlightPipe} from './highlight.pipe';

@NgModule({
    imports: [HighlightPipe],
    exports: [HighlightPipe]
})
export class PipeModule {
}
