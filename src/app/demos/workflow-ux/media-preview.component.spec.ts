import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { firstValueFrom } from 'rxjs';
import { demoPdf } from './demo-pdf';
import { MediaPreviewComponent } from './media-preview.component';

describe('MediaPreviewComponent', () => {
    let fixture: ComponentFixture<MediaPreviewComponent>;
    let component: MediaPreviewComponent;
    let modals: NzModalService;
    const frames = (): Promise<void> => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    async function close(ref: NzModalRef): Promise<void> {
        const closed = firstValueFrom(ref.afterClose);
        ref.destroy();
        fixture.detectChanges();
        await closed;
        fixture.detectChanges();
        await frames();
    }

    beforeEach(async () => {
        spyOn(window, 'IntersectionObserver').and.returnValue(jasmine.createSpyObj<IntersectionObserver>('observer', ['observe', 'disconnect']));
        await TestBed.configureTestingModule({
            imports: [MediaPreviewComponent],
            providers: [provideNoopAnimations()],
        }).compileComponents();
        fixture = TestBed.createComponent(MediaPreviewComponent);
        component = fixture.componentInstance;
        modals = fixture.debugElement.injector.get(NzModalService);
        fixture.detectChanges();
        await fixture.whenStable();
    });

    afterEach(async () => {
        while (modals.openModals.length) await close(modals.openModals[modals.openModals.length - 1]);
    });

    it('does not attach image URLs before visibility, keeps a skeleton until load and offers retry', () => {
        expect(fixture.nativeElement.querySelector('img')).toBeNull();
        component.revealImage(1);
        fixture.detectChanges();
        const image = fixture.nativeElement.querySelector('img') as HTMLImageElement;
        expect(image.loading).toBe('eager'); // IntersectionObserver already gates the request.
        expect(image.getAttribute('width')).toBe('480');
        expect(image.getAttribute('height')).toBe('300');
        expect(fixture.nativeElement.querySelector('.image-skeleton.is-loading')).not.toBeNull();
        image.dispatchEvent(new Event('load'));
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.image-skeleton.is-loading')).toBeNull();
        image.dispatchEvent(new Event('error'));
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.image-fallback')).not.toBeNull();
        component.retryImage(1);
        expect(component.revisions()[1]).toBe(1);
        expect(component.imageStates()[1]).toBeUndefined();
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('img').src).toContain('preview=1');
    });

    it('opens only one PDF iframe on demand and releases each blob after closing', async () => {
        const create = spyOn(URL, 'createObjectURL').and.callThrough();
        const revoke = spyOn(URL, 'revokeObjectURL').and.callThrough();
        expect(document.querySelector('iframe.pdf-preview')).toBeNull();
        await component.readFile(demoPdf());
        fixture.detectChanges();
        await frames();
        expect(document.querySelectorAll('iframe.pdf-preview').length).toBe(1);
        expect(component.objectUrlCount()).toBe(1);
        await component.readFile(demoPdf());
        expect(create.calls.count()).toBe(1);
        const originalUrl = component.preview()!.url;
        await close(modals.openModals[0]);
        expect(revoke).toHaveBeenCalledOnceWith(originalUrl);
        expect(component.objectUrlCount()).toBe(0);
        await component.readFile(demoPdf());
        expect(component.preview()!.url).not.toBe(originalUrl);
        await close(modals.openModals[0]);
        expect(revoke.calls.count()).toBe(2);
    });

    it('rejects unsupported, oversized and mismatched files before creating blob URLs', async () => {
        const create = spyOn(URL, 'createObjectURL').and.callThrough();
        await component.readFile(new File(['<svg/>'], 'x.svg', { type: 'image/svg+xml' }));
        expect(component.error()).not.toBe('');
        await component.readFile(new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.pdf', { type: 'application/pdf' }));
        expect(component.error()).toContain('10 MB');
        await component.readFile(new File(['<html>not PDF</html>'], 'fake.pdf', { type: 'application/pdf' }));
        expect(component.error()).toContain('không khớp');
        expect(create).not.toHaveBeenCalled();
    });

    it('ignores an obsolete file read after a newer selection', async () => {
        const create = spyOn(URL, 'createObjectURL').and.callThrough();
        let finish!: (value: ArrayBuffer) => void;
        const pending = new Promise<ArrayBuffer>(resolve => finish = resolve);
        const older = demoPdf();
        spyOn(older, 'slice').and.returnValue({ arrayBuffer: () => pending } as Blob);
        const olderRead = component.readFile(older);
        await component.readFile(demoPdf());
        finish(new TextEncoder().encode('%PDF-1.4').buffer);
        await olderRead;
        expect(create.calls.count()).toBe(1);
        expect(component.objectUrlCount()).toBe(1);
    });

    it('cleans up on destruction and never opens a preview for a late file read', async () => {
        const create = spyOn(URL, 'createObjectURL').and.callThrough();
        let finish!: (value: ArrayBuffer) => void;
        const pending = new Promise<ArrayBuffer>(resolve => finish = resolve);
        const file = demoPdf();
        spyOn(file, 'slice').and.returnValue({ arrayBuffer: () => pending } as Blob);
        const reading = component.readFile(file);
        fixture.destroy();
        finish(new TextEncoder().encode('%PDF-1.4').buffer);
        await reading;
        expect(create).not.toHaveBeenCalled();
        expect(modals.openModals.length).toBe(0);
    });

    it('revokes an open PDF when its owning component is destroyed', async () => {
        const revoke = spyOn(URL, 'revokeObjectURL').and.callThrough();
        await component.readFile(demoPdf());
        const url = component.preview()!.url;
        const closed = firstValueFrom(modals.openModals[0].afterClose);
        fixture.destroy();
        await closed;
        expect(revoke).toHaveBeenCalledOnceWith(url);
        expect(component.objectUrlCount()).toBe(0);
    });

    it('accepts one dropped file and rejects multi-file drops without opening extra previews', () => {
        const read = spyOn(component, 'readFile').and.returnValue(Promise.resolve());
        const data = new DataTransfer();
        const file = demoPdf();
        data.items.add(file);
        const event = new DragEvent('drop', { dataTransfer: data, cancelable: true });
        component.drop(event);
        expect(event.defaultPrevented).toBeTrue();
        expect(read).toHaveBeenCalledOnceWith(file);
        data.items.add(demoPdf());
        component.drop(new DragEvent('drop', { dataTransfer: data, cancelable: true }));
        expect(read.calls.count()).toBe(1);
        expect(component.error()).toContain('đúng một file');
    });
});

describe('MediaPreviewComponent with real viewport and scroll clipping', () => {
    it('does not create offscreen images and loads the clipped last row only after scrolling the gallery', async () => {
        await TestBed.configureTestingModule({
            imports: [MediaPreviewComponent], providers: [provideNoopAnimations()],
        }).compileComponents();
        const fixture = TestBed.createComponent(MediaPreviewComponent);
        const component = fixture.componentInstance;
        const host = fixture.nativeElement as HTMLElement;
        const previousScroll = { left: window.scrollX, top: window.scrollY };
        host.style.cssText = `display: block; width: 600px; margin-top: ${window.innerHeight * 2}px`;
        const frames = (): Promise<void> => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        const until = async (condition: () => boolean): Promise<void> => {
            const deadline = Date.now() + 2000;
            while (!condition()) {
                if (Date.now() > deadline) throw new Error('Viewport observer did not fire');
                await frames();
                fixture.detectChanges();
            }
        };
        try {
            window.scrollTo(0, 0);
            fixture.detectChanges();
            await frames();
            expect(component.visibleImages().size).toBe(0);
            expect(host.querySelector('img')).toBeNull();
            const gallery = host.querySelector('.gallery-scroll') as HTMLElement;
            gallery.scrollIntoView({ block: 'start' });
            await until(() => component.visibleImages().has(1));
            expect(component.visibleImages().has(6)).toBeFalse();
            expect(host.querySelectorAll('img').length).toBeLessThan(6);
            gallery.scrollTop = gallery.scrollHeight;
            await until(() => component.visibleImages().has(6));
            expect(host.querySelectorAll('img').length).toBeGreaterThanOrEqual(4);
        } finally {
            fixture.destroy();
            window.scrollTo(previousScroll);
        }
    });
});
