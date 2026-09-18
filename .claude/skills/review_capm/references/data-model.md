# Data model review: normalization, associations, compositions

## Associations vs compositions — the distinction that drives most findings

An **Association** is a reference to something with an independent life. A
**Composition** is containment: the target exists only as part of the parent,
is created and deleted with it, and is served as a single deep document.

Getting this wrong is the most common structural defect in CAP models, and it
shows up in two directions:

**Composition used where Association belongs.** `Order.customer : Composition of
Customers` means deleting an order deletes the customer. Deep-insert on the
order will also *create* customers. Symptom to look for: a composition pointing
at a master-data or shared entity (Customers, Products, Currencies, Employees) —
anything referenced by more than one parent.

**Association used where Composition belongs.** `Order.items : Association to
many OrderItems` gives you no cascade delete, no deep insert, and no draft
support for the item table. The application then compensates with custom
handlers that delete children manually in `before('DELETE')` — if you see that
handler, the model is telling you it wanted a Composition. Symptom: a child
entity that only ever appears under one parent, has no independent service
exposure, and whose name reads like a part (`Items`, `Lines`, `Positions`,
`Attachments`, `Texts`).

Checks on the composition side:
- **Backlink shape.** `Composition of many X on X.parent = $self` is the
  standard. A composition of many with no `on` condition is managed by CAP and
  fine for new models, but mixing styles across sibling entities is a
  consistency smell worth noting.
- **Child exposed independently.** A composition target also projected as a
  top-level entity in a service creates two write paths into the same rows, and
  the standalone path skips the parent's authorization. Flag it as both a
  modelling and a security finding.
- **Drafts.** `@odata.draft.enabled` belongs on the composition **root** only.
  On a child it is an error; missing on the root while a Fiori Elements app
  edits the document means no draft handling at all.
- **Cascade depth.** Deep composition trees (3+ levels) with large children make
  `DELETE` and deep-read expensive. Note it where the child table is high-volume.

Checks on the association side:
- **Managed vs unmanaged.** `author : Association to Authors;` is managed — CAP
  generates the `author_ID` foreign key. An explicit `on` condition
  (`on author.ID = author_ID`) plus a hand-declared `author_ID` field is
  unmanaged and usually unnecessary; it is only needed for non-key joins or
  multi-field keys. Redundant unmanaged associations are a simplification
  opportunity.
- **`to many` without `on`.** A `to many` association needs a backlink `on`
  condition; without one the model is incomplete.
- **Missing inverse.** Not required, but an association traversed in both
  directions by the UI or handlers with only one side declared forces manual
  queries.
- **`@assert.target`.** Managed associations do **not** enforce referential
  integrity by default. If the FK must point at an existing row, either
  `@assert.target` or `cds.features.assert_integrity` should be in play. Absence
  on a business-critical reference is a real data-quality finding.

## Normalization

Apply ordinary relational reasoning, then temper it with what CAP and HANA
actually reward.

**1NF — repeating groups.** Fields like `phone1`, `phone2`, `phone3`, or
`tags : String` holding a comma-separated list. Should be a composition of many.

**2NF — partial dependency on a composite key.** In an entity keyed on
`(orderID, itemNo)`, a field like `orderDate` depends only on `orderID`. Move it
to the parent.

**3NF — transitive dependency.** The classic CAP instance: an entity has
`author : Association to Authors` **and** an `authorName : String` copied
alongside it. Two sources of truth that will diverge. Three legitimate reasons
to keep it, which you should check for before flagging:
- it is a deliberate **historical snapshot** (the price on an invoice line must
  not change when the product price changes) — correct, but should be named and
  commented as such (`priceAtOrder`);
- it is a **calculated element** (`virtual` or `= author.name`), which is
  computed not stored — fine;
- it is materialized for **search/sort performance** on a large table, where
  OData `$orderby` across an association is slow — defensible, but it needs a
  handler or DB trigger keeping it in sync, and you should check that it exists.

If none of the three apply, it is duplication. Recommend a calculated element or
an expand.

**Keys.** Every persisted entity needs a key. A field named `ID` without the
`key` modifier is a silent defect — CAP will complain at compile time for most
cases but projections and `@cds.persistence.skip` can hide it. Prefer `cuid`
(UUID) over natural or numeric keys for anything replicated or distributed;
natural keys (`code : String(3)` for currencies) are fine for stable code lists,
where the `sap.common.CodeList` aspect is the idiomatic choice.

**Aspects.** `managed` (createdAt/By, modifiedAt/By) is close to free and almost
always wanted on business entities; its absence on entities that are edited is
worth a recommendation. `temporal` for time-slice data. `cuid` for UUID keys.
Hand-rolled `createdAt : Timestamp` fields instead of `managed` are a
reinvention worth flagging.

**Type hygiene.**
- `String` with no length becomes `NVARCHAR(5000)` on HANA — wasteful on wide
  tables and blocks some index use. Specify lengths.
- `Double` for money is a correctness bug. Use `Decimal(p, s)`, and pair amounts
  with a currency (`Currency` from `@sap/cds/common`) and quantities with a UoM.
- `DateTime` vs `Timestamp`: `DateTime` drops sub-second precision. For audit
  trails use `Timestamp`.
- Free-text status/type fields where a `CodeList` or enum belongs.
- Localized text (`localized String`) missing on user-facing descriptions in a
  multi-language app.

**Over-normalization.** The opposite failure exists: a code list split into five
tables that are always read together, or an entity decomposed so far that every
list view needs six expands. On HANA column store, a wide-ish entity often
outperforms a join-heavy one. If the model reads as academically pure but every
service projection re-joins the same four entities, say so.

## Persistence and performance concerns worth reporting

- **Indexes.** Large entities filtered or sorted on non-key fields with no
  `@cds.persistence.index` / `technical configuration { index ... }`.
- **Unique constraints.** Business keys (order number, email) that must be
  unique but have only `@assert.unique` missing or no DB-level constraint.
- **Views on views.** Projections layered three or four deep compile into nested
  SQL views that HANA may not flatten well.
- **`@cds.persistence.skip` / `@cds.persistence.exists`** on entities that other
  entities have associations to — the FK will point at nothing.
- **Missing `@readonly`** on entities that are analytical/derived.
- **Wide `select *` projections** (`as projection on X` with no column list)
  exposing internal or sensitive columns — a modelling and a security finding.
  Explicit column lists are also self-documenting.

## How to present model findings

Group by entity, not by rule. A reader fixing `Books` wants every issue with
`Books` in one place. For each, give the current shape, the problem in one
sentence, and the corrected CDS snippet — a diff-sized snippet, not a rewrite of
the whole file.