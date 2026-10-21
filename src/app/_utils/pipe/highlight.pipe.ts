import { Pipe, PipeTransform } from '@angular/core';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';

@Pipe({
  name: 'highlight'
})
export class HighlightPipe implements PipeTransform {
    constructor(private readonly sanitizer: DomSanitizer) {}

    transform(value: string, term: string): SafeHtml {
        // 1. Nếu không có từ khóa tìm kiếm, trả về văn bản gốc
        if (!term || !value) return value;

        try {
            // 2. Tạo Regex tìm kiếm (g: toàn bộ, i: không phân biệt hoa thường)
            // Cần thoát các ký tự đặc biệt nếu term có chứa chúng
            const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const re = new RegExp(escapedTerm, 'gi');

            // 3. Thay thế các đoạn khớp bằng thẻ span có class "hl"
            const result = value.replace(re, match => `<span class="hl">${match}</span>`);

            // 4. Báo cho Angular rằng chuỗi HTML này là an toàn để render
            return this.sanitizer.bypassSecurityTrustHtml(result);
        } catch (e: any) {
            return value;
        }
    }
}
