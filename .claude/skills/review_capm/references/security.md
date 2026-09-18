# Security review: endpoint protection and xs-security

## The mental model that makes this review correct

CAP's default is **open**. A service with no `@requires` and no `@restrict` is
reachable by anyone who can reach the service. In dev this is masked by mocked
auth; in production, bound to XSUAA/IAS, an unannotated service is authenticated
but *unauthorised* — any logged-in user of the whole subaccount can call it.
This is why "no annotation" is a finding, not a neutral observation.

Authorization in CAP is **inherited downward and not overridden upward**:
service-level `@requires` applies to everything inside, and entity-level
`@restrict` narrows further. So a service-level annotation is the floor, and
entity-level annotations are where real-world leaks hide — a service guarded by
`@requires: 'authenticated-user'` with a `Users` entity inside and no
`@restrict` means every authenticated user can read every user row.

## What to check, in order of how often it is actually wrong

### 1. Every service has an explicit auth annotation
Look for `@requires` or `@restrict` directly on each `service` definition, or
added later through an `annotate <Service> with @(requires: ...)` statement —
often in a separate `srv/*-auth.cds` or `srv/annotations.cds` file. Miss the
`annotate` statements and you will report false positives. The scanner collects
them; cross-check before writing a finding.

`@requires: 'authenticated-user'` is the weakest useful setting. It is fine for
a read-only catalogue, and clearly insufficient for anything that writes
business data or exposes personal data. Say which one the service is.

### 2. Write operations and actions/functions
Actions bypass entity-level CRUD restrictions people assume are protecting
them. `action wipeAll()` inside a service whose entities are `@readonly` is
still callable. Every unbound and bound action/function needs its own
`@requires` unless the service-level role is genuinely sufficient for it.

A common real defect: entity restricted to `READ` for a role, but a custom
action on the same entity mutates it with no role check at all.

### 3. `@restrict` grants that don't constrain rows
```cds
@restrict: [{ grant: '*', to: 'Admin' }]                     // role gate only
@restrict: [{ grant: 'READ', to: 'Viewer', where: 'buyer = $user' }]  // instance-based
```
The `where` clause is what turns a role check into row-level security. If an
entity holds tenant- or user-owned data (orders, documents, employee records)
and the grants have no `where`, flag it: role membership then leaks the whole
table. `$user`, `$user.<attribute>`, and `$user.tenant` are the usual
predicates.

Watch for `grant: '*'` used casually — it includes actions and `DELETE`.

### 4. `xs-security.json` — presence and coherence
If the project deploys to BTP with XSUAA (evidence: `mta.yaml` with an
`xsuaa`/`com.sap.xs.uaa` resource, `@sap/xssec` dependency, `auth: { kind:
'xsuaa' }` in `package.json`), then `xs-security.json` is required for the
service instance to exist at all. Missing → the deployment either fails or
falls back to a security config that grants nothing or everything, depending on
setup. This is a **critical** finding, not a warning.

When it exists, the failure mode is drift rather than absence. Check:

- **Every role used in CDS exists as a scope + role-template.** Collect role
  names from all `@requires` and `to:` clauses, compare with `scopes[].name`
  (which appear as `$XSAPPNAME.RoleName`). A role in CDS with no scope means
  nobody can ever be granted it — the endpoint is effectively bricked, or worse,
  silently open if the annotation is later removed to "fix" it.
- **Every scope is reachable.** Scopes with no role-template, and role-templates
  in no role-collection, cannot be assigned in the cockpit.
- **`$user.<attr>` attributes are declared.** An instance-based `where` clause
  on `$user.country` needs a matching `attribute-references` entry in the
  role-template, otherwise the attribute is always null and the restriction
  either blocks everyone or is ignored.
- **`tenant-mode`.** `dedicated` in a multitenant (SaaS) app is wrong; MTX apps
  need `shared`.
- **`oauth2-configuration.redirect-uris`** should not contain wildcards to
  arbitrary hosts.

For IAS-based projects the equivalent artefacts are the IAS application and
`@sap/cds` `auth: { kind: 'ias' }`; the role checks still live in CDS.

### 5. The approuter layer
`xs-app.json` routes: a route with `"authenticationType": "none"` in front of a
CAP endpoint undoes every CDS annotation behind it. Also check `csrfProtection`
is not disabled on mutating routes, and that there is no catch-all route
exposing `/odata/v4/*` without auth.

### 6. Development leftovers that reach production
- `auth: { kind: 'mocked' }` or `'dummy'` in the **production** profile of
  `package.json`/`.cdsrc.json` (under `[production]` or `cds.requires.[production]`)
  disables authorization entirely. In the default profile it is normal — say so
  rather than crying wolf, but confirm a production profile overrides it.
- `cds.requires.auth.users` with hardcoded test users outside the dev profile.
- `@cds.persistence.skip` or `@readonly` removed "temporarily".
- Credentials, API keys or destination secrets committed in `.cdsrc.json`,
  `default-env.json`, or `.env`. Check these are gitignored.

### 7. CAP Java specifics
Java projects express the same model through the same CDS annotations, so the
`@requires`/`@restrict` analysis is unchanged. Additionally check:
- `application.yaml` for `cds.security.authentication.mode` — `none` or
  `model-strict: false` weakens enforcement.
- Spring Security config classes that `permitAll()` on service paths.
- `@PreAuthorize` used *instead of* CDS annotations creates two sources of
  truth; note it as a maintainability risk.

## Severity guidance

| Finding | Severity |
|---|---|
| Service exposing writable business data with no auth annotation | Critical |
| `xs-security.json` missing while XSUAA is bound | Critical |
| Mutating action with no role check | Critical |
| Personal/tenant data with role-only grants, no `where` | High |
| Role in CDS with no matching scope | High |
| `authenticationType: none` on a business route | High |
| Only `authenticated-user` on data that warrants a named role | Medium |
| Scope not reachable via any role-collection | Medium |
| Mocked auth in default profile with production profile present | Low (note only) |

Report the file and line for each. A finding the reader cannot locate is a
finding they will not fix.