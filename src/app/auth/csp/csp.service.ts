import {Inject, Injectable} from '@angular/core';
import {DOCUMENT} from '@angular/common';
import {Meta} from '@angular/platform-browser';
import {environment} from '../../../environments/environment';

// Định nghĩa các Key hợp lệ của CSP để tránh gõ sai
type CspDirective =
    | 'default-src' | 'connect-src' | 'script-src' | 'style-src'
    | 'img-src' | 'font-src' | 'object-src'
    | 'base-uri' | 'form-action' | 'frame-src';

// Một Map chứa: Key là directive, Value là mảng các nguồn
type CspMap = Record<CspDirective, string[]>;

interface CspConfig {
    connectSrc?: readonly string[];
    scriptSrc?: readonly string[];
    imgSrc?: readonly string[];
    fontSrc?: readonly string[];
    frameSrc?: readonly string[];
}

export function buildCspContent(conf: CspConfig): string {
    const cspRules: CspMap = {
        'default-src': ["'self'"],
        'connect-src': ["'self'", ...(conf.connectSrc ?? [])],
        // Sources are space-separated; semicolons separate DIRECTIVES only.
        // The app uses AOT in both build configurations, so eval is not needed.
        'script-src': ["'self'", ...(conf.scriptSrc ?? [])],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'img-src': ["'self'", 'data:', ...(conf.imgSrc ?? [])],
        'font-src': ["'self'", 'data:', ...(conf.fontSrc ?? [])],
        'frame-src': ["'self'", ...(conf.frameSrc ?? [])],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
    };

    return Object.entries(cspRules)
        .map(([directive, sources]) => `${directive} ${[...new Set(sources.filter(Boolean))].join(' ')}`)
        .join('; ');
}

@Injectable({
    providedIn: 'root' // Singleton: Chỉ có 1 instance duy nhất
})
export class CspService {

    constructor(
        private readonly meta: Meta,
        @Inject(DOCUMENT) private readonly document: Document
    ) {}

    public initCsp(): void {
        this.applyMetaTag(buildCspContent(environment.cspConfig));
    }

    private applyMetaTag(content: string): void {
        const selector = "http-equiv='Content-Security-Policy'";
        // Avoid adding the same policy again. A changed policy needs a full reload:
        // removing/updating a meta tag does not relax an already enforced policy.
        if (this.document.querySelector(`meta[${selector}]`)?.getAttribute('content') === content) return;
        this.meta.updateTag({
            httpEquiv: 'Content-Security-Policy',
            content,
        }, selector);

        if (!environment.production) console.log('🛡️ CSP Activated with rules:', content);
    }
}
