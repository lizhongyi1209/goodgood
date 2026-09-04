# syntax=docker/dockerfile:1

ARG NODE_VERSION=24.20.0
ARG NODE_IMAGE_DIGEST=sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e

FROM node:${NODE_VERSION}-bookworm-slim@${NODE_IMAGE_DIGEST} AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build:local && npm run build:runtime

FROM node:${NODE_VERSION}-bookworm-slim@${NODE_IMAGE_DIGEST} AS runtime
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

# The application runtime invokes Node directly. Remove npm/npx plus their
# build-only dependency tree from the shipped image.
RUN rm -rf /usr/local/lib/node_modules/npm \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx

COPY --from=build --chown=node:node /app/dist/standalone/ ./
# Vinext 1.0 beta's standalone tracer does not currently retain its React peer
# packages. Keep the exact locked peers and their small runtime dependency tree
# beside Vinext so the production server can start and render without the build
# tree.
COPY --from=build --chown=node:node /app/node_modules/react ./node_modules/react
COPY --from=build --chown=node:node /app/node_modules/react-dom ./node_modules/react-dom
COPY --from=build --chown=node:node /app/node_modules/react-server-dom-webpack ./node_modules/react-server-dom-webpack
COPY --from=build --chown=node:node /app/node_modules/scheduler ./node_modules/scheduler
COPY --from=build --chown=node:node /app/node_modules/acorn-loose ./node_modules/acorn-loose
COPY --from=build --chown=node:node /app/node_modules/neo-async ./node_modules/neo-async
COPY --from=build --chown=node:node /app/node_modules/webpack-sources ./node_modules/webpack-sources
COPY --from=build --chown=node:node /app/node_modules/@img ./node_modules/@img
COPY --from=build --chown=node:node /app/node_modules/detect-libc ./node_modules/detect-libc
COPY --from=build --chown=node:node /app/node_modules/sharp ./node_modules/sharp
COPY --from=build --chown=node:node /app/migrations ./migrations
COPY --from=build --chown=node:node /app/runtime-bundle ./server/runtime
COPY --from=build --chown=node:node /app/infra/container ./infra/container

USER node
EXPOSE 3000 3001 3002
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "infra/container/healthcheck.mjs"]

CMD ["node", "server/runtime/web.mjs"]
