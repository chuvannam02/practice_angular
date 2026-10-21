import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, InjectionToken, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { firstValueFrom, timer } from 'rxjs';
import { CreateJob, DemoApiError, DemoNetworkError, DemoRecord, OfflineDemoStore, mockCreateRequest } from './offline-demo.store';

export const OFFLINE_DEMO_STORE_FACTORY = new InjectionToken<() => OfflineDemoStore>('Offline demo store factory', {
    providedIn: 'root', factory: () => () => new OfflineDemoStore(),
});

@Component({
    selector: 'app-offline-sync-demo', standalone: true,
    imports: [ReactiveFormsModule, NzButtonModule, NzInputModule],
    templateUrl: './offline-sync.component.html', styleUrl: './workflow-ux.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfflineSyncComponent {
    readonly records = signal<DemoRecord[]>([]);
    readonly jobs = signal<CreateJob[]>([]);
    readonly ready = signal(false);
    readonly saving = signal(false);
    readonly syncing = signal(false);
    readonly editing = signal<DemoRecord | null>(null);
    readonly mockOffline = signal(false);
    readonly browserOnline = signal(navigator.onLine);
    readonly loseNextReply = signal(false);
    readonly canSend = computed(() => !this.mockOffline() && this.browserOnline());
    readonly message = signal('');
    readonly error = signal('');
    readonly remoteChanged = signal(false);
    readonly newTitle = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(120)] });
    readonly editTitle = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(120)] });
    readonly tabId = crypto.randomUUID();
    private readonly store = inject(OFFLINE_DEMO_STORE_FACTORY)();
    private readonly destroyRef = inject(DestroyRef);
    private readonly document = inject(DOCUMENT);
    private readonly channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('angular-workflow-offline-v1');
    private destroyed = false;
    private refreshGeneration = 0;
    private retryTimer?: ReturnType<typeof setTimeout>;
    readonly secondTabUrl = (() => {
        const url = new URL(this.document.URL);
        url.searchParams.set('syncDemo', '1');
        url.hash = 'offline-sync-demo';
        return url.href;
    })();

    constructor() {
        const resume = (): void => {
            this.browserOnline.set(navigator.onLine);
            void this.refresh().then(() => this.drain());
        };
        const offline = (): void => this.browserOnline.set(false);
        window.addEventListener('online', resume);
        window.addEventListener('offline', offline);
        window.addEventListener('focus', resume);
        if (this.channel) this.channel.onmessage = () => { this.remoteChanged.set(true); void this.refresh(); };
        this.destroyRef.onDestroy(() => {
            this.destroyed = true;
            clearTimeout(this.retryTimer);
            window.removeEventListener('online', resume);
            window.removeEventListener('offline', offline);
            window.removeEventListener('focus', resume);
            this.channel?.close();
            this.store.close();
        });
        void this.refresh().then(() => this.drain());
    }

    async refresh(): Promise<void> {
        const generation = ++this.refreshGeneration;
        try {
            const snapshot = await this.store.snapshot();
            if (this.destroyed || generation !== this.refreshGeneration) return;
            this.records.set(snapshot.records);
            this.jobs.set(snapshot.jobs);
            this.ready.set(true);
            clearTimeout(this.retryTimer);
            const leases = snapshot.jobs.map(job => job.leaseUntil ?? 0).filter(until => until > Date.now());
            if (leases.length) this.retryTimer = setTimeout(() => void this.refresh().then(() => this.drain()), Math.min(...leases) - Date.now() + 50);
        } catch (error) { if (!this.destroyed) this.error.set(`Không đọc được IndexedDB: ${this.describe(error)} Nội dung đang nhập vẫn được giữ.`); }
    }

    toggleOffline(offline: boolean): void {
        this.mockOffline.set(offline);
        if (!offline) void this.drain();
    }

    async create(): Promise<void> {
        if (!this.ready() || this.saving() || this.syncing()) return;
        this.newTitle.markAsTouched();
        if (this.newTitle.invalid || !this.newTitle.value.trim()) { this.error.set('Nhập tên hồ sơ từ 1 đến 120 ký tự.'); return; }
        this.saving.set(true);
        this.error.set('');
        try {
            // Store immutable intent + key BEFORE sending. Never generate a new key on retry.
            const job = await this.store.enqueue(this.newTitle.value);
            if (this.destroyed) return;
            this.newTitle.reset();
            this.message.set(`Đã lưu lệnh ${job.key}. ${this.canSend() ? 'Đang gửi…' : 'Chờ có mạng để đồng bộ.'}`);
            this.changed();
            await this.refresh();
            await this.drain();
        } catch (error) { if (!this.destroyed) this.error.set(`Chưa lưu được lệnh: ${this.describe(error)} Nội dung được giữ để thử lại.`); }
        finally { this.saving.set(false); }
    }

    async drain(): Promise<void> {
        if (this.destroyed || this.syncing() || !this.canSend()) return;
        this.syncing.set(true);
        this.error.set('');
        try {
            const { jobs } = await this.store.snapshot();
            for (const queued of jobs) {
                if (this.destroyed || !this.canSend()) break;
                const job = await this.store.claim(queued.key, this.tabId);
                if (!job) continue;
                this.changed();
                const loseReply = this.loseNextReply();
                this.loseNextReply.set(false);
                try {
                    await firstValueFrom(timer(450).pipe(takeUntilDestroyed(this.destroyRef)));
                    if (this.destroyed) return;
                    const result = await mockCreateRequest(this.store, job, !this.canSend() ? 'offline' : loseReply ? 'lost-response' : 'none');
                    await this.store.settle(job.key, this.tabId);
                    this.message.set(`${result.replayed ? 'Retry trả lại kết quả cũ' : 'Đã tạo hồ sơ'}: ${result.record.title} · ID ${result.record.id}.`);
                } catch (error) {
                    if (this.destroyed) return; // A crashed tab's lease expires; another tab can resume safely.
                    await this.store.settle(job.key, this.tabId, {
                        status: error instanceof DemoApiError ? 'blocked' : 'unknown', error: this.describe(error),
                    });
                    this.error.set(this.describe(error));
                    if (!(error instanceof DemoApiError)) break; // No infinite retry loop for network/unknown results.
                } finally { if (!this.destroyed) this.changed(); }
            }
        } catch (error) { if (!this.destroyed) this.error.set(this.describe(error)); }
        finally {
            this.syncing.set(false);
            if (!this.destroyed) await this.refresh();
        }
    }

    edit(record: DemoRecord): void {
        if (this.saving()) return;
        this.editing.set({ ...record }); // Preserve the version captured when the user STARTED editing.
        this.editTitle.setValue(record.title);
        this.remoteChanged.set(false);
        this.error.set('');
    }

    async saveEdit(): Promise<void> {
        const base = this.editing();
        this.editTitle.markAsTouched();
        if (!base || this.saving() || this.editTitle.invalid || !this.editTitle.value.trim()) return;
        await this.write(() => this.store.update(base.id, base.version, this.editTitle.value), () => this.editing.set(null));
    }

    async remove(record: DemoRecord): Promise<void> {
        if (this.saving()) return;
        await this.write(() => this.store.remove(record.id, record.version));
    }

    async discard(job: CreateJob): Promise<void> {
        try { await this.store.discardUnsent(job.key); this.changed(); await this.refresh(); }
        catch (error) { if (!this.destroyed) this.error.set(this.describe(error)); }
    }

    private async write(operation: () => Promise<DemoRecord>, success?: () => void): Promise<void> {
        this.saving.set(true);
        this.error.set('');
        try {
            await firstValueFrom(timer(450).pipe(takeUntilDestroyed(this.destroyRef)));
            if (this.destroyed) return;
            if (!this.canSend()) throw new DemoNetworkError('Đang offline. Demo chỉ xếp hàng thao tác tạo; bản sửa được giữ để bạn lưu lại sau.');
            const record = await operation();
            if (this.destroyed) return;
            success?.();
            this.message.set(`Đã ${record.deleted ? 'xóa' : 'cập nhật'} hồ sơ, version ${record.version}.`);
            this.changed();
        } catch (error) { if (!this.destroyed) this.error.set(this.describe(error)); }
        finally { this.saving.set(false); if (!this.destroyed) await this.refresh(); }
    }

    private changed(): void { this.channel?.postMessage('changed'); }
    private describe(error: unknown): string { return error instanceof Error ? error.message : 'Thao tác thất bại. Hãy thử lại.'; }
}
