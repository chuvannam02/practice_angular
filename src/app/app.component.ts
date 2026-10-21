import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';
import {
    EMPTY,
    Observable,
    Subject,
    defer,
    delay,
    distinctUntilChanged,
    exhaustMap,
    finalize,
    map,
    of,
    switchMap,
    takeUntil,
    timer,
} from 'rxjs';

interface DemoCategory {
    id: number;
    name: string;
    code: string;
    group: string;
}
interface KeysetResponse {
    items: DemoCategory[];
    nextLastId: number | null;
    hasMore: boolean;
}

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        NzEmptyModule,
        NzSelectModule,
        NzSpinModule,
        NzTagModule,
    ],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, OnDestroy {
    readonly minSearchLength = 3;
    readonly pageSize = 20;
    keyword = '';
    selectedCategoryId: number | null = null;
    selectedCategory: DemoCategory | null = null;
    categories: DemoCategory[] = [];
    isSearching = false;
    isLoadingMore = false;
    hasSearched = false;
    hasMore = false;
    hasLoadedOnce = false;
    private lastId: number | null = null;
    private searchVersion = 0;
    private readonly searchRequests$ = new Subject<string>();
    private readonly loadMore$ = new Subject<void>();
    private readonly destroy$ = new Subject<void>();
    private readonly database: DemoCategory[] = Array.from(
        { length: 137 },
        (_, index) => {
            const id = index + 1;
            const names = [
                'Điện tử',
                'Gia dụng',
                'Thời trang',
                'Mỹ phẩm',
                'Sách',
                'Thực phẩm',
                'Văn phòng phẩm',
            ];
            const groups = ['Hàng tiêu dùng', 'Kho tổng', 'Khuyến mại'];
            return {
                id,
                name: `${names[index % names.length]} ${id}`,
                code: `CAT-${String(id).padStart(4, '0')}`,
                group: groups[index % groups.length],
            };
        },
    );

    ngOnInit(): void {
        this.searchRequests$
            .pipe(
                distinctUntilChanged(),
                switchMap((keyword) => this.searchFirstPage(keyword)),
                takeUntil(this.destroy$),
            )
            .subscribe(({ response, version }) => {
                if (version !== this.searchVersion) return;
                this.categories = response.items;
                this.lastId = response.nextLastId;
                this.hasMore = response.hasMore;
                this.hasLoadedOnce = true;
            });
        this.loadMore$
            .pipe(
                exhaustMap(() => this.loadNextPage()),
                takeUntil(this.destroy$),
            )
            .subscribe(({ response, version }) => {
                if (version !== this.searchVersion) return;
                this.categories = [...this.categories, ...response.items];
                this.lastId = response.nextLastId;
                this.hasMore = response.hasMore;
            });
    }
    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
    get selectedCategoryOutsideResults(): DemoCategory | null {
        const selected = this.selectedCategory;
        return selected && !this.categories.some((item) => item.id === selected.id)
            ? selected
            : null;
    }
    onDropdownOpen(isOpen: boolean): void {
        // Từ khóa rỗng luôn tải trang đầu, kể cả khi nz-select tự xóa ô tìm kiếm.
        if (isOpen && !this.hasLoadedOnce && !this.isSearching)
            this.searchRequests$.next('');
    }
    onSearch(keyword: string): void {
        const normalized = keyword.trim();
        if (normalized === this.keyword) return;
        this.keyword = normalized;
        this.searchRequests$.next(normalized);
    }
    onModelChange(value: number | null): void {
        // Angular có thể emit null lúc khởi tạo; chỉ clear nếu user đã chọn rồi bấm X.
        const hadSelection = this.selectedCategoryId !== null;
        this.selectedCategoryId = value;
        this.selectedCategory =
            value === null
                ? null
                : this.categories.find((item) => item.id === value) ??
                  (this.selectedCategory?.id === value
                      ? this.selectedCategory
                      : null);
        if (value === null && hadSelection) this.clearSearch();
    }
    clearSearch(): void {
        this.onSearch('');
    }
    onDropdownScrollToBottom(): void {
        if (!this.isSearching && !this.isLoadingMore && this.hasMore)
            this.loadMore$.next();
    }

    private searchFirstPage(
        keyword: string,
    ): Observable<{ response: KeysetResponse; version: number }> {
        const version = ++this.searchVersion;
        this.categories = [];
        this.lastId = null;
        this.hasMore = false;
        this.hasSearched =
            keyword.length === 0 || keyword.length >= this.minSearchLength;
        if (!this.hasSearched) {
            this.isSearching = false;
            return EMPTY;
        }
        this.isSearching = true;
        // Hủy request cũ ngay khi đổi từ khóa; chỉ trì hoãn lời gọi tìm kiếm mới.
        return (keyword.length === 0 ? of(0) : timer(350)).pipe(
            switchMap(() => this.fakeKeysetApi$(keyword, null)),
            map((response) => ({ response, version })),
            finalize(() => {
                if (version === this.searchVersion) this.isSearching = false;
            }),
        );
    }
    private loadNextPage(): Observable<{
        response: KeysetResponse;
        version: number;
    }> {
        if (this.isSearching || this.isLoadingMore || !this.hasMore)
            return EMPTY;
        this.isLoadingMore = true;
        const version = this.searchVersion;
        return this.fakeKeysetApi$(this.keyword, this.lastId).pipe(
            takeUntil(this.searchRequests$),
            map((response) => ({ response, version })),
            finalize(() => (this.isLoadingMore = false)),
        );
    }
    // Spring Boot: WHERE id > :lastId ORDER BY id LIMIT :pageSizePlusOne.
    private fakeKeysetApi$(
        keyword: string,
        lastId: number | null,
    ): Observable<KeysetResponse> {
        return defer(() => {
            const normalized = keyword.toLocaleLowerCase();
            const matched = this.database.filter((item) =>
                `${item.name} ${item.code} ${item.group}`
                    .toLocaleLowerCase()
                    .includes(normalized),
            );
            const afterLastId =
                lastId === null
                    ? matched
                    : matched.filter((item) => item.id > lastId);
            const fetched = afterLastId.slice(0, this.pageSize + 1);
            const hasMore = fetched.length > this.pageSize;
            const items = hasMore ? fetched.slice(0, this.pageSize) : fetched;
            return of({
                items,
                nextLastId: items.length ? items[items.length - 1].id : lastId,
                hasMore,
            }).pipe(delay(700));
        });
    }
}
