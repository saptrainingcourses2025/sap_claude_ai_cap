# Modularization review: file layout and code organisation

## What good CAP structure looks like

CAP has strong conventions, and the payoff for following them is that files get
picked up automatically and that anyone who has seen another CAP project can
navigate this one. Deviations are worth flagging even when the code works.

```
db/
  schema.cds              # or split by domain: db/orders.cds, db/products.cds
  data/                   # csv seed data, named <namespace>-<Entity>.csv
srv/
  catalog-service.cds     # service definition
  catalog-service.js      # implementation, auto-bound by matching filename
  admin-service.cds
  admin-service.js
  annotations.cds         # UI/auth annotations kept out of the service definition
  lib/                    # shared, service-agnostic helpers
app/                      # UI modules, one folder per Fiori app
package.json  mta.yaml  xs-security.json  xs-app.json
```

The filename-matching convention (`foo-service.cds` ↔ `foo-service.js`) is worth
calling out explicitly when a project uses `impl` paths or a single
`server.js` registering everything — the convention removes wiring code.

## The signals that a file should be split

Don't use line count alone as the criterion — a 400-line handler file of ten
cohesive validations is healthier than a 150-line file mixing auth, email and
SQL. Look for these instead, in rough order of how strongly they indicate a
split:

**1. More than one service in one `.cds` file.** Two `service` blocks in
`catalog-service.cds` means the filename lies, the implementation file can only
auto-bind to one of them, and the two services' consumers now read each other's
model. Split into one `.cds` per service. This is the single most common
CAP-specific structure finding and easy to fix.

**2. Domain schema in one giant `db/schema.cds`.** Past ~300 lines or ~3 distinct
business domains, split by domain (`db/orders.cds`, `db/products.cds`,
`db/master-data.cds`) with a thin `db/index.cds` or per-domain `using`. It makes
merge conflicts survivable, which is the real cost being paid here.

**3. Handler file mixing hook registration with business logic.** A healthy
handler file reads like a table of contents:
```js
module.exports = class CatalogService extends cds.ApplicationService {
  init() {
    this.before('CREATE', 'Orders', validateOrder)
    this.on('submitOrder', submitOrder)
    this.after('READ', 'Books', addDiscount)
    return super.init()
  }
}
```
with `validateOrder` etc. imported from `./handlers/orders.js` or `./lib/`.
When the arrow functions inline 60 lines of logic each, the file is doing two
jobs. Recommend extracting **by concern into `srv/handlers/<entity>.js` or
`srv/lib/<capability>.js`** and name the concrete functions to move.

**4. Duplicated logic across services.** The same validation, tax calculation,
date arithmetic, or external-call wrapper appearing in two handler files. This
belongs in `srv/lib/` — or, when it is genuinely domain logic, consider whether
the shared behaviour indicates a shared aspect in the model instead.

**5. Cross-cutting concerns tangled into handlers.** Logging, error mapping,
audit trail, tenant resolution, feature toggles. In CAP these are better as:
- `srv/lib/` helpers called from handlers, or
- a `cds.on('served')` hook / custom middleware in `server.js` for things that
  apply to every service, or
- CDS annotations where one exists (`@audit.personal`, `@readonly`,
  `@assert.*`) rather than hand-written checks. Replacing a handwritten
  mandatory-field check with `@mandatory` is a real reduction in code.

**6. External integrations inside business handlers.** Calls to a remote OData
service, a destination, an S/4 API, or a message queue mixed into CRUD handlers.
These belong behind a thin adapter in `srv/external/` (and the remote service
should be modelled as a `cds.Service` via `srv/external/*.csn` + `cds.connect.to`,
not raw `axios`/`fetch`). Flag raw HTTP clients where a connected service
belongs — it costs destination handling, mocking and resilience.

**7. `srv/` files that aren't services.** Utility scripts, data loaders, one-off
migrations sitting next to service implementations.

**8. Deeply nested conditional logic in a single hook.** Multi-branch `if/else`
over event types inside one `this.on('*')` handler. Split into per-event
handlers; CAP's dispatcher is doing the branching for you already.

## Service decomposition — when the split should be at the service level

Beyond file layout, sometimes the *services* are wrong. Consider recommending a
new service when:
- **Different audiences share one service.** Admin/back-office operations and
  public catalogue reads in one service force role annotations entity by entity;
  two services (`AdminService` with a role gate, `CatalogService` with
  `authenticated-user`) makes the boundary structural and much harder to get
  wrong later. This is the security and modularization findings pointing the
  same way, which is worth noting explicitly.
- **Different protocols or clients.** A Fiori UI service and a machine-to-machine
  integration API have different shapes, lifecycles, and versioning needs.
- **One service has 15+ entities** spanning unrelated domains.
- **A technical/internal service** (jobs, health, replication) sits alongside
  business entities.

## CAP Java layout

Same principles, different conventions:
```
db/            srv/src/main/java/<pkg>/handlers/   srv/src/main/resources/
```
- Handlers as `@Component` classes implementing `EventHandler`, one class per
  entity or per capability, annotated `@ServiceName`.
- A single `CatalogServiceHandler` with 20 `@On`/`@Before` methods is the Java
  version of the god-file; split by entity or use case.
- Business logic in `@Service` beans, not in the handler methods themselves.
- Check that CDS annotations aren't being duplicated by Spring Security config.

## How to report these findings

Modularization advice is easy to write and easy to ignore. Make it actionable:
name the exact file, the exact functions or blocks to move, the destination
path, and what the resulting files would contain. "Consider splitting large
files" helps nobody. Prefer:

> `srv/catalog-service.js` (412 lines) registers 11 hooks and inlines all of
> them. Extract `validateStock`, `applyDiscount`, `checkCredit` (lines 88–210)
> to `srv/handlers/orders.js`, leaving registration in the service file. The
> two `AdminService` hooks at lines 330–380 are registered on the wrong service
> and should move to `srv/admin-service.js` once `AdminService` is split out of
> `srv/catalog-service.cds` into its own file.

Also be honest about payoff. A 3-entity demo project does not need a `lib/`
layer, and saying "this is fine at current size, revisit past ~N" is more
useful than manufacturing a finding.