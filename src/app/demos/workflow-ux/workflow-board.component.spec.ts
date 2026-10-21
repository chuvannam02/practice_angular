import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { WorkflowBoardComponent, WorkflowColumn, WorkflowTask } from './workflow-board.component';

describe('WorkflowBoardComponent', () => {
    let fixture: ComponentFixture<WorkflowBoardComponent>;
    let component: WorkflowBoardComponent;
    const ids = (stage: string): number[] => component.board().find(column => column.id === stage)!.tasks.map(task => task.id);
    const frames = (): Promise<void> => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    async function settled(): Promise<void> {
        const deadline = performance.now() + 3000;
        while (component.pending()) {
            if (performance.now() > deadline) throw new Error('Workflow request did not finish');
            await frames();
            fixture.detectChanges();
        }
        fixture.detectChanges();
        await frames();
    }

    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [WorkflowBoardComponent], providers: [provideNoopAnimations()] }).compileComponents();
        fixture = TestBed.createComponent(WorkflowBoardComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
    });

    it('applies a CDK drop by ID, rolls back on a network error, and retries without duplicate writes', fakeAsync(() => {
        const lists = fixture.debugElement.queryAll(By.directive(CdkDropList));
        const source = lists[0].injector.get<CdkDropList<WorkflowColumn>>(CdkDropList);
        const target = lists[1].injector.get<CdkDropList<WorkflowColumn>>(CdkDropList);
        const item = fixture.debugElement.queryAll(By.directive(CdkDrag))[0].injector.get<CdkDrag<WorkflowTask>>(CdkDrag);
        component.nextFailure.set('network');
        component.dropped({
            previousContainer: source, container: target, item, previousIndex: 0, currentIndex: 0,
            isPointerOverContainer: true, distance: { x: 100, y: 0 }, dropPoint: { x: 100, y: 50 }, event: new MouseEvent('mouseup'),
        });
        expect(ids('review')).toEqual([1, 4, 5]);
        component.move(2, 'review');
        expect(component.requestCount()).toBe(1);
        tick(700);
        expect(ids('todo')).toEqual([1, 2, 3]);
        expect(ids('review')).toEqual([4, 5]);
        expect(component.error()).toContain('Lỗi mạng');
        component.retry();
        tick(700);
        expect(ids('review')).toEqual([1, 4, 5]);
        expect(component.version()).toBe(2);
        expect(component.requestCount()).toBe(2);
    }));

    it('reorders via keyboard-accessible buttons and keeps stable card identities', fakeAsync(() => {
        const column = component.board()[0];
        component.nudge(column.tasks[0], column, 1);
        expect(ids('todo')).toEqual([2, 1, 3]);
        tick(700);
        expect(ids('todo')).toEqual([2, 1, 3]);
    }));

    it('rejects illegal transitions, locked records and completed records', () => {
        component.move(1, 'done');
        component.move(3, 'review');
        component.move(6, 'todo');
        expect(component.requestCount()).toBe(0);
        expect(ids('todo')).toEqual([1, 2, 3]);
        expect(ids('done')).toEqual([6]);
    });

    it('waits for approval confirmation before displaying success', fakeAsync(() => {
        fixture.nativeElement.querySelector('[data-approve-id="4"]').click();
        expect(ids('review')).toContain(4);
        expect(ids('done')).not.toContain(4);
        expect(component.pending()).toBeTrue();
        tick(700);
        expect(ids('done')).toEqual([6, 4]);
        expect(component.feedback()).toContain('đã xác nhận phê duyệt');
    }));

    it('does not mark a failed approval complete', fakeAsync(() => {
        component.nextFailure.set('network');
        component.move(4, 'done');
        tick(700);
        expect(ids('review')).toContain(4);
        expect(ids('done')).not.toContain(4);
        expect(component.version()).toBe(1);
    }));

    it('resolves a version conflict from the canonical server state without blind retry', fakeAsync(() => {
        component.nextFailure.set('conflict');
        component.move(1, 'review');
        tick(700);
        expect(ids('todo')).toContain(1);
        expect(component.board()[0].tasks[0].assignee).toBe('Người xử lý mới');
        expect(component.version()).toBe(2);
        expect(component.retryCommand()).toBeNull();
        expect(component.error()).toContain('Xung đột');
    }));

    it('cancels the mock request when the component is destroyed', fakeAsync(() => {
        component.move(4, 'done');
        fixture.destroy();
        tick(700);
        expect(component.pending()).toBeFalse();
        expect(component.version()).toBe(1);
        expect(ids('done')).toEqual([6]);
    }));

    it('keeps keyboard focus with the task while awaiting and completing approval', async () => {
        const approve = fixture.nativeElement.querySelector('[data-approve-id="4"]') as HTMLButtonElement;
        approve.focus();
        approve.click();
        fixture.detectChanges();
        await frames();
        expect(document.activeElement?.getAttribute('data-task-title')).toBe('4');
        await settled();
        expect(document.activeElement?.closest('[data-stage]')?.getAttribute('data-stage')).toBe('done');
    });

    it('moves a task through a real CDK pointer drag/drop gesture', async () => {
        const predicateCalls: string[] = [];
        const predicate = component.canEnter;
        spyOn(component, 'canEnter').and.callFake((item, list) => {
            const allowed = predicate(item, list);
            predicateCalls.push(`${item.data.id}->${list.data.id}:${allowed}`);
            return allowed;
        });
        fixture.detectChanges();
        const drag = fixture.debugElement.queryAll(By.directive(CdkDrag))[0].injector.get(CdkDrag);
        let started = false;
        drag.started.subscribe(() => started = true);
        const handle = fixture.nativeElement.querySelector('[data-task-id="1"] .drag-handle') as HTMLElement;
        const target = fixture.nativeElement.querySelector('[data-stage="review"]') as HTMLElement;
        const targetList = fixture.debugElement.queryAll(By.directive(CdkDropList))[1].injector.get(CdkDropList);
        let entered = false;
        targetList.entered.subscribe(() => entered = true);
        let dropDescription = '';
        drag.dropped.subscribe(event => dropDescription = `${event.previousContainer.data.id}->${event.container.data.id}:${event.previousIndex}/${event.currentIndex}`);
        handle.scrollIntoView({ block: 'center' });
        await frames();
        const start = handle.getBoundingClientRect();
        const finish = target.getBoundingClientRect();
        const startX = start.left + start.width / 2;
        const startY = start.top + start.height / 2;
        const endX = finish.left + finish.width / 2;
        const endY = finish.top + 50;
        const mouse = (target: EventTarget, type: string, x: number, y: number, buttons = 1): void => {
            const event = new MouseEvent(type, { view: window, bubbles: true, cancelable: true, detail: 1, buttons, button: 0, clientX: x, clientY: y });
            // Synthetic MouseEvents need page coordinates matching the scrolled viewport.
            Object.defineProperties(event, { pageX: { value: x + window.scrollX }, pageY: { value: y + window.scrollY } });
            target.dispatchEvent(event);
        };
        // detail=1 models a real mouse press; CDK ignores detail=0 screen-reader activation.
        mouse(handle, 'mousedown', startX, startY);
        mouse(document, 'mousemove', startX + 12, startY + 12);
        await frames();
        mouse(document, 'mousemove', endX, endY);
        await frames();
        const hit = document.elementFromPoint(endX, endY)?.closest('[data-stage]')?.getAttribute('data-stage');
        mouse(document, 'mouseup', endX, endY, 0);
        const deadline = performance.now() + 2000;
        while (!component.requestCount() && performance.now() < deadline) {
            await frames();
            fixture.detectChanges();
        }
        expect(started).withContext('The pointer gesture must start CDK dragging').toBeTrue();
        expect(component.requestCount()).withContext(JSON.stringify({ predicateCalls, entered, hit, dropDescription, startX, startY, endX, endY, error: component.error() })).toBe(1);
        expect(ids('review')).toContain(1);
        await settled();
        expect(ids('todo')).not.toContain(1);
    });
});
