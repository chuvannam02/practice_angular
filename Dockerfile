# syntax=docker/dockerfile:1

FROM node:22-alpine AS dependencies
WORKDIR /app
ENV NG_CLI_ANALYTICS=false \
    npm_config_fetch_retries=5 \
    npm_config_fetch_retry_mintimeout=20000 \
    npm_config_fetch_retry_maxtimeout=120000
# Only manifest changes invalidate the dependency layer.
COPY package.json package-lock.json ./
RUN --mount=type=cache,id=practice-angular-npm,target=/root/.npm,sharing=locked \
    npm ci --include=dev --prefer-offline --no-audit --no-fund

FROM dependencies AS build
COPY angular.json tsconfig.json tsconfig.app.json ./
COPY src/ ./src/
COPY public/ ./public/
RUN npm run build -- --configuration production

# No Node/npm/node_modules needed to serve the static Angular build.
FROM nginxinc/nginx-unprivileged:alpine-slim AS runtime
COPY default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/practice_angular/browser/ /usr/share/nginx/html/
USER 101:101
EXPOSE 8080
STOPSIGNAL SIGQUIT
ENTRYPOINT ["nginx", "-g", "daemon off;"]
