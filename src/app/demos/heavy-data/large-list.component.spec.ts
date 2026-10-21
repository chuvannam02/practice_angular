import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { LargeListComponent } from './large-list.component';

describe('LargeListComponent', () => {
    let fixture: ComponentFixture<LargeListComponent>;
    let component: LargeListComponent;
    const frames = (): Promise<void> => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    async function until(predicate: () => boolean): Promise<void> {
        const deadline = performance.now() + 4000;
        while (!predicate()) {
            if (performance.now() > deadline) throw new Error('Timed out waiting for list preparation/render');
            await frames();
            fixture.detectChanges();
        }
    }

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [LargeListComponent], providers: [provideNoopAnimations()],
        }).compileComponents();
        fixture = TestBed.createComponent(LargeListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
    });

    it('allocates only on demand, bounds rendered rows and preserves checkbox state across recycled views', async () => {
        expect(component.rows().length).toBe(0);
        component.load();
        fixture.detectChanges();
        // A direct method call may schedule work outside NgZone; await actual state.
        await until(() => !component.loading());
        fixture.detectChanges();
        await frames();
        fixture.detectChanges();
        expect(component.rows().length).toBe(20000);
        const rowCount = fixture.nativeElement.querySelectorAll('.virtual-row').length;
        expect(rowCount).toBeGreaterThan(0);
        expect(rowCount).toBeLessThan(30);
        const firstCheckbox = fixture.nativeElement.querySelector('[data-row-id="1"] input') as HTMLInputElement;
        firstCheckbox.click();
        fixture.detectChanges();
        await fixture.whenStable();
        expect(component.selectedIds().has(1)).toBeTrue();

        component.jumpToEnd();
        component.viewport.elementRef.nativeElement.dispatchEvent(new Event('scroll'));
        await until(() => !!fixture.nativeElement.querySelector('[data-row-id="20000"]'));
        expect(fixture.nativeElement.querySelector('[data-row-id="20000"]')).not.toBeNull();
        expect(fixture.nativeElement.querySelector('[data-row-id="1"]')).toBeNull();
        component.viewport.scrollToIndex(0);
        component.viewport.elementRef.nativeElement.dispatchEvent(new Event('scroll'));
        await until(() => !!fixture.nativeElement.querySelector('[data-row-id="1"]'));
        await fixture.whenStable();
        fixture.detectChanges();
        expect((fixture.nativeElement.querySelector('[data-row-id="1"] input') as HTMLInputElement).checked).toBeTrue();
    });

    it('supports user interaction and cancels partial preparation without committing it', fakeAsync(() => {
        component.load();
        tick(482);
        fixture.detectChanges();
        expect(component.loading()).toBeTrue();
        expect(component.progress()).toBeGreaterThan(0);
        fixture.nativeElement.querySelector('[data-action="probe-ui"]').click();
        expect(component.probeCount()).toBe(1);
        fixture.nativeElement.querySelector('[data-action="cancel-large-list"]').click();
        tick(1000);
        expect(component.loading()).toBeFalse();
        expect(component.rows().length).toBe(0);
        expect(component.feedback()).toContain('Đã hủy');
    }));

    it('debounces normalized queries and keeps selection when its row is filtered out', fakeAsync(() => {
        component.rows.set([
            { id: 1, name: 'Hồ sơ An', group: 'Nhóm 1', searchText: 'ho so an nhom 1' },
            { id: 2, name: 'Hồ sơ Bình', group: 'Nhóm 2', searchText: 'ho so binh nhom 2' },
        ]);
        component.select(1, true);
        component.search('an');
        tick(100);
        component.search('BÌNH');
        tick(199);
        expect(component.filteredRows().length).toBe(2);
        tick(1);
        expect(component.filteredRows().map(row => row.id)).toEqual([2]);
        expect(component.selectedIds().has(1)).toBeTrue();
        component.selectFiltered();
        expect(component.selectedIds().size).toBe(2);
        fixture.destroy();
    }));

    it('retains previous data on cancellation and cancels scheduled work on destruction', fakeAsync(() => {
        const original = [{ id: 1, name: 'An', group: '1', searchText: 'an 1' }];
        component.rows.set(original);
        component.select(1, true);
        component.load();
        tick(100);
        component.cancelLoad();
        tick(1000);
        expect(component.rows()).toBe(original);
        expect(component.selectedIds().has(1)).toBeTrue();
        component.load();
        tick(482);
        fixture.destroy();
        tick(1000);
        expect(component.rows()).toBe(original);
        expect(component.loading()).toBeFalse();
    }));
});
