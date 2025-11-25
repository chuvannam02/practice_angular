import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timer, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import {User} from './user.schema';

@Injectable({
    providedIn: 'root'
})
export class UserService {

    constructor(private readonly http: HttpClient) {
    }

    // ============================================================
    // 1. MOCK API (Dùng để test UI, test Decorator)
    // ============================================================

    /**
     * Mock API Xóa User
     * Giả lập chờ 2 giây mới xóa xong để test Loading Spinner
     */
    deleteUser(id: number): Observable<boolean> {
        console.log(`[Mock API] Đang xóa user ID: ${id}...`);

        // timer(2000): Đợi 2000ms (2 giây) sau đó mới emit giá trị
        return timer(2000).pipe(
            map(() => {
                console.log('[Mock API] Xóa thành công!');
                return true;
            })
        );

        // Mẹo: Nếu muốn test trường hợp LỖI, hãy comment đoạn trên và mở đoạn dưới:
        // return timer(2000).pipe(
        //    switchMap(() => throwError(() => new Error('Server bảo trì, không xóa được!')))
        // );
    }

    /**
     * Mock API Reset Password
     * Giả lập chờ 1.5 giây
     */
    resetPassword(id: number): Observable<any> {
        console.log(`[Mock API] Đang reset pass cho user ID: ${id}...`);

        return timer(1500).pipe(
            map(() => {
                console.log('[Mock API] Reset pass thành công!');
                return { status: 'ok', newPass: '123456' };
            })
        );
    }

    // ============================================================
    // 2. REAL API (Code thật khi nối Backend)
    // Bạn sẽ mở comment phần này khi có API thật
    // ============================================================

    /*
    deleteUserReal(id: number): Observable<any> {
        return this.httpClient.delete(`/api/users/${id}`);
    }

    resetPasswordReal(id: number): Observable<any> {
        return this.httpClient.post(`/api/users/${id}/reset-password`, {});
    }
    */

    // Signature 1: Truyền 1 ID -> Trả về 1 User (chắc chắn)
    getUser(id: string): Observable<User>;

    // Signature 2: Truyền mảng ID -> Trả về mảng User (chắc chắn)
    getUser(ids: string[]): Observable<User[]>;

    // Implementation (Phần thực thi - gom tất cả logic lại)
    getUser(idOrIds: string | string[]): Observable<User | User[]> {
        if (Array.isArray(idOrIds)) {
            return this.http.get<User[]>('/api/users', { params: { ids: idOrIds } });
        }
        return this.http.get<User>(`/api/users/${idOrIds}`);
    }
}
