import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { DemoSwitchComponent } from './demo-switch.component';
import { PracticalTablesComponent } from './practical-tables.component';

describe('PracticalTablesComponent', () => {
    let fixture: ComponentFixture<PracticalTablesComponent>;
    let component: PracticalTablesComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [PracticalTablesComponent],
            providers: [provideNoopAnimations()],
        }).compileComponents();
        fixture = TestBed.createComponent(PracticalTablesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
    });

    function render(): void {
        fixture.detectChanges();
        tick(16);
        fixture.detectChanges();
    }

    function checkbox(index: number): HTMLInputElement {
        return fixture.nativeElement.querySelectorAll('input[type="checkbox"]')[index];
    }

    function instances(mode: 'with-track-by' | 'without-track-by'): Map<number, DemoSwitchComponent> {
        const panel = fixture.debugElement.query(By.css(`[data-demo="${mode}"]`));
        return new Map(
            panel.queryAll(By.directive(DemoSwitchComponent)).map((node) => [
                Number(node.nativeElement.closest('tr').getAttribute('data-user-id')),
                node.componentInstance as DemoSwitchComponent,
            ]),
        );
    }

    it('loads orders from checkbox clicks and ignores the slower previous selection', fakeAsync(() => {
        checkbox(0).click();
        render();
        expect(component.selectedCustomer?.id).toBe(1);
        expect(component.ordersLoading).toBeTrue();
        expect(fixture.nativeElement.querySelectorAll('[data-panel="customers"] .row-heading nz-spin').length).toBe(1);
        expect(fixture.nativeElement.querySelector('.orders-panel .ant-spin-spinning')).not.toBeNull();

        tick(100);
        checkbox(1).click();
        render();
        tick(600);
        render();

        expect(component.selectedCustomer?.id).toBe(2);
        expect(component.orders.length).toBe(3);
        expect(component.orders.every((order) => order.customerId === 2)).toBeTrue();
        expect(checkbox(0).checked).toBeFalse();
        expect(checkbox(1).checked).toBeTrue();

        tick(1200);
        expect(component.orders.every((order) => order.customerId === 2)).toBeTrue();
        expect(component.ordersLoading).toBeFalse();
        render();
        expect(fixture.nativeElement.querySelector('[data-panel="customers"] .row-heading nz-spin')).toBeNull();
    }));

    it('joins both tables without a gap and aligns column headers above checkbox row headers', fakeAsync(() => {
        render();
        const left: HTMLElement = fixture.nativeElement.querySelector('[data-panel="customers"]');
        const right: HTMLElement = fixture.nativeElement.querySelector('[data-panel="orders"]');
        const leftHeader = left.querySelector('thead')!;
        const rightHeader = right.querySelector('thead')!;

        expect(Math.abs(left.getBoundingClientRect().right - right.getBoundingClientRect().left)).toBeLessThanOrEqual(1);
        expect(Math.abs(leftHeader.getBoundingClientRect().top - rightHeader.getBoundingClientRect().top)).toBeLessThanOrEqual(1);
        expect(left.querySelectorAll('thead th[scope="col"]').length).toBe(2);
        expect(right.querySelectorAll('thead th[scope="col"]').length).toBe(2);
        expect(left.querySelectorAll('tbody th[scope="row"] input[type="checkbox"]').length).toBe(4);

        checkbox(1).click();
        render();
        tick(600);
        render();

        expect(right.querySelectorAll('tbody th[scope="row"]').length).toBe(3);
        expect(right.textContent).toContain('DH-0201');
        expect(Math.abs(leftHeader.getBoundingClientRect().top - rightHeader.getBoundingClientRect().top)).toBeLessThanOrEqual(1);
    }));

    it('cancels the request and clears table B when its customer is unchecked', fakeAsync(() => {
        checkbox(0).click();
        render();
        checkbox(0).click();
        render();
        tick(1500);
        render();

        expect(component.selectedCustomer).toBeNull();
        expect(component.orders).toEqual([]);
        expect(component.ordersLoading).toBeFalse();
    }));

    it('recovers after an API error and supports a customer with no orders', fakeAsync(() => {
        component.selectCustomer(component.customers[1], true);
        tick(600);
        component.reloadOrders(true);
        tick(600);
        render();

        expect(component.ordersError).toContain('Không tải được');
        expect(component.orders).toEqual([]);
        expect(component.ordersLoading).toBeFalse();

        component.reloadOrders();
        tick(600);
        render();
        expect(component.ordersError).toBe('');
        expect(component.orders.length).toBe(3);

        component.selectCustomer(component.customers[3], true);
        tick(600);
        render();
        expect(component.ordersError).toBe('');
        expect(component.orders).toEqual([]);
        expect(fixture.nativeElement.textContent).toContain('Khách chưa có đơn hàng');
    }));

    it('recreates untracked switches but preserves tracked instances after a full API reload', fakeAsync(() => {
        const beforeWithout = instances('without-track-by');
        const beforeWith = instances('with-track-by');
        expect(beforeWith.size).toBe(4);

        component.reloadUsers();
        tick(650);
        render();

        const afterWithout = instances('without-track-by');
        const afterWith = instances('with-track-by');
        for (const id of [1, 2, 3, 4]) {
            expect(afterWithout.get(id)).not.toBe(beforeWithout.get(id));
            expect(afterWith.get(id)).toBe(beforeWith.get(id));
        }
    }));

    it('loads only the clicked row and preserves tracked switches after saving it', fakeAsync(() => {
        const beforeWith = instances('with-track-by');
        const beforeWithout = instances('without-track-by');
        const switchButton: HTMLButtonElement = fixture.nativeElement.querySelector(
            '[data-demo="with-track-by"] [data-user-id="2"] app-demo-switch button',
        );
        switchButton.click();
        render();

        expect(component.pendingUserIds.has(2)).toBeTrue();
        for (const [id, instance] of instances('with-track-by')) {
            expect(instance.loading).toBe(id === 2);
        }
        expect(component.usersWithTrackBy.find((user) => user.id === 2)?.enabled).toBeFalse();

        tick(650);
        render();

        expect(component.usersWithTrackBy.find((user) => user.id === 2)?.enabled).toBeTrue();
        expect(component.usersWithoutTrackBy.find((user) => user.id === 2)?.enabled).toBeTrue();
        expect(component.pendingUserIds.size).toBe(0);
        for (const id of [1, 2, 3, 4]) {
            expect(instances('with-track-by').get(id)).toBe(beforeWith.get(id));
            expect(instances('without-track-by').get(id)).not.toBe(beforeWithout.get(id));
        }
    }));

    it('keeps a failed save unchanged and permits retrying the same row', fakeAsync(() => {
        const beforeWith = instances('with-track-by');
        component.failNextSave = true;
        component.updateUser(2, true);
        tick(650);
        render();

        expect(component.usersWithTrackBy.find((user) => user.id === 2)?.enabled).toBeFalse();
        expect(component.pendingUserIds.size).toBe(0);
        expect(component.usersMessage).toContain('thất bại');
        expect(instances('with-track-by').get(2)).toBe(beforeWith.get(2));

        component.updateUser(2, true);
        tick(650);
        render();
        expect(component.usersWithTrackBy.find((user) => user.id === 2)?.enabled).toBeTrue();
    }));

    it('supports keyboard activation and ignores another toggle while the row is saving', fakeAsync(() => {
        const button: HTMLButtonElement = fixture.nativeElement.querySelector(
            '[data-demo="with-track-by"] [data-user-id="2"] app-demo-switch button',
        );
        button.dispatchEvent(new KeyboardEvent('keydown', {
            key: ' ', bubbles: true, cancelable: true,
        }));
        render();
        expect(component.pendingUserIds.has(2)).toBeTrue();

        button.click();
        tick(650);
        render();

        expect(component.usersWithTrackBy.find((user) => user.id === 2)?.enabled).toBeTrue();
        expect(component.pendingUserIds.size).toBe(0);
    }));

    it('keeps each tracked switch attached to its id when the server reverses row order', fakeAsync(() => {
        const beforeWith = instances('with-track-by');
        component.reloadUsers(true);
        tick(650);
        render();

        expect(component.usersWithTrackBy.map((user) => user.id)).toEqual([4, 3, 2, 1]);
        expect([...instances('with-track-by').keys()]).toEqual([4, 3, 2, 1]);
        for (const id of [1, 2, 3, 4]) {
            expect(instances('with-track-by').get(id)).toBe(beforeWith.get(id));
        }
    }));

    it('saves independent rows concurrently without losing either change', fakeAsync(() => {
        component.updateUser(1, false);
        component.updateUser(2, true);
        expect(component.pendingUserIds.size).toBe(2);
        tick(650);
        render();

        expect(component.usersWithTrackBy.find((user) => user.id === 1)?.enabled).toBeFalse();
        expect(component.usersWithTrackBy.find((user) => user.id === 2)?.enabled).toBeTrue();
        expect(component.pendingUserIds.size).toBe(0);
    }));
});
