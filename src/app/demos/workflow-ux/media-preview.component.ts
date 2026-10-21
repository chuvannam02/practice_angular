import { DOCUMENT, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, Injector, TemplateRef, ViewChild, afterNextRender, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule, NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { take } from 'rxjs';
import { demoPdf } from './demo-pdf';
import { InViewOnceDirective } from '../../_utils/directive/in-view-once.directive';

interface Preview { kind: 'image' | 'pdf'; url: string; safeUrl?: SafeResourceUrl; name: string; }

@Component({
    selector: 'app-media-preview-demo',
    standalone: true,
    imports: [NgOptimizedImage, NzButtonModule, NzModalModule, InViewOnceDirective],
    providers: [NzModalService],
    templateUrl: './media-preview.component.html',
    styleUrl: './workflow-ux.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaPreviewComponent {
    readonly pictures = [1, 2, 3, 4, 5, 6].map(id => ({
        id, name: `Chứng từ minh họa ${id}`, src: `assets/ux-demo/document-${(id - 1) % 3 + 1}.svg`,
    }));
    readonly imageStates = signal<Record<number, 'loaded' | 'error'>>({});
    readonly visibleImages = signal<ReadonlySet<number>>(new Set());
    readonly revisions = signal<Record<number, number>>({});
    readonly preview = signal<Preview | null>(null);
    readonly reading = signal(false);
    readonly error = signal('');
    readonly previewError = signal(false);
    readonly objectUrlCount = signal(0);
    private readonly modals = inject(NzModalService);
    private readonly sanitizer = inject(DomSanitizer);
    private readonly destroyRef = inject(DestroyRef);
    private readonly document = inject(DOCUMENT);
    private readonly injector = inject(Injector);
    private readonly objectUrls = new Set<string>();
    private modal: NzModalRef | null = null;
    private generation = 0;
    private destroyed = false;

    @ViewChild('previewBody', { static: true }) private previewBody!: TemplateRef<unknown>;

    constructor() {
        this.destroyRef.onDestroy(() => {
            this.destroyed = true;
            this.generation++;
            this.modal?.destroy();
            for (const url of [...this.objectUrls]) this.release(url);
        });
    }

    imageState(id: number, state: 'loaded' | 'error'): void {
        this.imageStates.update(previous => ({ ...previous, [id]: state }));
    }

    revealImage(id: number): void { this.visibleImages.update(previous => new Set([...previous, id])); }

    simulateImageError(): void { this.revealImage(1); this.imageState(1, 'error'); }

    retryImage(id: number): void {
        this.imageStates.update(previous => { const next = { ...previous }; delete next[id]; return next; });
        this.revisions.update(previous => ({ ...previous, [id]: (previous[id] ?? 0) + 1 }));
    }

    openPicture(src: string, name: string): void { this.show({ kind: 'image', url: src, name }); }
    openPdf(): void { void this.readFile(demoPdf()); }

    pick(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        input.value = ''; // The same file can be selected again after an error/close.
        if (file) void this.readFile(file);
    }

    allowDrop(event: DragEvent): void { event.preventDefault(); }
    drop(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        const files = event.dataTransfer?.files;
        if (this.preview()) return;
        if (!files || files.length !== 1) {
            this.generation++;
            this.reading.set(false);
            this.error.set('Chọn hoặc thả đúng một file để preview.');
            return;
        }
        void this.readFile(files[0]);
    }

    async readFile(file: File): Promise<void> {
        if (this.modal || this.destroyed) return;
        const generation = ++this.generation;
        this.reading.set(false);
        this.error.set('');
        const allowed = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
        if (!allowed.includes(file.type) || !file.size || file.size > 10 * 1024 * 1024) {
            this.error.set('Dùng PNG, JPEG, WebP hoặc PDF không rỗng, tối đa 10 MB.');
            return;
        }
        this.reading.set(true);
        try {
            const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
            if (this.destroyed || this.modal || generation !== this.generation) return;
            const ascii = new TextDecoder().decode(header);
            const valid = file.type === 'application/pdf' ? ascii.startsWith('%PDF-')
                : file.type === 'image/png' ? [137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => header[i] === byte)
                : file.type === 'image/jpeg' ? header[0] === 255 && header[1] === 216 && header[2] === 255
                : ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP';
            if (!valid) throw new Error('Nội dung file không khớp định dạng đã khai báo.');
            const url = URL.createObjectURL(file);
            this.objectUrls.add(url);
            this.objectUrlCount.set(this.objectUrls.size);
            this.show({
                kind: file.type === 'application/pdf' ? 'pdf' : 'image', url, name: file.name,
                // Trust only a blob URL created here from the validated PDF, never an input URL.
                safeUrl: file.type === 'application/pdf' ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : undefined,
            }, url);
        } catch (error) {
            if (!this.destroyed && generation === this.generation) this.error.set(error instanceof Error ? error.message : 'Không đọc được file. Hãy chọn lại.');
        } finally {
            if (!this.destroyed && generation === this.generation) this.reading.set(false);
        }
    }

    close(): void { this.modal?.destroy(); }

    private show(preview: Preview, ownedUrl?: string): void {
        if (this.modal) return;
        const returnFocusTo = this.document.activeElement as HTMLElement | null;
        this.preview.set(preview);
        this.previewError.set(false);
        try {
            const ref = this.modals.create({
                nzTitle: preview.name, nzContent: this.previewBody, nzFooter: null,
                nzWidth: 920, nzMaskClosable: false,
            });
            this.modal = ref;
            ref.afterClose.pipe(take(1), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
                if (ownedUrl) this.release(ownedUrl);
                if (this.modal === ref) {
                    this.modal = null;
                    this.preview.set(null);
                    afterNextRender(() => {
                        if (!this.preview() && returnFocusTo?.isConnected) returnFocusTo.focus({ preventScroll: true });
                    }, { injector: this.injector });
                }
            });
        } catch (error) {
            if (ownedUrl) this.release(ownedUrl);
            this.preview.set(null);
            throw error;
        }
    }

    private release(url: string): void {
        if (this.objectUrls.delete(url)) URL.revokeObjectURL(url);
        this.objectUrlCount.set(this.objectUrls.size);
    }
}
