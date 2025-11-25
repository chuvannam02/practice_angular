/**
 * @Project: practice_angular
 * @Author: CHUNAM
 * @Date: 11/14/2025
 * @Time: 12:59 AM
 * @File: Response.model.ts
 */

// Generic API Response
export interface ApiResponse<T> {
    data: T;
    success: boolean;
    message?: string;
}
