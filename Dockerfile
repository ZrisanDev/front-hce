# syntax=docker/dockerfile:1
#
# Generic multi-stage Dockerfile for any app in the front-hce monorepo.
#
# One Dockerfile builds all five apps (shell + 4 zones) via the APP_DIR arg:
#
#   docker build --build-arg APP_DIR=shell        -t hce-shell .
#   docker build --build-arg APP_DIR=mf-productos -t hce-mf-productos .
#   docker build --build-arg APP_DIR=mf-compras   -t hce-mf-compras .
#   docker build --build-arg APP_DIR=mf-ventas    -t hce-mf-ventas .
#   docker build --build-arg APP_DIR=mf-kardex    -t hce-mf-kardex .
#
# Each app sets `output: 'standalone'` + `outputFileTracingRoot` (monorepo
# root) in its next.config.ts, so `next build` emits a self-contained
# .next/standalone tree with a minimal server.js (Node-compatible). The runner
# copies standalone + static + public and boots server.js with bun, which reads
# PORT/HOSTNAME from the environment.
#
# Runtime env (all server-side only — never NEXT_PUBLIC_*):
#   BACKEND_URL            gateway base URL, e.g. http://backend:5050
#   API_ZONA_PRODUCTOS..   per-zone upstreams (shell only), e.g. http://mf-productos:3001
#   PORT, HOSTNAME         standalone server bind (defaults below)

ARG BUN_VERSION=1.3.14

# ---- stage 1: deps -------------------------------------------------------
# Install the full workspace from the lockfile. Only manifests are copied, so
# this layer is cached across source edits.
FROM oven/bun:${BUN_VERSION} AS deps
WORKDIR /app

# Workspace root manifests + lockfile + shared tsconfig.
COPY package.json bun.lock tsconfig.base.json ./
# Every workspace member's package.json so bun can resolve the workspace graph.
COPY apps/shell/package.json      apps/shell/package.json
COPY apps/mf-productos/package.json apps/mf-productos/package.json
COPY apps/mf-compras/package.json apps/mf-compras/package.json
COPY apps/mf-ventas/package.json  apps/mf-ventas/package.json
COPY apps/mf-kardex/package.json  apps/mf-kardex/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN bun install --frozen-lockfile

# ---- stage 2: builder ----------------------------------------------------
FROM oven/bun:${BUN_VERSION} AS builder
WORKDIR /app

ARG APP_DIR
RUN test -n "$APP_DIR" || (echo "ERROR: APP_DIR build-arg is required (shell | mf-productos | mf-compras | mf-ventas | mf-kardex)" && false)

# Installed node_modules from the cached deps stage + full source.
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build ONLY the requested zone. `output: 'standalone'` emits
# apps/${APP_DIR}/.next/standalone (with server.js + traced node_modules).
RUN bun --cwd apps/${APP_DIR} run build

# Standalone does NOT include static assets or public/ by default — fold them
# in so the runner is a single self-contained tree (per Next 16 output.md).
RUN cp -r apps/${APP_DIR}/.next/static apps/${APP_DIR}/.next/standalone/.next/static \
 && if [ -d apps/${APP_DIR}/public ]; then cp -r apps/${APP_DIR}/public apps/${APP_DIR}/.next/standalone/public; fi

# ---- stage 3: runner -----------------------------------------------------
# Minimal runtime image. bun is used as the runtime (matches the project's
# package manager and runs the Node-compatible standalone server.js).
FROM oven/bun:${BUN_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000

# Copy the assembled standalone tree (server.js + .next + node_modules + public).
COPY --from=builder /app/apps/${APP_DIR}/.next/standalone ./

EXPOSE 3000

# server.js reads PORT/HOSTNAME from env; override PORT per service in compose.
CMD ["bun", "server.js"]
