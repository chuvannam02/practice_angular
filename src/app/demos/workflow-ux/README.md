# Media, form lớn và workflow trên FE

Chạy app, tìm **Preview file, form lớn và xử lý workflow**, bấm **Mở các demo workflow**.
Các request ghi/validation được giả lập trên FE; file được preview cục bộ, không upload.
Đóng lab hủy các component, draft/board ở RAM. Riêng demo hai tab dùng IndexedDB nên dữ liệu/outbox vẫn còn qua reload.
Đây là demo hành vi, không phải load test nhiều client.

Demo mới: [hai tab, mất mạng, idempotency key và IndexedDB/Service Worker](offline-sync.md).

## Ảnh và PDF

- Gallery: `IntersectionObserver` chưa tạo `img`/URL khi thumbnail chưa đi vào viewport và phần nhìn thấy của khung cuộn. `rootMargin: 0px`, threshold nhỏ dương tránh bỏ lỡ trường hợp chỉ vừa chạm biên mà diện tích giao còn bằng 0.
- Skeleton giữ aspect ratio, chỉ chạy shimmer khi đang tải, tắt chuyển động khi người dùng yêu cầu reduced motion. Load thành công bỏ skeleton; lỗi hiện fallback/retry. Observer disconnect sau lần xuất hiện đầu và khi hủy view.
- `NgOptimizedImage` dùng eager sau khi observer cho phép tạo ảnh. Native `loading="lazy"` riêng lẻ có thể prefetch gần viewport nên không đáp ứng yêu cầu chờ đúng vùng nhìn thấy. Không hỗ trợ observer thì có nút tải thủ công. Hero/LCP dùng priority ngay từ đầu; ảnh thật nên có thumbnail và srcset/CDN phù hợp.
- Chọn hoặc drop đúng một PNG/JPEG/WebP/PDF tối đa 10 MB. Kiểm tra MIME + signature ngắn, không đọc toàn file vào base64.
- Chỉ tạo một preview khi yêu cầu. Blob URL được revoke sau modal đóng, hoặc khi component bị hủy; kết quả đọc file cũ không mở lại preview.
- PDF mẫu được tạo bằng `demo-pdf.ts`. Native PDF viewer phụ thuộc trình duyệt; luôn có link tải. PDF.js với nhiều trang cần virtualize trang và dọn canvas, không render mọi trang cùng lúc.
- Giới hạn MB không bảo đảm giới hạn RAM decode; sản phẩm cần giới hạn độ phân giải/thumbnail theo dữ liệu thực. Kiểm tra file ở FE không thay thế kiểm tra/quyền truy cập ở BE.

## updateOn: 'blur'

`change` cập nhật model/validation khi nhập; `blur` chờ mất focus. DOM vẫn nhận ký tự ngay.
Demo có bộ đếm validation và async request, cùng debounce 250ms; username `admin` giả lập đã tồn tại.
`setValue`/`patchValue` vẫn cập nhật bằng code ngay. `blur` không giảm số DOM/controls.

Form 1.000 trường chia 40 nhóm, chỉ tạo 25 controls của nhóm hiện tại.
Trước khi chuyển nhóm/submit bằng Enter, chốt ô đang focus rồi giữ draft dạng dữ liệu riêng.
`markAllAsTouched()` và `updateValueAndValidity()` không tự flush giá trị view đang chờ blur.
Nút kiểm tra toàn bộ draft kiểm tra cả nhóm chưa render. Draft chỉ ở RAM và mất khi reload.

## Drag/drop và workflow

- Dùng CDK DropList/DragHandle, track theo ID, preview gọn, nút thay thế cho bàn phím/mobile.
- Chặn bước không hợp lệ, hồ sơ khóa/đã duyệt. Drop từ `todo` sang `review` và reorder phản hồi ngay rồi rollback khi lỗi giả lập.
- Phê duyệt chờ xác nhận trước khi chuyển sang `done`. Board serialize lệnh ghi để snapshot rollback không đè thao tác khác.
- Chọn lỗi mạng để thử retry; chọn xung đột version để thấy bản cập nhật của người xử lý khác, không tự retry phê duyệt.
- API thật cần authorization, trạng thái hợp lệ, expectedVersion/ETag và idempotency phù hợp.
- Với timeout thật, trạng thái có thể chưa biết: server có thể đã nhận lệnh. Query/refresh trước retry; unsubscribe ở FE không bảo đảm hủy tác dụng trên server.
- Canvas workflow lớn cần model theo ID, chỉ render vùng nhìn thấy, phát hiện chu trình theo luật nghiệp vụ, gom pointer events và validate khi drop. Không kiểm tra toàn graph mỗi lần chuột di chuyển.

Trong giao diện còn có bảng UC: autosave, nhiều người duyệt cùng lúc, bulk actions, WebSocket burst, nhiều attachment và 429/503.

Nguồn: [Angular Forms](https://angular.dev/guide/forms/form-validation),
[AbstractControl.updateOn](https://angular.dev/api/forms/AbstractControl#updateOn),
[NgOptimizedImage](https://angular.dev/guide/image-optimization),
[CDK DragDrop](https://angular.dev/guide/drag-drop),
[Blob URL cleanup](https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL_static),
[If-Match](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/If-Match),
[429 / Retry-After](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/429).
