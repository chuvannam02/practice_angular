import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { OptimisticUxComponent } from './optimistic-ux.component';

describe('OptimisticUxComponent', () => {
    let fixture: ComponentFixture<OptimisticUxComponent>;
    let component: OptimisticUxComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OptimisticUxComponent], providers: [provideNoopAnimations()],
        }).compileComponents();
        fixture = TestBed.createComponent(OptimisticUxComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('renders the optimistic state before confirmation and blocks overlapping requests', fakeAsync(() => {
        const button = fixture.nativeElement.querySelector('[data-action="toggle-like"]') as HTMLButtonElement;
        button.click();
        fixture.detectChanges();
        expect(button.getAttribute('aria-pressed')).toBe('true');
        expect(button.textContent).toContain('25');
        expect(button.disabled).toBeTrue();
        expect(component.confirmed()).toEqual({ liked: false, count: 24 });
        component.toggle(); // Protect non-DOM callers as well as disabled buttons.
        expect(component.requests()).toBe(1);
        tick(800);
        fixture.detectChanges();
        expect(component.confirmed()).toEqual({ liked: true, count: 25 });
        expect(button.disabled).toBeFalse();
    }));

    it('rolls back both state and count on error, then retries the same intent successfully', fakeAsync(() => {
        component.failNext.set(true);
        component.toggle();
        expect(component.state()).toEqual({ liked: true, count: 25 });
        tick(800);
        fixture.detectChanges();
        expect(component.state()).toEqual({ liked: false, count: 24 });
        expect(component.confirmed()).toEqual(component.state());
        expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
        fixture.nativeElement.querySelector('[data-action="retry-like"]').click();
        expect(component.state()).toEqual({ liked: true, count: 25 });
        tick(800);
        fixture.detectChanges();
        expect(component.error()).toBe('');
        expect(component.failedTarget()).toBeNull();
        expect(component.confirmed()).toEqual(component.state());
        expect(component.requests()).toBe(2);
    }));

    it('restores an already liked item when an unlike request fails', fakeAsync(() => {
        component.toggle();
        tick(800);
        component.failNext.set(true);
        component.toggle();
        expect(component.state()).toEqual({ liked: false, count: 24 });
        tick(800);
        expect(component.state()).toEqual({ liked: true, count: 25 });
        expect(component.failedTarget()).toBeFalse();
    }));

    it('cancels pending confirmation when the component is destroyed', fakeAsync(() => {
        component.toggle();
        fixture.destroy();
        tick(800);
        expect(component.confirmed()).toEqual({ liked: false, count: 24 });
        expect(component.pending()).toBeFalse();
    }));

    it('updates plain properties and signals from the same template event with OnPush', () => {
        fixture.nativeElement.querySelector('[data-action="increment-both"]').click();
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('[data-demo="regular-count"]').textContent.trim()).toBe('1');
        expect(fixture.nativeElement.querySelector('[data-demo="signal-count"]').textContent.trim()).toBe('1');
        expect(component.doubled()).toBe(2);
    });
});
