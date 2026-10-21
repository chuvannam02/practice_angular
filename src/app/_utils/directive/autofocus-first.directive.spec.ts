import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AutofocusFirstDirective } from './autofocus-first.directive';

@Component({
    standalone: true,
    imports: [AutofocusFirstDirective],
    template: `
        <div [appAutofocusFirst]="enabled" [style.display]="hidden ? 'none' : 'block'"
            (firstInputFocused)="focused.push($event)">
            @if (showInputs) {
                <input type="hidden" />
                <input disabled data-field="disabled" />
                <fieldset disabled><input data-field="disabled-fieldset" /></fieldset>
                <input readonly data-field="readonly" />
                <div hidden><input data-field="hidden" /></div>
                <input data-field="first" [disabled]="allDisabled" />
                <input data-field="second" [disabled]="allDisabled" />
            } @else { <p>Skeleton, chưa có input</p> }
        </div>
    `,
})
class FocusHostComponent {
    enabled = true;
    showInputs = false;
    allDisabled = false;
    hidden = false;
    focused: HTMLElement[] = [];
}

describe('AutofocusFirstDirective', () => {
    let fixture: ComponentFixture<FocusHostComponent>;
    let host: FocusHostComponent;

    async function frames(): Promise<void> {
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    }

    async function render(): Promise<void> {
        fixture.detectChanges();
        await fixture.whenStable();
        await frames();
        fixture.detectChanges();
    }

    function input(field: string): HTMLInputElement {
        return fixture.nativeElement.querySelector(`[data-field="${field}"]`);
    }

    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [FocusHostComponent] }).compileComponents();
        fixture = TestBed.createComponent(FocusHostComponent);
        host = fixture.componentInstance;
        await render();
    });

    it('waits for lazy inputs and skips hidden, readonly and inherited disabled controls', async () => {
        expect(host.focused.length).toBe(0);
        host.showInputs = true;
        await render();

        expect(document.activeElement).toBe(input('first'));
        expect(host.focused).toEqual([input('first')]);
    });

    it('waits while all inputs are disabled and responds when one becomes enabled', async () => {
        host.allDisabled = true;
        host.showInputs = true;
        await render();
        expect(host.focused.length).toBe(0);

        host.allDisabled = false;
        await render();
        expect(document.activeElement).toBe(input('first'));
    });

    it('starts after an explicit ready gate such as modal afterOpen', async () => {
        host.enabled = false;
        host.showInputs = true;
        await render();
        expect(host.focused.length).toBe(0);

        host.enabled = true;
        await render();
        expect(document.activeElement).toBe(input('first'));
    });

    it('waits for the form to become visible', async () => {
        host.hidden = true;
        host.showInputs = true;
        await render();
        expect(host.focused.length).toBe(0);

        host.hidden = false;
        await render();
        expect(document.activeElement).toBe(input('first'));
    });

    it('does not steal a user focus choice before its scheduled autofocus', async () => {
        host.showInputs = true;
        fixture.detectChanges();
        input('second').focus();
        await render();

        expect(document.activeElement).toBe(input('second'));
        expect(host.focused.length).toBe(0);
    });

    it('stops watching after success rather than refocusing after later DOM changes', async () => {
        host.showInputs = true;
        await render();
        input('second').focus();
        input('first').disabled = true;
        input('first').disabled = false;
        await render();

        expect(document.activeElement).toBe(input('second'));
        expect(host.focused.length).toBe(1);
    });

    it('does not focus after destruction while waiting for content', async () => {
        host.showInputs = true;
        fixture.detectChanges();
        const focus = spyOn(input('first'), 'focus').and.callThrough();
        fixture.destroy();
        await frames();

        expect(focus).not.toHaveBeenCalled();
    });
});
