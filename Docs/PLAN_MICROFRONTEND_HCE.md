# PLAN — Microfrontend Frontend HCE (Next.js / Multi-Zones)

> **Decisión arquitectónica (validada):** el enfoque de microfrontend se
> implementa con **Multi-Zones**, el patrón **oficial de Next.js** para
> microfrontends (`https://nextjs.org/docs/app/guides/multi-zones`, v16.3.0).
>
> **Por qué NO Module Federation:** `@module-federation/nextjs-mf@8.8.72`
> (última versión) declara `peerDependencies: next: '^12 || ^13 || ^14 || ^15'`
> — **no soporta Next 16**. Además, Next 16 usa **Turbopack por defecto**, y
> cualquier custom webpack config rompe el build salvo que se fuerc e `--webpack`.
> Turbopack **no soporta** Module Federation nativo. Forzar webpack+ federation
> sobre Next 16 es una combinación sin respaldo oficial.
>
> **Por qué Multi-Zones SÍ:** es microfrontend **documentado y ejemplificado**
> por Next.js y Vercel, compatible con App Router y Turbopack, sin hacks de
> bundler, portable (Docker / self-host / Vercel), y mantiene el espíritu del
> plan original (shell + zonas por dominio + `packages/shared`).
>
> **Stack base verificado:** Next.js `16.3.0`, React `19.2.8`, TypeScript 5,
> Tailwind CSS 4, package manager **bun**. Repositorio partiendo de scaffold de
> Create Next App (actual `front-hce/`).

---

## 1. Objetivo

Dividir el frontend en **aplicaciones Next.js independientes** (zonas), cada una
dueña de un dominio de negocio del examen, integradas por un **shell host** que
ruta entre ellas vía `rewrites`. Cada zona se desarrolla, versiona y despliega
por separado, y consume los microservicios del backend que le corresponden.
Debe quedar operativa la cobertura de los **8 servicios** del backend:

1. Registrar Venta
2. Registrar Compra
3. Registrar Producto
4. Actualizar Producto
5. Listar Venta
6. Listar Compra
7. Listar Producto
8. Listar Kardex

---

## 2. Contexto y decisiones previas (leer primero)

### 2.1 Qué SÍ exige el entregable (confirmado)
- El **microfrontend** es requisito explícito del entregable ("enfoque de
  microfront"). Multi-Zones lo cumple: es la forma oficial de Next.js de hacer
  microfrontends (separación por dominio, build y deploy independientes).
- **"Interceptores JWT"** es requisito explícito: el front debe exponer un
  mecanismo común (interceptor) que inyecte el token y gestione 401 →
  refresh/logout. Esto es **ortogonal** al enfoque de microfront; vive en
  `packages/shared` y lo consumen todas las zonas.
- La sección de frontend del documento de examen está solo mencionada, pero la
  **lista de entregables** (teoría + repo + SQL + video) define el alcance real.

### 2.2 Stack del repositorio (verificado)
- Next.js `16.3.0`, React `19.2.8`, TS 5, Tailwind v4, **bun**.
- **Next.js 16 advierte breaking changes** (`node_modules/next/dist/docs/`):
  Turbopack es bundler por defecto, App Router con RSC, `experimental.turbopack`
  ahora es `turbopack` top-level. Leer las guías antes de escribir código.
- Shadcn ya instalado (`components.json`, `class-variance-authority`,
  `tailwind-merge`, `lucide-react`) — base para el kit de UI compartido.

### 2.3 Enfoques evaluados (decisión final: Multi-Zones)

| Enfoque | Veredicto | Razón |
|---|---|---|
| **Multi-Zones (Next.js nativo)** ✅ | **Elegido** | Oficial, documentado, compatible Turbopack, portable, sin hacks. |
| Module Federation (webpack) ❌ | Descartado | `@module-federation/nextjs-mf` no declara Next 16; rompe default Turbopack. |
| Forzar webpack + federation en Next 16 ❌ | Descartado | Combinación sin respaldo oficial; alto riesgo sin deadline. |
| single-spa ❌ | Descartado | Integración compleja con App Router + RSC; no aporta sobre Multi-Zones. |
| `@vercel/microfrontends` ⚠️ | **Opcional (fase posterior)** | Capa de plataforma sobre Multi-Zones. Mejora DX (prefetch cross-zone, Toolbar) pero ata a Vercel. **Para el examen empezamos con Multi-Zones puros** y se deja como mejora. |

**Decisión:** `Multi-Zones puros` (rewrites + `basePath` + `assetPrefix`) sobre
workspace de `bun`, con un **shell** (host) Next 16 + **zonas** por dominio.
Compatible con self-hosting (Docker compose) — no requiere Vercel.

---

## 3. Topología de zonas propuesta

```
front-hce/
├── apps/
│   ├── shell/            # host — layout, auth, rutas base, REWRITES a zonas
│   ├── mf-productos/     # zona — CRUD de Productos        (/productos/*)
│   ├── mf-compras/       # zona — CompraCab / CompraDet    (/compras/*)
│   ├── mf-ventas/        # zona — VentaCab / VentaDet      (/ventas/*)
│   └── mf-kardex/        # zona — Movimientos + Kardex     (/kardex/*)
├── packages/
│   └── shared/           # tipos, DTOs, api-client, AuthContext, interceptores JWT, UI kit
├── tsconfig.base.json
├── package.json          # raíz del workspace (bun workspaces)
└── bun.lock
```

### Puertos en desarrollo local

| App            | Puerto | basePath      |
|----------------|--------|---------------|
| `shell`        | 3000   | (sin basePath — sirve `/` y rewrites) |
| `mf-productos` | 3001   | `/productos`  |
| `mf-compras`   | 3002   | `/compras`    |
| `mf-ventas`    | 3003   | `/ventas`     |
| `mf-kardex`    | 3004   | `/kardex`     |

### Comunicación entre zonas
- **Shared API client** en `packages/shared` apunta al backend con **JWT**.
- **Autenticación centralizada en el shell** (login → token → expuesta a todas
  las zonas vía `packages/shared` AuthContext; el token vive en cookie HttpOnly
  o en memoria, nunca en localStorage).
- **Navegación cross-zone**: usar **`<a href>`** (NO `<Link>`) para ir de una
  zona a otra — `next/link` hace soft-navigate que no cruza zonas. (Si más
  adelante se adopta `@vercel/microfrontends`, su `Link` mejora el prefetch
  cross-zone.)
- **Eventos entre zonas**: `CustomEvent` en `window` para sincronizar el Kardex
  tras registrar una compra/venta (refresco por evento, no acoplar). Las zonas
  son apps distintas pero corren en el mismo `window` del navegador.

---

## 4. Plan de implementación (fases)

### Fase 0 — Preparación del monorepo
- [ ] Convertir `front-hce` en **workspace de bun** (`workspaces` en
      `package.json` raíz: `apps/*`, `packages/*`).
- [ ] Mover el scaffold actual a `apps/shell/` (preservar `app/`, `components/`,
      `lib/`, configs).
- [ ] Crear `apps/mf-productos`, `apps/mf-compras`, `apps/mf-ventas`,
      `apps/mf-kardex` (cada uno app Next mínima con su `package.json`,
      `next.config.ts`, `tsconfig.json`).
- [ ] Crear `packages/shared` (package local `@hce/shared`).
- [ ] `tsconfig.base.json` compartido + ESLint unificado + rutas TS.
- [ ] Leer `node_modules/next/dist/docs/01-app/02-guides/multi-zones.md` y
      `upgrading/version-16.md` antes de configurar nada.
- **Salida:** `bun dev` levanta las 5 apps en paralelo (script `dev:all`),
  cada una con un placeholder en su `basePath`.

### Fase 1 — Shell host + configuración Multi-Zones
- [ ] En cada zona (`mf-*`): configurar `next.config.ts` con
      `basePath: '/productos'` (etc.) y `assetPrefix: '/productos/'` para evitar
      conflictos de assets.
- [ ] En el `shell`: configurar `rewrites` en `next.config.ts` para proxyear
      cada ruta a su zona en dev local:
      ```ts
      async rewrites() {
        return [
          { source: '/productos/:path*', destination: 'http://localhost:3001/productos/:path*' },
          { source: '/compras/:path*',   destination: 'http://localhost:3002/compras/:path*'   },
          { source: '/ventas/:path*',    destination: 'http://localhost:3003/ventas/:path*'    },
          { source: '/kardex/:path*',    destination: 'http://localhost:3004/kardex/:path*'    },
        ]
      }
      ```
- [ ] Si se usan **Server Actions**: añadir `serverActions.allowedOrigins` con
      el dominio de producción.
- [ ] Layout global del shell: header + navegación (`<a>` a cada zona) + logout.
- [ ] Verificar que navegando `localhost:3000/productos` se sirve la zona
      productos (con su `basePath` aplicado).
- **Salida:** navegación cross-zone funciona desde el shell; cada zona carga
  desde su app independiente.

### Fase 2 — packages/shared (cross-cutting)
- [ ] Tipos y DTOs del dominio (Producto, CompraCab/Det, VentaCab/Det,
      MovimientoCab/Det, TipoMovimiento).
- [ ] `api-client` (wrap de `fetch`, consume los **interceptores JWT** de la
      Fase 3, manejo central de errores).
- [ ] Kit de UI base con Tailwind v4 + shadcn (Button, Table, Modal, Inputs,
      Form) — se exporta desde `@hce/shared/ui`.
- [ ] Configurar `transpilePackages` en cada `next.config.ts` para que Next
      bundlee `@hce/shared` correctamente.
- **Salida:** las zonas importan tipos, UI kit y api-client sin duplicar.

### Fase 3 — Autenticación global en el shell + **interceptores JWT** (requisito)
- [ ] Login → obtiene **JWT (30 min)** desde el backend (alinear con
      `back-hce` que ya usa cookie HttpOnly + JWT 30m).
- [ ] `AuthProvider` (React Context) en `packages/shared` (montado en el shell)
      expone el token a todas las zonas.
- [ ] Guards de rutas protegidas (middleware en shell + check en cada zona).
- [ ] **Implementar interceptores JWT** en `packages/shared`:
  - **Request interceptor**: inyecta `Authorization: Bearer <token>` en cada
    llamada (vía un token-provider, sin exponer el token en crudo).
  - **Response interceptor**: intercepta **401** → intenta refresh/revoke o
    re-login, reenvía la petición y evita bucle infinito (flag
    `_retry` o cola de pending).
  - Interceptor asociado al `api-client` de `packages/shared` (lo consumen
    todas las zonas).
- **Salida:** toda zona reenvía el JWT automáticamente y reacciona a 401 de
  forma central.

### Fase 4 — Implementación de cada dominio (los 8 servicios)
- [ ] `mf-productos`: registrar / actualizar / listar productos.
- [ ] `mf-compras`: registrar y listar compras con sus detalles.
- [ ] `mf-ventas`: registrar y listar ventas con sus detalles.
- [ ] `mf-kardex`: listar el kardex (movimientos entrada/salida).
- **Salida:** los 8 servicios cubiertos desde la interfaz.

### Fase 5 — Comunicación entre dominios (eventing)
- [ ] Tras registrar compra o venta → emitir `CustomEvent('hce:inventory-change')`
      que recoge `mf-kardex` y refresca el stock / kardex.
- [ ] Documentar el contrato del evento en `packages/shared` (payload tipado).
- **Salida:** cambios de inventario reflejados en kardex de forma desacoplada.

### Fase 6 — CORS, despliegue y documentación
- [ ] Verificar que la API del backend es consumida únicamente por los
      dominios del front (CORS ya restringido en `back-hce`).
- [ ] `Dockerfile` multi-stage por zona + `docker-compose.yml` que levante
      shell + 4 zonas + backend (o apunte al backend desplegado).
- [ ] Variables de entorno por zona (`NEXT_PUBLIC_API_URL`, puertos).
- [ ] README raíz con arquitectura + cómo levantar (`bun dev:all` o
      `docker compose up`).
- **Salida:** entorno end-to-end (backend Docker + front compose).

---

## 5. Riesgos y contramedidas

- ~~**Next 16 + Module Federation**~~ → **resuelto**: descartado por falta de
  soporte oficial. Multi-Zones es la alternativa soportada.
- **`basePath` afecta todos los links internos de la zona**: cualquier `<Link>`
  o asset dentro de `mf-productos` se resuelve bajo `/productos/...`
  automáticamente. Consecuencia: **NO hardcodear rutas**; usar siempre rutas
  relativas o constantes tipadas.
- **Navegación cross-zone con `<Link>`**: Next.js intenta soft-navigate y falla
  entre zonas. **Solución**: usar `<a href="/otra-zona">` para ir de zona a
  zona. (Con `@vercel/microfrontends` se puede usar su `Link` mejorado —
  opción futura.)
- **Estado compartido entre zonas**: como son apps distintas, **no comparten
  React state**. Solución: AuthContext vive en `packages/shared` y se monta en
  cada zona; el token viaja por cookie HttpOnly (no por Context cross-app).
  Comunicación de negocio via `CustomEvent`.
- **Server Actions cross-zone**: configurar `serverActions.allowedOrigins` con
  el dominio user-facing. Si una zona usa Server Actions, declarar el origen.
- **Build/dev en paralelo**: 5 procesos Next pueden ser pesados. Script
  `dev:all` con `concurrently` o `bun` scripts que arranquen todo. Considerar
  Turbo cache para builds.

---

## 6. MVP mínimo para validar con el examinador

1. Workspace bun + shell que integre **2 zonas** (p. ej. `productos` + `kardex`)
   vía rewrites de Next.js (Multi-Zones oficial).
2. `packages/shared` tipado + `api-client` con **interceptores JWT** (request +
   401).
3. Un dominio funcional que cubra los 8 servicios (o 4 dominios cubriendo los
   8).
4. Docker compose que levante shell + zonas + backend.

> (opcional) Grabar un video corto mostrando el dominio host con las zonas
> navegando — ver `ENTREGABLES_HCE.md` Entregable 4.

---

## 7. Checklist técnico por zona

Cada zona (`productos` / `compras` / `ventas` / `kardex`) debe contener:
- [ ] `next.config.ts` con `basePath` y `assetPrefix` correctos.
- [ ] Capa de datos: servicio/repositorio que usa el `api-client` de
      `@hce/shared`.
- [ ] Capa de UI: listado + formulario + validaciones (usa kit de `@hce/shared/ui`).
- [ ] Estados de UI: error / loading / empty.
- [ ] Tests unitarios mínimos (componentes simples).
- [ ] Respuesta correcta ante **401** (interceptor central → refresh/re-login).
- [ ] Navegación cross-zone con `<a>` (no `<Link>`) cuando aplique.

---

## 8. Criterios de éxito

- [ ] El host (`shell`) sirve un espacio único con las 4 zonas como apps Next
      independientes vía Multi-Zones (rewrites).
- [ ] Los 8 servicios del backend son operativos desde un único frontpacket.
- [ ] Token JWT (30 min) compartido, reenviado por **interceptores** a cada
      microservicio y con manejo central de 401 (refresh/re-login).
- [ ] CORS del backend solo acepta el dominio del front desplegado.
- [ ] Cada zona es desplegable por separado (Docker multi-stage / compose).
- [ ] **El enfoque de microfront es defendible técnicamente**: Multi-Zones es la
      documentación oficial de Next.js para microfrontends.

---

## 9. Lecturas obligatorias antes de implementar

- **`node_modules/next/dist/docs/01-app/02-guides/multi-zones.md`** — guía
  oficial Multi-Zones (este es el core del enfoque).
- `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` —
  breaking changes de Next 16 (Turbopack default, `turbopack` top-level).
- `node_modules/next/dist/docs/01-app/api-reference/config/next-config-js/rewrites.md`
- `node_modules/next/dist/docs/01-app/api-reference/config/next-config-js/basePath.md`
- `node_modules/next/dist/docs/01-app/api-reference/config/next-config-js/assetPrefix.md`
- **Ejemplo oficial:** `github.com/vercel/next.js/tree/canary/examples/with-zones`
- **Ejemplo App Router + Multi-Zones:**
  `github.com/vercel-labs/microfrontends-nextjs-app-multi-zone`
- **Doc Vercel (referencia, opcional):** `vercel.com/docs/microfrontends`
- Backend ya documentado en `back-hce/Docs/` (modelos + casos de uso → alinear
  tipos en `packages/shared`).

---

> **Estado:** PLAN actualizado a Multi-Zones (decisión tomada, pendiente de
> implementar). Próximo paso: **Fase 0** (preparación del monorepo).
