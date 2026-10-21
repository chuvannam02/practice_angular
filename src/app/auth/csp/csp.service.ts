import {Inject, Injectable} from '@angular/core';
import {DOCUMENT} from '@angular/common';
import {Meta} from '@angular/platform-browser';
import {environment} from '../../../environments/environment.development';

// Định nghĩa các Key hợp lệ của CSP để tránh gõ sai
type CspDirective =
    | 'default-src' | 'connect-src' | 'script-src' | 'style-src'
    | 'img-src' | 'font-src' | 'object-src'
    | 'base-uri' | 'form-action';

// Một Map chứa: Key là directive, Value là mảng các nguồn
type CspMap = Record<CspDirective, string[]>;

@Injectable({
    providedIn: 'root' // Singleton: Chỉ có 1 instance duy nhất
})
export class CspService {

    constructor(
        private readonly meta: Meta,
        @Inject(DOCUMENT) private readonly document: Document
    ) {}

    public initCsp() {
        const conf = environment.cspConfig;

        // 1. KHAI BÁO LUẬT (Rules Definition)
        // Dùng Object để gom nhóm dữ liệu rõ ràng
        const cspRules: CspMap = {
            'default-src': ["'self'"],

            'connect-src': ["'self'", ...(conf.connectSrc || [])],

            'script-src':  ["'self'; 'unsafe-eval';", ...(conf.scriptSrc || [])],

            'style-src':   ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],

            'img-src':     ["'self'", "data:", ...(conf.imgSrc || [])],

            'font-src':    ["'self'", "data:", ...(conf.fontSrc || [])],

            'object-src':  ["'none'"],
            'base-uri':    ["'self'"],
            'form-action': ["'self'"]
        };

        // 2. LOGIC TẠO CHUỖI (String Generation)
        // Chỉ việc map qua object và nối lại
        const cspContent = Object.entries(cspRules)
            .map(([directive, sources]) => {
                // Lọc bỏ các giá trị rỗng/null nếu có và nối bằng dấu cách
                const sourceString = sources.filter(s => !!s).join(' ');
                return `${directive} ${sourceString}`;
            })
            .join('; '); // Nối các directive bằng dấu chấm phẩy

        // 3. APPLY
        this.applyMetaTag(cspContent);
    }

    private applyMetaTag(content: string) {
        // Xóa thẻ cũ để tránh trùng lặp
        const existingTag = this.document.querySelector("meta[http-equiv='Content-Security-Policy']");
        if (existingTag) {
            existingTag.remove();
        }

        // Thêm thẻ mới và xóa khoảng trắng thừa
        this.meta.addTag({
            httpEquiv: 'Content-Security-Policy',
            content: content.replace(/\s{2,}/g, ' ').trim()
        });

        console.log('🛡️ CSP Activated with rules:', content);
    }
}
