import { CdkDrag, CdkDragDrop, CdkDropList, DragDropModule } from '@angular/cdk/drag-drop';
import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, Injector, afterNextRender, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { finalize, timer } from 'rxjs';

type Stage = 'todo' | 'review' | 'done';
type Failure = 'none' | 'network' | 'conflict';
export interface WorkflowTask { id: number; title: string; assignee: string; locked?: boolean; }
export interface WorkflowColumn { id: Stage; title: string; tasks: WorkflowTask[]; }
interface MoveCommand { id: number; target: Stage; beforeId: number | null; }

const INITIAL: WorkflowColumn[] = [
    { id: 'todo', title: 'Cần xử lý', tasks: [
        { id: 1, title: 'Đề nghị mua thiết bị', assignee: 'An' },
        { id: 2, title: 'Cấp tài khoản dự án', assignee: 'Bình' },
        { id: 3, title: 'Bổ sung chứng từ', assignee: 'Chi', locked: true },
    ] },
    { id: 'review', title: 'Chờ duyệt', tasks: [
        { id: 4, title: 'Duyệt hồ sơ nhân sự', assignee: 'Dũng' },
        { id: 5, title: 'Duyệt kế hoạch đào tạo', assignee: 'Hà' },
    ] },
    { id: 'done', title: 'Đã duyệt', tasks: [{ id: 6, title: 'Hồ sơ đã hoàn tất', assignee: 'Lan' }] },
];

/** Immutable placement by stable IDs, independent of CDK's rendered item indexes. */
function place(board: WorkflowColumn[], command: MoveCommand): WorkflowColumn[] {
    const task = board.flatMap(column => column.tasks).find(item => item.id === command.id)!;
    return board.map(column => {
        const tasks = column.tasks.filter(item => item.id !== command.id);
        if (column.id === command.target) {
            const anchor = tasks.findIndex(item => item.id === command.beforeId);
            tasks.splice(anchor < 0 ? tasks.length : anchor, 0, task);
        }
        return { ...column, tasks };
    });
}

@Component({
    selector: 'app-workflow-board-demo',
    standalone: true,
    imports: [DragDropModule, FormsModule, NzButtonModule, NzSelectModule],
    templateUrl: './workflow-board.component.html',
    styleUrl: './workflow-ux.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkflowBoardComponent {
    readonly board = signal<WorkflowColumn[]>(INITIAL);
    readonly pending = signal(false);
    readonly pendingId = signal<number | null>(null);
    readonly nextFailure = signal<Failure>('none');
    readonly requestCount = signal(0);
    readonly version = signal(1);
    readonly error = signal('');
    readonly feedback = signal('Kéo bằng tay nắm, hoặc dùng các nút chuyển bước/lên/xuống.');
    readonly retryCommand = signal<MoveCommand | null>(null);
    private serverBoard: WorkflowColumn[] = INITIAL;
    private serverVersion = 1;
    private readonly destroyRef = inject(DestroyRef);
    private readonly document = inject(DOCUMENT);
    private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly injector = inject(Injector);

    readonly canEnter = (drag: CdkDrag<WorkflowTask>, list: CdkDropList<WorkflowColumn>): boolean =>
        this.allowed(drag.data.id, list.data.id);

    dropped(event: CdkDragDrop<WorkflowColumn, WorkflowColumn, WorkflowTask>): void {
        const remaining = event.container.data.tasks.filter(task => task.id !== event.item.data.id);
        this.move(event.item.data.id, event.container.data.id, remaining[event.currentIndex]?.id ?? null);
    }

    nudge(task: WorkflowTask, column: WorkflowColumn, delta: number): void {
        const index = column.tasks.findIndex(item => item.id === task.id);
        const target = index + delta;
        if (target < 0 || target >= column.tasks.length) return;
        const remaining = column.tasks.filter(item => item.id !== task.id);
        this.move(task.id, column.id, remaining[target]?.id ?? null);
    }

    move(id: number, target: Stage, beforeId: number | null = null): void {
        if (this.pending()) return;
        if (!this.allowed(id, target)) {
            this.error.set('Không thể chuyển: hồ sơ đang khóa, đã hoàn tất hoặc chưa qua bước chờ duyệt.');
            return;
        }
        const before = this.board();
        const source = before.find(column => column.tasks.some(task => task.id === id))!;
        const position = source.tasks.findIndex(task => task.id === id);
        if (source.id === target && (source.tasks[position + 1]?.id ?? null) === beforeId) return;
        const command: MoveCommand = { id, target, beforeId };
        const next = place(before, command);
        const approval = target === 'done';
        const expectedVersion = this.version();
        const failure = this.nextFailure();
        this.nextFailure.set('none');
        this.error.set('');
        this.retryCommand.set(null);
        this.pending.set(true);
        this.pendingId.set(id);
        this.requestCount.update(value => value + 1);
        const restoreFocus = this.element.nativeElement.contains(this.document.activeElement);
        if (!approval) this.board.set(next);
        if (restoreFocus) this.focusTask(id);
        this.feedback.set(approval ? 'Đang chờ xác nhận phê duyệt từ API giả lập…' : 'Đã đổi trên UI, đang lưu thứ tự/trạng thái giả lập…');
        // Serialize mutations for this board. Other page components stay interactive.
        timer(700).pipe(
            takeUntilDestroyed(this.destroyRef),
            finalize(() => { this.pending.set(false); this.pendingId.set(null); }),
        ).subscribe(() => {
            const restoreFocus = this.element.nativeElement.contains(this.document.activeElement);
            if (failure === 'conflict') {
                // Another user changes the canonical server state during our request.
                this.serverBoard = this.serverBoard.map(column => ({
                    ...column, tasks: column.tasks.map(task => task.id === id ? { ...task, assignee: 'Người xử lý mới' } : task),
                }));
                this.serverVersion++;
            }
            if (expectedVersion !== this.serverVersion) {
                this.board.set(this.serverBoard);
                this.version.set(this.serverVersion);
                this.error.set('Xung đột version (giả lập): người khác đã sửa hồ sơ. Đã tải bản mới; kiểm tra trước khi thao tác lại.');
                this.feedback.set('Không tự gửi lại lệnh phê duyệt sau xung đột.');
            } else if (failure === 'network') {
                this.board.set(before);
                this.retryCommand.set(command);
                this.error.set('Lỗi mạng giả lập. Đã giữ/khôi phục trạng thái trước thao tác. Bạn có thể thử lại.');
                this.feedback.set('Chưa lưu thành công.');
            } else {
                this.serverBoard = next;
                this.serverVersion++;
                this.board.set(next);
                this.version.set(this.serverVersion);
                this.feedback.set(approval ? 'API giả lập đã xác nhận phê duyệt.' : 'API giả lập đã xác nhận thay đổi.');
            }
            if (restoreFocus) this.focusTask(id);
        });
    }

    retry(): void {
        const command = this.retryCommand();
        if (command) this.move(command.id, command.target, command.beforeId);
    }

    private allowed(id: number, target: Stage): boolean {
        if (this.pending()) return false;
        const source = this.board().find(column => column.tasks.some(task => task.id === id));
        const task = source?.tasks.find(item => item.id === id);
        if (!source || !task) return false;
        return !task.locked && source.id !== 'done' && (target !== 'done' || source.id === 'review');
    }

    private focusTask(id: number): void {
        afterNextRender(() => {
            const active = this.document.activeElement;
            if (active === this.document.body || this.element.nativeElement.contains(active)) {
                this.element.nativeElement.querySelector<HTMLElement>(`[data-task-title="${id}"]`)?.focus({ preventScroll: true });
            }
        }, { injector: this.injector });
    }
}
