import { CommonModule } from '@angular/common';
import {
    AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, EventEmitter,
    Input, Output, TemplateRef, ViewChild, ViewContainerRef, inject, signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NEVER, Observable, takeUntil, timer } from 'rxjs';

@Component({
    selector: 'app-template-modal-body',
    standalone: true,
    imports: [CommonModule],
    template: `
        <ng-container *ngIf="loading()" [ngTemplateOutlet]="loadingTemplate"></ng-container>
        <ng-container #content></ng-container>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemplateModalBodyComponent<C extends object> implements AfterViewInit {
    @Input({ required: true }) contentTemplate!: TemplateRef<C>;
    @Input({ required: true }) context!: C;
    @Input() loadingTemplate: TemplateRef<unknown> | null = null;
    @Input() delayMs = 900;
    @Input() cancel$: Observable<void> = NEVER;
    @Output() readonly contentReady = new EventEmitter<void>();
    readonly loading = signal(true);

    @ViewChild('content', { read: ViewContainerRef, static: true })
    private container!: ViewContainerRef;
    private readonly destroyRef = inject(DestroyRef);

    ngAfterViewInit(): void {
        // Demo data latency, not a delay used to guess when focus will work.
        timer(this.delayMs)
            .pipe(takeUntil(this.cancel$), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                this.loading.set(false);
                this.container.clear();
                const view = this.container.createEmbeddedView(this.contentTemplate, this.context);
                view.detectChanges();
                this.contentReady.emit();
            });
    }
}
