FROM nginx:1.19-alpine
LABEL org.opencontainers.image.source https://github.com/husky-dev/husky-blog
COPY ./public /usr/share/nginx/html

HEALTHCHECK --interval=30s --timeout=3s CMD curl --fail http://localhost || exit 1
