import { DemoApiError, DemoNetworkError, OfflineDemoStore, mockCreateRequest } from './offline-demo.store';

describe('OfflineDemoStore (real IndexedDB, independent tab connections)', () => {
    let name: string;
    let tabA: OfflineDemoStore;
    let tabB: OfflineDemoStore;

    beforeEach(() => {
        name = `offline-spec-${crypto.randomUUID()}`;
        tabA = new OfflineDemoStore(name);
        tabB = new OfflineDemoStore(name);
    });
    afterEach(async () => {
        tabA.close(); tabB.close();
        await new Promise<void>((resolve, reject) => {
            const request = indexedDB.deleteDatabase(name);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    });

    it('allows only one concurrent update from the same version and does not silently overwrite', async () => {
        const results = await Promise.allSettled([
            tabA.update('demo-a', 1, 'Tab A'), tabB.update('demo-a', 1, 'Tab B'),
        ]);
        expect(results.filter(result => result.status === 'fulfilled').length).toBe(1);
        const rejected = results.find(result => result.status === 'rejected') as PromiseRejectedResult;
        expect(rejected.reason instanceof DemoApiError).toBeTrue();
        expect((rejected.reason as DemoApiError).status).toBe(409);
        expect((await tabB.snapshot()).records.find(record => record.id === 'demo-a')!.version).toBe(2);
    });

    it('rejects a stale edit after deletion rather than resurrecting the record', async () => {
        await tabA.remove('demo-a', 1);
        await expectAsync(tabB.update('demo-a', 1, 'Stale draft')).toBeRejectedWith(jasmine.objectContaining({ status: 410 }));
        expect((await tabB.snapshot()).records.some(record => record.id === 'demo-a')).toBeFalse();
    });

    it('commits one record for two simultaneous sends with the same idempotency key', async () => {
        const job = await tabA.enqueue('Only once');
        const results = await Promise.all([tabA.create(job), tabB.create(job)]);
        expect(results[0].record.id).toBe(results[1].record.id);
        expect(results.filter(result => result.replayed).length).toBe(1);
        expect((await tabA.snapshot()).records.filter(record => record.title === 'Only once').length).toBe(1);
    });

    it('keeps a durable intent after offline failure, reloads it and retries the same key', async () => {
        const job = await tabA.enqueue('Offline draft');
        await expectAsync(mockCreateRequest(tabA, job, 'offline')).toBeRejectedWith(jasmine.any(DemoNetworkError));
        tabA.close();
        tabA = new OfflineDemoStore(name); // Simulates a reload/new document.
        const restored = (await tabA.snapshot()).jobs[0];
        expect(restored.key).toBe(job.key);
        const response = await mockCreateRequest(tabA, restored, 'none');
        expect(response.record.title).toBe(job.title);
        expect(response.replayed).toBeFalse();
    });

    it('replays the original response when the first write committed but its response was lost', async () => {
        const job = await tabA.enqueue('Lost response');
        await expectAsync(mockCreateRequest(tabA, job, 'lost-response')).toBeRejectedWith(jasmine.any(DemoNetworkError));
        const committed = (await tabB.snapshot()).records.find(row => row.title === job.title)!;
        const retry = await mockCreateRequest(tabB, job, 'none');
        expect(retry.replayed).toBeTrue();
        expect(retry.record.id).toBe(committed.id);
        expect((await tabA.snapshot()).records.length).toBe(3);
    });

    it('rejects a reused key with a changed payload and does not dedupe different intents by title', async () => {
        const job = await tabA.enqueue('Same title');
        await tabA.create(job);
        await expectAsync(tabB.create({ ...job, title: 'Changed payload' })).toBeRejectedWith(jasmine.objectContaining({ status: 409 }));
        const separate = await tabB.enqueue(job.title);
        expect(separate.key).not.toBe(job.key);
        await tabB.create(separate);
        expect((await tabA.snapshot()).records.filter(row => row.title === job.title).length).toBe(2);
    });

    it('atomically claims a queue item and recovers an expired lease without losing an unknown outcome', async () => {
        const job = await tabA.enqueue('Claim me');
        const claims = await Promise.all([tabA.claim(job.key, 'A', 100), tabB.claim(job.key, 'B', 100)]);
        expect(claims.filter(Boolean).length).toBe(1);
        const first = claims.find(Boolean)!;
        const replacement = await tabB.claim(job.key, 'C', 10101);
        expect(replacement!.attempts).toBe(2);
        await tabA.settle(job.key, first.leaseOwner!); // A stale sender cannot remove the new owner's item.
        expect((await tabB.snapshot()).jobs.length).toBe(1);
        await tabB.settle(job.key, 'C', { status: 'unknown', error: 'Timeout' });
        await expectAsync(tabA.discardUnsent(job.key)).toBeRejectedWith(jasmine.objectContaining({ status: 409 }));
        const retry = await tabA.claim(job.key, 'D');
        expect(retry!.key).toBe(job.key);
        await tabA.settle(job.key, 'D');
        expect((await tabB.snapshot()).jobs.length).toBe(0);
    });

    it('removes an unsent intent and replays an old receipt without recreating a deleted record', async () => {
        const unused = await tabA.enqueue('Cancel me');
        await tabA.discardUnsent(unused.key);
        expect((await tabB.snapshot()).jobs.length).toBe(0);
        const job = await tabA.enqueue('Created then deleted');
        const response = await tabA.create(job);
        await tabB.remove(response.record.id, 1);
        expect((await tabA.create(job)).replayed).toBeTrue();
        expect((await tabB.snapshot()).records.some(row => row.id === response.record.id)).toBeFalse();
    });
});
