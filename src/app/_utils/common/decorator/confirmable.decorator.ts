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

export function Confirmable(options?: ConfirmableOptions) {
    return function (target: Object, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) { // Đánh dấu async func bao bọc

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
                nzOnOk: async () => {
                    try {
                        // Gọi hàm gốc
                        const result = originalMethod.apply(this, args);

                        // Xử lý Loading: Chờ nếu là Observable hoặc Promise
                        if (isObservable(result)) {
                            await firstValueFrom(result);
                        } else if (result instanceof Promise) {
                            await result;
                        }

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
