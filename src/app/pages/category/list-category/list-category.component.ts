import {Component, inject} from '@angular/core';
import {BaseListComponent} from '../../../_utils/common/BaseListComponent.model';
import {ICategoryOptional} from '../category.model';
import {NzModalRef} from 'ng-zorro-antd/modal';
import {FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {TrimDirective} from '../../../_utils/directive/trim.directive';
import {HttpClient} from '@angular/common/http';
import {catchError, delay, firstValueFrom, Observable, of, tap} from 'rxjs';
import {ApiService} from '../../../_utils/common/services/api.service';
import {AsyncPipe} from '@angular/common';
import {ApiResponse, ApiResponseClass} from '../../../_utils/Response.model';
import {User} from '../../user/user.schema';
import {map} from 'rxjs/operators';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

@Component({
    selector: 'app-list-category',
    imports: [
        FormsModule,
        ReactiveFormsModule,
        TrimDirective,
        AsyncPipe
    ],
    templateUrl: './list-category.component.html',
    styleUrl: './list-category.component.scss'
})
export class ListCategoryComponent extends BaseListComponent<ICategoryOptional> {
    posts: any[] | null = [];
    private readonly http = inject(HttpClient); // <--- Inject HttpClient
    // constructor(private apiService: ApiService) {}
    private readonly apiService = inject(ApiService);

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
        this.loadPosts();
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
        const request$ = this.http.get<any[]>('https://jsonplaceholder.typicode.com/photos')
            .pipe(takeUntilDestroyed()) // Tự động hủy khi component destroy
            .pipe(
                // QUAN TRỌNG: Giả lập mạng lag 3 giây để bạn kịp chuyển trang
                // delay(3000),

                // Log này chỉ hiện nếu API chạy xong (không bị huỷ)
                tap(() => console.log('🔥 SERVER: Đã tải xong data từ JSONPlaceholder!'))
            );

        try {
            // 2. Gọi qua hàm xử lý của BaseComponent
            // Nếu component bị destroy trong 3 giây chờ, hàm này sẽ ngắt request
            const data = await firstValueFrom(request$);

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

    // Lấy stream từ Getter của Service
    progress$ = this.apiService.uploadProgress$;

    onFileSelected(file: File) {
        this.apiService.uploadWithProgress('/api/upload', file).subscribe({
            next: (res) => {
                if (res) console.log('Upload xong:', res);
            }
        });
    }

    // Trong Service
    getUser(): Observable<ApiResponseClass<User> | ApiResponseClass<null>> {
        return this.http.get<User>('/api/user').pipe(
            map(data => {
                console.log("CLick !!!");
                console.log("data: ", ApiResponseClass.success(data));
                return ApiResponseClass.success(data);
            }),
            catchError(err => {
                // ❌ LỖI CŨ: Không truyền <User>, TS hiểu là <unknown>
                // return of(ApiResponseClass.error(err.message));

                // ✅ SỬA: Truyền <User> vào để TS hiểu "Lỗi này thuộc về kiểu User"
                // Lúc này data sẽ là null, nhưng type vỏ bọc vẫn là ApiResponseClass<User>
                console.log('error: ', ApiResponseClass.error<User>(err.message))
                return of(ApiResponseClass.error<User>(err.message));
            })
        );
    }

    loadPosts() {
        this.isLoading = true;

        // Gọi method get overload mà bạn đã định nghĩa
        this.apiService.get<any[]>('https://jsonplaceholder.typicode.com/posts')
            .pipe(this.autoUnsubscribe())
            .subscribe((response: ApiResponse<any[]>) => {
                this.posts = response.data;
                this.isLoading = false;
            });
    }
}
