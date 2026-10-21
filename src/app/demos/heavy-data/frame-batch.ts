import { Observable } from 'rxjs';

export interface FrameProgress { processed: number; total: number; }

/** Small CPU tasks share a frame budget; unsubscribe cancels the next frame. */
export function processInFrames(total: number, consume: (index: number) => void): Observable<FrameProgress> {
    return new Observable(subscriber => {
        let processed = 0;
        let frame: number | null = null;
        const step = (): void => {
            frame = null;
            const deadline = performance.now() + 4;
            let batchSize = 0;
            try {
                while (processed < total && !subscriber.closed && batchSize < 1000 && performance.now() < deadline) {
                    consume(processed++);
                    batchSize++;
                }
            } catch (error) {
                subscriber.error(error);
                return;
            }
            subscriber.next({ processed, total });
            if (subscriber.closed) return;
            if (processed >= total) subscriber.complete();
            else frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
        return () => { if (frame !== null) cancelAnimationFrame(frame); };
    });
}
