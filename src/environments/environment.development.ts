export const environment = {
    production: false,
    apiUrls: ['https://dev-api.yoursite.com'], // API cho dev
    cspConfig: {
        // API được phép gọi
        connectSrc: [
            'https://dev-api.yoursite.com',
            'https://auth-dev.yoursite.com',
            "https://jsonplaceholder.typicode.com",
            'https://randomuser.me',
            'http://localhost:8080/',
            'ws://localhost:8080/'
        ],
        // Script bên ngoài được phép chạy (VD: Google Analytics, Chat plugin)
        scriptSrc: [
            'https://www.google-analytics.com',
            'https://widget.intercom.io',
        ],
        // Nguồn ảnh (VD: S3 bucket, CDN)
        imgSrc: [
            'https://dev-images.s3.amazonaws.com',
            'https://ng.ant.design'
        ],
        // Font chữ (VD: Google Fonts)
        fontSrc: [
            'https://fonts.gstatic.com'
        ],
    }
};
