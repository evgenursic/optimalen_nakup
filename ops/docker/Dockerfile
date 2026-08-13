# syntax=docker/dockerfile:1.7

ARG NODE_IMAGE=node:22-bookworm-slim@sha256:6c74791e557ce11fc957704f6d4fe134a7bc8d6f5ca4403205b2966bd488f6b3

FROM ${NODE_IMAGE} AS base
ENV NEXT_TELEMETRY_DISABLED=1 \
    PNPM_HOME=/pnpm \
    TURBO_TELEMETRY_DISABLED=1
ENV PATH="${PNPM_HOME}:${PATH}"
RUN corepack enable && corepack prepare pnpm@11.17.0 --activate
WORKDIR /workspace

FROM base AS dependencies
COPY . .
RUN pnpm install --frozen-lockfile

FROM dependencies AS web-build
ARG APP_VERSION=development
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CONVEX_URL
ARG NEXT_PUBLIC_DEFAULT_LOCALE=sl
ENV APP_VERSION=${APP_VERSION} \
    NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL} \
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY} \
    NEXT_PUBLIC_CONVEX_URL=${NEXT_PUBLIC_CONVEX_URL} \
    NEXT_PUBLIC_DEFAULT_LOCALE=${NEXT_PUBLIC_DEFAULT_LOCALE}
RUN pnpm turbo run build --filter=@optimalen-nakup/web

FROM ${NODE_IMAGE} AS web
ARG APP_VERSION=development
LABEL org.opencontainers.image.description="Optimalen Nakup Next.js web application" \
      org.opencontainers.image.revision="${APP_VERSION}" \
      org.opencontainers.image.source="https://github.com/evgenursic/optimalen_nakup"
ENV APP_VERSION=${APP_VERSION} \
    HOSTNAME=0.0.0.0 \
    NODE_ENV=production \
    PORT=3000
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs --home-dir /app nextjs
WORKDIR /app
COPY --from=web-build --chown=nextjs:nodejs /workspace/apps/web/.next/standalone ./
COPY --from=web-build --chown=nextjs:nodejs /workspace/apps/web/.next/static ./apps/web/.next/static
COPY --from=web-build --chown=nextjs:nodejs /workspace/apps/web/public ./apps/web/public
USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]

FROM dependencies AS worker-build
RUN pnpm turbo run build --filter=@optimalen-nakup/worker \
    && pnpm --filter @optimalen-nakup/worker deploy --prod --legacy /opt/worker

FROM ${NODE_IMAGE} AS worker
ARG APP_VERSION=development
LABEL org.opencontainers.image.description="Optimalen Nakup isolated Playwright research worker" \
      org.opencontainers.image.revision="${APP_VERSION}" \
      org.opencontainers.image.source="https://github.com/evgenursic/optimalen_nakup"
ENV APP_VERSION=${APP_VERSION} \
    NODE_ENV=production \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    PORT=3001
RUN groupadd --system --gid 1001 worker \
    && useradd --system --uid 1001 --gid worker --home-dir /app worker
WORKDIR /app
COPY --from=worker-build --chown=worker:worker /opt/worker ./
RUN node node_modules/playwright/cli.js install --with-deps chromium \
    && chmod -R a+rX /ms-playwright \
    && rm -rf /var/lib/apt/lists/*
USER worker
EXPOSE 3001
CMD ["node", "dist/index.js"]

FROM dependencies AS backup
ARG APP_VERSION=development
LABEL org.opencontainers.image.description="Optimalen Nakup Convex export and encrypted restic backup runner" \
      org.opencontainers.image.revision="${APP_VERSION}" \
      org.opencontainers.image.source="https://github.com/evgenursic/optimalen_nakup"
RUN apt-get update \
    && apt-get install --yes --no-install-recommends \
      ca-certificates=20230311+deb12u1 \
      restic=0.14.0-1+b5 \
      unzip=6.0-28 \
    && rm -rf /var/lib/apt/lists/*
ENTRYPOINT ["/bin/sh"]
CMD ["ops/scripts/backup.sh"]
