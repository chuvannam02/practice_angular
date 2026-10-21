import { ComponentFixture, DeferBlockBehavior, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { firstValueFrom } from 'rxjs';
import { ModalFocusComponent } from './modal-focus.component';

describe('ModalFocusComponent', () => {
    let fixture: ComponentFixture<ModalFocusComponent>;
    let component: ModalFocusComponent;
    let modals: NzModalService;

    function frames(): Promise<void> {
        return new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    }

    function waitFor<T extends Element>(selector: string): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const existing = document.querySelector<T>(selector);
            if (existing) { resolve(existing); return; }
            const observer = new MutationObserver(() => {
                const element = document.querySelector<T>(selector);
                if (element) {
                    observer.disconnect();
                    clearTimeout(deadline);
                    resolve(element);
                }
            });
            const deadline = setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Không tìm thấy ${selector}`));
            }, 4000);
            observer.observe(document.body, { childList: true, subtree: true });
        });
    }

    async function open(mode: 'create' | 'edit', delay = 100): Promise<NzModalRef> {
        component.loadDelayMs = delay;
        component.open(mode);
        const ref = modals.openModals[0];
        const opened = firstValueFrom(ref.afterOpen);
        fixture.detectChanges();
        await waitFor('[data-demo="modal-skeleton"]');
        await opened;
        fixture.detectChanges();
        return ref;
    }

    async function formReady(): Promise<HTMLElement> {
        const form = await waitFor<HTMLElement>('[data-demo="lazy-profile-form"]');
        await fixture.whenStable();
        await frames();
        fixture.detectChanges();
        return form;
    }

    async function close(ref: NzModalRef): Promise<void> {
        const closed = firstValueFrom(ref.afterClose);
        ref.destroy();
        fixture.detectChanges();
        await closed;
        await frames();
    }

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ModalFocusComponent],
            providers: [provideNoopAnimations()],
            deferBlockBehavior: DeferBlockBehavior.Playthrough,
        }).compileComponents();
        fixture = TestBed.createComponent(ModalFocusComponent);
        component = fixture.componentInstance;
        modals = fixture.debugElement.injector.get(NzModalService);
        fixture.detectChanges();
        await fixture.whenStable();
    });

    afterEach(async () => {
        while (modals.openModals.length) await close(modals.openModals[modals.openModals.length - 1]);
    });

    it('shows skeleton then focuses the first enabled input in the dynamically created grid form', async () => {
        await open('create');
        const form = await formReady();
        const code = form.querySelector<HTMLInputElement>('[data-field="code"]')!;
        const name = form.querySelector<HTMLInputElement>('[data-field="name"]')!;
        expect(code.disabled).toBeTrue();
        expect(getComputedStyle(form.closest('.ant-modal-content')!).borderRadius).toBe('16px');
        expect(document.activeElement).toBe(name);
        expect(document.querySelector('[data-demo="modal-skeleton"]')).toBeNull();
        expect(document.querySelector('.focus-status')?.textContent).toContain('Họ và tên');

        const codeColumn = code.closest('.ant-col')!.getBoundingClientRect();
        const nameColumn = name.closest('.ant-col')!.getBoundingClientRect();
        if (window.innerWidth >= 768) {
            expect(Math.abs(codeColumn.top - nameColumn.top)).toBeLessThanOrEqual(1);
            expect(nameColumn.left).toBeGreaterThan(codeColumn.left);
        }
    });

    it('skips a disabled name field and focuses Email even with slow data', async () => {
        component.disableName = true;
        await open('edit', 150);
        const form = await formReady();

        expect(form.querySelector<HTMLInputElement>('[data-field="name"]')!.disabled).toBeTrue();
        expect(document.activeElement).toBe(form.querySelector('[data-field="email"]'));
        expect(document.querySelector('.focus-status')?.textContent).toContain('Email');
    });

    it('reuses the same template with a fresh context when opening edit then create', async () => {
        const ref = await open('edit');
        const edited = await formReady();
        expect(edited.querySelector<HTMLInputElement>('[data-field="name"]')!.value).toBe('Nguyễn An');
        await close(ref);

        await open('create');
        const created = await formReady();
        expect(created).not.toBe(edited);
        expect(created.querySelector<HTMLInputElement>('[data-field="name"]')!.value).toBe('');
        expect(component.openCount()).toBe(2);
        expect(document.activeElement).toBe(created.querySelector('[data-field="name"]'));
    });

    it('does not steal focus back when the user moves to another input', async () => {
        await open('edit');
        const form = await formReady();
        const phone = form.querySelector<HTMLInputElement>('[data-field="phone"]')!;
        const name = form.querySelector<HTMLInputElement>('[data-field="name"]')!;
        phone.focus();
        name.disabled = true;
        name.disabled = false;
        await frames();

        expect(document.activeElement).toBe(phone);
    });

    async function changeField(form: HTMLElement, field: string, value: string): Promise<void> {
        const input = form.querySelector<HTMLInputElement>(`[data-field="${field}"]`)!;
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        fixture.detectChanges();
        await fixture.whenStable();
    }

    it('guards dirty dismissal, preserves edits when cancelled and discards only when confirmed', async () => {
        const ref = await open('edit');
        const form = await formReady();
        await changeField(form, 'name', 'Tên vừa sửa');
        document.querySelector<HTMLButtonElement>('.ant-modal-close')!.click();
        fixture.detectChanges();
        expect(modals.openModals.length).toBe(2);
        const confirmation = modals.openModals[1];
        const cancelled = firstValueFrom(confirmation.afterClose);
        await confirmation.triggerCancel();
        await cancelled;
        await frames();
        expect(component.isOpen()).toBeTrue();
        expect(form.querySelector<HTMLInputElement>('[data-field="name"]')!.value).toBe('Tên vừa sửa');
        form.querySelector<HTMLButtonElement>('[data-action="close-profile-modal"]')!.click();
        fixture.detectChanges();
        const closed = firstValueFrom(ref.afterClose);
        await modals.openModals[1].triggerOk();
        await closed;
        expect(component.isOpen()).toBeFalse();
        expect(component.lastSaved()).toBe('');
    });

    it('closes without confirmation when changed values are restored to the original', async () => {
        const ref = await open('edit');
        const form = await formReady();
        await changeField(form, 'name', 'Tên vừa sửa');
        await changeField(form, 'name', 'Nguyễn An');
        const closed = firstValueFrom(ref.afterClose);
        form.querySelector<HTMLButtonElement>('[data-action="close-profile-modal"]')!.click();
        fixture.detectChanges();
        expect(document.querySelector('.ant-modal-confirm')).toBeNull();
        await closed;
        expect(component.isOpen()).toBeFalse();
    });

    it('shows actionable validation and focuses the first invalid field on submit', async () => {
        await open('create');
        const form = await formReady();
        const email = form.querySelector<HTMLInputElement>('[data-field="email"]')!;
        email.focus();
        form.querySelector<HTMLButtonElement>('[data-action="save-profile"]')!.click();
        fixture.detectChanges();
        expect(document.activeElement).toBe(form.querySelector('[data-field="name"]'));
        expect(form.querySelectorAll('.field-error').length).toBe(2);
        expect(form.querySelector('fieldset')!.disabled).toBeFalse();
        expect(component.lastSaved()).toBe('');
    });

    it('locks only while saving, keeps edits on failure and supports a successful retry', async () => {
        const ref = await open('edit');
        const form = await formReady();
        await changeField(form, 'name', 'Giữ dữ liệu này');
        form.querySelector<HTMLInputElement>('#modal-fail-next-save')!.click();
        fixture.detectChanges();
        const save = form.querySelector<HTMLButtonElement>('[data-action="save-profile"]')!;
        save.click();
        fixture.detectChanges();
        expect(save.disabled).toBeTrue();
        expect(save.classList.contains('ant-btn-loading')).toBeTrue();
        expect(form.querySelector('fieldset')!.disabled).toBeTrue();
        expect(ref.getConfig().nzKeyboard).toBeFalse();
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await waitFor('[data-demo="save-error"]');
        fixture.detectChanges();
        expect(form.querySelector<HTMLInputElement>('[data-field="name"]')!.value).toBe('Giữ dữ liệu này');
        expect(form.querySelector('fieldset')!.disabled).toBeFalse();
        expect(save.disabled).toBeFalse();
        expect(component.isOpen()).toBeTrue();
        expect(component.lastSaved()).toBe('');
        const closed = firstValueFrom(ref.afterClose);
        save.click();
        fixture.detectChanges();
        await closed;
        expect(component.lastSaved()).toContain('Giữ dữ liệu này');
        expect(component.isOpen()).toBeFalse();
        expect(document.querySelector('.ant-modal-confirm')).toBeNull();
    });

    it('cancels loading when closed before data arrives and can reopen without stale form data', async () => {
        const ref = await open('edit', 120);
        await waitFor('app-template-modal-body');
        const closed = firstValueFrom(ref.afterClose);
        const closeButton = document.querySelector<HTMLButtonElement>('.ant-modal-close')!;
        closeButton.click();
        fixture.detectChanges();
        await closed;
        await new Promise<void>((resolve) => setTimeout(resolve, 150));

        expect(document.querySelector('[data-demo="lazy-profile-form"]')).toBeNull();
        expect(component.isOpen()).toBeFalse();
        await open('create');
        const form = await formReady();
        expect(document.activeElement).toBe(form.querySelector('[data-field="name"]'));
        expect(form.querySelector<HTMLInputElement>('[data-field="name"]')!.value).toBe('');
    });

    it('restores focus to the opening button after it becomes enabled again', async () => {
        component.loadDelayMs = 0;
        const trigger = fixture.nativeElement.querySelector('[data-action="open-create-modal"]') as HTMLButtonElement;
        trigger.focus();
        trigger.click();
        const ref = modals.openModals[0];
        const opened = firstValueFrom(ref.afterOpen);
        fixture.detectChanges();
        await opened;
        await formReady();
        expect(trigger.disabled).toBeTrue();
        const closed = firstValueFrom(ref.afterClose);
        await ref.triggerCancel();
        await closed;
        fixture.detectChanges();
        await frames();
        expect(trigger.disabled).toBeFalse();
        expect(document.activeElement).toBe(trigger);
    });
});
