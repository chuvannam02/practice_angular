import { CommonModule, DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, Injector, TemplateRef, ViewChild, WritableSignal, afterNextRender, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, NgForm } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule, NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { ReplaySubject, finalize, take, takeUntil, timer } from 'rxjs';
import { AutofocusFirstDirective } from '../../_utils/directive/autofocus-first.directive';
import { TemplateModalBodyComponent } from '../../_utils/common/template-modal/template-modal-body.component';

interface ProfileValues {
    code: string;
    name: string;
    email: string;
    phone: string;
    department: string;
    address: string;
}

interface ModalSession {
    id: number;
    mode: 'create' | 'edit';
    delayMs: number;
    disableName: boolean;
    values: ProfileValues;
    initialValues: ProfileValues;
    dirty: WritableSignal<boolean>;
    saving: WritableSignal<boolean>;
    saveError: WritableSignal<string>;
    failNextSave: WritableSignal<boolean>;
    opened: WritableSignal<boolean>;
    ready: WritableSignal<boolean>;
    focusedField: WritableSignal<string>;
    closed$: ReplaySubject<void>;
}

interface ModalTemplateContext { $implicit: ModalSession; }

@Component({
    selector: 'app-modal-focus-demo',
    standalone: true,
    imports: [CommonModule, FormsModule, NzButtonModule, NzCheckboxModule,
        NzGridModule, NzInputModule, NzModalModule, NzSelectModule, NzSkeletonModule,
        AutofocusFirstDirective, TemplateModalBodyComponent],
    providers: [NzModalService],
    templateUrl: './modal-focus.component.html',
    styleUrl: './modal-focus.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalFocusComponent {
    loadDelayMs = 900;
    disableName = false;
    readonly isOpen = signal(false);
    readonly lastSaved = signal('');
    readonly openCount = signal(0);
    private readonly modalService = inject(NzModalService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly document = inject(DOCUMENT);
    private readonly injector = inject(Injector);
    private modalRef: NzModalRef<unknown, ProfileValues> | null = null;
    private discardRef: NzModalRef | null = null;
    private session: ModalSession | null = null;

    @ViewChild('modalContent', { static: true })
    private modalContent!: TemplateRef<ModalTemplateContext>;

    readonly focusCode = `// Một TemplateRef dùng cho cả tạo mới và chỉnh sửa.
const ref = modal.create({
  nzContent: this.modalContent,
  nzData: session,
  nzAutofocus: null // để directive quản lý focus input
});
ref.afterOpen.subscribe(() => session.opened.set(true));

// Wrapper tồn tại từ lúc skeleton xuất hiện.
<div [appAutofocusFirst]="session.opened()">
  <!-- Lazy body tạo form từ sharedForm + context khi dữ liệu sẵn sàng. -->
</div>

// Trong phần thân dùng chung:
const view = container.createEmbeddedView(contentTemplate, context);
view.detectChanges();

// Directive: MutationObserver → requestAnimationFrame → input hợp lệ.
// Bỏ qua disabled/fieldset disabled, hidden, readonly, tabindex âm.
// Focus xong ngắt observer; không giành focus khi đang nhập.
// Không dùng setTimeout(50/500) để đoán thời điểm render.`;

    constructor() {
        this.destroyRef.onDestroy(() => {
            this.discardRef?.destroy();
            this.stopSession(this.session);
            this.modalRef?.destroy();
        });
    }

    open(mode: 'create' | 'edit', event?: Event): void {
        if (this.isOpen()) return;
        const returnFocusTo = (event?.currentTarget ?? this.document.activeElement) as HTMLElement | null;
        const id = this.openCount() + 1;
        const values: ProfileValues = mode === 'edit'
            ? { code: 'NV-0007', name: 'Nguyễn An', email: 'an@example.com', phone: '0901234567', department: 'Kinh doanh', address: 'Hà Nội' }
            : { code: 'Tự sinh sau khi lưu', name: '', email: '', phone: '', department: '', address: '' };
        const session: ModalSession = {
            id, mode, delayMs: this.loadDelayMs, disableName: this.disableName,
            values, initialValues: { ...values }, dirty: signal(false), saving: signal(false),
            saveError: signal(''), failNextSave: signal(false),
            opened: signal(false), ready: signal(false), focusedField: signal(''),
            closed$: new ReplaySubject<void>(1),
        };
        this.session = session;
        this.openCount.set(id);
        this.isOpen.set(true);
        const ref = this.modalService.create<unknown, ModalSession, ProfileValues>({
            nzTitle: mode === 'create' ? 'Tạo hồ sơ · template dùng chung' : 'Chỉnh sửa hồ sơ · template dùng chung',
            nzContent: this.modalContent, nzData: session, nzWidth: 780,
            nzFooter: null, nzAutofocus: null, nzMaskClosable: false,
            nzOnCancel: () => { this.close(session); return false; },
        });
        this.modalRef = ref;
        ref.afterOpen.pipe(take(1), takeUntil(session.closed$), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => session.opened.set(true));
        ref.afterClose.pipe(take(1), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                this.stopSession(session);
                if (this.session === session) {
                    this.discardRef?.destroy();
                    this.session = null;
                    this.modalRef = null;
                    this.isOpen.set(false);
                    // Wait for the opening button's disabled binding to be updated.
                    afterNextRender(() => {
                        if (!this.isOpen() && returnFocusTo?.isConnected) returnFocusTo.focus({ preventScroll: true });
                    }, { injector: this.injector });
                }
            });
    }

    close(session: ModalSession): void {
        if (session !== this.session || session.saving() || this.discardRef) return;
        if (session.dirty()) {
            const ref = this.modalService.confirm({
                nzTitle: 'Bỏ các thay đổi chưa lưu?',
                nzContent: 'Bạn đã thay đổi thông tin. Bỏ thay đổi sẽ mất nội dung vừa nhập.',
                nzOkText: 'Bỏ thay đổi', nzOkDanger: true,
                nzCancelText: 'Tiếp tục nhập', nzAutofocus: 'cancel', nzMaskClosable: false,
                nzOnOk: () => this.closeNow(session),
            });
            this.discardRef = ref;
            ref.afterClose.pipe(take(1), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
                if (this.discardRef === ref) this.discardRef = null;
            });
            return;
        }
        this.closeNow(session);
    }

    updateField(session: ModalSession, field: keyof ProfileValues, value: string): void {
        if (session.saving()) return;
        session.values[field] = value;
        session.dirty.set((Object.keys(session.values) as (keyof ProfileValues)[])
            .some(key => session.values[key] !== session.initialValues[key]));
    }

    private closeNow(session: ModalSession): void {
        this.stopSession(session);
        this.modalRef?.destroy();
    }

    save(session: ModalSession, form: NgForm): void {
        if (!session.ready() || session.saving() || session !== this.session) return;
        if (form.invalid) {
            form.form.markAllAsTouched();
            this.modalRef?.getElement().querySelector<HTMLInputElement>('input.ng-invalid:not(:disabled)')?.focus();
            return;
        }
        const payload = { ...session.values };
        const fail = session.failNextSave();
        const ref = this.modalRef!;
        session.failNextSave.set(false);
        session.saveError.set('');
        session.saving.set(true);
        ref.updateConfig({ nzClosable: false, nzKeyboard: false });
        // Fake FE request. Replace timer with HttpClient; keep the same cancellation/guard.
        timer(800).pipe(
            takeUntil(session.closed$), takeUntilDestroyed(this.destroyRef),
            finalize(() => session.saving.set(false)),
        ).subscribe(() => {
            session.saving.set(false);
            ref.updateConfig({ nzClosable: true, nzKeyboard: true });
            if (fail) {
                session.saveError.set('Lưu thất bại (lỗi giả lập). Dữ liệu của bạn vẫn còn. Bấm Lưu để thử lại.');
                return;
            }
            session.dirty.set(false);
            this.lastSaved.set(`${session.mode === 'create' ? 'Tạo mới' : 'Cập nhật'}: ${payload.name} · ${payload.email} (lưu giả lập trên FE)`);
            this.stopSession(session);
            ref.close(payload);
        });
    }

    onFocused(element: HTMLElement, session: ModalSession): void {
        const field = element.getAttribute('data-field');
        session.focusedField.set(field === 'name' ? 'Họ và tên' : field === 'email' ? 'Email' : element.id);
    }

    private stopSession(session: ModalSession | null): void {
        session?.closed$.next();
        session?.closed$.complete();
        session?.opened.set(false);
    }
}
