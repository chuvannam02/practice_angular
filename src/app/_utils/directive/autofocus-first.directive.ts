import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { InteractivityChecker } from '@angular/cdk/a11y';
import {
    AfterViewInit, Directive, ElementRef, EventEmitter, Input, NgZone,
    OnChanges, OnDestroy, Output, PLATFORM_ID, booleanAttribute, inject,
} from '@angular/core';

type FormControlElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

@Directive({
    selector: '[appAutofocusFirst]',
    standalone: true,
})
export class AutofocusFirstDirective implements AfterViewInit, OnChanges, OnDestroy {
    @Input({ transform: booleanAttribute }) appAutofocusFirst = true;
    @Output() readonly firstInputFocused = new EventEmitter<FormControlElement>();
    private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly document = inject(DOCUMENT);
    private readonly zone = inject(NgZone);
    private readonly checker = inject(InteractivityChecker);
    private readonly platformId = inject(PLATFORM_ID);
    private mutationObserver?: MutationObserver;
    private resizeObserver?: ResizeObserver;
    private frameId: number | null = null;
    private initialized = false;
    private finished = false;
    private readonly onFocusIn = () => {
        // Preserve a focus choice already made by the user inside this form.
        this.finished = true;
        this.stopWatching();
    };

    ngAfterViewInit(): void {
        this.initialized = true;
        this.restart();
    }
    ngOnChanges(): void {
        if (this.initialized) this.restart();
    }
    ngOnDestroy(): void {
        this.finished = true;
        this.stopWatching();
    }

    private restart(): void {
        this.stopWatching();
        this.finished = false;
        if (!this.appAutofocusFirst || !isPlatformBrowser(this.platformId)) return;
        const host = this.element.nativeElement;
        this.zone.runOutsideAngular(() => {
            this.mutationObserver = new MutationObserver(() => this.scheduleFocus());
            this.mutationObserver.observe(host, {
                childList: true, subtree: true, attributes: true,
                attributeFilter: ['disabled', 'readonly', 'hidden', 'style', 'class',
                    'type', 'tabindex', 'inert', 'aria-hidden'],
            });
            if (typeof ResizeObserver !== 'undefined') {
                this.resizeObserver = new ResizeObserver(() => this.scheduleFocus());
                this.resizeObserver.observe(host);
            }
            host.addEventListener('focusin', this.onFocusIn);
            this.scheduleFocus();
        });
    }

    private scheduleFocus(): void {
        if (this.finished || this.frameId !== null || !this.appAutofocusFirst) return;
        const window = this.document.defaultView;
        if (!window) return;
        this.frameId = window.requestAnimationFrame(() => {
            this.frameId = null;
            this.focusFirstAvailableInput();
        });
    }

    private focusFirstAvailableInput(): void {
        const host = this.element.nativeElement;
        if (this.finished || !host.isConnected) return;
        if (host.contains(this.document.activeElement)) {
            this.finished = true;
            this.stopWatching();
            return;
        }
        for (const input of host.querySelectorAll<FormControlElement>('input, textarea, select')) {
            if (
                input.matches(':disabled, [readonly]') || input.tabIndex < 0 ||
                input.closest('[hidden], [inert], [aria-hidden="true"]') ||
                !this.checker.isFocusable(input)
            ) continue;
            input.focus({ preventScroll: true });
            if (this.document.activeElement === input) {
                this.finished = true;
                this.stopWatching();
                this.zone.run(() => this.firstInputFocused.emit(input));
                return;
            }
        }
    }

    private stopWatching(): void {
        this.mutationObserver?.disconnect();
        this.resizeObserver?.disconnect();
        this.mutationObserver = undefined;
        this.resizeObserver = undefined;
        this.element.nativeElement.removeEventListener('focusin', this.onFocusIn);
        if (this.frameId !== null) {
            this.document.defaultView?.cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }
    }
}
