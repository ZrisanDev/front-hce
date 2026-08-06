# ENTREGABLES HCE — Roadmap de Cierre

Alinea los **4 entregables** del examen contra el estado real de los repos
(`back-hce` + `front-hce`). Estado verificado al momento de escribir.

---

## Entregable 1 — Evaluación Teórica (documento)

> Respuestas detalladas sobre **API REST**, arquitecturas (**Monolítica vs.
> Microservicios**), patrones (**BFF, DDD**) y **diagrama de arquitectura** con
> Docker, monitoreo e integraciones.

### Qué falta
- [ ] Documento de **teoría pura** (API REST, REST vs. alternativas, idempotencia, estados HTTP).
- [ ] Comparativa **Monolítica vs. Microservicios** (pros/contras, cuándo, costes).
- [ ] Patrones **BFF** (Backend for Frontend) y **DDD** (bounded contexts, agregados, eventos de dominio) aplicados al caso HCE.
- [ ] **Diagrama de arquitectura** (Mermaid) que integre: Docker services, monitoreo (Prometheus/pino), integraciones (auth→inventario→SQL Server).

### Estado existente aprovechable
- `back-hce/Docs/` ya contiene esquemas (microservicios-gateway, metallo hexagonal,
  docker-despliegue, seguridad, casos de uso).
- Monitoreo ya implementado: **pino JSON + prom-client** (`prometheus.yml`, `/metrics`).

> **Acción:** crear `Docs/TEORIA.md` (respuestas + comparativas) y `Docs/DIAGRAMA.md`
> (Mermaid) que integre lo ya documentado. Prioridad ALTA — es 100% de la rúbrica y
> además fija el discurso del video (Entregable 4).

---

## Entregable 2 — Repositorio Git (código público)

**BackEnd Nest.js microservicios** + **FrontEnd Next.js con enfoque microfront y categorías
interceptores JWT.**

### Backend — estado: ✅ casi completo
- Ya: monorepo `gateway`/`auth`/`inventario` + `libs/contracts`, hexagonal, JWT 30m en
  cookie HttpOnly, CORS restringido, Swagger, Throttler, Helmet, Docker multi-servicio.
- **A revisar:** hacer público el repo, `README` raíz claro, `.env.example`, semillas y
  migraciones versionadas.

### Frontend — estado: ⏳ plan listo, código NO implementado
- Plan microfront en `front-hce/Docs/PLAN_MICROFRONTEND_HCE.md`.
- **Falta implementar** (Fases 0→6) y **FALTA el "interceptor JWT"** explícito (interceptor
  axios/fetch que inyecta `Authorization` y maneja 401 → refresh/logout).

### Acciones
- [ ] Repo público (dos repos: `hce-backend`, `hce-frontend`).
- [ ] Front: validar Module Federation en **Next 16** (Fase 0) → fallback single-spa.
- [ ] Implementar **interceptores JWT** en `packages/shared` (request + response/401).
- [ ] `README.md` raíz por repo con arquitectura + cómo levantar.

---

## Entregable 3 — Base de Datos (SQL Server)

**Scripts completos: tablas, consultas T-SQL, procedimientos almacenados y triggers de
auditoría.**

### Estado existente (back-hce/scripts)
- `01-schema.sql`  → tablas (producto, compra, venta, movimiento, tipo_movimiento)
- `02-seed.sql`    → datos MERGE
- `03-procedures.sql` → stored procedures (atomicidad SQL compra/venta/kardex)
- `04-examples.sql` → ejemplos

### Falta verificar / agregar
- [ ] **Triggers de auditoría** — NO confirmado en scripts actuales. Pueden no estar →
      crear triggers que registren operaciones (INSERT/UPDATE/DELETE) en una tabla `AuditLog`
      (usuario, fecha, tabla, operación, antes/después).
- [ ] **Consultas T-SQL solicitadas** (kardex: JOINs movimiento_cab/venta+compra).
- [ ] Procedimientos ya existen → documentar firma y uso en `scripts/README.md`.
- [ ] Verificar scripts son **idempotentes** (schema con `IF OBJECT_ID... IS NULL`).

> **Acción:** auditar `03-procedures.sql` y añadir un `05-triggers-auditoria.sql` +
> `06-consultas-tsql.sql`. Prioridad ALTA (entregable nominal).

---

## Entregable 4 — Evidencia en Video (grabación corta)

Explicar: arquitectura, estructura de código, **patrones Facade y Decorator**, y demo de
**registro de venta, compra y visualización de Kardex.**

### Guion sugerido (≤ 5–7 min)
1. **0:00–1:00** Diagrama de arquitectura: Docker (db/auth/inventario/gateway/prometheus),
   microservicios, cómo CORS cae solo al front.
2. **1:00–2:30** Estructura del código: monorepo (apps + libs/contracts) y en front
   microfrontend (shell + remotes).
3. **2:30–4:00** Patrones: **Facade** (gateway como fachada única de API) y **Decorator**
   (ej. guards/validation/auth decorators en Nest). Mostrar código en pantalla.
4. **4:00–6:00** Demo funcional: **registrar venta → registrar compra → ver Kardex**
   (en vivo o con videos de swagger).
5. **6:00+** Cierre: breves de decisiones de diseño.

> Esto NO se puede delegar:lo haces tú. Requiere que el front + el flujo end-to-end
> estén operativos (depende de Entregable 2).

---

## Orden de ejecución recomendado

1. **Entregable 1 (Teoría + Diagrama)** → rápido, sin dependencias, cierra la rúbrica
   teórica y sirve de guion para el video.
2. **Entregable 3 (Triggers de auditoría + consultas T-SQL)** → completar scripts SQL.
3. **Entregable 2 (Frontend microfront + interceptores JWT)** → el trabajo grueso.
   Backend ya alineado.
4. **Entregable 4 (Video)** → último, una vez el front E2E esté operativo.

---

**Estado:** roadmap de cierre (no ejecutado).