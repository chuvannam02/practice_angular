import {isDevMode} from '@angular/core';
import {Observable, tap} from 'rxjs';

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
            // 1. Nếu không phải Dev mode -> chạy hàm gốc luôn, không log gì cả
            if (!isDevMode()) {
                return originalMethod.apply(this, args);
            }

            // 2. Log thông tin REQUEST (Input)
            console.groupCollapsed(`🚀 API Request: [${propertyKey.toUpperCase()}]`);
            console.log('🔗 URL:', args[0]);
            if (args[1]) console.log('📦 Params/Body:', args[1]);
            console.groupEnd();

            // 3. Gọi hàm gốc và lấy kết quả (là một Observable)
            const result$ = originalMethod.apply(this, args);

            // 4. Kiểm tra xem kết quả có phải là Observable không để dùng .pipe()
            if (result$ instanceof Observable) {
                return result$.pipe(
                    tap({
                        next: (response: any) => {
                            // Log khi API trả về thành công
                            console.groupCollapsed(`✅ API Response: [${propertyKey.toUpperCase()}]`);
                            console.log('DATA:', response);
                            console.groupEnd();
                        },
                        error: (error: any) => {
                            // Log khi API bị lỗi
                            console.groupCollapsed(`❌ API Error: [${propertyKey.toUpperCase()}]`);
                            console.error('ERROR:', error);
                            console.groupEnd();
                        }
                    })
                );
            }

            // Trường hợp hàm không trả về Observable (ít gặp trong HttpClient nhưng vẫn nên handle)
            return result$;
        };

        return descriptor;
    };
}
