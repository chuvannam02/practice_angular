# Docker cho Angular static

Chạy các lệnh từ thư mục gốc repository. Cần Docker Desktop chạy Linux containers
và Docker BuildKit/buildx. Node 22 dùng ở builder phù hợp với Angular 19 của project.

Nếu Docker Desktop đang chạy nhưng CLI báo không tìm thấy engine, kiểm tra
`docker context ls`. Với Linux engine ở context `desktop-linux`, thêm
`--context desktop-linux` ngay sau `docker` trong các lệnh dưới đây, ví dụ
`docker --context desktop-linux buildx build ...`.

| File | Builder | Runtime | User runtime |
| --- | --- | --- | --- |
| `Dockerfile` | Node + Angular CLI | Nginx unprivileged | `101:101` |
| `Dockerfile-minimize` | Node + Angular CLI | Chainguard Nginx distroless | `65532:65532` |
| `Dockerfile-advanced` | Node + Angular CLI | Chainguard Nginx distroless | `app`, `10001:10001` |

## Build và chạy bản advanced

```sh
docker buildx build --load --progress=plain -f Dockerfile-advanced -t practice-angular:advanced .
docker run --rm --name practice-angular -p 8080:8080 --read-only --tmpfs /tmp:rw,noexec,nosuid,size=32m,mode=1777 --cap-drop=ALL --security-opt=no-new-privileges:true practice-angular:advanced
```

Mở `http://localhost:8080`. Chỉ `/tmp` được ghi để lưu pid/temp của Nginx;
source/config/static files giữ ownership của root và process chạy bằng user `app`.
Các lệnh `ENTRYPOINT`/`CMD` dùng exec form vì distroless không có shell.
`SIGQUIT` cho phép Nginx dừng theo cách graceful.

Đổi `-f Dockerfile-advanced` thành `-f Dockerfile` hoặc `-f Dockerfile-minimize`
để build hai bản còn lại. Bộ cờ `--read-only --tmpfs` ở trên dành cho cấu hình advanced.

## Cache dependencies hoạt động như thế nào?

1. Copy riêng `package.json` và `package-lock.json`, sau đó `npm ci`.
2. Copy riêng các input Angular sau bước cài: `angular.json`, `tsconfig*.json`,
   `src/`, `public/`. Chỉnh HTML/TS/SCSS chỉ làm chạy lại build, không cài lại npm.
3. BuildKit mount cache `/root/.npm`, nên khi manifest thay đổi, npm có thể dùng
   lại tarball đã tải. `--prefer-offline` ưu tiên cache; package chưa có vẫn cần mạng.
4. `.dockerignore` dùng allowlist: loại `node_modules`, `dist`, `.angular`, `.git`,
   IDE config, tài liệu, test và credentials khỏi build context. Npm cache ở builder,
   không nằm trong image runtime.

Build lại cùng lệnh với `--progress=plain` để xem bước `npm ci` có nhãn `CACHED`.
Không dùng `--no-cache` nếu muốn giữ layer cache. Cache cần cùng builder và chưa bị prune;
đổi base image cũng có thể làm layer dependencies phải chạy lại.

Với CI runner mới mỗi lần, có thể xuất/nhập layer cache qua registry:

```sh
# Thay YOUR_REGISTRY bằng registry bạn có quyền ghi; đăng nhập trước khi chạy.
docker buildx build --push -f Dockerfile-advanced -t YOUR_REGISTRY/practice-angular:latest --cache-from=type=registry,ref=YOUR_REGISTRY/practice-angular:buildcache --cache-to=type=registry,ref=YOUR_REGISTRY/practice-angular:buildcache,mode=max .
```

Registry cache tái sử dụng layer chứa dependencies khi manifest không đổi. Cache mount npm
không tự đi theo registry layer cache; muốn giữ tarball qua các runner khi lockfile đổi,
cần builder được giữ lâu dài hoặc cơ chế lưu/khôi phục cache mount của CI.

## Vì sao không dùng `npm ci --omit=dev` trước Angular build?

Angular CLI, TypeScript, Less/build tooling nằm trong `devDependencies`; bỏ chúng
trước `ng build` sẽ làm build thất bại. Vì vậy builder dùng `npm ci --include=dev`.
Runtime Nginx chỉ copy `dist/practice_angular/browser/`, không copy bất kỳ `node_modules`
nào: cả dependencies và devDependencies đều không nằm trong runtime image.

Để thử riêng cách cài production dependencies dùng cho một runtime Node/SSR, advanced có target:

```sh
docker buildx build --load --target production-deps -f Dockerfile-advanced -t practice-angular:production-deps .
```

Target này chạy `npm ci --omit=dev`, là image trung gian để học/kiểm tra dependencies,
không phải web server và không chạy `docker run -p ...` như image advanced.
BuildKit bỏ qua target này khi build runtime static mặc định, nên không tốn thêm một lần cài.
Nếu chuyển sang SSR thật, cần bổ sung Node runtime và server bundle riêng.

## Kiểm tra sau khi build

```sh
docker run --rm --read-only --tmpfs /tmp:rw,noexec,nosuid,size=32m,mode=1777 --cap-drop=ALL --security-opt=no-new-privileges:true practice-angular:advanced -t
docker image inspect practice-angular:advanced --format '{{.Config.User}}'
curl -I http://localhost:8080/
curl -I http://localhost:8080/pages/email
curl -I http://localhost:8080/index.html
curl -I http://localhost:8080/missing.js
curl http://localhost:8080/healthz
curl -I -H 'Accept-Encoding: gzip' http://localhost:8080/styles-HASH.css
```

Trong PowerShell dùng `curl.exe` nếu `curl` đang là alias của `Invoke-WebRequest`.
Thay `styles-HASH.css` bằng tên file hash thực tế trong output production.
`/pages/email` trả SPA entry, `missing.js` trả 404, `/healthz` trả `ok`.
`index.html` dùng `no-cache` để revalidate khi deploy mới; JS/CSS có hash trả thành công
mới được `immutable`. File lỗi 404 không bị cache một năm.

Nginx nén gzip động: Angular đang dùng builder `application`, không chạy
`custom-webpack.config.js`, nên không giả định đã có `.gz`/`.br` và không bật module Brotli.
Đường dẫn `/api` được trả 404 để không trả nhầm HTML; nếu có backend, cấu hình proxy ở đây
hoặc tại ingress trước khi dùng API cùng origin.

Không áp lại CSP mẫu `script-src 'self'` của cấu hình minimize cũ: output hiện tại
có `onload="this.media='all'"` do `inlineCritical`, nên policy đó chặn việc áp dụng CSS.
Nếu bật CSP, cần cấu hình hash/nonce và cách tải critical CSS phù hợp với build thực tế
cũng như origin API của ứng dụng.

Các tag image có thể thay đổi. CI có thể pin digest đã kiểm chứng:

```sh
docker buildx build --load -f Dockerfile-advanced --build-arg NODE_IMAGE=node:22-alpine@sha256:YOUR_NODE_DIGEST --build-arg NGINX_IMAGE=cgr.dev/chainguard/nginx@sha256:YOUR_NGINX_DIGEST -t practice-angular:advanced .
```

Đây là placeholder; lấy digest thật từ registry và cập nhật theo lịch của dự án.

Nguồn: [Docker build cache](https://docs.docker.com/build/cache/optimize/),
[npm ci và omit](https://docs.npmjs.com/cli/v11/commands/npm-ci/),
[Chainguard Nginx](https://images.chainguard.dev/directory/image/nginx/overview),
[Angular/Node compatibility](https://angular.dev/reference/versions).
