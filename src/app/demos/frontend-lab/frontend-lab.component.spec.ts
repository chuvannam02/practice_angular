import {
    ComponentFixture,
    DeferBlockBehavior,
    DeferBlockState,
    TestBed,
    fakeAsync,
    tick,
} from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { FrontendLabComponent } from './frontend-lab.component';
import { LabMetrics } from './lab-metrics';

describe('FrontendLabComponent', () => {
    let fixture: ComponentFixture<FrontendLabComponent>;
    let component: FrontendLabComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [FrontendLabComponent],
            providers: [provideNoopAnimations()],
            deferBlockBehavior: DeferBlockBehavior.Manual,
        }).compileComponents();
        fixture = TestBed.createComponent(FrontendLabComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    });

    function click(selector: string): void {
        const button: HTMLButtonElement = fixture.nativeElement.querySelector(selector);
        expect(button).not.toBeNull();
        button.click();
        fixture.detectChanges();
    }

    it('appends views on one side but preserves the same DOM and view id on the other', () => {
        click('[data-person-id="1"]');
        const reused: HTMLElement = fixture.nativeElement.querySelector('[data-demo="reuse-view"] .detail-view');
        const viewId = reused.getAttribute('data-view-id');

        click('[data-person-id="2"]');
        expect(fixture.nativeElement.querySelector('[data-demo="reuse-view"] .detail-view')).toBe(reused);
        expect(reused.textContent).toContain('Trần Bình');
        expect(reused.getAttribute('data-view-id')).toBe(viewId);

        click('[data-person-id="1"]');
        expect(fixture.nativeElement.querySelectorAll('[data-demo="append-views"] .detail-view').length).toBe(3);
        expect(component.appendViewCount).toBe(3);
        expect(component.reuseViewCount).toBe(1);
        expect(reused.textContent).toContain('Nguyễn An');
    });

    it('bounds the accumulating example to five views', () => {
        for (let index = 0; index < 12; index++) {
            component.showPerson(component.people[index % 2]);
        }
        fixture.detectChanges();

        expect(component.appendViewCount).toBe(5);
        expect(component.reuseViewCount).toBe(1);
        expect(fixture.nativeElement.querySelectorAll('[data-demo="append-views"] .detail-view').length).toBe(5);
    });

    it('detaches and reinserts the same view, then clears it and creates a fresh view', () => {
        click('[data-person-id="1"]');
        const reused: HTMLElement = fixture.nativeElement.querySelector('[data-demo="reuse-view"] .detail-view');

        click('[data-action="detach-view"]');
        expect(component.isViewDetached).toBeTrue();
        expect(component.reuseViewCount).toBe(0);
        expect(fixture.nativeElement.querySelector('[data-demo="reuse-view"] .detail-view')).toBeNull();

        click('[data-action="detach-view"]');
        expect(component.isViewDetached).toBeFalse();
        expect(fixture.nativeElement.querySelector('[data-demo="reuse-view"] .detail-view')).toBe(reused);

        click('[data-action="detach-view"]');
        click('[data-action="clear-views"]');
        expect(component.isViewDetached).toBeFalse();
        expect(component.appendViewCount).toBe(0);
        expect(component.reuseViewCount).toBe(0);

        click('[data-person-id="2"]');
        expect(fixture.nativeElement.querySelector('[data-demo="reuse-view"] .detail-view')).not.toBe(reused);
    });

    it('reuses pure pipe and computed results during ten unchanged checks', () => {
        click('[data-action="same-input"]');

        expect(component.calculationResult).toEqual({ method: 10, pipe: 0, computed: 0 });
        const results = [...fixture.nativeElement.querySelectorAll('.result')] as HTMLElement[];
        expect(results.map((element) => element.textContent?.trim())).toEqual([
            'angular ng-zorro', 'angular ng-zorro', 'angular ng-zorro',
        ]);
    });

    it('recalculates all three bindings once when the input changes', () => {
        click('[data-action="change-input"]');

        expect(component.calculationResult).toEqual({ method: 1, pipe: 1, computed: 1 });
        expect(component.normalizedComputed()).toBe('angular lần 1');

        click('[data-action="same-input"]');
        expect(component.calculationResult).toEqual({ method: 10, pipe: 0, computed: 0 });
    });

    it('stops the timer when its component closes and starts a single new timer on reopening', fakeAsync(() => {
        click('[data-action="toggle-ticker"]');
        tick(1000);
        component.captureTicks();
        expect(component.tickerSnapshot).toBe(2);

        click('[data-action="toggle-ticker"]');
        tick(2000);
        component.captureTicks();
        expect(component.tickerSnapshot).toBe(2);

        click('[data-action="toggle-ticker"]');
        tick(500);
        component.captureTicks();
        expect(component.tickerSnapshot).toBe(3);
        click('[data-action="toggle-ticker"]');
    }));

    it('cleans up an active timer when the entire lab is destroyed', fakeAsync(() => {
        const metrics = fixture.debugElement.injector.get(LabMetrics);
        click('[data-action="toggle-ticker"]');
        tick(500);
        const before = metrics.timerTicks;

        fixture.destroy();
        tick(1500);

        expect(metrics.timerTicks).toBe(before);
    }));

    it('renders the real deferred report only after its defer block completes', async () => {
        expect(fixture.nativeElement.querySelector('[data-demo="lazy-report"]')).toBeNull();
        expect(fixture.nativeElement.querySelector('[data-demo="report-placeholder"]')).not.toBeNull();

        const blocks = await fixture.getDeferBlocks();
        expect(blocks.length).toBe(1);
        await blocks[0].render(DeferBlockState.Complete);
        fixture.detectChanges();
        await fixture.whenStable();

        expect(fixture.nativeElement.querySelector('[data-demo="lazy-report"]')).not.toBeNull();
        expect(fixture.nativeElement.querySelector('[data-demo="report-placeholder"]')).toBeNull();
    });

    it('compresses actual UTF-8 sample bytes with gzip and reports the measured result', async () => {
        const pending = component.compressSample();
        expect(component.isCompressing).toBeTrue();
        await pending;
        fixture.detectChanges();

        expect(component.compressionError).toBe('');
        expect(component.isCompressing).toBeFalse();
        expect(component.compressionResult).not.toBeNull();
        expect(component.compressionResult!.bytes).toBeGreaterThan(0);
        expect(component.compressionResult!.bytes).toBeLessThan(component.sampleBytes);
        expect(component.compressionResult!.savedPercent).toBeGreaterThan(0);
        expect(component.compressionResult!.savedPercent).toBeLessThan(100);
    });
});
