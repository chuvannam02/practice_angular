import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { LargeFormComponent } from './large-form.component';

describe('LargeFormComponent', () => {
    let fixture: ComponentFixture<LargeFormComponent>;
    let component: LargeFormComponent;
    function type(selector: string, value: string): HTMLInputElement {
        const input = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return input;
    }

    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [LargeFormComponent], providers: [provideNoopAnimations()] }).compileComponents();
        fixture = TestBed.createComponent(LargeFormComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
    });

    it('commits change inputs immediately but defers model and validation until blur', fakeAsync(() => {
        const baseline = component.validationCounts();
        for (const value of ['a', 'ad', 'adm', 'admin']) {
            type('#compare-change', value);
            type('#compare-blur', value);
        }
        expect(component.changeControl.value).toBe('admin');
        expect(component.blurControl.value).toBe('');
        expect(component.validationCounts().change).toBe(baseline.change + 4);
        expect(component.validationCounts().blur).toBe(baseline.blur);
        const input = fixture.nativeElement.querySelector('#compare-blur') as HTMLInputElement;
        expect(input.value).toBe('admin');
        input.dispatchEvent(new Event('blur'));
        expect(component.blurControl.value).toBe('admin');
        expect(component.validationCounts().blur).toBe(baseline.blur + 1);
        tick(250);
        expect(component.requestCounts()).toEqual({ change: 1, blur: 1 });
        tick(400);
        expect(component.blurControl.hasError('reserved')).toBeTrue();
        expect(component.changeControl.hasError('reserved')).toBeTrue();
    }));

    it('updates programmatically without waiting for blur and cancels obsolete async validation', fakeAsync(() => {
        component.blurControl.setValue('admin');
        expect(component.modelValues().blur).toBe('admin');
        tick(300);
        component.blurControl.setValue('alice');
        tick(650);
        expect(component.blurControl.valid).toBeTrue();
        expect(component.modelValues().blur).toBe('alice');
        expect(component.requestCounts().blur).toBe(2);
    }));

    it('creates only one group and preserves the active unblurred input before replacing controls', () => {
        expect(component.fields().length).toBe(0);
        component.activate(0);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelectorAll('.group-fields input').length).toBe(25);
        const input = fixture.nativeElement.querySelector('#large-form-0') as HTMLInputElement;
        input.focus();
        type('#large-form-0', 'Đơn ABC');
        expect(component.groupForm.controls['field_0'].value).toBe('');
        component.activate(1);
        fixture.detectChanges();
        expect(Object.keys(component.groupForm.controls).length).toBe(25);
        expect(component.groupForm.controls['field_0']).toBeUndefined();
        component.activate(0);
        fixture.detectChanges();
        expect(component.groupForm.controls['field_0'].value).toBe('Đơn ABC');
        expect(component.draftCount()).toBe(1);
    });

    it('commits the focused blur control during Enter-style form submission', () => {
        component.activate(0);
        fixture.detectChanges();
        const input = fixture.nativeElement.querySelector('#large-form-0') as HTMLInputElement;
        input.focus();
        type('#large-form-0', 'Hồ sơ mới');
        expect(component.groupForm.controls['field_0'].value).toBe('');
        fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        expect(component.groupForm.controls['field_0'].value).toBe('Hồ sơ mới');
        expect(component.draftCount()).toBe(1);
        expect(component.feedback()).toContain('Đã giữ draft');
    });

    it('validates data from unrendered groups and treats whitespace-only required values as empty', () => {
        component.activate(0);
        fixture.detectChanges();
        component.groupForm.controls['field_0'].setValue('  ');
        component.saveCurrent();
        expect(component.groupForm.invalid).toBeTrue();
        component.groupForm.controls['field_0'].setValue('Hợp lệ');
        component.validateAll();
        fixture.detectChanges();
        expect(component.activeGroup()).toBe(1);
        expect(component.feedback()).toContain('nhóm 2');
        expect(component.groupForm.invalid).toBeTrue();
        component.activate(0);
        expect(component.groupForm.controls['field_0'].value).toBe('Hợp lệ');
        component.clearDraft();
        expect(component.fields().length).toBe(0);
        expect(component.draftCount()).toBe(0);
    });

    it('cancels scheduled async validators when the component is destroyed', fakeAsync(() => {
        component.changeControl.setValue('admin');
        fixture.destroy();
        tick(1000);
        expect(component.requestCounts().change).toBe(0);
    }));
});
