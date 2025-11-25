/**
 * @Project: practice_angular
 * @Author: CHUNAM
 * @Date: 11/25/2025
 * @Time: 4:20 PM
 * @File: toast-notification.ts
 */
interface ToastConfig {
    message: string;
    type: 'success' | 'error' | 'warning';
    duration?: number;
}

// Signature 1: Cách dùng nhanh (Shorthand)
function showToast(message: string): void;

// Signature 2: Cách dùng nhanh có type
function showToast(message: string, type: 'success' | 'error'): void;

// Signature 3: Cách dùng đầy đủ (Full Config)
function showToast(config: ToastConfig): void;

// Implementation
function showToast(arg1: string | ToastConfig, arg2?: string): void {
    if (typeof arg1 === 'object') {
        // Xử lý logic config object
        console.log("Config mode:", arg1);
    } else {
        // Xử lý logic string
        console.log("Shorthand mode:", arg1, "Type:", arg2 || 'success');
    }
}

// --- Sử dụng ---
showToast("Save success!"); // ✅ Nhanh gọn
showToast("Deleted", "error"); // ✅ Nhanh gọn + Type
showToast({ message: "Loading...", duration: 5000, type: "warning" }); // ✅ Full options
