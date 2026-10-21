import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { InViewOnceDirective } from './in-view-once.directive';

@Component({ standalone: true, imports: [InViewOnceDirective], template: '<div appInViewOnce #view="appInViewOnce" (entered)="count = count + 1">{{ view.unsupported() }}</div>' })
class HostComponent { count = 0; }

describe('InViewOnceDirective', () => {
    it('waits for a positive viewport intersection, emits once and disconnects', () => {
        let callback!: IntersectionObserverCallback;
        const observer = jasmine.createSpyObj<IntersectionObserver>('observer', ['observe', 'disconnect']);
        const constructor = spyOn(window, 'IntersectionObserver').and.callFake(function(cb) { callback = cb; return observer; });
        const fixture = TestBed.createComponent(HostComponent);
        fixture.detectChanges();
        const enter = (intersecting: boolean, width: number, height: number): void => callback([
            { isIntersecting: intersecting, intersectionRect: { width, height } } as IntersectionObserverEntry,
        ], observer);
        expect(constructor.calls.mostRecent().args[1]).toEqual({ root: null, rootMargin: '0px', threshold: 0.001 });
        enter(false, 100, 100);
        enter(true, 0, 100);
        expect(fixture.componentInstance.count).toBe(0);
        enter(true, 100, 100);
        enter(true, 100, 100);
        expect(fixture.componentInstance.count).toBe(1);
        expect(observer.disconnect).toHaveBeenCalledTimes(1);
        fixture.destroy();
        expect(observer.disconnect).toHaveBeenCalledTimes(2);
    });

    it('disconnects an observer even if the image was never visible', () => {
        const observer = jasmine.createSpyObj<IntersectionObserver>('observer', ['observe', 'disconnect']);
        spyOn(window, 'IntersectionObserver').and.returnValue(observer);
        const fixture = TestBed.createComponent(HostComponent);
        fixture.detectChanges();
        fixture.destroy();
        expect(observer.disconnect).toHaveBeenCalledTimes(1);
        expect(fixture.componentInstance.count).toBe(0);
    });
});
