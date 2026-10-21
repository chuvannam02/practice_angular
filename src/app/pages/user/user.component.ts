import {Component, inject, OnInit} from '@angular/core';
import {FormBuilder} from '@angular/forms';
import {buildFormFromZod} from '../../_utils/common/validation/zod-to-angular';
import {userSchema} from './user.schema';
import {Confirmable} from '../../_utils/common/decorator/confirmable.decorator';
import {UserService} from './user.service';
import {formatDate} from '../../_utils/common/date-formatter';

@Component({
    selector: 'app-user',
    templateUrl: './user.component.html',
    styleUrl: './user.component.scss',
    standalone: false
})
export class UserComponent implements OnInit {
    // Thay vì inject qua constructor, hãy dùng inject() ở đây
    private readonly fb = inject(FormBuilder);
    // Lúc này this.fb đã sẵn sàng để dùng ngay tại đây
    form = this.fb.group({});
    // Constructor không cần tham số nữa (trừ khi có cái khác)
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    constructor() {}

    // form: FormGroup | undefined;
    // Angular 19 khuyến khích dùng inject() thay vì constructor
    private readonly userService = inject(UserService);

    // constructor(private readonly fb: FormBuilder) {
    // }

    ngOnInit() {
        try {
            this.form = buildFormFromZod(this.fb, userSchema);
        } catch (e) {
            console.error("Zod helper error:", e);
        }
    }

    // Helper check lỗi cho gọn template
    isFieldInvalid(fieldName: string): boolean {
        const control = this.form.get(fieldName);
        // Chỉ hiện lỗi khi control không hợp lệ VÀ (đã nhập liệu HOẶC đã bấm submit/touched)
        return !!(control && control.invalid && (control.dirty || control.touched));
    }

    submit() {
        console.log('Submit form:', formatDate("2024-01-01T00:00:00Z", "YYYY-MM-DD"));
        // --- Khi sử dụng (Type Inference cực thông minh) ---
        this.userService.getUser('123').subscribe(u => {
            console.log(u.email); // TS biết ngay 'u' là Object User, gợi ý code chuẩn
        });

        this.userService.getUser(['1', '2']).subscribe(users => {
            users.forEach(u => {
                console.log(u.name); // TS biết ngay 'u' là Object User, gợi ý code chuẩn
            }); // TS biết ngay 'users' là Array, cho phép dùng .forEach
        });
        if (this.form.invalid) {
            // QUAN TRỌNG: Đánh dấu tất cả các field là "đã touch" để kích hoạt hiển thị lỗi
            Object.values(this.form.controls).forEach((control: any) => {
                if (control?.invalid) {
                    control?.markAsDirty();
                    control?.updateValueAndValidity({ onlySelf: true });
                }
            });
            return;
        }

        console.log('Form Valid, gửi dữ liệu:', this.form.value);
    }

// 🧠 Kết quả
//     Bạn chỉ định nghĩa validation 1 lần bằng Zod, không cần viết thủ công Angular validators.
//     Khi backend thay đổi schema → chỉ cần update file Zod, form Angular tự sinh lại logic kiểm tra.

    // ---------------------------------------------------------
    // TRƯỜNG HỢP 1: XÓA USER (Nguy hiểm -> Nút đỏ, Cảnh báo ghê sợ)
    // ---------------------------------------------------------
    @Confirmable({
        title: 'Cảnh báo xóa',
        content: 'Dữ liệu sẽ mất vĩnh viễn. Bạn chắc chứ?',
        nzOkDanger: true,           // Nút OK màu đỏ
        successMessage: 'Đã xóa người dùng thành công!' // Popup xanh hiện sau khi API xong
    })
    deleteUser(id: number) {
        // Gọi API xóa.
        // BẮT BUỘC: Phải return về Observable để Decorator bắt được và tạo Loading
        return this.userService.deleteUser(id);
    }

    // ---------------------------------------------------------
    // TRƯỜNG HỢP 2: RESET PASSWORD (Bình thường -> Nút xanh)
    // ---------------------------------------------------------
    @Confirmable({
        title: 'Xác nhận đặt lại mật khẩu',
        content: 'Mật khẩu sẽ được gửi về email user.',
        nzOkDanger: false,          // Nút OK màu xanh mặc định
        successMessage: 'Đã gửi mật khẩu mới về email!'
    })
    resetPassword(id: number) {
        // Gọi API khác hoàn toàn
        return this.userService.resetPassword(id);
    }
}
