---
name: cap-project-review
description: Reviews a SAP BTP CAP (CAPM) project end to end — checks every service endpoint, entity and action is protected by @requires/@restrict, warns when xs-security.json is missing or its scopes drift from the CDS annotations, finds unnormalized or duplicated model fields, checks Association vs Composition and key correctness, pinpoints oversized or mixed-concern files and names the exact handlers to split into separate modules, and audits CAP best practices (CQN vs string SQL, profiles, mta.yaml, tests). Use whenever the user asks to review, audit, assess, code-review, security-check or get feedback on a CAP / CAPM / SAP BTP project, or mentions reviewing .cds files, srv/ handlers, db/schema.cds, service authorization, xs-security.json or CAP best practices — use it even when they ask about only one of these areas, since the areas overlap and a partial answer misleads. Also use for "is my CAP app production ready", "are my OData endpoints secure", or requests to critique a CAP data model.
---

# CAP project review

## What this review is for

Someone hands you a CAP project and wants to know what is wrong with it before
it reaches production or a colleague's pull request. The value you add is not a
list of generic CAP advice — they can read the docs. It is **specific findings,
located in their files, ranked by what would actually hurt them**, with the
corrected code next to the problem.

Two failure modes to avoid:
- **Padding.** Twenty Medium findings bury the one Critical one. If a service is
  wide open, that must be impossible to miss.
- **Guessing.** CAP's authorization is inherited and can be added from a
  *different file* via `annotate`. A finding that turns out to be annotated two
  files over destroys trust in the whole report. Verify before you claim.

## Workflow

### 1. Locate and scope the project

Find the project root (the directory with `package.json` + `db/` + `srv/`, or
`pom.xml` + `srv/` for Java). If the user pointed at a subdirectory, walk up.

If nothing was attached or no path is given, ask for one before proceeding —
don't review a hypothetical project.

Note which flavour you're in: **Node.js** (`@sap/cds` in dependencies) or
**Java** (`pom.xml`, `cds-starter-*`). The CDS-level analysis is identical; the
handler and config analysis differs.

### 2. Run the scanner

```bash
python3 <skill-path>/scripts/scan_cap_project.py <project-root> --json /tmp/cap-scan.json
```

This produces a factual inventory: every service with its auth annotations,
every exposed entity and action, every domain entity with keys/associations/
compositions, handler files with size and hook counts, and the state of
`xs-security.json`, `package.json`, `mta.yaml`, `xs-app.json`.

It prefers `cds compile --to json` when a `cds` CLI is available (exact,
resolves `annotate` statements and aspects) and falls back to source parsing
otherwise. **The scanner's output is a starting point, not the report.** When it
is in fallback mode especially, open the files it flags and confirm — its
`annotate` handling is approximate, and a false "unprotected service" is worse
than a missed one.

If the project is large, the scanner tells you where to look; read those files
rather than every file.

### 3. Read the code the scanner points at

At minimum, read: every `srv/*.cds`, any `annotations.cds` / `*-auth.cds`,
`db/schema.cds` (or the split equivalents), `xs-security.json`, the largest 3–5
handler files, `package.json` cds config, and `mta.yaml` + `xs-app.json` if
present.

### 4. Analyse against the reference material

Read these as you need them rather than all upfront:

| Area | File |
|---|---|
| Endpoint protection, `@restrict` patterns, xs-security coherence, approuter | `references/security.md` |
| Normalization, Association vs Composition, keys, types, persistence | `references/data-model.md` |
| File layout, when to split, service decomposition, handler extraction | `references/modularization.md` |
| CQN vs string SQL, validation, profiles, CSV seeds, logging, tests, deps | `references/best-practices.md` |

Each one explains *why* its checks matter, which is what lets you judge whether
a pattern in this particular project is a defect or a deliberate choice.

### 5. Calibrate severity to the project

Before writing, decide what this project **is**: a learning/demo app, an
internal tool, or something holding customer, financial or personal data. Say so
in the report's opening. Advice that suits a regulated production app is noise
on a three-entity tutorial, and the reverse is negligence. Where you're unsure,
state the assumption you reviewed under.

Use these severities consistently:

- **Critical** — exploitable now, or will break deployment. Unprotected writable
  endpoint, missing `xs-security.json` with XSUAA bound, SQL built by string
  concatenation, mutating action with no role check.
- **High** — data exposure across users/tenants, role in CDS with no scope,
  auth disabled in the production profile, a modelling defect that will corrupt
  data (composition pointing at shared master data).
- **Medium** — weak-but-present auth, normalization defects, missing keys or
  `@assert` constraints, structural problems that will hurt maintenance.
- **Low** — conventions, naming, small simplifications, nice-to-haves.

### 6. Write the report

Write it to a Markdown file in the outputs directory, then give a short inline
summary of the Critical and High findings so the user gets the headline without
opening anything. Present the file with `present_files`.

## Report structure

Use this shape. Drop a section entirely if it has no findings — an empty section
with "no issues found" padding is fine once, a page of them is not.

```markdown
# CAP project review — <project name>

**Reviewed:** <path> · <N> services, <N> entities, <N> handler files · CAP <Node.js|Java>
**Reviewed as:** <demo / internal tool / production app handling business data>
**Analysis basis:** <compiled CSN | source parsing — findings marked (unverified) need a look>

## Verdict
<3–5 sentences. What's the state of it, what is the single most important thing
to fix, and is it safe to deploy as-is.>

| Severity | Count |
|---|---|
| Critical | N |
| High | N |
| Medium | N |
| Low | N |

## Critical & high findings

### C1 · <Short title>
**Where:** `srv/admin-service.cds:10`
**What:** <one or two sentences — the concrete problem>
**Why it matters:** <the consequence, specific to this project's data>
**Fix:**
```cds
<the corrected snippet — diff-sized>
```

## Endpoint protection
<Table of every service: entities, actions, effective auth, verdict. This table
is the artefact the user will come back to, so make it complete.>

| Service | File | Entities | Actions | Service auth | Entity-level | Verdict |
|---|---|---|---|---|---|---|

<Then per-service notes for anything the table can't carry.>

## xs-security.json
<Present/missing. If present: scope ↔ role coverage, unreachable scopes,
undeclared $user attributes, tenant-mode. If missing: whether XSUAA is actually
bound, and the minimal file to add.>

## Data model
<Grouped by entity. Normalization, keys, types, association/composition
correctness, constraints. Corrected CDS per entity.>

## Modularization
<Named files, named functions to move, destination paths, and what each
resulting file would hold. Include service-level decomposition where the
services themselves are drawn wrong.>

## Best practices
<Query patterns, validation, config/profiles, deployment descriptors, logging,
tests, dependencies.>

## What's done well
<Two to five genuine items. This is not flattery — it tells the user which
patterns to keep when they refactor, and it calibrates the rest of the report.>

## Suggested order of work
<A numbered list, most important first, with rough effort. 5–10 items.>
```

## Things that make this review good rather than generic

**Every finding carries a location.** `file:line`. If you cannot locate it, you
have not verified it, and it probably shouldn't be in the report.

**Show the fix, not the rule.** Not "add `@restrict` to sensitive entities" but
the actual annotation with this project's role names and this entity's fields:
```cds
@restrict: [
  { grant: 'READ',   to: 'OrderViewer', where: 'buyer = $user' },
  { grant: '*',      to: 'OrderAdmin' }
]
entity Orders as projection on my.Orders;
```

**Connect findings that are the same problem.** An unprotected `AdminService`
sitting inside `catalog-service.cds` is one root cause with a security symptom
and a structure symptom. Saying so is more useful than two disconnected entries.

**Distinguish "missing" from "intentional".** A denormalized `priceAtOrder` is a
correct historical snapshot; a denormalized `authorName` is duplication. Mocked
auth in the dev profile is normal; in the production profile it is Critical.
Check which one you are looking at before writing.

**Say what's fine.** If every service is properly annotated, lead with that. A
review that finds nothing Critical and says so plainly is a successful review.

## When the user asks for only part of this

If they ask only about security, run the scanner anyway (it's fast and its model
inventory informs the `@restrict` recommendations), but report only the security
sections — and add one line if you noticed something Critical elsewhere. People
asking a narrow question still want to know their app has string-concatenated
SQL.