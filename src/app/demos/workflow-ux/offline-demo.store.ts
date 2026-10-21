export interface DemoRecord { id: string; title: string; version: number; deleted: boolean; }
export interface CreateJob {
    key: string; title: string; createdAt: number; attempts: number;
    status: 'pending' | 'unknown' | 'blocked'; error: string;
    leaseOwner?: string; leaseUntil?: number;
}
interface Receipt { key: string; fingerprint: string; record: DemoRecord; }
export class DemoApiError extends Error {
    constructor(readonly status: number, message: string) { super(message); }
}
export class DemoNetworkError extends Error {}

/** Faults deliberately happen before the write or AFTER its successful commit. */
export async function mockCreateRequest(store: OfflineDemoStore, job: Pick<CreateJob, 'key' | 'title'>,
    fault: 'none' | 'offline' | 'lost-response'): Promise<{ record: DemoRecord; replayed: boolean }> {
    if (fault === 'offline') throw new DemoNetworkError('Chưa kết nối được. Lệnh đã lưu ở IndexedDB, chờ gửi lại.');
    const response = await store.create(job);
    if (fault === 'lost-response') throw new DemoNetworkError('Mất phản hồi: chưa xác nhận được kết quả. Retry bằng đúng key đã lưu.');
    return response;
}

/** IndexedDB is a SHARED MOCK SERVER here, plus a durable client outbox.
 * In production records/receipts belong on the backend, scoped to the authenticated user.
 * All compare-and-write operations happen in one readwrite transaction, including across tabs.
 */
export class OfflineDemoStore {
    private database?: Promise<IDBDatabase>;
    private closed = false;
    constructor(private readonly name = 'angular-workflow-offline-v1') {}

    close(): void {
        this.closed = true;
        void this.database?.then(db => db.close(), () => undefined);
    }

    async snapshot(): Promise<{ records: DemoRecord[]; jobs: CreateJob[] }> {
        return this.run(['records', 'outbox'], 'readonly', (tx, done) => {
            const rows = tx.objectStore('records').getAll();
            const jobs = tx.objectStore('outbox').getAll();
            jobs.onsuccess = () => done({
                records: (rows.result as DemoRecord[]).filter(row => !row.deleted),
                jobs: (jobs.result as CreateJob[]).sort((a, b) => a.createdAt - b.createdAt || a.key.localeCompare(b.key)),
            });
        });
    }

    async enqueue(title: string): Promise<CreateJob> {
        title = this.validTitle(title);
        const job: CreateJob = { key: crypto.randomUUID(), title, createdAt: Date.now(), attempts: 0, status: 'pending', error: '' };
        return this.run(['outbox'], 'readwrite', (tx, done, fail) => {
            const store = tx.objectStore('outbox');
            const count = store.count();
            count.onsuccess = () => {
                if (count.result >= 50) { fail(new DemoApiError(422, 'Hàng đợi đã có 50 lệnh. Đồng bộ hoặc bỏ lệnh chưa gửi trước.')); return; }
                store.add(job);
                done(job);
            };
        });
    }

    /** Lease prevents two live tabs draining the same job; expires after a crashed/closed tab. */
    async claim(key: string, owner: string, now = Date.now()): Promise<CreateJob | null> {
        return this.run(['outbox'], 'readwrite', (tx, done) => {
            const store = tx.objectStore('outbox');
            const read = store.get(key);
            read.onsuccess = () => {
                const job = read.result as CreateJob | undefined;
                if (!job || job.status === 'blocked' || (job.leaseUntil ?? 0) > now) { done(null); return; }
                const claimed = { ...job, leaseOwner: owner, leaseUntil: now + 10000, attempts: job.attempts + 1 };
                store.put(claimed);
                done(claimed);
            };
        });
    }

    async settle(key: string, owner: string, failure?: Pick<CreateJob, 'status' | 'error'>): Promise<void> {
        return this.run(['outbox'], 'readwrite', (tx, done) => {
            const store = tx.objectStore('outbox');
            const read = store.get(key);
            read.onsuccess = () => {
                const job = read.result as CreateJob | undefined;
                if (job?.leaseOwner === owner) {
                    if (!failure) store.delete(key);
                    else store.put({ ...job, ...failure, leaseOwner: undefined, leaseUntil: undefined });
                }
                done(undefined);
            };
        });
    }

    /** Do not offer cancellation for an unknown outcome: it may already exist on the server. */
    async discardUnsent(key: string): Promise<void> {
        return this.run(['outbox'], 'readwrite', (tx, done, fail) => {
            const store = tx.objectStore('outbox');
            const read = store.get(key);
            read.onsuccess = () => {
                const job = read.result as CreateJob | undefined;
                if (job && (job.attempts > 0 || job.leaseOwner)) {
                    fail(new DemoApiError(409, 'Lệnh đã được thử gửi. Cần đối soát kết quả bằng cùng key trước.')); return;
                }
                store.delete(key);
                done(undefined);
            };
        });
    }

    /** Atomic backend contract: business mutation and idempotency receipt commit together. */
    async create(job: Pick<CreateJob, 'key' | 'title'>): Promise<{ record: DemoRecord; replayed: boolean }> {
        const title = this.validTitle(job.title);
        const scopedKey = `demo-user:POST:/records:${job.key}`;
        const fingerprint = JSON.stringify({ title }); // Canonical payload for this one-field demo.
        return this.run(['records', 'receipts'], 'readwrite', (tx, done, fail) => {
            const receipts = tx.objectStore('receipts');
            const read = receipts.get(scopedKey);
            read.onsuccess = () => {
                const receipt = read.result as Receipt | undefined;
                if (receipt) {
                    if (receipt.fingerprint !== fingerprint) {
                        fail(new DemoApiError(409, 'Cùng idempotency key nhưng payload khác. Không thực thi lại.')); return;
                    }
                    done({ record: receipt.record, replayed: true });
                    return;
                }
                const record: DemoRecord = { id: crypto.randomUUID(), title, version: 1, deleted: false };
                tx.objectStore('records').add(record);
                receipts.add({ key: scopedKey, fingerprint, record } satisfies Receipt);
                done({ record, replayed: false });
            };
        });
    }

    async update(id: string, expectedVersion: number, title: string): Promise<DemoRecord> {
        return this.mutate(id, expectedVersion, this.validTitle(title));
    }
    async remove(id: string, expectedVersion: number): Promise<DemoRecord> { return this.mutate(id, expectedVersion); }

    private async mutate(id: string, expectedVersion: number, title?: string): Promise<DemoRecord> {
        return this.run(['records'], 'readwrite', (tx, done, fail) => {
            const records = tx.objectStore('records');
            const read = records.get(id);
            read.onsuccess = () => {
                const current = read.result as DemoRecord | undefined;
                if (!current || current.deleted) { fail(new DemoApiError(410, 'Bản ghi đã bị xóa ở tab khác. Giữ lại nội dung bạn đang sửa để sao chép.')); return; }
                if (current.version !== expectedVersion) { fail(new DemoApiError(409, 'Version đã thay đổi ở tab khác. Tải bản mới rồi so sánh trước khi lưu lại.')); return; }
                const next = { ...current, version: current.version + 1, title: title ?? current.title, deleted: title === undefined };
                records.put(next); // Tombstone prevents a stale update from resurrecting a deletion.
                done(next);
            };
        });
    }

    private validTitle(title: string): string {
        const normalized = title.trim();
        if (!normalized || normalized.length > 120) throw new DemoApiError(422, 'Tên cần từ 1 đến 120 ký tự.');
        return normalized;
    }

    private open(): Promise<IDBDatabase> {
        if (this.closed) return Promise.reject(new Error('Kho dữ liệu đã đóng.'));
        return this.database ??= new Promise((resolve, reject) => {
            const request = indexedDB.open(this.name, 1);
            let blocked = false;
            request.onupgradeneeded = () => {
                const db = request.result;
                const records = db.createObjectStore('records', { keyPath: 'id' });
                db.createObjectStore('receipts', { keyPath: 'key' });
                db.createObjectStore('outbox', { keyPath: 'key' });
                records.put({ id: 'demo-a', title: 'Hồ sơ đề nghị mua thiết bị', version: 1, deleted: false } satisfies DemoRecord);
                records.put({ id: 'demo-b', title: 'Hồ sơ thanh toán tháng này', version: 1, deleted: false } satisfies DemoRecord);
            };
            request.onerror = () => reject(request.error ?? new Error('Không mở được IndexedDB.'));
            request.onblocked = () => { blocked = true; reject(new Error('Kho dữ liệu bị chặn bởi tab cũ. Đóng tab cũ rồi mở lại lab.')); };
            request.onsuccess = () => {
                const db = request.result;
                db.onversionchange = () => db.close();
                if (this.closed || blocked) { db.close(); reject(new Error('Kho dữ liệu đã đóng.')); }
                else resolve(db);
            };
        });
    }

    private async run<T>(stores: string[], mode: IDBTransactionMode,
        operation: (tx: IDBTransaction, done: (value: T) => void, fail: (error: Error) => void) => void): Promise<T> {
        const db = await this.open();
        return new Promise<T>((resolve, reject) => {
            const tx = db.transaction(stores, mode);
            let result: T;
            let failure: Error | undefined;
            // Resolve only after COMMIT, never from an individual put's success callback.
            tx.oncomplete = () => resolve(result);
            tx.onabort = () => reject(failure ?? tx.error ?? new Error('Giao dịch lưu trữ bị hủy.'));
            const fail = (error: Error): void => { failure = error; tx.abort(); };
            try { operation(tx, value => result = value, fail); } catch (error) { fail(error instanceof Error ? error : new Error(String(error))); }
        });
    }
}
