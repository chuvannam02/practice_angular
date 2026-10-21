import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    DestroyRef,
    EmbeddedViewRef,
    TemplateRef,
    ViewChild,
    ViewContainerRef,
    computed,
    inject,
    signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { CalculationCounts, LabMetrics, normalizeLabText } from './lab-metrics';
import { LabNormalizePipe } from './lab-normalize.pipe';
import { LazyReportComponent } from './lazy-report.component';
import { LifecycleTickerComponent } from './lifecycle-ticker.component';
import { ModalFocusComponent } from '../modal-focus/modal-focus.component';
import { OptimisticUxComponent } from '../optimistic-ux/optimistic-ux.component';
import { LargeListComponent } from '../heavy-data/large-list.component';
import { FolderBrowserComponent } from '../heavy-data/folder-browser.component';
import { WorkflowLabComponent } from '../workflow-ux/workflow-lab.component';

interface LabPerson {
    id: number;
    name: string;
    department: string;
}

interface DetailContext {
    $implicit: LabPerson;
    viewId: number;
}

@Component({
    selector: 'app-frontend-lab',
    standalone: true,
    imports: [CommonModule, FormsModule, NzButtonModule, NzInputModule,
        LabNormalizePipe, LazyReportComponent, LifecycleTickerComponent, ModalFocusComponent, OptimisticUxComponent,
        LargeListComponent, FolderBrowserComponent, WorkflowLabComponent],
    providers: [LabMetrics],
    templateUrl: './frontend-lab.component.html',
    styleUrl: './frontend-lab.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FrontendLabComponent {
    readonly people: LabPerson[] = [
        { id: 1, name: 'Nguyễn An', department: 'Kinh doanh' },
        { id: 2, name: 'Trần Bình', department: 'Kỹ thuật' },
    ];
    appendViewCount = 0;
    reuseViewCount = 0;
    isViewDetached = false;
    selectedPerson: LabPerson | null = null;

    readonly text = signal('  Angular NG-ZORRO  ');
    readonly normalizedComputed = computed(() => {
        this.metrics.computed++;
        return normalizeLabText(this.text());
    });
    calculationResult: CalculationCounts | null = null;
    calculationMessage = 'Chọn một thí nghiệm để đo số lần tính toán.';
    tickerOpen = false;
    tickerSnapshot = 0;

    readonly sampleSource = Array.from({ length: 250 }, (_, index) =>
        `export const item${index} = { name: "Angular NG-ZORRO", enabled: true };\n`,
    ).join('') + '.demo-card { display: flex; gap: 12px; padding: 16px; border-radius: 12px; }\n'.repeat(250);
    readonly sampleBytes = new TextEncoder().encode(this.sampleSource).byteLength;
    isCompressing = false;
    compressionError = '';
    compressionResult: { bytes: number; savedPercent: number } | null = null;

    readonly viewCode = `// Tạo view chưa gắn, sau đó chèn vào container.
const view = template.createEmbeddedView({ $implicit: row, viewId: 1 });
container.insert(view);

// Hoặc tạo và gắn cùng lúc.
const view = container.createEmbeddedView(template, context);

// Cập nhật view hiện có, tránh tạo thêm mỗi lần chọn.
view.context.$implicit = nextRow;
view.markForCheck();

container.clear();   // Hủy các view đang gắn.
container.detach();  // Gỡ nhưng CHƯA hủy; giữ lại để insert sau.
// View đã detach mà không dùng nữa: view.destroy().`;

    readonly calculationCode = `// Hàm: được gọi khi Angular kiểm tra biểu thức này.
{{ normalizeWithMethod(text()) }}

// Pure pipe: tính lại khi input thay đổi.
{{ text() | labNormalize }}

// Computed: cache theo những signal đã đọc.
normalized = computed(() => normalizeText(this.text()));
{{ normalized() }}

// Với mảng/object, cập nhật tham chiếu để pure pipe nhận thay đổi.
this.rows = this.rows.map(row => row.id === id ? { ...row, enabled } : row);`;

    readonly cleanupCode = `private readonly destroyRef = inject(DestroyRef);

ngOnInit() {
  interval(500).pipe(
    takeUntilDestroyed(this.destroyRef)
  ).subscribe(() => this.ticks.update(value => value + 1));
}
// Hủy component bằng @if/*ngIf → subscription dừng.
// Chỉ ẩn bằng CSS → component còn sống, timer vẫn chạy.`;

    readonly lazyCode = `@defer (on interaction(loadReportButton)) {
  <app-lazy-report />
} @placeholder {
  <p>Báo cáo chưa được tải.</p>
}
// Component standalone chỉ được dùng trong @defer này.
// Mở DevTools → Network → lọc JS → bấm tải lần đầu.`;

    readonly buildCode = `// angular.json → configurations.production
{
  "optimization": true,
  "namedChunks": false,
  "outputHashing": "all",
  "sourceMap": false,
  "aot": true
}

ng build --configuration production --stats-json

// Chỉ đăng ký icon cần dùng, tránh giữ toàn bộ bộ icon.
import { SearchOutline, LoadingOutline } from '@ant-design/icons-angular/icons';
export const icons = [SearchOutline, LoadingOutline];`;

    readonly gzipCode = `# Nginx: nén response khi phục vụ ứng dụng.
gzip on;
gzip_vary on;
gzip_comp_level 6;
gzip_min_length 1024;
gzip_types text/css application/javascript application/json image/svg+xml;

# Nếu đã có file .gz và Nginx hỗ trợ module:
# gzip_static on;

# Network → response header: Content-Encoding: gzip
# Tạo file .br không tự bật Brotli trên server.`;

    @ViewChild('detailTemplate', { static: true })
    private detailTemplate!: TemplateRef<DetailContext>;
    @ViewChild('appendSlot', { read: ViewContainerRef, static: true })
    private appendHost!: ViewContainerRef;
    @ViewChild('reuseSlot', { read: ViewContainerRef, static: true })
    private reuseHost!: ViewContainerRef;

    private readonly metrics = inject(LabMetrics);
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly destroyRef = inject(DestroyRef);
    private reusedView?: EmbeddedViewRef<DetailContext>;
    private nextViewId = 0;
    private inputRevision = 0;
    private isDestroyed = false;

    constructor() {
        this.destroyRef.onDestroy(() => {
            this.isDestroyed = true;
            // A detached view is no longer owned by the container.
            if (this.isViewDetached && this.reusedView && !this.reusedView.destroyed) {
                this.reusedView.destroy();
            }
        });
    }

    showPerson(person: LabPerson): void {
        this.selectedPerson = person;
        // Keep the intentionally accumulating example bounded.
        if (this.appendHost.length >= 5) this.appendHost.remove(0);
        const extra = this.detailTemplate.createEmbeddedView({
            $implicit: person, viewId: ++this.nextViewId,
        });
        this.appendHost.insert(extra);
        this.appendViewCount = this.appendHost.length;

        if (!this.reusedView || this.reusedView.destroyed) {
            this.reusedView = this.reuseHost.createEmbeddedView(this.detailTemplate, {
                $implicit: person, viewId: ++this.nextViewId,
            });
        } else {
            this.reusedView.context.$implicit = person;
            if (this.isViewDetached) this.reuseHost.insert(this.reusedView);
            this.reusedView.markForCheck();
        }
        this.isViewDetached = false;
        this.reuseViewCount = this.reuseHost.length;
    }

    toggleDetachedView(): void {
        if (!this.reusedView || this.reusedView.destroyed) return;
        if (this.isViewDetached) {
            this.reuseHost.insert(this.reusedView);
        } else {
            this.reuseHost.detach(this.reuseHost.indexOf(this.reusedView));
        }
        this.isViewDetached = !this.isViewDetached;
        this.reuseViewCount = this.reuseHost.length;
    }

    clearViews(): void {
        this.appendHost.clear();
        this.reuseHost.clear();
        if (this.reusedView && !this.reusedView.destroyed) this.reusedView.destroy();
        this.reusedView = undefined;
        this.isViewDetached = false;
        this.selectedPerson = null;
        this.appendViewCount = 0;
        this.reuseViewCount = 0;
    }

    normalizeWithMethod(value: string): string {
        // Counts are captured after the experiment, not bound live during checking.
        this.metrics.method++;
        return normalizeLabText(value);
    }

    runChecks(changeInput = false): void {
        this.cdr.detectChanges(); // Warm up all three bindings first.
        const before = this.metrics.snapshot();
        if (changeInput) this.text.set(`  Angular lần ${++this.inputRevision}  `);
        const passes = changeInput ? 1 : 10;
        for (let index = 0; index < passes; index++) this.cdr.detectChanges();
        const after = this.metrics.snapshot();
        this.calculationResult = {
            method: after.method - before.method,
            pipe: after.pipe - before.pipe,
            computed: after.computed - before.computed,
        };
        this.calculationMessage = changeInput
            ? 'Đổi input, đo 1 lượt kiểm tra: cả ba cách cần tính lại.'
            : 'Giữ input, đo 10 lượt kiểm tra: pure pipe và computed dùng lại kết quả.';
    }

    toggleTicker(): void {
        this.tickerOpen = !this.tickerOpen;
        this.captureTicks();
    }

    captureTicks(): void {
        this.tickerSnapshot = this.metrics.timerTicks;
    }

    async compressSample(): Promise<void> {
        if (this.isCompressing) return;
        this.isCompressing = true;
        this.compressionError = '';
        this.compressionResult = null;
        try {
            if (!('CompressionStream' in globalThis)) {
                throw new Error('Trình duyệt này chưa hỗ trợ CompressionStream.');
            }
            const stream = new Blob([this.sampleSource]).stream()
                .pipeThrough(new CompressionStream('gzip'));
            const compressed = await new Response(stream).blob();
            if (this.isDestroyed) return;
            this.compressionResult = {
                bytes: compressed.size,
                savedPercent: Math.round((1 - compressed.size / this.sampleBytes) * 1000) / 10,
            };
        } catch (error) {
            if (this.isDestroyed) return;
            this.compressionError = error instanceof Error ? error.message : 'Không nén được mẫu dữ liệu.';
        } finally {
            if (!this.isDestroyed) {
                this.isCompressing = false;
                this.cdr.markForCheck();
            }
        }
    }
}
