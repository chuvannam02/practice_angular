# Stage 1: Build Angular 19 ứng dụng
FROM node:18-alpine AS build
WORKDIR /app

# Copy file package.json và package-lock.json để tận dụng cache cài đặt npm
COPY package*.json ./
RUN npm ci

# Copy toàn bộ source code và build ứng dụng
COPY . .
# Nếu bạn đã cấu hình production build (ví dụ: "ng build --configuration production") thì chạy như sau:
RUN npm run build -- --configuration production

# Stage 2: Production với Nginx (sử dụng image alpine để giảm kích thước)
FROM nginx:alpine

# Xóa nội dung mặc định của Nginx
RUN rm -rf /usr/share/nginx/html/*

# Xóa cấu hình mặc định của Nginx
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy file cấu hình Nginx tùy chỉnh (default.conf) vào container
COPY default.conf /etc/nginx/conf.d/

# Copy thư mục build (dist) từ stage build vào thư mục phục vụ tĩnh của Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Chỉnh quyền sở hữu cho thư mục chứa ứng dụng
RUN chown -R nginx:nginx /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
