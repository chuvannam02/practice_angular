import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { finalize, timer } from 'rxjs';

interface LikeState { liked: boolean; count: number; }

@Component({
    selector: 'app-optimistic-ux',
    standalone: true,
    imports: [FormsModule, NzButtonModule, NzCheckboxModule],
    templateUrl: './optimistic-ux.component.html',
    styleUrl: './optimistic-ux.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OptimisticUxComponent {
    readonly state = signal<LikeState>({ liked: false, count: 24 });
    readonly confirmed = signal<LikeState>({ liked: false, count: 24 });
    readonly pending = signal(false);
    readonly failNext = signal(false);
    readonly error = signal('');
    readonly status = signal('Chưa có request. Bấm Thích để thử.');
    readonly failedTarget = signal<boolean | null>(null);
    readonly requests = signal(0);
    readonly likeLabel = computed(() => this.state().liked ? 'Đã thích' : 'Thích');
    readonly signalCount = signal(0);
    readonly doubled = computed(() => this.signalCount() * 2);
    regularCount = 0;
    private readonly destroyRef = inject(DestroyRef);

    readonly optimisticCode = `// Chỉ một request đang chạy trên mỗi đối tượng.
if (pending()) return;
const before = state(); // snapshot bất biến trước khi đổi
state.set({ liked: target, count: before.count + (target ? 1 : -1) });
pending.set(true);

// HttpClient: gửi trạng thái đích { liked: target }.
// Thành công: cập nhật bằng dữ liệu thực trả về từ API.
// Thất bại: state.set(before); hiện lỗi + cho thử lại.
// finalize: pending.set(false).
// takeUntilDestroyed: dọn subscription khi component bị hủy.`;

    readonly signalCode = `// Biến thường vẫn dùng tốt cho event đồng bộ trong template.
regularCount = 0;
increment() { this.regularCount++; }

// Signal thông báo cho consumer khi giá trị thay đổi.
count = signal(0);
doubled = computed(() => this.count() * 2);
increment() { this.count.update(value => value + 1); }
// Template: {{ count() }} / {{ doubled() }}

// OnPush + tự subscribe async với biến thường:
// this.label = result; this.cdr.markForCheck();
// Hoặc Observable + async pipe để quản lý cập nhật/dọn subscription.

// Object/array: tạo reference mới, không sửa sâu rồi set lại cùng object.
state.update(value => ({ ...value, liked: true }));`;

    toggle(): void { this.send(!this.state().liked); }

    retry(): void {
        const target = this.failedTarget();
        if (target !== null) this.send(target);
    }

    incrementBoth(): void {
        this.regularCount++;
        this.signalCount.update(value => value + 1);
    }

    private send(target: boolean): void {
        if (this.pending()) return;
        const before = this.state();
        const optimistic: LikeState = {
            liked: target, count: before.count + (target === before.liked ? 0 : target ? 1 : -1),
        };
        const fail = this.failNext();
        this.failNext.set(false);
        this.failedTarget.set(null);
        this.error.set('');
        this.state.set(optimistic);
        this.pending.set(true);
        this.requests.update(value => value + 1);
        this.status.set('Đã đổi trên giao diện, đang chờ xác nhận giả lập…');
        // FE-only demo: no network call. The captured outcome belongs to this request.
        timer(800).pipe(
            takeUntilDestroyed(this.destroyRef),
            finalize(() => this.pending.set(false)),
        ).subscribe(() => {
            if (fail) {
                this.state.set(before);
                this.failedTarget.set(target);
                this.error.set('Không lưu được lượt thích (lỗi giả lập). Đã hoàn tác về trạng thái trước đó.');
                this.status.set('Request thất bại. Bạn có thể thử lại.');
            } else {
                this.confirmed.set(optimistic);
                this.status.set('Đã xác nhận thành công bằng API giả lập trên FE.');
            }
        });
    }
}
