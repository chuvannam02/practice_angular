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
            const url = args[0];
            const body = args[1]; // Thường body là tham số thứ 2

            console.group(`🌐 API Call: [${propertyKey.toUpperCase()}]`);
            console.log('URL:', url);
            if (body) console.log('Body:', body);
            console.groupEnd();

            return originalMethod.apply(this, args);
        };

        return descriptor;
    };
}
