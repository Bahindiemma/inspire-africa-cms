# syntax=docker/dockerfile:1
# Multi-stage Dockerfile for inspire-africa-cms (Strapi v5).
#
# Why three stages: `strapi build` needs the dev tooling (typescript, etc.)
# to compile the TS config + admin panel, but the runtime image should ship
# production dependencies only. So we build with the full dep tree, install a
# pruned dep tree separately, and assemble a lean runtime from both.

# ---------- 1. Builder (full deps, compiles admin + TS) ----------
FROM node:20-alpine AS builder
RUN apk add --no-cache build-base python3 vips-dev
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
ENV NODE_ENV=production
RUN npm run build

# ---------- 2. Production dependencies only ----------
FROM node:20-alpine AS proddeps
RUN apk add --no-cache build-base python3 vips-dev
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps && npm cache clean --force

# ---------- 3. Runtime ----------
FROM node:20-alpine AS runner
# vips = libvips runtime for sharp; tini = proper PID 1 / signal handling.
RUN apk add --no-cache vips tini
ENV NODE_ENV=production \
    PORT=1337
WORKDIR /app

COPY --from=proddeps /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/config ./config
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/tsconfig.json ./

# Strapi writes to .tmp + public/uploads at runtime. Ensure they exist and
# are owned by the non-root `node` user.
RUN mkdir -p /app/.tmp /app/public/uploads && chown -R node:node /app
USER node

EXPOSE 1337
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npm", "run", "start"]
