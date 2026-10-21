import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { FolderBrowserComponent } from './folder-browser.component';

describe('FolderBrowserComponent', () => {
    let fixture: ComponentFixture<FolderBrowserComponent>;
    let component: FolderBrowserComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [FolderBrowserComponent], providers: [provideNoopAnimations()],
        }).compileComponents();
        fixture = TestBed.createComponent(FolderBrowserComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
    });

    it('loads only one page on demand and deduplicates an identical pending request', fakeAsync(() => {
        expect(component.requestCount()).toBe(0);
        component.start();
        component.start();
        expect(component.requestCount()).toBe(1);
        expect(component.loading()).toBeTrue();
        tick(400);
        expect(component.items().length).toBe(20);
        expect(component.total()).toBe(73);
        expect(component.cacheSize()).toBe(1);
        expect(component.loading()).toBeFalse();
    }));

    it('allows breadcrumb navigation while loading and never commits the cancelled child response', fakeAsync(() => {
        component.start();
        tick(400);
        component.open(component.items()[0]);
        tick(100);
        fixture.detectChanges();
        expect(component.loading()).toBeTrue();
        fixture.nativeElement.querySelector('[data-ancestor-index="0"]').click();
        fixture.detectChanges();
        expect(component.loading()).toBeFalse();
        expect(component.current().id).toBe('root');
        tick(1000);
        expect(component.items()[0].id).toBe('root/1');
        expect(component.cacheSize()).toBe(1);
        expect(component.requestCount()).toBe(2);
        expect(component.cacheHits()).toBe(1);
    }));

    it('reuses cached pages and keeps page data scoped to the parent id', fakeAsync(() => {
        component.start();
        tick(400);
        const child = component.items()[0];
        component.open(child);
        tick(700);
        component.changePage(2);
        tick(700);
        expect(component.items()[0].id).toBe('root/1/21');
        component.changePage(1);
        expect(component.items()[0].id).toBe('root/1/1');
        component.ancestor(0);
        component.open(child);
        expect(component.items()[0].id).toBe('root/1/1');
        expect(component.requestCount()).toBe(3);
        expect(component.cacheHits()).toBe(3);
    }));

    for (const problem of ['network', 'cycle'] as const) {
        it(`shows ${problem} errors without poisoning cache or ending the navigation stream`, fakeAsync(() => {
            component.start();
            tick(400);
            component.nextProblem.set(problem);
            component.reload();
            tick(400);
            fixture.detectChanges();
            expect(component.error()).not.toBe('');
            expect(component.loaded()).toBeFalse();
            expect(component.cacheSize()).toBe(0);
            expect(component.items().length).toBe(0);
            expect(fixture.nativeElement.querySelector('[data-demo="folder-error"]')).not.toBeNull();
            fixture.nativeElement.querySelector('[data-action="retry-folders"]').click();
            tick(400);
            expect(component.loaded()).toBeTrue();
            expect(component.error()).toBe('');
            expect(component.items().length).toBe(20);
            expect(component.requestCount()).toBe(3);
        }));
    }

    it('distinguishes a successfully loaded empty folder from loading and errors', fakeAsync(() => {
        component.start();
        tick(400);
        component.open(component.items()[6]);
        tick(700);
        expect(component.current().id).toBe('root/7');
        expect(component.loaded()).toBeTrue();
        expect(component.total()).toBe(0);
        expect(component.items()).toEqual([]);
        expect(component.error()).toBe('');
        expect(component.loading()).toBeFalse();
    }));

    it('evicts old pages when the LRU limit is exceeded', fakeAsync(() => {
        component.start();
        tick(400);
        const children = component.items().filter(item => item.hasChildren).slice(0, 10);
        for (const child of children) {
            component.open(child);
            tick(700);
            expect(component.cacheSize()).toBeLessThanOrEqual(8);
            component.ancestor(0);
        }
        expect(component.cacheSize()).toBe(8);
        const before = component.requestCount();
        component.open(children[0]);
        expect(component.loading()).toBeTrue();
        expect(component.requestCount()).toBe(before + 1);
        tick(700);
    }));

    it('cancels explicitly, can retry, and releases pending work on destruction', fakeAsync(() => {
        component.start();
        tick(100);
        component.cancel();
        tick(1000);
        expect(component.loading()).toBeFalse();
        expect(component.cancelled()).toBeTrue();
        expect(component.loaded()).toBeFalse();
        expect(component.cacheSize()).toBe(0);
        component.reload();
        tick(400);
        expect(component.loaded()).toBeTrue();
        component.open(component.items()[0]);
        fixture.destroy();
        tick(1000);
        expect(component.loading()).toBeFalse();
        expect(component.items()).toEqual([]);
        expect(component.cacheSize()).toBe(1);
    }));
});
