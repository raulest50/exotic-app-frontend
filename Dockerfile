# CI creates both environment images; the VM only pulls reviewed digests.
FROM oven/bun:1.3.14@sha256:e10577f0db68676a7024391c6e5cb4b879ebd17188ab750cf10024a6d700e5c4 AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
ARG DEPLOYMENT_ENVIRONMENT
ARG DEPLOYMENT_IP=34.30.31.30
RUN set -eu; \
    case "$DEPLOYMENT_ENVIRONMENT" in \
      staging) public_segment=staging; prefix=staging ;; \
      production) public_segment=prod; prefix=prod ;; \
      *) echo 'DEPLOYMENT_ENVIRONMENT must be staging or production' >&2; exit 2 ;; \
    esac; \
    unset VITE_API_BASE_URL VITE_APP_ENV; \
    bun run vite build --base=/ --outDir=/out/ssh; \
    VITE_APP_ENV="$DEPLOYMENT_ENVIRONMENT" VITE_API_BASE_URL="https://mrp.api.${public_segment}.exotic.com.co" \
      bun run vite build --base=/ --outDir=/out/domain; \
    VITE_APP_ENV="$DEPLOYMENT_ENVIRONMENT" VITE_API_BASE_URL="https://${DEPLOYMENT_IP}/${prefix}/backend" \
      bun run vite build --base="/${prefix}/" --outDir=/out/ip

FROM caddy:2-alpine@sha256:e70b164da81ef698b3ad19af799ea6086ce6d9e48ed4079eb9fe26f6fbf14ee5
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=builder --chown=1000:1000 /out/ssh /srv
COPY --from=builder --chown=1000:1000 /out/domain /srv-public
COPY --from=builder --chown=1000:1000 /out/ip /srv-ip
USER 1000:1000
EXPOSE 8080
HEALTHCHECK --interval=20s --timeout=5s CMD wget --quiet --output-document=/dev/null http://127.0.0.1:8080/healthz || exit 1
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
