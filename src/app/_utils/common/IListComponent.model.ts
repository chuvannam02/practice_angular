// @typescript-eslint/ no-explicit-any
import {FormGroup} from '@angular/forms';
import {NzModalRef} from 'ng-zorro-antd/modal';

/**
 * @Project: practice_angular
 * @Author: CHUNAM
 * @Date: 11/28/2025
 * @Time: 3:53 AM
 * @File: IListComponent.model.ts
 */
export interface IListComponentModel<T> {
    // --- BẮT BUỘC (Class phải có) ---
    isLoading: boolean;
    data: T[];
    size: number;
    page: number;
    total: number;
    searchForm: FormGroup;

    search(): void;

    // --- KHÔNG BẮT BUỘC (Optional - Có dấu ?) ---
    // Các class implement interface này có thể bỏ qua không viết các hàm dưới đây

    pageSizeOptions?: number[];

    trackByFn?(index: number, item: T): string | number;

    resetForm?(): void;

    onChangePage?(page: number): void;

    onChangePageSize?(size: number): void;

    getFromSearch?(): T;

    onSearch?(): void;

    showModal?(data: Partial<T> | T, ...args: any[]): void;

    showModalView?(data: Partial<T> | T, view: boolean): void;

    // Hàm save phức tạp có thể optional nếu màn hình chỉ là View (chỉ xem)
    save?(
        data: Partial<T> | T,
        modal: NzModalRef,
        setLoading: (...args: any) => any,
        afterSave: (...args: any) => void,
        closeModal: boolean
    ): Promise<void>;

    delete?(data: Partial<T> | T, ...args: any): void;

    onClickSwitch?(data: Partial<T> | T, index: number): void;

    export?(type: number): void;

    keyEvent?(event: KeyboardEvent): void;
}

// --- VÍ DỤ CÁCH SỬ DỤNG INTERFACE ---
// Class này chỉ cần khai báo những cái bắt buộc, bỏ qua export, keyEvent...
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class ProductListComponent implements IListComponentModel<any> {
    isLoading = false;
    data = [];
    size = 10;
    page = 1;
    total = 0;
    searchForm!: FormGroup;

    search() {
        console.log('Searching...');
    }

    // Không cần viết hàm export() vẫn không bị báo lỗi
}
