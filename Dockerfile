FROM klakegg/hugo:0.107.0 as builder

WORKDIR /src
COPY . /src
RUN hugo --minify


FROM nginx:1.19-alpine
LABEL org.opencontainers.image.source https://github.com/husky-dev/husky-blog
COPY --from=builder /src/public /usr/share/nginx/html

HEALTHCHECK --interval=30s --timeout=3s CMD curl --fail http://localhost || exit 1
