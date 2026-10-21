import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { LabMetrics } from './lab-metrics';

@Component({
    selector: 'app-lifecycle-ticker',
    standalone: true,
    template: `<div class="ticker">Timer đang chạy: <strong>{{ ticks() }}</strong> tick. Mỗi tick cách nhau 500ms.</div>`,
    styles: `.ticker { padding: 16px; border: 1px solid #bce4ce; border-radius: 10px; background: #effaf3; color: #17613d; }`,
})
export class LifecycleTickerComponent implements OnInit {
    readonly ticks = signal(0);
    private readonly metrics = inject(LabMetrics);
    private readonly destroyRef = inject(DestroyRef);

    ngOnInit(): void {
        interval(500)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                this.ticks.update((value) => value + 1);
                this.metrics.timerTicks++;
            });
    }
}
