import {Component} from '@angular/core';
import {RouterOutlet} from '@angular/router';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss'
})
export class AppComponent {
    // 1. Sửa lỗi cú pháp dòng titleService (nếu bạn chưa dùng thì xóa hoặc comment lại)
    // private readonly titleService: Title;

    // 2. Sửa 'title' thành một thuộc tính (biến) thay vì hàm
    // Giá trị gán vào phải khớp với cái tên project bạn đặt lúc tạo (ví dụ: 'practice_angular')
    title = 'practice_angular';
}
