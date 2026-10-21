import { fakeAsync, tick } from '@angular/core/testing';
import { processInFrames } from './frame-batch';

describe('processInFrames', () => {
    it('yields between bounded batches and completes all work', fakeAsync(() => {
        let consumed = 0;
        let complete = false;
        processInFrames(2500, () => consumed++).subscribe({ complete: () => complete = true });
        expect(consumed).toBe(0);
        tick(16);
        expect(consumed).toBeGreaterThan(0);
        expect(consumed).toBeLessThanOrEqual(1000);
        expect(complete).toBeFalse();
        tick(1000);
        expect(consumed).toBe(2500);
        expect(complete).toBeTrue();
    }));

    it('does no further work after cancellation between frames', fakeAsync(() => {
        let consumed = 0;
        const subscription = processInFrames(20000, () => consumed++).subscribe();
        tick(16);
        const before = consumed;
        subscription.unsubscribe();
        tick(1000);
        expect(before).toBeGreaterThan(0);
        expect(consumed).toBe(before);
    }));

    it('reports a task error and stops scheduling work', fakeAsync(() => {
        let consumed = 0;
        let failure: unknown;
        processInFrames(20000, () => {
            if (++consumed === 8) throw new Error('bad row');
        }).subscribe({ error: error => failure = error });
        tick(1000);
        expect((failure as Error).message).toBe('bad row');
        expect(consumed).toBe(8);
    }));
});
