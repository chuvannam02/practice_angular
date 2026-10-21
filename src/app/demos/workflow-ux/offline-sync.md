# Hai tab, offline và đồng bộ an toàn

Mở **Preview file, form lớn và xử lý workflow → Mở các demo workflow**.
Demo **Mất mạng, mất phản hồi và hai tab cùng ghi** có nút **Mở tab thứ hai**, tự mở lab ở tab mới.

## Những gì demo thực sự chạy

- `in-view-once.directive.ts`: ảnh chỉ được tạo khi có diện tích giao với viewport; scroll ancestor cũng được tính clipping. Gallery dùng skeleton đến sự kiện `load`, retry sau `error`, giữ ảnh đã tải khi cuộn đi rồi quay lại.
- `offline-demo.store.ts`: IndexedDB thật, hai kết nối/tab cùng origin dùng chung dữ liệu. Ba object stores: `records`, `receipts`, `outbox`.
- `offline-sync.component.ts`: hàng đợi tạo hồ sơ, loading, giả lập mất mạng trước khi ghi hoặc mất phản hồi sau khi đã ghi, tự đồng bộ khi lab mở lại/online/focus. BroadcastChannel báo thay đổi; khi không hỗ trợ thì refresh lúc focus hoặc dùng nút tải lại.

`records` và `receipts` đóng vai **backend giả lập cùng trình duyệt** để thử tình huống FE. Backend thật phải thực thi các kiểm tra này trên server/database; IndexedDB không khóa được người dùng ở thiết bị khác.

## Kịch bản kiểm tra

| Thao tác | Kết quả mong đợi |
| --- | --- |
| Bật “Giả lập mất mạng”, tạo hồ sơ | Commit payload + key vào outbox, chưa thêm record; hiện chờ đồng bộ |
| Tắt mất mạng | Tự gửi, thêm một record, xóa lệnh khỏi outbox sau khi nhận kết quả |
| Bật “Mất phản hồi”, tạo hồ sơ | Record đã có, outbox vẫn còn với kết quả chưa xác nhận |
| Retry sau mất phản hồi | Cùng key/payload trả lại cùng ID; không tạo record thứ hai |
| Hai tab mở sửa cùng version, lần lượt lưu | Lần đầu thành công; lần sau 409, giữ nguyên bản nháp để so sánh |
| Tab 1 xóa trong lúc tab 2 đang sửa | Tab 2 lưu báo 410; không tự upsert bản đã xóa, không mất nội dung đang gõ |
| Hai tab gửi lại cùng một lệnh | Lease hạn chế gửi đồng thời; kể cả lease hết hạn, receipt trong transaction vẫn chống ghi trùng |
| Hai tab tạo hai lệnh độc lập giống tên | Hai key khác nhau nên cả hai có thể thành công; đây là hai ý định độc lập |
| Lưu IndexedDB thất bại/đầy | Không báo đã lưu, không xóa nội dung input |

Checkbox giả lập mất mạng chỉ áp dụng ở tab hiện tại, reset khi reload. Outbox được chia sẻ: tab khác đang online có thể đồng bộ khi được focus. Sau reload online, lệnh đã lưu tự tiếp tục; xem **DevTools → Application → IndexedDB → angular-workflow-offline-v1** để kiểm tra persistence. Có thể xóa riêng database demo ở đây khi muốn bắt đầu lại, sau khi đóng các tab lab.

Khi tab đang gửi bị đóng, lease hết hạn sau 10 giây. Tab còn mở sẽ thử lại lúc hết lease; mở lại lab cũng tiếp tục xử lý. Lease chỉ hạn chế số request, không thay thế idempotency phía backend.

Mock không cài Service Worker nên chưa hỗ trợ mở toàn bộ app từ đầu khi offline. Outbox vẫn nằm trong IndexedDB; app cần tải được để tiếp tục đồng bộ. Bản nháp sửa và ô tạo chưa bấm lưu chỉ nằm trong RAM; chỉ payload **đã xếp hàng** mới bền vững.

## Idempotency key được tạo thế nào?

1. Tạo một UUID ngẫu nhiên đủ entropy (`crypto.randomUUID()` trên HTTPS/localhost) cho **một ý định ghi**, trước lần gửi đầu tiên. Không dùng timestamp đơn lẻ, tên hồ sơ, email hay thông tin nhạy cảm làm key.
2. Lưu key cùng payload bất biến trong outbox **trước khi gửi**. Nhấn retry, timeout, mất phản hồi hoặc reload đều dùng lại cặp này. Không sinh key ngẫu nhiên ở interceptor cho từng HTTP attempt.
3. Nếu sửa payload thành ý định khác thì dùng key mới. Lệnh cũ có kết quả chưa rõ phải được đối soát trước khi bỏ/thay thế: server có thể đã thực hiện.
4. Backend scope key theo user/tenant và operation/endpoint, kiểm tra fingerprint của payload; cùng key nhưng payload khác phải bị từ chối. Fingerprint demo chỉ là JSON canonical của một trường; API phức tạp cần canonicalization nhất quán theo hợp đồng.
5. Backend commit mutation và receipt/result trong **cùng transaction**, hoặc dùng cơ chế đảm bảo tương đương. Ghi receipt sau mutation bằng hai bước độc lập có thể để lọt duplicate khi server chết giữa chừng.
6. Backend định nghĩa thời gian giữ key/result và khả năng tra cứu operation. Nếu retry sau thời gian lưu mà kết quả còn chưa rõ, cần query/đối soát thay vì mặc định sinh key mới. Demo giữ receipt đến khi xóa database, chưa mô phỏng TTL.

Ví dụ hợp đồng API thật:

```http
POST /records
Idempotency-Key: <UUID đã lưu cùng payload>
Content-Type: application/json

{"title":"Đề nghị mua màn hình"}
```

```http
PATCH /records/123
If-Match: "version-7"
Content-Type: application/json

{"title":"Nội dung đã chỉnh"}
```

`If-Match`/expectedVersion xử lý stale write (thường 412 với If-Match; demo dùng 409 cho conflict nghiệp vụ). Idempotency xử lý retry cùng lệnh; không thay thế kiểm tra version, quyền truy cập hoặc unique constraint của mã hồ sơ. Hai tab tạo hai UUID khác nhau không tự được nhận diện là cùng ý định. Nếu cần cùng một thao tác nghiệp vụ chỉ thành công một lần, server cần khóa duy nhất theo mã nghiệp vụ/operation ID phù hợp.

## Chọn IndexedDB hay Service Worker?

| Nhu cầu | Cơ chế phù hợp |
| --- | --- |
| Draft biểu mẫu dài, checklist tại hiện trường, hàng đợi attachment metadata | IndexedDB, schema version, trạng thái đã lưu rõ ràng |
| Gửi lại khi người dùng mở app/có mạng/trở về tab | IndexedDB outbox + foreground sync, như demo |
| Mở app shell khi offline sau lần truy cập đầu | Service Worker + Cache Storage cho tài nguyên phù hợp |
| Có thể gửi outbox lúc trang đã đóng | Custom Service Worker + Background Sync trên trình duyệt hỗ trợ, vẫn có foreground fallback |
| Người khác đã sửa/xóa hồ sơ trong lúc mình offline | Version/ETag và quy tắc giải quyết conflict ở backend + giao diện giữ draft |

IndexedDB chỉ lưu dữ liệu, không tự gọi API. Service Worker chạy tách khỏi Angular component và không có DOM; Angular signals không phải storage dùng chung cho worker. Angular Service Worker hỗ trợ caching, không tự queue/replay POST cho bạn. Background Sync cần secure context, không có trên mọi trình duyệt và không bảo đảm chạy đúng một thời điểm.

Với sản phẩm có offline writes thật, luồng nên là:

```text
Form → validate → commit intent + key vào IndexedDB → hiện “Chờ đồng bộ”
  → foreground hoặc worker claim lease → gửi API với key đã lưu
  → nhận kết quả → commit trạng thái hoàn tất → thông báo các tab
  → timeout: giữ kết quả chưa xác nhận, retry cùng key với backoff
  → 409/412/410: dừng tự retry, giữ draft và yêu cầu xử lý conflict
```

Các UC phù hợp: kỹ thuật viên ghi checklist ngoài hiện trường, nhân viên ghi nhận đơn khi mạng yếu, autosave draft báo cáo. Bước workflow yêu cầu quyền/trạng thái hiện tại như phê duyệt vẫn cần server xác nhận; UI phân biệt **đã lưu trên máy**, **đang đồng bộ**, **đã được server chấp nhận**.

Khi triển khai thật, giới hạn queue/dung lượng, xử lý quota, retry có giới hạn và backoff/jitter cho lỗi mạng/429/503, đọc Retry-After; dừng khi 401/403 để xác thực/quyền được giải quyết. Tách outbox theo tài khoản/tenant, xử lý đổi tài khoản/logout để không gửi nhầm draft. Không giữ token bí mật trong từng job. Storage trình duyệt có thể bị dọn/xóa nên không là bản sao duy nhất của dữ liệu quan trọng.

## Nguồn chính thức

- [IntersectionObserver](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- [IndexedDB transactions](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction)
- [BroadcastChannel](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API)
- [Idempotent requests – Stripe, ví dụ hợp đồng backend](https://docs.stripe.com/api/idempotent_requests)
- [If-Match](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/If-Match)
- [navigator.onLine chỉ là gợi ý](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine)
- [Angular Service Worker](https://angular.dev/ecosystem/service-workers)
- [Angular SW configuration: cache GET/HEAD](https://angular.dev/ecosystem/service-workers/config)
- [Background Synchronization API, hỗ trợ và secure context](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)
