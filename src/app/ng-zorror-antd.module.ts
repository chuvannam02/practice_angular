/**
 * @Project: Angular-project
 * @Author: CHUNAM
 * @Date: 3/15/2025
 * @Time: 3:47 PM
 * @File: ng-zorror-antd.module.ts
 */
import {NgModule} from '@angular/core';
import {NzButtonModule} from 'ng-zorro-antd/button';
import {NzTableModule} from 'ng-zorro-antd/table';
import {NzIconModule} from 'ng-zorro-antd/icon';
import {NzInputModule} from 'ng-zorro-antd/input';
import {NzCheckboxModule} from 'ng-zorro-antd/checkbox';
import {NzSelectModule} from 'ng-zorro-antd/select';
import {NzDatePickerModule} from 'ng-zorro-antd/date-picker';
import {NzCommentModule} from 'ng-zorro-antd/comment';
import {NzModalModule} from 'ng-zorro-antd/modal';
import {NzTreeModule} from 'ng-zorro-antd/tree';
import {NzBreadCrumbModule} from 'ng-zorro-antd/breadcrumb';
import {NzTreeViewModule} from 'ng-zorro-antd/tree-view';
import {NzLayoutModule} from 'ng-zorro-antd/layout';
import {NzCollapseModule} from 'ng-zorro-antd/collapse';
import {NzMenuModule} from 'ng-zorro-antd/menu';

@NgModule({
    imports: [
        NzButtonModule,
        NzTableModule,
        NzIconModule,
        NzInputModule,
        NzCheckboxModule,
        NzSelectModule,
        NzDatePickerModule,
        NzCommentModule,
        NzModalModule,
        NzTreeViewModule,
        NzBreadCrumbModule,
        NzTreeModule,
        NzLayoutModule,
        NzCollapseModule,
        NzMenuModule
    ],
    exports: [
        NzButtonModule,
        NzTableModule,
        NzIconModule,
        NzInputModule,
        NzCheckboxModule,
        NzSelectModule,
        NzDatePickerModule,
        NzCommentModule,
        NzModalModule,
        NzTreeViewModule,
        NzBreadCrumbModule,
        NzTreeModule,
        NzLayoutModule,
        NzCollapseModule,
        NzMenuModule
    ]
})
export class ModuleShare {
}
