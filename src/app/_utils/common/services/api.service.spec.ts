/**
 * @Project: practice_angular
 * @Author: CHUNAM
 * @Date: 11/28/2025
 * @Time: 3:05 PM
 * @File: api.service.spec.ts
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpEventType } from '@angular/common/http';
import { ApiService } from './api.service'; // Đường dẫn tới service của bạn

describe('ApiService', () => {
    let service: ApiService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule], // Module giả lập HTTP
            providers: [ApiService]
        });

        // Inject Service và Mock Controller
        service = TestBed.inject(ApiService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        // Đảm bảo không còn request nào đang treo (pending) sau mỗi test case
        httpMock.verify();
    });

    // --- CASE 1: TEST GET (Mô phỏng gọi JSONPlaceholder) ---
    it('should retrieve posts from public API via GET', () => {
        const dummyPosts = [
            { userId: 1, id: 1, title: 'Post 1', body: 'Content 1' },
            { userId: 1, id: 2, title: 'Post 2', body: 'Content 2' }
        ];

        const publicUrl = 'https://jsonplaceholder.typicode.com/posts';

        // 1. Gọi hàm cần test và subscribe kết quả mong đợi
        service.get<any[]>(publicUrl).subscribe(posts => {
            // expect(posts.length).toBe(2);
            // @ts-ignore
            expect(posts).toEqual(dummyPosts);
        });

        // 2. Bắt request HTTP đang được gửi đi
        const req = httpMock.expectOne(publicUrl);

        // 3. Kiểm tra method phải là GET
        expect(req.request.method).toBe('GET');

        // 4. "Flush" (Xả) dữ liệu giả về để kích hoạt subscribe ở bước 1
        req.flush(dummyPosts);
    });


    // --- CASE 2: TEST UPLOAD & PROGRESS (Quan trọng) ---
    it('should upload file and update progress getter', () => {
        const file = new File(['dummy content'], 'test-image.png', { type: 'image/png' });
        const uploadUrl = '/api/upload';

        // Biến để theo dõi giá trị của Getter uploadProgress$
        let currentProgress = 0;

        // 1. Subscribe vào Getter để theo dõi % thay đổi
        service.uploadProgress$.subscribe(percent => {
            currentProgress = percent;
        });

        // 2. Gọi hàm upload
        service.uploadWithProgress(uploadUrl, file).subscribe(response => {
            // Khi xong thì response trả về body (ở bước flush cuối cùng)
            if (response) {
                expect(response).toEqual({ success: true });
            }
        });

        // 3. Bắt request
        const req = httpMock.expectOne(uploadUrl);
        expect(req.request.method).toBe('POST');
        // Kiểm tra body có phải FormData không
        expect(req.request.body instanceof FormData).toBeTrue();

        // 4. MÔ PHỎNG TIẾN ĐỘ UPLOAD (Simulate Progress)

        // Giả lập: Đã tải lên 50% (50/100 bytes)
        req.event({
            type: HttpEventType.UploadProgress,
            loaded: 50,
            total: 100
        });

        // Kiểm tra xem Getter đã cập nhật lên 50 chưa
        expect(currentProgress).toBe(50);

        // Giả lập: Đã tải lên 80%
        req.event({
            type: HttpEventType.UploadProgress,
            loaded: 80,
            total: 100
        });
        expect(currentProgress).toBe(80);

        // 5. MÔ PHỎNG HOÀN THÀNH (Simulate Response)
        req.flush({ success: true });

        // Theo logic trong Service của bạn, khi Response về thì progress set = 100
        expect(currentProgress).toBe(100);
    });
});
