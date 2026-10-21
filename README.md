# PracticeAngular

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.0.6.

## Học về `Discriminated Unions` hay `Tagged Unions`
- Là một kỹ thuật trong `Typescript`, cho phép bạn tạo ra một kiểu dữ liệu có thể là một trong nhiều hình dạng khác nhau, nhưng mỗi hình dạng đều có một "nhãn" chung để giúp TypeScript phân biệt chúng một cách chính xác.
- Thành phần cấu tạo:
  - Các kiểu dữ liệu riêng lẻ (Types): Mỗi kiểu có các thuộc tính khác nhau.
  - Thuộc tính phân biệt (Discriminant): Một thuộc tính chung có kiểu dữ liệu là Literal Type (ví dụ: một chuỗi cụ thể như 'circle', 'square') xuất hiện ở tất cả các kiểu.
  - Kiểu hợp (Union Type): Gộp các kiểu trên lại bằng toán tử |.
- Ví dụ: Giả sử bạn cần quản lý kết quả trả về từ một API:
```typescript
interface Success {
  status: 'success'; // Discriminant
  data: string[];
}

interface Failure {
  status: 'error';   // Discriminant
  message: string;
}

interface Loading {
  status: 'loading'; // Discriminant
}

// Đây chính là Discriminated Union
type ApiResponse = Success | Failure | Loading;
```

- Cách hoạt động: Type Narrowing
  - Điểm "ăn tiền" của Discriminated Unions là khi bạn dùng if hoặc switch để kiểm tra thuộc tính chung (status), TypeScript sẽ tự động hiểu (narrow) các thuộc tính còn lại.
```typescript
function handleResponse(response: ApiResponse) {
  switch (response.status) {
    case 'success':
      // Ở đây TypeScript BIẾT CHẮC CHẮN response có thuộc tính 'data'
      console.log(response.data); 
      break;
      
    case 'error':
      // Ở đây TypeScript BIẾT CHẮC CHẮN response có thuộc tính 'message'
      console.log(response.message);
      break;
      
    case 'loading':
      console.log('Đang tải...');
      break;
  }
}
```
## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Tối ưu hoá build ứng dụng Angular (angular.json)
- Sửa cấu hình file `angular.json`
```typscript
"configurations": {
  "production": {
    "budgets": [
      {
        "type": "initial",
        "maximumWarning": "500kb",
        "maximumError": "1mb"
      }
    ],
    "outputHashing": "all",             // Hash file name để tránh cache browser cũ
    "optimization": {
      "scripts": true,                  // Minify JS (Terser), Tree-shaking
      "styles": {
        "minify": true,                 // Minify CSS
        "inlineCritical": true          // Inline CSS quan trọng để load nhanh
      },
      "fonts": true
    },
    "sourceMap": false,                 // Tắt hoàn toàn SourceMap (không lộ code gốc)
    "namedChunks": false,               // Tắt tên chunk (1.js thay vì dashboard.js)
    "aot": true,                        // Ahead-of-Time compilation
    "extractLicenses": true,
    "vendorChunk": false,               // Gộp vendor vào main để giảm số lượng request (tùy chọn)
    "buildOptimizer": true              // Tối ưu hóa sâu cho Angular
  }
}
```

- Lệnh Build (Thêm `Obfuscation` & `SRI`): Để tăng cường bảo mật (chống sửa đổi file JS) và "làm xấu" code thêm nữa:

    + `SRI (Subresource Integrity)`: Đảm bảo trình duyệt không chạy file nếu hash bị thay đổi.

    + Obfuscation: Mặc định optimization: true đã dùng `Terser` để `uglification` (đổi tên biến ngắn lại). 
      Nếu bạn muốn Obfuscation nặng (đổi luồng code, dead code injection), bạn cần dùng thư viện ngoài như `javascript-obfuscator` nhưng cảnh báo: nó sẽ làm chậm app đáng kể. Với Angular, cấu hình trên là đủ chuẩn industry.
```shell
# Lệnh build trong CI/CD
ng build --configuration production --subresource-integrity
```

### Chuyển sang chế độ "Paranoid" (Cực đoan).
- Ở cấp độ này, chúng ta sẽ thực hiện 3 việc:

    + Code: Không chỉ minify mà còn Obfuscate (làm rối) cấu trúc code và nén trước (Pre-compression) bằng thuật toán Brotli/Gzip ngay lúc build.

    + Container: Bỏ luôn Alpine. Dùng Distroless Static (Chainguard). Không có OS, không có Shell, không có libc thừa thãi. Image chỉ chứa đúng binary của Nginx.

    + Runtime: Chế độ Read-only Filesystem và Drop All Capabilities.

#### 1. Angular: Advanced Obfuscation & Pre-Compression (Brotli)
- Mặc định Angular chỉ minify (đổi tên biến). Để Obfuscate (đảo luồng code, mã hóa string) và Nén Brotli (tốt hơn Gzip 20%), bạn cần can thiệp vào Webpack.

- Cài đặt dependencies:
```shell
npm install --save-dev @angular-builders/custom-webpack javascript-obfuscator webpack-obfuscator compression-webpack-plugin
```

- Sửa angular.json: Đổi builder từ @angular-devkit/build-angular:browser sang custom builder.
```json
{
    "architect": {
        "build": {
            "builder": "@angular-devkit/build-angular:application",
            "options": {
                "outputPath": "dist/practice_angular",
                "index": "src/index.html",
                "browser": "src/main.ts",
                "polyfills": [
                    "zone.js"
                ],
                "tsConfig": "tsconfig.app.json",
                "inlineStyleLanguage": "scss"
            }
        }
    }
}
```
"architect": {
  "build": {
    "builder": "@angular-builders/custom-webpack:browser",
    "options": {
      "customWebpackConfig": {
        "path": "./custom-webpack.config.js"
      },
      // ... giữ nguyên các options khác
    }
  }
}```

- Tạo file `custom-webpack.config.js` (Tại root):
```javascript
const WebpackObfuscator = require('webpack-obfuscator');
const CompressionPlugin = require('compression-webpack-plugin');

module.exports = {
  plugins: [
    // 1. OBFUSCATION: Biến code thành "mớ bòng bong" khó đọc
    new WebpackObfuscator({
      rotateStringArray: true,
      stringArray: true,
      stringArrayThreshold: 0.75, // 75% chuỗi sẽ bị mã hóa
      deadCodeInjection: false,   // Tắt để không tăng size quá nhiều (bật true nếu muốn bảo mật cực cao)
      compact: true,
      controlFlowFlattening: true, // Làm phẳng luồng code (if/else thành switch case rối rắm)
      controlFlowFlatteningThreshold: 0.75,
      disableConsoleOutput: true,  // Tắt mọi console.log
      identifierNamesGenerator: 'hexadecimal', // Tên biến thành _0x1a2b...
      renameGlobals: false,
      selfDefending: true,         // Code tự hỏng nếu bị format lại
    }, ['vendor.js', 'polyfills.js']), // Tránh obfuscate vendor để không lỗi thư viện

    // 2. PRE-COMPRESSION: Nén sẵn file .br và .gz để Nginx không tốn CPU nén lúc runtime
    new CompressionPlugin({
      filename: '[path][base].br',
      algorithm: 'brotliCompress',
      test: /\.(js|css|html|svg)$/,
      threshold: 10240,
      minRatio: 0.8,
    }),
    new CompressionPlugin({
      filename: '[path][base].gz',
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 10240,
      minRatio: 0.8,
    }),
  ]
};
```

- Nginx custom
```
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    # Tắt version nginx
    server_tokens off; 

    server {
        listen 8080;
        root /usr/share/nginx/html;
        index index.html;

        # --- STATIC GZIP/BROTLI ---
        # Ưu tiên gửi file nén sẵn (.gz hoặc .br) thay vì nén on-the-fly
        gzip_static on; 
        
        # Security Headers (Hardcore)
        add_header X-Frame-Options "DENY" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer" always;
        add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; block-all-mixed-content;" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

        location / {
            try_files $uri $uri/ /index.html;
        }

        # Cache cực mạnh cho file assets (đã có hash tên file)
        location ~* \.(?:css|js|jpg|svg|gif|png|ico|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

- Dockerfile
```Dockerfile
# --- Stage 1: Builder ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Build với custom webpack đã cấu hình ở trên
RUN npm run build -- --configuration production

# --- Stage 2: Production (CHAINGUARD STATIC) ---
# Image này cực nhẹ (~10MB), không shell, không root, chỉ có nginx binary
FROM cgr.dev/chainguard/nginx:latest

# Copy file config nginx
# Lưu ý: Chainguard Nginx mặc định load config từ /etc/nginx/nginx.conf
# Chúng ta sẽ overwrite hoặc include custom config
COPY nginx-custom.conf /etc/nginx/nginx.conf

# Copy source code đã build (bao gồm cả file .br .gz)
COPY --from=builder /app/dist/your-project-name/browser /usr/share/nginx/html

# Mặc định Chainguard chạy user 'nginx' (uid 65532), cổng 8080.
# Không cần lệnh USER hay EXPOSE vì nó đã được hardcode trong base image an toàn.
```

```shell
docker run -d \
  -p 8080:8080 \
  --name my-app \
  --cap-drop=ALL \
  --cap-add=NET_BIND_SERVICE \
  --security-opt=no-new-privileges \
  --tmpfs /var/run:rw,noexec,nosuid,size=1m \
  --tmpfs /var/cache/nginx:rw,noexec,nosuid,size=10m \
  my-secure-app
  
  docker run -d -p 8080:8080 --name my-app --cap-drop=ALL --cap-add=NET_BIND_SERVICE --security-opt=no-new-privileges --tmpfs /var/run:rw,noexec,nosuid,size=1m --tmpfs /var/cache/nginx:rw,noexec,nosuid,size=10m angular-app
```

