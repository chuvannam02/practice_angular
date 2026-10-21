import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { LargeFormComponent } from './large-form.component';
import { MediaPreviewComponent } from './media-preview.component';
import { WorkflowBoardComponent } from './workflow-board.component';
import { OfflineSyncComponent } from './offline-sync.component';

@Component({
    selector: 'app-workflow-ux-lab',
    standalone: true,
    imports: [NzButtonModule, LargeFormComponent, MediaPreviewComponent, WorkflowBoardComponent, OfflineSyncComponent],
    template: `
        <section class="ux-card" id="workflow-ux-lab">
            <p class="eyebrow">LAB · MEDIA / FORM / DRAG &amp; DROP WORKFLOW</p>
            <h2>Preview file, form lớn và xử lý workflow</h2>
            <p>Bấm mở để tạo các demo. Đóng lab sẽ hủy view, async validator và preview đang mở; draft/board ở RAM được reset. Riêng hàng đợi IndexedDB và kho dữ liệu hai tab vẫn được giữ qua reload.</p>
            <button nz-button nzType="primary" (click)="toggle()" [attr.aria-expanded]="opened()" data-action="toggle-workflow-lab">{{ opened() ? 'Đóng các demo workflow' : 'Mở các demo workflow' }}</button>
        </section>
        @if (opened()) {
            <app-media-preview-demo></app-media-preview-demo>
            <app-offline-sync-demo></app-offline-sync-demo>
            <app-large-form-demo></app-large-form-demo>
            <app-workflow-board-demo></app-workflow-board-demo>
        }
    `,
    styleUrl: './workflow-ux.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkflowLabComponent {
    readonly opened = signal(new URL(inject(DOCUMENT).URL).searchParams.get('syncDemo') === '1');
    toggle(): void { this.opened.update(value => !value); }
}
