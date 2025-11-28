/**
 * @Project: practice_angular
 * @Author: CHUNAM
 * @Date: 11/14/2025
 * @Time: 12:59 AM
 * @File: Response.model.ts
 */

// Generic API Response
export interface ApiResponse<T> {
    data: T | null;
    success: boolean;
    message?: string;
}

// export class ApiResponseClass<T> implements ApiResponse<T> {
//     // Shorthand: Tự động khai báo property và gán giá trị
//     constructor(
//         public data: T,
//         public success = true, // Mặc định là true
//         public message?: string
//     ) {}
// }

// Nâng cao (Factory Methods - Khuyên dùng)
export class ApiResponseClass<T> implements ApiResponse<T> {
    constructor(
        public data: T,
        public success: boolean,
        public message?: string
    ) {}

    /**
     * Helper tạo nhanh response thành công
     * Sử dụng: ApiResponseClass.success(data)
     */
    static success<T>(data: T, message = 'Success'): ApiResponseClass<T> {
        return new ApiResponseClass(data, true, message);
    }

    /**
     * Helper tạo nhanh response thất bại
     * Sử dụng: ApiResponseClass.error('Lỗi rồi', null)
     */
    static error<T>(message: string, data?: T): ApiResponseClass<T | null> {
        // data as T để ép kiểu nếu data là null/undefined
        return new ApiResponseClass(data ?? null, false, message);
    }
}

// --- Cách dùng ---
// const user = { id: 1, name: 'Nam' };
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// const response = new ApiResponseClass(user);
// Kết quả: { data: {id: 1...}, success: true, message: undefined }
