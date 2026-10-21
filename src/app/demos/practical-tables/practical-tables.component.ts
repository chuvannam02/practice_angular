import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule } from 'ng-zorro-antd/table';
import { Subject, catchError, finalize, map, of, switchMap, timer } from 'rxjs';
import { DemoSwitchComponent } from './demo-switch.component';

interface Customer {
    id: number;
    name: string;
    company: string;
}

interface Order {
    id: number;
    customerId: number;
    code: string;
    amount: number;
}

interface DemoUser {
    id: number;
    name: string;
    enabled: boolean;
}

@Component({
    selector: 'app-practical-tables',
    standalone: true,
    imports: [CommonModule, NzButtonModule, NzCheckboxModule, NzSpinModule, NzTableModule, DemoSwitchComponent],
    templateUrl: './practical-tables.component.html',
    styleUrl: './practical-tables.component.scss',
})
export class PracticalTablesComponent implements OnInit {
    readonly customers: Customer[] = [
        { id: 1, name: 'Nguyễn An', company: 'An Phát' },
        { id: 2, name: 'Trần Bình', company: 'Bình Minh' },
        { id: 3, name: 'Lê Chi', company: 'Chi Việt' },
        { id: 4, name: 'Phạm Dũng', company: 'Dũng Tiến' },
    ];
    selectedCustomer: Customer | null = null;
    orders: Order[] = [];
    ordersLoading = false;
    ordersError = '';
    detailsRequestCount = 0;

    usersWithoutTrackBy: DemoUser[] = [];
    usersWithTrackBy: DemoUser[] = [];
    pendingUserIds = new Set<number>();
    isReloadingUsers = false;
    usersMessage = 'Thử bật/tắt một switch hoặc tải lại danh sách ở cả hai bảng.';
    failNextSave = false;
    reloadCount = 0;

    readonly masterDetailCode = `// Mỗi lần chọn, hủy request trước và chỉ nhận kết quả mới nhất.
detailRequests$.pipe(
  switchMap(request => loadOrders(request.customerId).pipe(
    catchError(() => of([])), // đặt bên trong để còn tìm lại được sau lỗi
    finalize(() => this.ordersLoading = false)
  )),
  takeUntilDestroyed(this.destroyRef)
).subscribe(orders => this.orders = orders);`;

    readonly trackingCode = `// Không trackBy: nhận object mới từ API → tạo lại các dòng.
<tr *ngFor="let user of table.data">...</tr>

// Có trackBy: cùng id → tái sử dụng dòng và switch hiện có.
<tr *ngFor="let user of table.data; trackBy: trackById">...</tr>

trackById(_index: number, row: { id: number }): number {
  return row.id;
}

// Cập nhật dữ liệu bằng mảng/object mới vẫn dùng được với trackBy.
this.users = response.map(user => ({ ...user }));
// Loading theo id, không gán loading cho tất cả các dòng.
this.pendingUserIds.has(user.id);`;

    private readonly destroyRef = inject(DestroyRef);
    private readonly detailRequests$ = new Subject<{
        customerId: number | null;
        fail: boolean;
    }>();
    private readonly orderDatabase: Order[] = [
        { id: 101, customerId: 1, code: 'DH-0101', amount: 1250000 },
        { id: 102, customerId: 1, code: 'DH-0102', amount: 480000 },
        { id: 201, customerId: 2, code: 'DH-0201', amount: 890000 },
        { id: 202, customerId: 2, code: 'DH-0202', amount: 2100000 },
        { id: 203, customerId: 2, code: 'DH-0203', amount: 350000 },
        { id: 301, customerId: 3, code: 'DH-0301', amount: 720000 },
    ];
    private serverUsers: DemoUser[] = [
        { id: 1, name: 'Nguyễn An', enabled: true },
        { id: 2, name: 'Trần Bình', enabled: false },
        { id: 3, name: 'Lê Chi', enabled: true },
        { id: 4, name: 'Phạm Dũng', enabled: false },
    ];

    ngOnInit(): void {
        this.applyFreshUsers();
        this.detailRequests$
            .pipe(
                switchMap(({ customerId, fail }) => {
                    this.orders = [];
                    this.ordersError = '';
                    this.ordersLoading = customerId !== null;
                    if (customerId === null) return of([] as Order[]);
                    this.detailsRequestCount++;

                    // Khách đầu trả chậm hơn để dễ thử chọn nhanh A → B.
                    return timer(customerId === 1 ? 1200 : 600).pipe(
                        map(() => {
                            if (fail) throw new Error('Demo API error');
                            return this.orderDatabase
                                .filter((order) => order.customerId === customerId)
                                .map((order) => ({ ...order }));
                        }),
                        catchError(() => {
                            this.ordersError = 'Không tải được đơn hàng. Bấm tải lại để thử tiếp.';
                            return of([] as Order[]);
                        }),
                        finalize(() => (this.ordersLoading = false)),
                    );
                }),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((orders) => (this.orders = orders));
    }

    selectCustomer(customer: Customer, checked: boolean): void {
        if (!checked && this.selectedCustomer?.id !== customer.id) return;
        const selected = checked ? customer : null;
        if (selected?.id === this.selectedCustomer?.id) return;
        this.selectedCustomer = selected;
        this.detailRequests$.next({ customerId: selected?.id ?? null, fail: false });
    }

    reloadOrders(fail = false): void {
        if (!this.selectedCustomer) return;
        this.detailRequests$.next({ customerId: this.selectedCustomer.id, fail });
    }

    reloadUsers(reverse = false): void {
        if (this.isReloadingUsers || this.pendingUserIds.size > 0) return;
        this.isReloadingUsers = true;
        timer(650)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => (this.isReloadingUsers = false)),
            )
            .subscribe(() => {
                if (reverse) this.serverUsers = [...this.serverUsers].reverse();
                this.applyFreshUsers();
                this.reloadCount++;
                this.usersMessage = 'Đã nhận object mới từ API. So sánh DOM # ở hai bảng.';
            });
    }

    updateUser(userId: number, enabled: boolean): void {
        if (this.pendingUserIds.has(userId)) return;
        const shouldFail = this.failNextSave;
        this.failNextSave = false;
        this.pendingUserIds = new Set(this.pendingUserIds).add(userId);
        this.usersMessage = `Đang lưu dòng #${userId}; chỉ dòng này có loading.`;

        timer(650)
            .pipe(
                map(() => {
                    if (shouldFail) throw new Error('Demo save error');
                    this.serverUsers = this.serverUsers.map((user) =>
                        user.id === userId ? { ...user, enabled } : user,
                    );
                    // Mô phỏng lưu thành công rồi API trả về cả danh sách mới.
                    this.applyFreshUsers();
                    this.usersMessage = `Đã lưu dòng #${userId}. Bảng có trackBy giữ nguyên ID DOM của tất cả switch.`;
                }),
                catchError(() => {
                    this.usersMessage = `Lưu dòng #${userId} thất bại. Giữ trạng thái cũ; bạn có thể bấm thử lại.`;
                    return of(undefined);
                }),
                finalize(() => {
                    const pending = new Set(this.pendingUserIds);
                    pending.delete(userId);
                    this.pendingUserIds = pending;
                }),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe();
    }

    trackById(_index: number, row: { id: number }): number {
        return row.id;
    }

    private applyFreshUsers(): void {
        this.usersWithoutTrackBy = this.serverUsers.map((user) => ({ ...user }));
        this.usersWithTrackBy = this.serverUsers.map((user) => ({ ...user }));
    }
}
