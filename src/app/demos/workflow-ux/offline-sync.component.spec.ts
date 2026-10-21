import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { OFFLINE_DEMO_STORE_FACTORY, OfflineSyncComponent } from './offline-sync.component';
import { OfflineDemoStore } from './offline-demo.store';

describe('OfflineSyncComponent', () => {
    let name: string;
    let fixtures: ComponentFixture<OfflineSyncComponent>[];
    let stores: OfflineDemoStore[];
    async function until(condition: () => boolean): Promise<void> {
        const deadline = Date.now() + 3500;
        while (!condition()) {
            if (Date.now() > deadline) throw new Error('Timed out waiting for demo state');
            await new Promise(resolve => setTimeout(resolve, 20));
        }
    }
    async function createFixture(offline = false): Promise<ComponentFixture<OfflineSyncComponent>> {
        const fixture = TestBed.createComponent(OfflineSyncComponent);
        fixtures.push(fixture);
        fixture.componentInstance.mockOffline.set(offline);
        fixture.detectChanges();
        await until(() => fixture.componentInstance.ready() && !fixture.componentInstance.syncing());
        return fixture;
    }
    beforeEach(async () => {
        name = `offline-ui-spec-${crypto.randomUUID()}`;
        fixtures = []; stores = [];
        await TestBed.configureTestingModule({
            imports: [OfflineSyncComponent], providers: [provideNoopAnimations(), {
                provide: OFFLINE_DEMO_STORE_FACTORY, useValue: () => {
                    const store = new OfflineDemoStore(name); stores.push(store); return store;
                },
            }],
        }).compileComponents();
    });
    afterEach(async () => {
        fixtures.forEach(fixture => fixture.destroy());
        stores.forEach(store => store.close());
        await new Promise<void>((resolve, reject) => {
            const request = indexedDB.deleteDatabase(name);
            request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
        });
    });

    it('persists an offline create through remount and automatically syncs when connectivity returns', async () => {
        const original = await createFixture(true);
        const component = original.componentInstance;
        component.newTitle.setValue('Offline UI');
        await component.create();
        const key = component.jobs()[0].key;
        expect(component.records().length).toBe(2);
        expect(component.newTitle.value).toBe('');
        original.destroy();
        const restored = (await createFixture(true)).componentInstance;
        expect(restored.jobs()[0].key).toBe(key);
        restored.toggleOffline(false);
        await until(() => !restored.syncing() && restored.jobs().length === 0);
        expect(restored.records().filter(row => row.title === 'Offline UI').length).toBe(1);
    });

    it('keeps an unknown create visible and retries it without adding another record', async () => {
        const component = (await createFixture()).componentInstance;
        component.loseNextReply.set(true);
        component.newTitle.setValue('Uncertain response');
        await component.create();
        expect(component.jobs()[0].status).toBe('unknown');
        expect(component.error()).toContain('Mất phản hồi');
        const id = component.records().find(row => row.title === 'Uncertain response')!.id;
        await component.drain();
        expect(component.jobs().length).toBe(0);
        expect(component.records().filter(row => row.title === 'Uncertain response').map(row => row.id)).toEqual([id]);
        expect(component.message()).toContain('kết quả cũ');
    });

    it('keeps a stale edit after another tab updates or deletes instead of overwriting/resurrecting', async () => {
        const tabA = (await createFixture()).componentInstance;
        const tabB = (await createFixture()).componentInstance;
        tabA.edit(tabA.records().find(row => row.id === 'demo-a')!);
        tabB.edit(tabB.records().find(row => row.id === 'demo-a')!);
        tabA.editTitle.setValue('New version from A');
        await tabA.saveEdit();
        tabB.editTitle.setValue('Draft B must survive');
        await tabB.saveEdit();
        expect(tabB.error()).toContain('Version');
        expect(tabB.editing()!.version).toBe(1);
        expect(tabB.editTitle.value).toBe('Draft B must survive');
        const second = tabB.records().find(row => row.id === 'demo-b')!;
        tabB.edit(second);
        tabB.editTitle.setValue('Draft after deletion');
        await tabA.remove(tabA.records().find(row => row.id === 'demo-b')!);
        await tabB.saveEdit();
        expect(tabB.error()).toContain('đã bị xóa');
        expect(tabB.editTitle.value).toBe('Draft after deletion');
        expect(tabB.records().some(row => row.id === second.id)).toBeFalse();
    });

    it('retains typed input if the durable enqueue fails', async () => {
        const fixture = await createFixture();
        const component = fixture.componentInstance;
        spyOn(stores[0], 'enqueue').and.rejectWith(new DOMException('Disk quota exceeded', 'QuotaExceededError'));
        component.newTitle.setValue('Do not lose my input');
        await component.create();
        fixture.detectChanges();
        expect(component.newTitle.value).toBe('Do not lose my input');
        expect(component.jobs().length).toBe(0);
        expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Chưa lưu được');
    });
});
