export const environment = {
    production: true,
    apiUrls: ['https://api.production-domain.com'], // Chỉ cho phép gọi API này
    cspConfig: {
        // API được phép gọi
        connectSrc: [
            'https://dev-api.yoursite.com',
            'https://auth-dev.yoursite.com',
        ],
        // Script bên ngoài được phép chạy (VD: Google Analytics, Chat plugin)
        scriptSrc: [
            'https://www.google-analytics.com',
            'https://widget.intercom.io',
        ],
        // Nguồn ảnh (VD: S3 bucket, CDN)
        imgSrc: [
            'https://dev-images.s3.amazonaws.com',
            'http://localhost:4200',
            'blob:', // Local image previews use object URLs, not an origin-prefixed CSP source.
        ],
        // Font chữ (VD: Google Fonts)
        fontSrc: ['https://fonts.gstatic.com'],
        frameSrc: ['blob:'], // Local PDF preview iframe.
    },
};
