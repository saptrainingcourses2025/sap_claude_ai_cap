# General CAP best practices

Everything here is checkable from the source. Only report what you can evidence
with a file and line.

## Query and handler correctness

**Never build SQL/CQL by string concatenation.** `"... WHERE ID = '" + req.data.id + "'"`
is an injection hole and defeats prepared-statement caching. CQN with bound
values is the fix:
```js
await SELECT.from(Books).where({ ID: req.data.book })
```
Any string-concatenated query is a Critical finding regardless of who can reach
it, because the reachability can change later.

**`req.query` vs re-querying.** Handlers that ignore the incoming query and run
their own `SELECT` discard `$filter`, `$top` and authorization filters that CAP
already applied. Look for `on('READ', ...)` handlers that don't delegate to
`next()` or use `req.query`.

**N+1 in loops.** `for (const x of rows) await SELECT.one...` inside an `after`
handler. Replace with a single query using `where: { ID: { in: ids } }`, or an
expand in the original read.

**Missing `await`.** An unawaited `INSERT`/`UPDATE` inside a handler escapes the
transaction and fails silently. Grep for `cds.run`/`INSERT`/`UPDATE`/`DELETE`
statements not preceded by `await` or `return`.

**Transaction handling.** Custom `cds.tx()` inside a request handler usually
means a second transaction that won't roll back with the request. CAP manages
the transaction from `req`; explicit `cds.tx` is for background jobs and tests.

**`after` handlers mutating for security.** Filtering or blanking fields in an
`after('READ')` handler is not access control — the data was already read, and
`$count`/`$filter` still leak it. Use `@restrict` with `where`, or a projection.

**Error handling.** `req.error(...)` / `req.reject(...)` with a proper code and
message, not `throw new Error('failed')` which surfaces as a 500 with a stack
trace. Check messages are i18n keys for user-facing errors.

## Validation

Prefer declarative validation in CDS over handler code — it is enforced
uniformly, documented in the metadata, and surfaces in Fiori:
`@mandatory`, `@assert.unique`, `@assert.range`, `@assert.format`,
`@assert.target`, enum types. Handwritten `if (!req.data.x) req.error(...)`
checks that a CDS annotation covers are a concrete simplification to recommend.

Input validation that exists *only* in the UI layer is a finding: the OData
endpoint is directly callable.

## Configuration and profiles

- Production config belongs under `[production]` profiles, dev defaults under
  the plain keys. Check `db.kind` is `hana` (not `sqlite`/`sql`) in production
  and that `auth.kind` is `xsuaa`/`ias` there.
- Hardcoded URLs, hostnames, credentials, or destination names in code instead
  of `cds.env` / destinations / `VCAP_SERVICES`.
- `default-env.json`, `.env`, `.cdsrc-private.json` must be gitignored — check
  `.gitignore` actually lists them, and that they aren't committed.

## Multitenancy (if the project is SaaS)

Evidence: `@sap/cds-mtxs` dependency, `mtx/sidecar/` folder, `tenant-mode:
shared`. Then check:
- No cross-tenant queries; tenant isolation relies on `cds.context.tenant` being
  respected (any raw `cds.tx({ tenant: ... })` deserves scrutiny).
- Extensibility annotations (`@cds.extension`) if tenant extensions are offered.
- Schema evolution handled via `cds deploy`/MTX upgrade, not manual SQL.

## Database deployment and data

- `db/data/*.csv` seed files: fine for master data and code lists, dangerous for
  transactional data because `cds deploy` **replaces** table contents on HANA
  deployment. Flag CSVs for entities that users write to.
- CSV filenames must match `<namespace>-<Entity>.csv` or they are silently
  ignored — a common invisible bug.
- HDI: check `db/src/` handwritten artefacts don't duplicate generated ones, and
  that `undeploy.json` exists if tables/views are ever removed.
- Never `DROP`/recreate in production; HDI handles deltas.

## Logging and observability

- `cds.log('component')` rather than `console.log`. `console.log` bypasses log
  levels and floods Cloud Foundry logs; sensitive payloads logged this way is
  also a data-protection issue. Flag `console.log(req.data)` specifically.
- Correlation IDs preserved on outbound calls.
- `@cap-js/telemetry` or equivalent for anything non-trivial.

## Testing

- `@cap-js/cds-test` / `cds.test` integration tests hitting the OData endpoints,
  not just unit tests of helper functions. A project with zero tests touching
  the service layer is worth a finding of its own.
- Tests asserting authorization (a request as a user *without* the role gets
  403) — these are the tests that catch the regressions this review is about.
- `npm test` script present and wired to CI.

## Dependencies and versions

- `@sap/cds` major version and whether it is current; CAP moves fast and old
  majors lose support.
- `@sap/hana-client` vs `@cap-js/hana` (the latter is the modern driver).
- Deprecated packages: `@sap/cds-odata-v2-adapter-proxy` (now
  `@cap-js/cds-odata-v2-adapter-proxy`), `passport`-based auth wiring.
- Dependencies pinned loosely (`*`, `latest`) in a deployed app.
- Direct `express` route registration bypassing CAP's protocol adapters.

## Deployment descriptors

- `mta.yaml`: modules/resources consistent with `package.json` requires; the
  `xsuaa` resource pointing at `xs-security.json` via `path`; memory/disk quotas
  present; `srv` bound to db, uaa, and destination as needed.
- Health check and `buildpack` settings for the srv module.
- `xs-app.json` route order (specific before catch-all), `welcomeFile`, and
  `authenticationMethod: route`.

## CAP Java notes

- `@Transactional` boundaries and `PersistenceService` usage instead of raw JDBC.
- `CqnAnalyzer`/CQL builders rather than string SQL.
- Handler classes registered as Spring beans, `@ServiceName` matching the CDS
  service.
- `application.yaml` profiles (`default`, `cloud`) with the same
  production-config checks as above.
- `cds-feature-hana`, `cds-starter-cloudfoundry` dependencies present for CF
  deployment.

## Calibration

Weight findings by what the project actually is. A hackathon-scale bookshop with
three entities does not need telemetry, MTX, or a `lib/` layer, and padding a
report with those makes the real findings harder to see. Conversely, an app that
holds personal or financial data should be held to instance-based restrictions,
audit logging (`@audit.personal`/`@PersonalData` annotations, `@cap-js/audit-logging`),
and tested authorization. Say which mode you are reviewing in.