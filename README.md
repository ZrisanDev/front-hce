# front-hce

Multi-Zones frontend for the **HCE** inventory system (productos, compras,
ventas, kardex). A bun monorepo with a shell host plus four isolated Next.js
zone apps and a shared `@hce/shared` package.

Built with **Next.js 16.3**, **React 19.2**, **TypeScript 5**, **Tailwind v4**,
and **bun 1.3.14**. Authentication uses a JWT **HttpOnly cookie** over a
same-origin `/api` proxy; a 401 surfaces a blocking "Sesión expirada" modal.

---

## Architecture

Next.js **Multi-Zones**: each domain is a standalone Next app. The **shell** is
the user-facing host (port 3000, no `basePath`) and owns auth. The four **zones**
run on their own ports with a `basePath`/`assetPrefix`, and the shell rewrites
`/<zona>/*` to them. All apps share `@hce/shared` (types, API client, auth,
events, UI kit) and proxy `/api/*` to the same backend.

```
                       Browser (same origin: :3000)
                                  │
   ┌──────────────────────────────┴──────────────────────────────┐
   │  shell  (:3000)  — host, auth owner, nav, /api proxy         │
   │  rewrites: /api/* → backend   /<zona>/* → zone app           │
   └──┬──────────────┬──────────────┬──────────────┬──────────────┘
      │ /productos   │ /compras     │ /ventas      │ /kardex
      ▼              ▼              ▼              ▼
 mf-productos   mf-compras     mf-ventas      mf-kardex
 (:3001)        (:3002)        (:3003)        (:3004)
 /productos/*   /compras/*     /ventas/*      /kardex/*
      │              │              │              │
      └──────────┬───┴──────────────┴──────────────┘
                 ▼  /api/*  (same-origin proxy, credentials:include)
            back-hce gateway (:5050)   ← HttpOnly JWT cookie

   @hce/shared (packages/shared) — types · apiClient · auth · events · UI kit
   cross-zone event bus: emitInventoryChange() (compras/ventas) → onInventoryChange() (kardex)
```

### Service → zone → endpoints

| Service | Port | basePath | Pages | Backend endpoints |
|---------|------|----------|-------|-------------------|
| `shell` | 3000 | — | `/` · `/login` · `/logout` | `POST /api/auth/login` · `POST /api/auth/logout` |
| `mf-productos` | 3001 | `/productos` | listar · `/registrar` · `/actualizar/[id]` | `GET/POST /api/productos` · `PATCH /api/productos/:id` |
| `mf-compras` | 3002 | `/compras` | listar · `/registrar` | `GET/POST /api/compras` |
| `mf-ventas` | 3003 | `/ventas` | listar · `/registrar` | `GET/POST /api/ventas` |
| `mf-kardex` | 3004 | `/kardex` | listar (filtrable) | `GET /api/kardex` |

---

## Stack

- **Next.js 16.3** (App Router, Multi-Zones, `output: 'standalone'`)
- **React 19.2**
- **TypeScript 5** (strict)
- **Tailwind CSS v4**
- **bun 1.3.14** (workspaces + runtime)

---

## Monorepo structure

```
front-hce/
├── package.json              # bun workspaces: apps/* + packages/*
├── bun.lock
├── tsconfig.base.json        # strict, @hce/shared path mapping
├── Dockerfile                # generic multi-stage, builds any zone via APP_DIR
├── docker-compose.yml        # shell + 4 zones on hce-frontend network
├── scripts/dev-all.sh        # runs all 5 apps in parallel (dev)
├── apps/
│   ├── shell/                # host :3000 — auth, nav, /api + zone rewrites
│   ├── mf-productos/         # :3001  basePath /productos
│   ├── mf-compras/           # :3002  basePath /compras
│   ├── mf-ventas/            # :3003  basePath /ventas
│   └── mf-kardex/            # :3004  basePath /kardex
└── packages/
    └── shared/               # "@hce/shared" — types, api, auth, events, routes, ui
```

---

## Run in development

Prerequisite: the **back-hce** gateway running on `http://localhost:5050` (see
its own README / `docker-compose.yml`).

```bash
bun install                 # resolve the workspace
bun run dev:all             # scripts/dev-all.sh → shell:3000 + zones:3001-3004
```

Then open <http://localhost:3000> and log in. Each zone is also reachable
directly on its own port (e.g. <http://localhost:3001/productos>); its own
`/api` rewrite keeps the same-origin cookie working either way.

---

## Run with Docker

```bash
docker compose up --build   # builds shell + 4 zones from the generic Dockerfile
```

Services exposed on the host:

| Service | Host port |
|---------|-----------|
| shell | 3000 |
| mf-productos | 3001 |
| mf-compras | 3002 |
| mf-ventas | 3003 |
| mf-kardex | 3004 |

The backend is **not** built here. back-hce is a separate microservice stack
(db + auth + inventario + gateway) with its own `docker-compose.yml` and no
single root Dockerfile, so it must be brought up independently. Two options,
documented in `docker-compose.yml`:

- **Backend on the host** (easy): run back-hce's gateway on `:5050`, then set
  `BACKEND_URL=http://host.docker.internal:5050` in the service env
  (`extra_hosts` already enables `host.docker.internal` on Linux).
- **Shared network**: join back-hce's gateway to the `hce-frontend` network with
  a `backend` alias so the default `BACKEND_URL=http://backend:5050` resolves.

---

## Environment variables

All variables are **server-side only** — none is `NEXT_PUBLIC_*`. The browser
never learns the backend host; every request is same-origin `/api/*` proxied by
each app's `next.config.ts` rewrites.

| Variable | Used by | Purpose |
|----------|---------|---------|
| `BACKEND_URL` | all apps | Same-origin `/api/*` proxy target (default `http://localhost:5050`) |
| `API_ZONA_PRODUCTOS` | shell | mf-productos upstream (default `http://localhost:3001`) |
| `API_ZONA_COMPRAS` | shell | mf-compras upstream (default `http://localhost:3002`) |
| `API_ZONA_VENTAS` | shell | mf-ventas upstream (default `http://localhost:3003`) |
| `API_ZONA_KARDEX` | shell | mf-kardex upstream (default `http://localhost:3004`) |
| `PORT` | runner | Standalone server bind (Docker) |

---

## Key technical decisions

- **Multi-Zones, not Module Federation.** Each zone is a fully independent Next
  app composed by URL path. Simpler ops, independent builds/deployments, no
  shared runtime/bundler coupling between teams. The tradeoff is a hard
  navigation between zones (plain `<a>`, since `next/link` cannot soft-navigate
  across apps).
- **Same-origin `/api` proxy.** Every app rewrites `/api/*` to the backend, so
  the browser always calls its own origin. This solves CORS and `SameSite` for
  credentials at once: the HttpOnly auth cookie travels with `SameSite=Lax` and
  `credentials: 'include'`, with zero cross-origin requests.
- **HttpOnly cookie + `credentials: 'include'`.** The JWT lives in an HttpOnly
  cookie (unreadable from JS). `apiClient` sends `credentials: 'include'` on
  every request; the cookie is never touched by client code.
- **401 → blocking "Sesión expirada" modal.** A module singleton in
  `@hce/shared` dedups simultaneous 401s and shows one modal that redirects to
  login. `resetSessionExpired()` is called on successful login so it doesn't
  reappear after re-authenticating.
- **AuthProvider cannot read the cookie.** By design (security). State starts at
  `checking` and resolves optimistically: a successful first protected call →
  `authenticated`; a 401 → `guest` + the modal. There is no `/auth/me`.
- **Cross-zone inventory events.** Compras/ventas call `emitInventoryChange()`
  (a `window` `CustomEvent`); mf-kardex subscribes via `onInventoryChange()` and
  re-fetches with its current filters, cleaning up on unmount. Keeps zones
  decoupled yet consistent after writes (e.g. a sale registered in one tab
  refreshes a kardex open in another).
- **`transpilePackages: ['@hce/shared']`.** The shared package ships as TS/TSX
  source from the workspace; each zone transpiles it directly (no separate build).
- **`output: 'standalone'`.** Each app emits a self-contained `.next/standalone`
  tree with a minimal `server.js` for Docker, with `outputFileTracingRoot` set to
  the monorepo root so the shared workspace package is included.

---

## Scripts

| Script | What it does |
|--------|--------------|
| `bun run dev` | Dev server for the shell only |
| `bun run dev:all` | All 5 apps in parallel (shell:3000, zones:3001-3004) |
| `bun run build:all` | Production build of all 5 apps |
| `bun run lint` | ESLint |

---

## Testing

No automated test suite by specification. Verification is manual smoke: run
`bun run dev:all`, log in, and exercise each zone (list/register/update, filters,
401 expiry) and the cross-zone kardex refresh after a compra/venta.
