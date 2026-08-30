# syntax=docker/dockerfile:1

ARG NODE_VERSION=24.12.0

FROM node:${NODE_VERSION}-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build:local

FROM node:${NODE_VERSION}-bookworm-slim AS runtime
ARG GOODGOOD_REVISION=development

LABEL org.opencontainers.image.title="GoodGood" \
      org.opencontainers.image.revision="${GOODGOOD_REVISION}"

ENV NODE_ENV=production \
    GOODGOOD_PROCESS=web \
    GOODGOOD_REVISION=${GOODGOOD_REVISION} \
    HOST=0.0.0.0 \
    PORT=3000 \
    WORKER_HEALTH_HOST=0.0.0.0 \
    WORKER_HEALTH_PORT=3001 \
    MOCK_GENERATION_HOST=0.0.0.0 \
    MOCK_GENERATION_PORT=3002

WORKDIR /app

COPY --from=build --chown=node:node /app/dist/standalone/ ./
COPY --from=build --chown=node:node /app/server/runtime ./server/runtime
COPY --from=build --chown=node:node /app/infra/container ./infra/container

USER node
EXPOSE 3000 3001 3002
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "infra/container/healthcheck.mjs"]

CMD ["node", "server/runtime/web.mjs"]
