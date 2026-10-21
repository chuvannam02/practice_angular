# Stage 1: Build Angular
FROM node:20-alpine AS build
WORKDIR /app

# Tối ưu cache npm
COPY package*.json ./
# Thiết lập retry để tránh lỗi ECONNRESET như bạn đã gặp
RUN npm config set fetch-retries 5 && npm ci

COPY . .
RUN npm run build -- --configuration production

# Stage 2: Production - Minimal & Hardened
# Sử dụng unprivileged để chạy non-root ngay từ đầu
FROM nginxinc/nginx-unprivileged:alpine-slim

# Chuyển sang user nginx (UID 101) đã được tạo sẵn trong image
USER 101

# Copy cấu hình Nginx (Đảm bảo file default.conf của bạn dùng port > 1024 vì non-root)
COPY --from=build --chown=101:101 /app/default.conf /etc/nginx/conf.d/default.conf

# Copy source code từ stage build
# Lưu ý: Đường dẫn dist của Angular 19 thường là dist/[project-name]/browser
COPY --from=build --chown=101:101 /app/dist/practice_angular/browser /usr/share/nginx/html

# Image này mặc định chạy port 8080 thay vì 80 để không cần quyền root
EXPOSE 8080

# Không sử dụng shell form, dùng exec form để tránh spawn shell process
ENTRYPOINT ["nginx", "-g", "daemon off;"]
