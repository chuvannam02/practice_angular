import {Component, inject} from '@angular/core';
import {BaseListComponent} from '../../../_utils/common/BaseListComponent.model';
import {ICategoryOptional} from '../category.model';
import {NzModalRef} from 'ng-zorro-antd/modal';
import {FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {TrimDirective} from '../../../_utils/directive/trim.directive';
import {HttpClient} from '@angular/common/http';
import {delay, tap} from 'rxjs';

@Component({
  selector: 'app-list-category',
    imports: [
        FormsModule,
        ReactiveFormsModule,
        TrimDirective
    ],
  templateUrl: './list-category.component.html',
  styleUrl: './list-category.component.scss'
})
export class ListCategoryComponent extends BaseListComponent<ICategoryOptional> {
    private readonly http = inject(HttpClient); // <--- Inject HttpClient

    constructor() {
        super();

        this.searchForm = this.fb.group({
            name: ['', Validators.required],
            email: ['', Validators.required],
            age: [0, Validators.required],
        });
    }

    delete(data: Partial<ICategoryOptional> | ICategoryOptional): void {
        console.log('Delete category:', data);
    }

    getFromSearch(): ICategoryOptional {
        return undefined as unknown as ICategoryOptional;
    }

    ngOnInit(): Promise<void> | void {
        return undefined;
    }

    resetForm(): void {
    }

    override onSearch(): void {
        super.onSearch();
        console.log("data: ", this.searchForm.getRawValue());
    }

    save(data: Partial<ICategoryOptional> | ICategoryOptional, modal: NzModalRef, setLoading: (...args: any) => any, afterSave: (...args: any) => void, closeModal: boolean): Promise<void> {
        console.log('Save category:', data);
        return Promise.resolve(undefined);
    }

    showModal(data: Partial<ICategoryOptional> | ICategoryOptional): void {
        console.log('Edit category:', data);
    }

    showModalView(data: Partial<ICategoryOptional> | ICategoryOptional, view: boolean): void {
        console.log('View category:', data, 'View mode:', view);
    }

    override async search(): Promise<void> {
        this.isLoading = true;
        console.log('🚀 CLIENT: Bắt đầu gọi API JSONPlaceholder...');

        // 1. Tạo Observable gọi API thật
        const request$ = this.http.get<any[]>('https://jsonplaceholder.typicode.com/photos').pipe(
            // QUAN TRỌNG: Giả lập mạng lag 3 giây để bạn kịp chuyển trang
            delay(3000),

            // Log này chỉ hiện nếu API chạy xong (không bị huỷ)
            tap(() => console.log('🔥 SERVER: Đã tải xong data từ JSONPlaceholder!'))
        );

        try {
            // 2. Gọi qua hàm xử lý của BaseComponent
            // Nếu component bị destroy trong 3 giây chờ, hàm này sẽ ngắt request
            const data = await this.firstValueFromUntilDestroyed(request$);

            // 3. Nếu không bị huỷ thì code xuống đây
            this.data = data.slice(0, 10); // Lấy 10 dòng đầu demo
            console.log('✅ CLIENT: Render dữ liệu ra màn hình:', this.data.length, 'bản ghi');

        } catch (error: any) {
            // BaseComponent thường sẽ trả về default value [] chứ không throw lỗi nếu bị destroy (tuỳ config của bạn)
            // Nếu throw lỗi thì check ở đây
            console.warn('⚠️ CLIENT: Có lỗi hoặc API đã bị huỷ:', error);
        } finally {
            this.isLoading = false;
        }
    }
}
