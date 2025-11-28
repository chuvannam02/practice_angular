import {FormBuilder, FormGroup} from '@angular/forms';
import {Directive, HostListener, inject, ViewContainerRef} from '@angular/core';
import {BaseComponent} from './BaseComponent';
import {NzModalRef} from 'ng-zorro-antd/modal';
import {AlertService} from './notification/AlertService';

/**
 * @Project: practice_angular
 * @Author: CHUNAM
 * @Date: 11/28/2025
 * @Time: 3:54 AM
 * @File: BaseListComponent.model.ts
 */
@Directive()
export abstract class BaseListComponent<T> extends BaseComponent {
    // Lúc này BaseListComponent đã có sẵn destroy$, nzModalService từ cha
    isLoading = false;

    data: T[] = [];
    size = 10;
    page = 1
    total = 0;
    pageSizeOptions: number[] = [10, 20, 50, 100];

    protected readonly fb: FormBuilder = inject(FormBuilder);
    protected readonly notification: AlertService = inject(AlertService);
    protected readonly viewContainerRef = inject(ViewContainerRef);
    searchForm: FormGroup = this.fb.group({});

    // 4. ABSTRACT METHODS (Bắt buộc class con phải tự viết logic)
    // Mỗi màn hình có cách gọi API search/save/delete khác nhau nên để abstrac
    // abstract ngOnInit(): Promise<void>;
    abstract ngOnInit(): Promise<void> | void;

    trackByFn(index: number, item: T extends { id: number | string } ? {
        id: number | string
    } : never): string | number {
        return item.id || index.toString();
    }

    abstract resetForm(): void;

    // abstract search(): void;
    search(): void {
        this.page = 1;
        this.onSearch();
    };

    onChangePage(page: number): void {
        this.page = page;
        this.onSearch();
    }

    onChangePageSize(size: number): void {
        this.size = size;
        this.page = 1;
        this.onSearch();
    }

    abstract getFromSearch(): T;

    // abstract onSearch(): void;
    onSearch(): void {
        this.isLoading = true;
    };

    abstract showModal(data: Partial<T> | T, ...args: any[]): void;

    abstract showModalView(data: Partial<T> | T, view: boolean): void;

    abstract save(data: Partial<T> | T,
                  modal: NzModalRef,
                  setLoading: (...args: any) => any,
                  afterSave: (...args: any) => void,
                  closeModal: boolean): Promise<void>;

    abstract delete(data: Partial<T> | T, ...args: any): void;

    @HostListener('document:keypress', ['$event'])
    keyEvent(event: KeyboardEvent) {
        if (event.keyCode === 13) {
            // this.onSearch();
        }
    }

    // Override lại ngOnDestroy để đảm bảo cả logic của cha và con đều chạy
    override ngOnDestroy(): void {
        super.ngOnDestroy(); // Gọi logic destroy$ của BaseComponent
    }
}
