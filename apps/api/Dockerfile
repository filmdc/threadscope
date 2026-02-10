FROM node:20-alpine AS base
RUN npm install -g pnpm@9.15.0

FROM base AS builder
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/eslint-config/package.json ./packages/eslint-config/
RUN pnpm install --frozen-lockfile

COPY packages/shared/ ./packages/shared/
COPY packages/eslint-config/ ./packages/eslint-config/
COPY apps/api/ ./apps/api/
RUN pnpm --filter @threadscope/api db:generate
RUN pnpm --filter @threadscope/api build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/

WORKDIR /app/apps/api
EXPOSE 4000
CMD ["node", "dist/server.js"]
