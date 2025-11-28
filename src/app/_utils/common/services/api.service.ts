/**
 * @Project: practice_angular
 * @Author: CHUNAM
 * @Date: 11/14/2025
 * @Time: 1:00 AM
 * @File: api.service.ts
 */
// api.service.ts
import {inject, Injectable} from '@angular/core';
import {HttpClient, HttpEvent, HttpEventType, HttpParams} from '@angular/common/http';
import {BehaviorSubject, finalize, Observable} from 'rxjs';
import {ApiResponse} from '../../Response.model';
import {LogApi} from '../decorator/log-api.decorator';
import {map} from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ApiService {
    // constructor(private readonly http: HttpClient) {}
    private readonly http: HttpClient = inject(HttpClient);
    // --- QUẢN LÝ UPLOAD PROGRESS (Getter/Setter) ---
    // Dùng BehaviorSubject để lưu trữ trạng thái % upload hiện tại
    private _uploadProgress$ = new BehaviorSubject<number>(0);

    /**
     * Getter: Lấy Observable để component có thể subscribe hiển thị thanh loading
     * Sử dụng: this.apiService.uploadProgress$.subscribe(percent => ...)
     */
    get uploadProgress$(): Observable<number> {
        return this._uploadProgress$.asObservable();
    }

    /**
     * Setter: Cập nhật tiến độ (Private, chỉ dùng nội bộ)
     */
    private set uploadProgress(value: number) {
        this._uploadProgress$.next(value);
    }

    // =========================================================
    // OVERLOADS (Định nghĩa các chữ ký hàm)
    // =========================================================

    // GET Overloads
    get<T>(url: string): Observable<ApiResponse<T>>;
    get<T>(url: string, params: HttpParams | Record<string, string | number | boolean>): Observable<ApiResponse<T>>;
    @LogApi() // Áp dụng Decorator log
    get<T>(url: string, params?: any): Observable<ApiResponse<T>> {
        return this.http.get<ApiResponse<T>>(url, { params });
    }


    // eslint-disable-next-line @typescript-eslint/adjacent-overload-signatures
    // POST Overloads
    post<T>(url: string): Observable<ApiResponse<T>>; // Post không body
    post<T, V>(url: string, body: V): Observable<ApiResponse<T>>; // Post có body
    @LogApi()
    post<T, V>(url: string, body?: V): Observable<ApiResponse<T>> {
        return this.http.post<ApiResponse<T>>(url, body);
    }

    @LogApi()
    put<T, V>(url: string, body: V): Observable<ApiResponse<T>> {
        return this.http.put<ApiResponse<T>>(url, body);
    }

    @LogApi()
    patch<T, V>(url: string, body: Partial<T> | V): Observable<ApiResponse<T>> {
        return this.http.patch<ApiResponse<T>>(url, body);
    }

    delete<T>(url: string, params: HttpParams | Record<string, string | number | boolean>): Observable<ApiResponse<T>>;
    @LogApi()
    delete<T>(url: string, params?: any): Observable<ApiResponse<T>> {
        return this.http.delete<ApiResponse<T>>(url, { params });
    }

    // --- UPLOAD (Hỗ trợ File hoặc FormData) ---
    upload<T>(url: string, fileOrFormData: File | FormData): Observable<ApiResponse<T>> {
        let body: FormData;

        if (fileOrFormData instanceof File) {
            body = new FormData();
            body.append('file', fileOrFormData);
        } else {
            body = fileOrFormData;
        }

        // Lưu ý: Không cần set Content-Type là multipart/form-data
        // HttpClient của Angular sẽ tự động làm việc đó khi thấy body là FormData
        return this.http.post<ApiResponse<T>>(url, body);
    }

    // --- UPLOAD NÂNG CAO (Có tính % Progress) ---
    // Hàm này trả về boolean (Done hay chưa), còn % thì bắn qua getter uploadProgress$
    uploadWithProgress<T>(url: string, fileOrFormData: File | FormData): Observable<T | boolean> {
        let body: FormData;
        if (fileOrFormData instanceof File) {
            body = new FormData();
            body.append('file', fileOrFormData);
        } else {
            body = fileOrFormData;
        }

        this.uploadProgress = 0; // Reset về 0

        return this.http.post<T>(url, body, {
            reportProgress: true, // Bắt buộc để nhận event progress
            observe: 'events'     // Bắt buộc để nghe từng sự kiện
        }).pipe(
            map((event: HttpEvent<any>) => {
                switch (event.type) {
                    case HttpEventType.UploadProgress:
                        if (event.total) {
                            // Tính toán % và set vào Getter/Subject
                            const percent = Math.round((100 * event.loaded) / event.total);
                            this.uploadProgress = percent;
                        }
                        return false; // Chưa xong

                    case HttpEventType.Response:
                        this.uploadProgress = 100; // Xong
                        return event.body; // Trả về data server

                    default:
                        return false;
                }
            }),
            finalize(() => {
                // Khi Observable complete hoặc error, reset về 0 sau 1 chút
                setTimeout(() => this.uploadProgress = 0, 1000);
            })
        );
    }

    // --- DOWNLOAD (Trả về Blob - File nhị phân) ---
    // Lưu ý: Download không trả về ApiResponse<T> mà trả về Blob trực tiếp
    download(url: string, params?: any): Observable<Blob> {
        return this.http.get(url, {
            params,
            responseType: 'blob' // Quan trọng: Báo cho Angular biết đây là file
        });
    }
}
