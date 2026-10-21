import {
    AfterViewInit,
    DestroyRef,
    Directive,
    ElementRef,
    EventEmitter,
    NgZone,
    Output,
    inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';

@Directive({
    selector: '[appSelectScroll]',
    standalone: true,
})
export class SelectScrollDirective implements AfterViewInit {
    @Output() readonly bottomReached = new EventEmitter<void>();

    private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly zone = inject(NgZone);
    private readonly destroyRef = inject(DestroyRef);

    ngAfterViewInit(): void {
        // Attach to this dropdown only; its footer is outside the virtual list.
        const viewport = this.element.nativeElement
            .closest('nz-option-container')
            ?.querySelector<HTMLElement>('cdk-virtual-scroll-viewport');
        if (!viewport) return;

        this.zone.runOutsideAngular(() => {
            fromEvent(viewport, 'scroll')
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(() => {
                    const remaining =
                        viewport.scrollHeight -
                        viewport.clientHeight -
                        viewport.scrollTop;
                    // A distance threshold also catches jumps past the last row.
                    if (
                        viewport.clientHeight > 0 &&
                        viewport.scrollHeight > viewport.clientHeight &&
                        remaining <= 32
                    ) {
                        this.zone.run(() => this.bottomReached.emit());
                    }
                });
        });
    }
}
