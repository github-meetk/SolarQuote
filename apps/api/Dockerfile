FROM rust:1.78-bookworm AS sim
WORKDIR /src
COPY crates/sim crates/sim
RUN cargo build --release --manifest-path crates/sim/Cargo.toml
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages packages
COPY apps/api apps/api
COPY prisma prisma
RUN corepack enable && pnpm install --frozen-lockfile && pnpm prisma generate && pnpm --filter @solarquote/api build
FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/packages ./packages
COPY --from=build /app/prisma ./prisma
COPY --from=sim /src/crates/sim/target/release/solar-sim ./solar-sim
EXPOSE 3001
CMD ["node", "apps/api/dist/server.js"]