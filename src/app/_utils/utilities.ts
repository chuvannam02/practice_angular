/**
 * @Project: practice_angular
 * @Author: CHUNAM
 * @Date: 1/1/2026
 * @Time: 8:12 PM
 * @File: utilities.ts
 */
type PromotionType = 'preOrder' | 'promotion' | 'blackFriday' | 'dayPrice' | 'default';

// Strategy Pattern - Table lookup
// Sử dụng Object Map Lookup
// Giả lập các hàm xử lý giá
const preOrderPrice = (p: number) => p * 0.8;
const promotionPrice = (p: number) => p * 0.9;
const blackFridayPrice = (p: number) => p * 0.5;
const dayPrice = (p: number) => p * 0.95;
const defaultPrice = (p: number) => p;

const getPriceStrategies: Record<PromotionType, (price: number) => number> = {
    preOrder: preOrderPrice,
    promotion: promotionPrice,
    blackFriday: blackFridayPrice,
    dayPrice: dayPrice,
    default: defaultPrice
};

// 1. Code sạch và dễ đọc (Clean Code): Khi sử dụng if-else hoặc switch-case, mã nguồn thường bị kéo dài theo chiều dọc với rất nhiều từ khóa lặp lại.
//     - Với if-else: Bạn phải đọc qua từng dòng điều kiện để hiểu logic.
//     - Với Object Map: Logic thực thi (hàm getPrice) tách biệt hoàn toàn với dữ liệu cấu hình (getPriceStrategies).Nhìn vào object, bạn thấy ngay toàn bộ các kịch bản đang có một cách trực quan.
//
// 2. Dễ bảo trì và mở rộng (Scalability): Đây là lợi ích lớn nhất liên quan đến nguyên lý Open/Closed trong SOLID (Đóng với việc sửa đổi, Mở với việc mở rộng).
//     - Thêm tính năng mới: Nếu bạn có thêm chương trình khuyến mãi "Tết Nguyên Đán", bạn chỉ cần thêm một dòng vào object getPriceStrategies. Bạn không cần chạm vào logic bên trong hàm getPrice.
//     - Giảm thiểu rủi ro: Vì bạn không sửa code ở hàm xử lý chung, bạn sẽ ít gây ra lỗi "tác động phụ" (side effects) cho các loại khuyến mãi hiện có.
//
// 3. Hiệu năng (Performance):Mặc dù ở quy mô nhỏ sự khác biệt là không đáng kể, nhưng về mặt thuật toán: if-else / switch: Có độ phức tạp là $O(n)$. Chương trình phải kiểm tra từng điều kiện một cho đến khi khớp.
//     - Object Lookup: Có độ phức tạp là $O(1)$ nhờ vào cơ chế Hash Table của JavaScript. Việc truy cập giá trị qua Key diễn ra gần như ngay lập tức bất kể bạn có 5 hay 500 loại khuyến mãi.

function getPrice(originalPrice: number, typePromotion: PromotionType): number {
    // Vì đã dùng Record, TS đảm bảo getPriceStrategies[typePromotion] luôn tồn tại
    const strategy = getPriceStrategies[typePromotion] || getPriceStrategies.default;
    return strategy(originalPrice);
}
// Nâng cấp bài toán
// 1. Kết hợp nhiều tham số bằng "Key Composition"
// - Nếu logic phụ thuộc vào 2 biến (ví dụ: Thứ hạng khách hàng và Phương thức thanh toán), bạn có thể gộp chúng thành một chuỗi duy nhất để làm Key.
// - Ví dụ: Tính phí vận chuyển.
type Rank = 'GOLD' | 'SILVER';
type Method = 'EXPRESS' | 'NORMAL';

// Tạo ra kiểu kết hợp: "GOLD_EXPRESS" | "GOLD_NORMAL" | ...
type ShippingKey = `${Rank}_${Method}` | 'DEFAULT';

const shippingMap: Record<ShippingKey, number> = {
    'GOLD_EXPRESS': 0,
    'GOLD_NORMAL': 10000,
    'SILVER_EXPRESS': 20000,
    'SILVER_NORMAL': 30000,
    'DEFAULT': 50000
};

function getShippingFee(rank: Rank, method: Method): number {
    const key: ShippingKey = `${rank}_${method}`;
    return shippingMap[key] ?? shippingMap['DEFAULT'];
}

// 2. Xử lý logic theo khoảng (Range) hoặc điều kiện phức tạp
// - Với các bài toán như tính thuế hoặc xếp loại học lực (nơi bạn không có Key cố định mà là các khoảng như score > 80), ta sử dụng Array of Strategies (Predicate Mapping).
// - Thay vì dùng if (score > 80) ... else if (score > 60), ta định nghĩa một mảng các đối tượng chứa điều kiện:
type Grade = 'Xuất sắc' | 'Giỏi' | 'Khá' | 'Trung bình' | 'Yếu';

interface GradeStrategy {
    condition: (score: number) => boolean;
    grade: Grade;
}

const gradeStrategies: GradeStrategy[] = [
    { condition: (s) => s >= 90, grade: 'Xuất sắc' },
    { condition: (s) => s >= 80, grade: 'Giỏi' },
    { condition: (s) => s >= 65, grade: 'Khá' },
    { condition: (s) => s >= 50, grade: 'Trung bình' },
];

function getGrade(score: number): Grade {
    const strategy = gradeStrategies.find(item => item.condition(score));
    return strategy ? strategy.grade : 'Yếu';
}

// 3. Xử lý logic lồng nhau (Nested Mapping)
// - Nếu bạn có các nhóm logic lớn, hãy chia nhỏ Object Map thành các lớp (Nested Objects). Điều này giống như việc bạn đi qua từng thư mục để tìm file.
// - Ví dụ: Xử lý thông báo theo loại người dùng và kênh gửi.
type Role = 'ADMIN' | 'CUSTOMER';
type Channel = 'EMAIL' | 'SMS' | 'PUSH';
type NotifyFn = (msg: string) => void;

// Dùng Record lồng nhau, Partial nghĩa là không bắt buộc phải có đủ EMAIL, SMS, PUSH
const notificationSystem: Record<Role, Partial<Record<Channel, NotifyFn>>> = {
    ADMIN: {
        EMAIL: (msg) => console.log(`Admin Email: ${msg}`),
        SMS: (msg) => console.log(`Admin SMS: ${msg}`),
        PUSH: (msg) => console.log(`Admin Push: ${msg}`)
    },
    CUSTOMER: {
        EMAIL: (msg) => console.log(`Customer Email: ${msg}`),
        PUSH: (msg) => console.log(`Customer Push: ${msg}`)
        // CUSTOMER không có SMS
    }
};

function notify(role: Role, channel: Channel, message: string): void {
    const strategy = notificationSystem[role]?.[channel];

    if (strategy) {
        strategy(message);
    } else {
        console.warn(`Hệ thống không hỗ trợ gửi ${channel} cho vai trò ${role}`);
    }
}

// => 1. If/else switch
// - Cấu trúc cây quyết định (Decision Tree)
// - Nên dùng khi logic đơn giản (1-2 nhánh)
// - Khả năng đọc code giảm dần khi logic lồng nhau
// - Khi mở rộng code phải chọc thẳng trực tiếp vào hàm xử lý

// => 2.Object/ Predicate Map
// - Sử dụng cấu trúc Lookup Table (bảng tra cứu)
// - Nên sử dụng khi logic có xu hướng mở rộng trong tương lai
// - Khả năng đọc code giữ nguyên
// - Khi mở rộng tính năng mới chỉ cần thêm 1 dòng cấu hình (Config)
