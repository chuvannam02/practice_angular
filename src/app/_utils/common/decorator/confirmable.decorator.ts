/**
 * @Project: practice_angular
 * @Author: CHUNAM
 * @Date: 11/25/2025
 * @Time: 1:56 AM
 * @File: confirmable.decorator.ts
 */
import { NzModalService, ModalOptions } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';

import { firstValueFrom, isObservable } from 'rxjs';
import {appInjector} from '../../app-injector';

export interface ConfirmableOptions extends ModalOptions {
    title?: string;
    content?: string;
    successMessage?: string;
    errorMessage?: string;
}

// export function Confirmable(...): Đây là hàm bạn sẽ gọi khi dùng decorator, ví dụ @Confirmable({ title: 'Xóa nhé?' }).
// options: Chính là object cấu hình bạn truyền vào.
export function Confirmable(options?: ConfirmableOptions) {
    // return function (...): Đây là chuẩn của TypeScript Decorator. Nó nhận 3 tham số:
    // - target: Class chứa hàm này (Prototype của Component).
    // - propertyKey: Tên của hàm đang được gắn decorator (ví dụ: deleteUser).
    // - descriptor: Quan trọng nhất. Nó chứa thông tin mô tả về hàm đó, bao gồm cả nội dung code của hàm (descriptor.value).
    return function (target: Object, propertyKey: string, descriptor: PropertyDescriptor) {
        // const originalMethod = descriptor.value;: Chúng ta lưu lại logic gốc của hàm (ví dụ code gọi API xóa user) vào biến này để dùng sau.
        const originalMethod = descriptor.value;

        // descriptor.value = ...: Chúng ta thay thế hàm gốc bằng một hàm mới (hàm wrapper). Khi Component gọi this.deleteUser(), thực chất nó sẽ chạy hàm mới này.
        // ...args: any[]: Thu thập tất cả tham số được truyền vào hàm gốc (ví dụ id của user).
        descriptor.value = async function (...args: any[]) { // Đánh dấu async func bao bọc

            // Vấn đề: Decorator là một function độc lập, nó không nằm trong Constructor của Component nên không thể dùng Dependency Injection (DI) của Angular theo cách thông thường (constructor(private modal: NzModalService)).
            // Giải pháp: Dùng appInjector (một biến toàn cục lưu trữ Injector của App) để lấy các service NzModalService và NzMessageService một cách thủ công.
            // Kiểm tra xem app đã khởi tạo xong chưa
            if (!appInjector) {
                console.error('AppInjector chưa được khởi tạo. Hãy kiểm tra app.config.ts');
                return;
            }

            const modalService = appInjector.get(NzModalService);
            const messageService = appInjector.get(NzMessageService);

            modalService.confirm({
                nzTitle: options?.title || 'Xác nhận hành động',
                nzContent: options?.content || 'Bạn có chắc chắn muốn thực hiện?',
                nzOkText: options?.nzOkText || 'Đồng ý',
                nzCancelText: options?.nzCancelText || 'Hủy',
                nzOkDanger: options?.nzOkDanger ?? false,
                ...options,

                // Logic xử lý khi bấm OK
                // nzOnOk: Hàm này chạy khi user bấm nút "Đồng ý".
                nzOnOk: async () => {
                    try {
                        // originalMethod.apply(this, args):
                        // - Chạy lại hàm gốc đã lưu ở bước 3.
                        // - this: Đảm bảo từ khóa this bên trong hàm gốc vẫn trỏ đúng về Component hiện tại (nếu không dùng apply, this có thể bị null hoặc sai lệch).
                        // - args: Truyền lại đúng các tham số (ví dụ ID) vào hàm gốc.
                        // Gọi hàm gốc
                        const result = originalMethod.apply(this, args);

                        // Xử lý Loading: Chờ nếu là Observable hoặc Promise
                        if (isObservable(result)) {
                            await firstValueFrom(result);
                        } else if (result instanceof Promise) {
                            await result;
                        }
                        // - Đoạn này kiểm tra xem hàm gốc trả về cái gì.
                        // - Nếu trả về Observable (thường thấy khi gọi API Angular HttpClient), ta dùng firstValueFrom để chuyển nó thành Promise và await nó.
                        // - Nếu trả về Promise, ta cũng await.
                        // - Tác dụng: Khi bạn await trong nzOnOk, nút "Đồng ý" của Modal sẽ tự động hiện vòng quay (Loading spinner) và không đóng lại cho đến khi hàm chạy xong.

                        // Thành công
                        if (options?.successMessage) {
                            messageService.success(options.successMessage);
                        }
                    } catch (error) {
                        // Thất bại
                        if (options?.errorMessage) {
                            messageService.error(options.errorMessage);
                        }
                        throw error; // Ném lỗi để console log ra ngoài nếu cần
                    }
                }
            });
        };

        return descriptor;
    };
}
