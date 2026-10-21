import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzSwitchModule } from 'ng-zorro-antd/switch';

let nextInstanceId = 0;

@Component({
    selector: 'app-demo-switch',
    standalone: true,
    imports: [FormsModule, NzSwitchModule],
    template: `
        <nz-switch
            [ngModel]="enabled"
            [nzControl]="true"
            [nzLoading]="loading"
            [nzId]="'demo-switch-' + instanceId"
            (click)="requestToggle()"
            (keydown)="onKeydown($event)"
        ></nz-switch>
        <label class="visually-hidden" [attr.for]="'demo-switch-' + instanceId">{{ label }}</label>
        <small class="instance">DOM #{{ instanceId }}</small>
    `,
    styles: `
        :host { display: inline-flex; align-items: center; gap: 8px; }
        .visually-hidden {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            overflow: hidden;
            clip-path: inset(50%);
            white-space: nowrap;
        }
        .instance {
            padding: 3px 6px;
            border-radius: 5px;
            color: #62708a;
            background: #eef2f7;
            font-size: 11px;
            white-space: nowrap;
            animation: instance-created 1.2s ease-out;
        }
        @keyframes instance-created {
            from { background: #ffe7a3; color: #775100; }
            to { background: #eef2f7; color: #62708a; }
        }
        @media (prefers-reduced-motion: reduce) {
            .instance { animation: none; }
        }
    `,
})
export class DemoSwitchComponent {
    @Input() enabled = false;
    @Input() loading = false;
    @Input() label = 'Trạng thái hoạt động';
    @Output() readonly enabledChange = new EventEmitter<boolean>();

    readonly instanceId = ++nextInstanceId;

    requestToggle(): void {
        // nzControl leaves changes to the parent until the save succeeds.
        if (!this.loading) this.enabledChange.emit(!this.enabled);
    }

    onKeydown(event: KeyboardEvent): void {
        if (!['Enter', ' ', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault();
        if (this.loading || event.repeat) return;
        const next = event.key === 'ArrowLeft' ? false
            : event.key === 'ArrowRight' ? true : !this.enabled;
        if (next !== this.enabled) this.enabledChange.emit(next);
    }
}
