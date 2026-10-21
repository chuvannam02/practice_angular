import { AfterViewInit, Directive, ElementRef, Input } from '@angular/core';

@Directive({
    selector: '[appAutofocusFirst]',
})
export class AutofocusFirstDirective implements AfterViewInit {
    // Cho phép bật/tắt tính năng này nếu cần (mặc định là true)
    @Input() appAutofocusFirst: boolean | string = true;

    constructor(private el: ElementRef) {}

    ngAfterViewInit(): void {
        // Nếu truyền vào false thì không thực hiện
        if (
            this.appAutofocusFirst === false ||
            this.appAutofocusFirst === 'false'
        ) {
            return;
        }

        // Delay một chút (~50ms) để NG-ZORRO kịp render ra HTML hoàn chỉnh trong DOM
        setTimeout(() => {
            this.focusFirstAvailableInput();
        }, 50);
    }

    private focusFirstAvailableInput(): void {
        const formElement = this.el.nativeElement as HTMLElement;

        // Tìm tất cả các thẻ input, textarea, select nằm bên trong form
        const inputs = formElement.querySelectorAll<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >('input, textarea, select');

        // Duyệt qua từng trường
        for (const input of inputs) {
            // ĐIỀU KIỆN: Không bị disabled, không phải là hidden input, và không bị ẩn (display: none)
            if (
                !input.disabled &&
                input.type !== 'hidden' &&
                input.offsetWidth > 0 &&
                input.offsetHeight > 0
            ) {
                input.focus();

                // Nếu là ô input text hoặc textarea, bôi đen sẵn chữ (nếu có) để người dùng gõ đè được ngay
                if (
                    (input instanceof HTMLInputElement &&
                        (input.type === 'text' || input.type === 'email')) ||
                    input instanceof HTMLTextAreaElement
                ) {
                    input.select();
                }

                break; // Đã tìm thấy và focus trường đầu tiên, thoát vòng lặp ngay
            }
        }
    }
}
