import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTableModule } from 'ng-zorro-antd/table';
import { EMPTY, Subject, catchError, defer, finalize, map, of, switchMap, tap, timer } from 'rxjs';

export interface FolderItem { id: string; name: string; depth: number; hasChildren: boolean; }
interface FolderPage { items: FolderItem[]; total: number; }
interface BrowseRequest { path: FolderItem[]; page: number; force: boolean; }
type FakeProblem = 'none' | 'network' | 'cycle';
const ROOT: FolderItem = { id: 'root', name: 'Tất cả thư mục', depth: 0, hasChildren: true };

@Component({
    selector: 'app-folder-browser-demo',
    standalone: true,
    imports: [FormsModule, NzButtonModule, NzPaginationModule, NzSelectModule, NzSkeletonModule, NzTableModule],
    templateUrl: './folder-browser.component.html',
    styleUrl: './heavy-data.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FolderBrowserComponent {
    readonly pageSize = 20;
    readonly cacheLimit = 8;
    readonly started = signal(false);
    readonly path = signal<FolderItem[]>([ROOT]);
    readonly page = signal(1);
    readonly items = signal<FolderItem[]>([]);
    readonly total = signal(0);
    readonly loading = signal(false);
    readonly loaded = signal(false);
    readonly cancelled = signal(false);
    readonly error = signal('');
    readonly nextProblem = signal<FakeProblem>('none');
    readonly requestCount = signal(0);
    readonly cacheHits = signal(0);
    readonly cacheSize = signal(0);
    readonly current = computed(() => this.path()[this.path().length - 1]);
    private readonly cache = new Map<string, FolderPage>();
    private readonly requests$ = new Subject<BrowseRequest | null>();
    private readonly destroyRef = inject(DestroyRef);
    private pendingKey: string | null = null;

    readonly code = `// Duyệt từng cấp + phân trang: chỉ dựng tối đa 20 dòng mỗi lần.
// Breadcrumb là đường dẫn điều hướng, không phải component đệ quy.
requests$.pipe(
  switchMap(request => defer(() => {
    // Bắt đầu loading ở đây, sau finalize của request bị hủy.
    // Tra cache parentId + page; thiếu thì gọi API.
    return api.children(parentId, page, 20).pipe(
      catchError(error => { /* hiện lỗi + thử lại, không kết thúc requests$ */ }),
      finalize(() => loading.set(false))
    );
  })),
  takeUntilDestroyed()
);
// Cache LRU tối đa 8 trang. Reload chủ động bỏ qua cache.
// Kiểm tra ID trùng / trỏ về tổ tiên trước khi cache và render.
// Với cây expand/collapse thực: tải con khi mở node, phân trang theo parent,
// flatten các node đang mở và dùng nz-tree virtual scroll.`;

    constructor() {
        this.requests$.pipe(
            switchMap(request => request ? defer(() => {
                const parent = request.path[request.path.length - 1];
                const key = `${parent.id}::${request.page}`;
                this.pendingKey = key;
                this.loading.set(true);
                this.loaded.set(false);
                this.cancelled.set(false);
                this.error.set('');
                this.items.set([]);
                this.total.set(0);
                const cached = request.force ? undefined : this.cache.get(key);
                if (cached) {
                    this.cache.delete(key);
                    this.cache.set(key, cached);
                    this.cacheHits.update(value => value + 1);
                }
                const problem = this.nextProblem();
                if (!cached) {
                    // A failed refresh must not leave an obsolete cached page available.
                    if (request.force) this.cache.delete(key);
                    this.cacheSize.set(this.cache.size);
                    this.nextProblem.set('none');
                    this.requestCount.update(value => value + 1);
                }
                const response$ = cached ? of(cached) : timer(parent.depth === 0 ? 400 : 700).pipe(map(() => {
                    if (problem === 'network') throw new Error('Tải thất bại (lỗi mạng giả lập). Bấm Thử lại để tiếp tục.');
                    const result = this.makePage(parent, request.page);
                    if (problem === 'cycle') result.items = [{ ...parent, name: 'Nhánh trỏ về tổ tiên (giả lập)' }, ...result.items];
                    this.validatePage(result, request.path);
                    this.remember(key, result);
                    return result;
                }));
                return response$.pipe(
                    tap(result => {
                        this.items.set(result.items);
                        this.total.set(result.total);
                        this.loaded.set(true);
                    }),
                    catchError((error: unknown) => {
                        this.error.set(error instanceof Error ? error.message : 'Không tải được dữ liệu. Hãy thử lại.');
                        return EMPTY;
                    }),
                    finalize(() => { this.pendingKey = null; this.loading.set(false); }),
                );
            }) : EMPTY),
            takeUntilDestroyed(this.destroyRef),
        ).subscribe();
    }

    start(): void { this.navigate([ROOT], 1); }

    open(item: FolderItem): void {
        if (!item.hasChildren) return;
        if (this.path().some(ancestor => ancestor.id === item.id)) {
            this.error.set('Đã chặn nhánh trỏ về tổ tiên để tránh vòng lặp.');
            return;
        }
        this.navigate([...this.path(), item], 1);
    }

    ancestor(index: number): void { this.navigate(this.path().slice(0, index + 1), 1); }
    changePage(page: number): void { this.navigate(this.path(), page); }
    reload(): void { this.navigate(this.path(), this.page(), true); }

    clearCache(): void {
        this.cache.clear();
        this.cacheSize.set(0);
        if (this.started()) this.reload();
    }

    cancel(): void {
        this.requests$.next(null);
        this.cancelled.set(true);
    }

    private navigate(path: FolderItem[], page: number, force = false): void {
        const key = `${path[path.length - 1].id}::${page}`;
        if (!force && this.pendingKey === key) return;
        this.started.set(true);
        this.path.set(path);
        this.page.set(page);
        this.requests$.next({ path, page, force });
    }

    private makePage(parent: FolderItem, page: number): FolderPage {
        // Generate one page only; never allocate a full recursive tree.
        const total = parent.id.endsWith('/7') ? 0 : 73;
        const start = (page - 1) * this.pageSize;
        return {
            total,
            items: Array.from({ length: Math.max(0, Math.min(this.pageSize, total - start)) }, (_, index) => {
                const number = start + index + 1;
                const hasChildren = parent.depth < 7 && number % 5 !== 0;
                return {
                    id: `${parent.id}/${number}`, name: `${hasChildren ? 'Thư mục' : 'Tài liệu'} ${number}`,
                    depth: parent.depth + 1, hasChildren,
                };
            }),
        };
    }

    private validatePage(result: FolderPage, path: FolderItem[]): void {
        const ancestors = new Set(path.map(item => item.id));
        const seen = new Set<string>();
        for (const item of result.items) {
            if (ancestors.has(item.id) || seen.has(item.id)) {
                throw new Error('Dữ liệu có ID trùng hoặc nhánh trỏ về tổ tiên. Đã chặn vòng lặp; bấm Thử lại.');
            }
            seen.add(item.id);
        }
    }

    private remember(key: string, page: FolderPage): void {
        this.cache.delete(key);
        this.cache.set(key, page);
        if (this.cache.size > this.cacheLimit) this.cache.delete(this.cache.keys().next().value!);
        this.cacheSize.set(this.cache.size);
    }
}
