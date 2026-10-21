import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { Meta } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { environment as development } from '../../../environments/environment.development';
import { CspService, buildCspContent } from './csp.service';

describe('CspService', () => {
    let service: CspService;
    let isolatedDocument: Document;

    beforeEach(() => {
        // Never enforce a CSP on Karma's own document: it cannot be relaxed afterward.
        isolatedDocument = document.implementation.createHTMLDocument('CSP test');
        TestBed.configureTestingModule({ providers: [{ provide: DOCUMENT, useValue: isolatedDocument }] });
        service = TestBed.inject(CspService);
    });

    it('applies the configured environment and reuses the same meta element on repeated initialization', () => {
        service.initCsp();
        const tag = isolatedDocument.querySelector('meta[http-equiv="Content-Security-Policy"]')!;
        expect(tag.getAttribute('content')).toBe(buildCspContent(environment.cspConfig));
        service.initCsp();
        expect(isolatedDocument.querySelectorAll('meta[http-equiv="Content-Security-Policy"]').length).toBe(1);
        expect(isolatedDocument.querySelector('meta[http-equiv="Content-Security-Policy"]')).toBe(tag);
    });

    for (const [name, config] of [['production', environment.cspConfig], ['development', development.cspConfig]] as const) {
        it(`generates valid script/image/frame source lists for ${name}`, () => {
            const policy = buildCspContent(config);
            const directives = policy.split('; ').map(value => value.split(' '));
            expect(directives.length).toBe(10);
            expect(directives.every(([name]) => /^[a-z]+(?:-[a-z]+)*$/.test(name))).toBeTrue();
            const rules = Object.fromEntries(directives.map(([name, ...sources]) => [name, sources])) as Record<string, string[]>;
            expect(rules['script-src']).toEqual(["'self'", ...config.scriptSrc]);
            expect(rules['img-src']).toContain('blob:');
            expect(policy).not.toContain('blob:http');
            expect(rules['frame-src']).toEqual(["'self'", ...config.frameSrc]);
            expect(rules['frame-src']).not.toContain('https://fonts.gstatic.com');
            expect(rules['object-src']).toEqual(["'none'"]);
        });
    }

    it('keeps font and frame sources independent, preserving the restrictive defaults', () => {
        const policy = buildCspContent({ fontSrc: ['https://fonts.example.test'], frameSrc: ['blob:', 'https://pdf.example.test'] });
        expect(policy).toContain("font-src 'self' data: https://fonts.example.test;");
        expect(policy).toContain("frame-src 'self' blob: https://pdf.example.test;");
        expect(policy).toContain("default-src 'self';");
        expect(policy).toContain("base-uri 'self'; form-action 'self'");
        expect(buildCspContent({})).toContain("frame-src 'self';");
    });
});

describe('CSP enforcement in Chrome', () => {
    it('allows local blob image and iframe previews under the real generated policy', async () => {
        const hostFrame = document.createElement('iframe');
        hostFrame.title = 'Isolated CSP regression test';
        document.body.append(hostFrame);
        const child = hostFrame.contentDocument!;
        const violations: SecurityPolicyViolationEvent[] = [];
        child.addEventListener('securitypolicyviolation', event => violations.push(event as SecurityPolicyViolationEvent));
        // No scripts are injected into the frame. Parent callbacks observe actual browser loads.
        new CspService(new Meta(child), child).initCsp();
        const imageUrl = URL.createObjectURL(new Blob([
            '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="blue"/></svg>',
        ], { type: 'image/svg+xml' }));
        // HTML makes successful frame navigation inspectable even in Chrome without a PDF viewer.
        // Both HTML and PDF previews use the same blob: frame-src check.
        const frameUrl = URL.createObjectURL(new Blob(['<!doctype html><p>Local frame loaded</p>'], { type: 'text/html' }));
        let timeout: ReturnType<typeof setTimeout> | undefined;
        try {
            const image = child.createElement('img');
            const frame = child.createElement('iframe');
            const imageLoaded = new Promise<void>((resolve, reject) => {
                image.onload = () => resolve(); image.onerror = () => reject(new Error('Blob image blocked'));
            });
            const frameLoaded = new Promise<void>(resolve => frame.onload = () => resolve());
            image.src = imageUrl;
            frame.src = frameUrl;
            child.body.append(image, frame);
            await Promise.race([
                Promise.all([imageLoaded, frameLoaded]),
                new Promise<never>((_, reject) => timeout = setTimeout(() => reject(new Error('Blob preview load timed out')), 2500)),
            ]);
            expect(image.naturalWidth).toBe(8);
            expect(frame.contentDocument?.body.textContent).toContain('Local frame loaded');
            expect(violations.map(event => event.effectiveDirective)).toEqual([]);
        } finally {
            clearTimeout(timeout);
            hostFrame.remove();
            URL.revokeObjectURL(imageUrl);
            URL.revokeObjectURL(frameUrl);
        }
    });
});
