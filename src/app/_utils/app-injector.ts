/**
 * @Project: practice_angular
 * @Author: CHUNAM
 * @Date: 11/25/2025
 * @Time: 1:48 AM
 * @File: app-injector.ts
 */
// Injector toàn cục để sử dụng ngoài DI của Angular
// Thường dùng trong các service không được DI trực tiếp
// như Interceptor, Guard, v.v.
import { Injector } from '@angular/core';

// Biến global để chứa Injector
export let appInjector: Injector;

// Hàm setter
export function setAppInjector(injector: Injector): void {
    if (appInjector) return;
    appInjector = injector;
}
