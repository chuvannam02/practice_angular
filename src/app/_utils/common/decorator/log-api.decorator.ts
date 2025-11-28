import {isDevMode} from '@angular/core';

/**
 * @Project: practice_angular
 * @Author: CHUNAM
 * @Date: 11/28/2025
 * @Time: 2:56 PM
 * @File: log-api.decorator.ts
 */
// Tạo một decorator @LogApi để tự động log URL và Body ra console mỗi khi gọi API (giúp debug dễ hơn).
// decorators/log-api.decorator.ts
export function LogApi() {
    return function (target: object, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = function (...args: any[]) {

            // 1. Kiểm tra: Nếu KHÔNG phải Dev Mode thì chạy hàm gốc ngay, bỏ qua đoạn log bên dưới
            if (!isDevMode()) {
                return originalMethod.apply(this, args);
            }

            // --- Logic Log (Chỉ chạy khi ở môi trường Dev) ---
            const url = args[0];
            const paramsOrBody = args[1]; // Tham số thứ 2 thường là params hoặc body

            console.groupCollapsed(`🌐 API Call: [${propertyKey.toUpperCase()}]`); // Dùng groupCollapsed cho gọn
            console.log('🔗 URL:', url);

            if (paramsOrBody) {
                console.log('📦 Body/Params:', paramsOrBody);
            }

            // Lưu ý: args ở đây là tham số ĐẦU VÀO, không phải response trả về
            console.log("📥 Arguments:", args);
            console.groupEnd();

            // Gọi hàm gốc
            return originalMethod.apply(this, args);
        };

        return descriptor;
    };
}
