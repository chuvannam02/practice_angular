import {
    AfterViewInit,
    ChangeDetectorRef,
    Component,
    inject,
    OnInit,
    signal,
    ViewChild,
} from '@angular/core';
import { AsyncPipe, CommonModule, DecimalPipe } from '@angular/common';
import {
    BehaviorSubject,
    catchError,
    debounceTime,
    delay,
    distinctUntilChanged,
    lastValueFrom,
    Observable,
    of,
    shareReplay,
    switchMap,
} from 'rxjs';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { HighlightPipe } from '../../_utils/pipe/highlight.pipe';
import {
    injectQuery,
    keepPreviousData,
} from '@tanstack/angular-query-experimental';
import { HttpClient, HttpParams } from '@angular/common/http';
import { NzTableComponent } from 'ng-zorro-antd/table';
import { NzSpinComponent } from 'ng-zorro-antd/spin';
import { NzOptionComponent, NzSelectComponent } from 'ng-zorro-antd/select';
import { map } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { AlertService } from '../../_utils/common/notification/AlertService';
import { IconPickerComponent } from '../../_utils/common/icons/icon-picker/icon-picker.component';
import { NgIcon } from '@ng-icons/core';

type Item = {
    id: number;
    name: string;
};

// Định nghĩa Interface cho dữ liệu trả về từ API
interface RandomUserResponse {
    results: MockUser[];
}

interface MockUser {
    name: {
        first: string;
        last: string;
    };
    login: {
        uuid: string; // Dùng làm ID duy nhất
    };
    email: string;
}

@Component({
    selector: 'app-unit',
    imports: [
        CommonModule,
        DecimalPipe,
        AsyncPipe,
        ScrollingModule,
        HighlightPipe,
        NzTableComponent,
        NzSpinComponent,
        NzSelectComponent,
        NzOptionComponent,
        FormsModule,
        IconPickerComponent,
        NgIcon,
    ],
    templateUrl: './unit.component.html',
    styleUrl: './unit.component.scss',
})
export class UnitComponent implements OnInit {
    private readonly http = inject(HttpClient);

    private readonly notification = inject(AlertService);

    private readonly cdr = inject(ChangeDetectorRef);

    constructor() {
        this.searchResults$ = this.searchTerm$.pipe(
            debounceTime(400),
            distinctUntilChanged(),
            switchMap((term) => {
                console.log(
                    `%c 🛰️ API: Đang tìm kiếm "${term}" trong 1000 sản phẩm...`,
                    'color: #ff9800; font-weight: bold',
                );
                return this.fakeApiCall(term);
            }),
            // ✅ Cache logic
            shareReplay({
                bufferSize: 1,
                refCount: true,
                windowTime: 180000, // 3 phút tự hủy cache
            }),
        );
    }

    ngOnInit(): void {
        this.loadMore();
    }

    onOpen(open: boolean) {
        if (open && this.optionList.length === 0) {
            this.loadMore();
        }
    }

    items: Item[] = [
        { id: 1, name: 'Học Angular' },
        { id: 2, name: 'Học React' },
        { id: 3, name: 'Học Vue' },
        { id: 4, name: 'Học Node.js' },
        { id: 5, name: 'Học NestJS' },
        { id: 6, name: 'Học Docker' },
        { id: 7, name: 'Học Kubernetes' },
        { id: 8, name: 'Học AWS' },
        { id: 9, name: 'Học TypeScript' }, // Mục tiêu thay đổi
        { id: 10, name: 'Học MongoDB' },
    ];

    refreshList() {
        this.notification.success('Thử nghiệm thôi mà!');
        console.log('Đang làm mới danh sách...');
        // Giả lập dữ liệu mới trả về từ API
        this.items = [
            { id: 1, name: 'Học Angular' },
            { id: 2, name: 'Học React' },
            { id: 3, name: 'Học Vue' },
            { id: 4, name: 'Học Node.js' },
            { id: 5, name: 'Học NestJS' },
            { id: 6, name: 'Học Docker' },
            { id: 7, name: 'Học Kubernetes' },
            { id: 8, name: 'Học AWS' },
            { id: 9, name: 'Học TypeScript - ĐÃ CẬP NHẬT' }, // Chỉ dòng này thay đổi
            { id: 10, name: 'Học MongoDB' },
        ];
    }

    // Hàm trackBy
    trackById(index: number, item: Item) {
        return item.id;
    }

    // 1. Biến private để xử lý logic luồng (stream)
    private readonly searchTerm$ = new BehaviorSubject<string>('');

    // 2. Biến public để Template có thể đọc được (Sửa lỗi bạn đang gặp)
    public searchTerm = '';

    // Tạo 1000 sản phẩm giả lập
    private readonly MOCK_PRODUCTS = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        name: `Sản phẩm ${i + 1}`,
        price: Math.floor(Math.random() * 1000000),
        code: `SKU-${Math.random().toString(36).substring(7).toUpperCase()}`,
    }));

    public searchResults$: Observable<any[]>;

    private fakeApiCall(term: string): Observable<any[]> {
        if (!term.trim()) return of([]);

        // Giả lập tìm kiếm filter trên 1000 bản ghi
        const results = this.MOCK_PRODUCTS.filter(
            (p) =>
                p.name.toLowerCase().includes(term.toLowerCase()) ||
                p.code.toLowerCase().includes(term.toLowerCase()),
        );

        return of(results).pipe(delay(600)); // Giả lập lag mạng 0.6s
    }

    onSearch(event: Event) {
        const element = event.target as HTMLInputElement;
        const term = element.value;

        // Cập nhật biến string để Pipe "highlight" nhận được giá trị mới nhất
        this.searchTerm = term;

        // Đẩy giá trị vào Subject để kích hoạt debounceTime/switchMap
        this.searchTerm$.next(term);
    }

    // 1. Quản lý State trang bằng Signal
    pageIndex = signal(1);
    pageSize = signal(5);

    // 2. Khai báo Query
    query = injectQuery(() => ({
        // Khi pageIndex() thay đổi, queryKey thay đổi -> Tự động fetch lại
        queryKey: ['users', this.pageIndex(), this.pageSize()],

        queryFn: async () => {
            // JSONPlaceholder hỗ trợ query params: _page và _limit
            const url = `https://jsonplaceholder.typicode.com/users?_page=${this.pageIndex()}&_limit=${this.pageSize()}`;
            return await lastValueFrom(this.http.get<any[]>(url));
        },

        staleTime: 5 * 60 * 1000, // 5 phút data "tươi"
        placeholderData: keepPreviousData, // Giữ data cũ khi đang tải data mới
    }));

    onPageIndexChange(index: number) {
        this.pageIndex.set(index);
    }

    onPageSizeChange(size: number) {
        // 3. Cập nhật Signal
        this.pageSize.set(size);

        // (Optional) Best Practice: Thường khi đổi pageSize, nên reset về trang 1
        // để tránh trường hợp đang ở trang 10 mà đổi size lớn lên thì trang 10 không còn dữ liệu.
        this.pageIndex.set(1);
    }

    readonly randomUserUrl = 'https://randomuser.me/api/';

    optionList: MockUser[] = [];
    selectedUser: string | null = null;
    isLoading = false;

    // Quản lý phân trang
    pageIndexSelect = 1;
    pageSizeSelect = 10;
    // Seed giúp randomuser.me trả về danh sách nhất quán giữa các trang
    readonly seed = 'angular19-test';

    trackByIdV1(index: number, item: MockUser): string {
        return item.login.uuid;
    }

    loadMore(): void {
        // Chặn gọi trùng lặp khi đang tải
        if (this.isLoading) {
            return;
        }

        this.isLoading = true;
        this.cdr.detectChanges();

        this.getUsers(
            this.pageIndexSelect,
            this.pageSizeSelect,
            this.seed,
        ).subscribe({
            next: (newUsers) => {
                // Nối dữ liệu mới (Immutable update)
                this.optionList = [...this.optionList, ...newUsers];
                this.pageIndexSelect++;
                this.isLoading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.isLoading = false;
            },
        });
    }

    getUsers(
        page: number,
        results: number,
        seed: string,
    ): Observable<MockUser[]> {
        const params = new HttpParams()
            .append('page', page)
            .append('results', results)
            .append('seed', seed) // Quan trọng: Giữ data giống nhau qua các lần gọi
            .append('inc', 'name,email,login'); // Chỉ lấy trường cần thiết để nhẹ payload

        return this.http
            .get<RandomUserResponse>(this.randomUserUrl, { params })
            .pipe(
                map((res) => res.results),
                catchError(() => of([])),
            );
    }

    // Biến lưu icon đang chọn
    selectedIconName = '';

    // Hàm xử lý khi người dùng chọn xong icon từ Modal
    onIconSaved(iconName: string) {
        console.log('Component cha nhận được:', iconName);
        this.selectedIconName = iconName;

        // Tại đây bạn có thể set vào Form
        // this.myForm.controls['icon'].setValue(iconName);
    }

    saveMenuToDb() {
        // Gửi this.selectedIconName lên API
        const payload = {
            label: 'New Menu',
            icon: this.selectedIconName,
        };
        console.log('Saving to DB:', payload);
    }
}
