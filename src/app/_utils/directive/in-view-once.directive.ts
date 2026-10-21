import { DestroyRef, Directive, ElementRef, afterNextRender, inject, output, signal } from '@angular/core';

/** Observe the viewport AND clipping scroll ancestors; do not prefetch outside them. */
@Directive({ selector: '[appInViewOnce]', standalone: true, exportAs: 'appInViewOnce' })
export class InViewOnceDirective {
    readonly entered = output<void>();
    readonly unsupported = signal(false);
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly destroyRef = inject(DestroyRef);

    constructor() {
        afterNextRender(() => {
            if (typeof IntersectionObserver === 'undefined') {
                this.unsupported.set(true); // The template offers an explicit load button instead.
                return;
            }
            let entered = false;
            const observer = new IntersectionObserver(entries => {
                if (!entered && entries.some(entry => entry.isIntersecting && entry.intersectionRect.width > 0 && entry.intersectionRect.height > 0)) {
                    entered = true;
                    observer.disconnect();
                    this.entered.emit();
                }
            }, { root: null, rootMargin: '0px', threshold: 0.001 });
            observer.observe(this.host.nativeElement);
            this.destroyRef.onDestroy(() => observer.disconnect());
        });
    }
}
