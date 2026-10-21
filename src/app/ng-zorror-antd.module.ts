/**
 * @Project: Angular-project
 * @Author: CHUNAM
 * @Date: 3/15/2025
 * @Time: 3:47 PM
 * @File: ng-zorror-antd.module.ts
 */
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

// Import các Module NG-ZORRO hiện có và mới
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzCommentModule } from 'ng-zorro-antd/comment';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzTreeViewModule } from 'ng-zorro-antd/tree-view';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzTreeModule } from 'ng-zorro-antd/tree';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';

// CÁC MODULE MỚI THÊM VÀO ĐỂ CHẠY FILE HTML:
import { NzTagModule } from 'ng-zorro-antd/tag';               // Cho <nz-tag>
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';     // Cho nút hành động sửa/xóa
import { NzGridModule } from 'ng-zorro-antd/grid';             // Cho nz-row và nz-col trong Form
import { RouterModule } from '@angular/router';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzUploadModule } from 'ng-zorro-antd/upload';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzCardModule } from 'ng-zorro-antd/card';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        ReactiveFormsModule, // <-- Thêm vào đây
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
        NzPopoverModule,
        NzTreeModule,
        NzLayoutModule,
        NzCollapseModule,
        NzMenuModule,
        NzFormModule,
        NzDrawerModule,
        NzDividerModule,
        NzEmptyModule,
        NzTagModule,        // <-- Thêm vào đây
        NzDropDownModule,   // <-- Thêm vào đây
        NzGridModule,        // <-- Thêm vào đây
        NzUploadModule,
        NzToolTipModule,
        NzBadgeModule,
        NzCardModule
    ],
    exports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule, // <-- Export ra để component con sử dụng
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
        NzDrawerModule,
        NzTreeModule,
        NzPopoverModule,
        NzLayoutModule,
        NzCollapseModule,
        NzMenuModule,
        NzFormModule,
        NzDividerModule,
        NzEmptyModule,
        NzTagModule,        // <-- Export ra ngoài
        NzDropDownModule,   // <-- Export ra ngoài
        NzGridModule,        // <-- Export ra ngoài,
        RouterModule,
        NzUploadModule,
        NzToolTipModule,
        NzBadgeModule,
        NzCardModule
    ]
})
export class ModuleShare { }
