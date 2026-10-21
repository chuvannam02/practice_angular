import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { Subject, asapScheduler, debounceTime, distinctUntilChanged, finalize, observeOn, switchMap, takeUntil, timer } from 'rxjs';
import { processInFrames } from './frame-batch';

interface LargeRow { id: number; name: string; group: string; searchText: string; }
function normalize(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().trim();
}

@Component({
    selector: 'app-large-list-demo',
    standalone: true,
    imports: [ScrollingModule, FormsModule, NzButtonModule, NzCheckboxModule, NzInputModule, NzProgressModule],
    templateUrl: './large-list.component.html',
    styleUrl: './heavy-data.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LargeListComponent implements AfterViewInit {
    readonly rows = signal<LargeRow[]>([]);
    readonly selectedIds = signal<ReadonlySet<number>>(new Set());
    readonly query = signal('');
    readonly appliedQuery = signal('');
    readonly loading = signal(false);
    readonly progress = signal(0);
    readonly feedback = signal('Chưa tạo dữ liệu. Demo chỉ cấp phát khi bạn bấm nút.');
    readonly probeCount = signal(0);
    readonly range = signal({ start: 0, end: 0 });
    readonly filtering = computed(() => normalize(this.query()) !== this.appliedQuery());
    readonly filteredRows = computed(() => {
        const query = this.appliedQuery();
        return query ? this.rows().filter(row => row.searchText.includes(query)) : this.rows();
    });
    private readonly destroyRef = inject(DestroyRef);
    private readonly queries$ = new Subject<string>();
    private readonly cancel$ = new Subject<void>();

    @ViewChild(CdkVirtualScrollViewport, { static: true }) viewport!: CdkVirtualScrollViewport;

    readonly code = `// Virtual scroll giới hạn DOM, không giới hạn dữ liệu tải về/RAM.
<cdk-virtual-scroll-viewport [itemSize]="52">
  <div *cdkVirtualFor="let row of rows; trackBy: trackById">...</div>
</cdk-virtual-scroll-viewport>

// State phải theo ID; view của virtual scroll có thể được tái sử dụng.
selectedIds = signal<ReadonlySet<number>>(new Set());

// Chuẩn hóa searchText khi nhận dữ liệu, debounce truy vấn.
// Dataset lớn hơn: lọc/phân trang qua API, không tải hết rồi mới virtualize.
// Công việc CPU nhỏ: chia batch, nhường frame, cho phép hủy.
// Một JSON.parse/sort khổng lồ không được chia nhỏ bằng setTimeout bọc ngoài;
// cân nhắc Web Worker và giới hạn dữ liệu/chi phí truyền message.`;

    constructor() {
        this.queries$.pipe(debounceTime(200), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
            .subscribe(value => {
                this.appliedQuery.set(value);
                this.viewport.scrollToIndex(0);
            });
    }

    ngAfterViewInit(): void {
        this.viewport.renderedRangeStream.pipe(observeOn(asapScheduler), takeUntilDestroyed(this.destroyRef))
            .subscribe(range => this.range.set(range));
    }

    load(): void {
        if (this.loading()) return;
        const draft: LargeRow[] = [];
        this.loading.set(true);
        this.progress.set(0);
        this.feedback.set('Đang chờ dữ liệu giả lập rồi chuẩn hóa theo từng batch…');
        timer(450).pipe(
            switchMap(() => processInFrames(20000, index => {
                const id = index + 1;
                const name = `Hồ sơ ${String(id).padStart(5, '0')}`;
                const group = `Nhóm ${index % 20 + 1}`;
                draft.push({ id, name, group, searchText: normalize(`${name} ${group}`) });
            })),
            takeUntil(this.cancel$), takeUntilDestroyed(this.destroyRef),
            finalize(() => this.loading.set(false)),
        ).subscribe({
            next: ({ processed, total }) => {
                this.progress.set(Math.round(processed * 100 / total));
                if (processed === total) {
                    this.rows.set(draft);
                    this.feedback.set('Đã tạo 20.000 bản ghi. Chỉ các dòng trong viewport và buffer được gắn vào DOM.');
                }
            },
            error: () => this.feedback.set('Không tạo được dữ liệu. Danh sách cũ được giữ lại; bạn có thể thử lại.'),
        });
    }

    cancelLoad(): void {
        this.cancel$.next();
        this.feedback.set('Đã hủy tạo dữ liệu. Danh sách và lựa chọn trước đó được giữ nguyên.');
    }

    clear(): void {
        this.cancel$.next();
        this.rows.set([]);
        this.selectedIds.set(new Set());
        this.search('');
        this.appliedQuery.set('');
        this.progress.set(0);
        this.feedback.set('Đã bỏ tham chiếu dữ liệu và lựa chọn; bộ nhớ được thu hồi theo cơ chế GC của trình duyệt.');
    }

    search(value: string): void {
        this.query.set(value);
        this.queries$.next(normalize(value));
    }

    select(id: number, checked: boolean): void {
        this.selectedIds.update(previous => {
            const next = new Set(previous);
            if (checked) next.add(id);
            else next.delete(id);
            return next;
        });
    }

    selectFiltered(): void {
        this.selectedIds.update(previous => new Set([...previous, ...this.filteredRows().map(row => row.id)]));
    }

    jumpToEnd(): void { this.viewport.scrollToIndex(this.filteredRows().length - 1); }
    probe(): void { this.probeCount.update(value => value + 1); }
    clearSelection(): void { this.selectedIds.set(new Set()); }
    trackById(_index: number, row: LargeRow): number { return row.id; }
}
