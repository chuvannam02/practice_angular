import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AsyncValidatorFn, FormControl, FormControlStatus, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { Subject, defer, map, switchMap, takeUntil, timer } from 'rxjs';

type Mode = 'change' | 'blur';
interface GroupField { id: number; key: string; required: boolean; }

@Component({
    selector: 'app-large-form-demo',
    standalone: true,
    imports: [FormsModule, ReactiveFormsModule, NzButtonModule, NzInputModule, NzSelectModule],
    templateUrl: './large-form.component.html',
    styleUrl: './workflow-ux.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LargeFormComponent {
    readonly validationCounts = signal({ change: 0, blur: 0 });
    readonly requestCounts = signal({ change: 0, blur: 0 });
    readonly modelValues = signal({ change: '', blur: '' });
    readonly statuses = signal<Record<Mode, FormControlStatus>>({ change: 'INVALID', blur: 'INVALID' });
    readonly totalFields = 1000;
    readonly groupSize = 25;
    readonly groups = Array.from({ length: 40 }, (_, index) => index);
    readonly activeGroup = signal<number | null>(null);
    readonly fields = signal<GroupField[]>([]);
    readonly draftCount = signal(0);
    readonly feedback = signal('Chưa tạo controls cho 1.000 trường. Bấm mở nhóm để bắt đầu.');
    private readonly stopValidators$ = new Subject<void>();
    private readonly destroyRef = inject(DestroyRef);
    private readonly document = inject(DOCUMENT);
    private readonly draft = new Map<number, string>();
    readonly changeControl = this.comparisonControl('change');
    readonly blurControl = this.comparisonControl('blur');
    groupForm = new FormGroup<Record<string, FormControl<string>>>({});

    @ViewChild('groupElement', { read: ElementRef }) private groupElement?: ElementRef<HTMLFormElement>;

    readonly code = `// Reactive forms: DOM input thay đổi ngay; model/validation chờ blur.
username = new FormControl('', {
  nonNullable: true,
  validators: [Validators.required, Validators.minLength(3)],
  updateOn: 'blur'
});
// Template-driven tương đương:
// [ngModelOptions]="{ updateOn: 'blur' }"

// Async validator: debounce trước API, observable phải kết thúc.
// Angular hủy subscription validator cũ khi giá trị committed mới xuất hiện.
return timer(250).pipe(
  switchMap(() => api.checkUsername(control.value)),
  map(taken => taken ? { reserved: true } : null)
);

// blur không phải debounce, không tự giảm DOM và không chặn input events.
// setValue/patchValue lập trình vẫn cập nhật ngay.
// Enter-submit có thể chưa blur: commit ô đang focus trước khi đọc payload.
// Không thay thế bước commit bằng markAllAsTouched/updateValueAndValidity.

// Form lớn: giữ draft dạng dữ liệu, chỉ tạo controls cho nhóm đang dùng.
// Trước khi tháo nhóm: blur ô hiện tại -> lưu raw value -> tạo nhóm tiếp.
// Kiểm tra toàn bộ draft theo schema, kể cả nhóm chưa render.`;

    constructor() {
        for (const mode of ['change', 'blur'] as const) {
            const control = mode === 'change' ? this.changeControl : this.blurControl;
            control.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(value => this.modelValues.update(previous => ({ ...previous, [mode]: value })));
            control.statusChanges.pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(status => this.statuses.update(previous => ({ ...previous, [mode]: status })));
        }
        this.destroyRef.onDestroy(() => { this.stopValidators$.next(); this.stopValidators$.complete(); });
    }

    activate(group: number): void {
        if (group < 0 || group >= this.groups.length || group === this.activeGroup()) return;
        this.captureDraft();
        const fields = Array.from({ length: this.groupSize }, (_, index) => {
            const id = group * this.groupSize + index;
            return { id, key: `field_${id}`, required: index === 0 };
        });
        const controls: Record<string, FormControl<string>> = {};
        const meaningful: ValidatorFn = control => String(control.value).trim() ? null : { required: true };
        for (const field of fields) {
            controls[field.key] = new FormControl(this.draft.get(field.id) ?? '', {
                nonNullable: true, updateOn: 'blur',
                validators: field.required ? [meaningful, Validators.minLength(2)] : [Validators.minLength(2)],
            });
        }
        this.groupForm = new FormGroup(controls);
        this.fields.set(fields);
        this.activeGroup.set(group);
        this.feedback.set(`Đang tạo đúng ${this.groupSize} controls cho nhóm ${group + 1}. Draft nằm riêng ngoài view.`);
    }

    saveCurrent(): void {
        this.captureDraft();
        this.groupForm.markAllAsTouched();
        if (this.groupForm.invalid) {
            const invalid = this.fields().find(field => this.groupForm.controls[field.key].invalid);
            if (invalid) this.document.getElementById(`large-form-${invalid.id}`)?.focus();
            this.feedback.set('Nhóm hiện tại còn lỗi. Ô đầu nhóm bắt buộc; các giá trị đã nhập cần ít nhất 2 ký tự.');
            return;
        }
        this.feedback.set('Đã giữ draft nhóm hiện tại trong RAM của demo. Chưa gửi server; reload trang sẽ mất draft.');
    }

    validateAll(): void {
        this.captureDraft();
        for (let id = 0; id < this.totalFields; id++) {
            const value = this.draft.get(id) ?? '';
            if ((id % this.groupSize === 0 && !value.trim()) || (value.length > 0 && value.length < 2)) {
                const group = Math.floor(id / this.groupSize);
                this.activate(group);
                this.groupForm.markAllAsTouched();
                this.feedback.set(`Toàn bộ draft chưa hợp lệ. Đã mở nhóm ${group + 1}, trường ${id + 1} cần kiểm tra. Các nhóm chưa mở vẫn được kiểm tra.`);
                return;
            }
        }
        this.feedback.set('Toàn bộ 1.000 trường logic đã qua kiểm tra schema đơn giản của demo.');
    }

    clearDraft(): void {
        this.commitActiveInput();
        this.draft.clear();
        this.draftCount.set(0);
        this.activeGroup.set(null);
        this.fields.set([]);
        this.groupForm = new FormGroup<Record<string, FormControl<string>>>({});
        this.feedback.set('Đã xóa draft và tháo controls của nhóm.');
    }

    private commitActiveInput(): void {
        const active = this.document.activeElement;
        if (active?.tagName === 'INPUT' && this.groupElement?.nativeElement.contains(active)) (active as HTMLInputElement).blur();
    }

    private captureDraft(): void {
        this.commitActiveInput();
        const values = this.groupForm.getRawValue();
        for (const field of this.fields()) {
            if (values[field.key]) this.draft.set(field.id, values[field.key]);
            else this.draft.delete(field.id);
        }
        this.draftCount.set(this.draft.size);
    }

    private comparisonControl(mode: Mode): FormControl<string> {
        const counted: ValidatorFn = () => {
            this.validationCounts.update(previous => ({ ...previous, [mode]: previous[mode] + 1 }));
            return null;
        };
        const remote: AsyncValidatorFn = control => {
            const value = String(control.value).trim().toLowerCase();
            return timer(250).pipe(
                switchMap(() => defer(() => {
                    this.requestCounts.update(previous => ({ ...previous, [mode]: previous[mode] + 1 }));
                    return timer(400).pipe(map(() => value === 'admin' ? { reserved: true } : null));
                })),
                takeUntil(this.stopValidators$),
            );
        };
        return new FormControl('', {
            nonNullable: true, updateOn: mode,
            validators: [counted, Validators.required, Validators.minLength(3)], asyncValidators: [remote],
        });
    }
}
