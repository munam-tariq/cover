# Identity Hardening Online Migration Design

## Context

The identity hardening migration currently:

- adds `customers.email_normalized` as a stored generated column;
- adds and immediately validates composite foreign keys on existing tables;
- declares an unused `v_email_norm` variable in `merge_customer_identity`;
- omits covering indexes for the new composite foreign keys.

The stored generated column can rewrite `customers`, while immediate foreign-key
validation scans `conversations` and `qualified_leads` while stronger locks are
held than necessary.

Staging has already applied the current hardening migration. Production has not
applied either identity migration.

Read-only production preflight on 2026-07-18 found:

- PostgreSQL 17.6;
- 160 customers, 156 conversations, and 64 qualified leads;
- no active client transactions or waiting locks on the target tables;
- no normalized-email collision groups;
- no conversation/customer or qualified-lead/customer project mismatches;
- no identity tables, columns, or migrations yet.

These sizes make a tracked `apply_migration` rollout preferable to a separate
concurrent-index preflight. A short lock timeout will make unexpected contention
fail safely instead of waiting.

## Goals

1. Avoid the stored generated-column rewrite in production.
2. Preserve case-insensitive email identity and canonical email storage.
3. Add tenant-consistency constraints without blocking normal reads and writes
   during table validation.
4. Add covering indexes for the new foreign keys.
5. Remove the unused `v_email_norm` variable.
6. Reconcile staging to the same final schema as production.
7. Apply changes through Supabase MCP migration history.

## Non-goals

- No production schema mutation in this implementation pass.
- No unrelated Supabase advisor cleanup.
- No change to identity JWT claims, merge precedence, or API contracts.
- No migration-history repair between local filenames and MCP-generated remote
  versions.

## Schema Design

### Email normalization

The production migration will not create `email_normalized`.

A `BEFORE INSERT OR UPDATE OF email` trigger will canonicalize email values with:

```sql
lower(nullif(btrim(email), ''))
```

Before enabling the trigger and relying on the existing
`idx_customers_project_email_unique` index, the migration will:

1. null only later duplicate rows per normalized `(project_id, email)`;
2. normalize remaining existing email values in place;
3. install the trigger for future writes.

This preserves the existing unique index, avoids a table rewrite, and keeps
identity lookups simple. `merge_customer_identity` will compare the canonical
`customers.email` value directly with `v_lock_email`.

The staging reconciliation will perform the same normalization, recreate
`idx_customers_project_email_unique`, replace the RPC, then drop the obsolete
generated column. Dropping the column also removes its dependent old normalized
index.

### Tenant consistency

`customers(id, project_id)` remains the unique target for composite foreign
keys.

The following foreign keys will be added as `NOT VALID` when absent:

- `customers.merged_into_customer_id -> customers.id`;
- `customer_identities(customer_id, project_id) -> customers(id, project_id)`;
- `conversations(customer_id, project_id) -> customers(id, project_id)`;
- `qualified_leads(customer_id, project_id) -> customers(id, project_id)`.

Each constraint will then be validated explicitly. PostgreSQL validation scans
existing rows but permits ordinary reads and writes, avoiding the blocking
behavior of immediate validation during `ADD CONSTRAINT`.

The migration will create covering indexes for:

- `customers(merged_into_customer_id)`;
- `customer_identities(customer_id, project_id)`;
- `conversations(customer_id, project_id)`;
- `qualified_leads(customer_id, project_id)`.

### Migration timeouts

Each tracked migration will set:

```sql
set local lock_timeout = '3s';
set local statement_timeout = '120s';
```

If an unexpected transaction prevents a metadata lock, the MCP migration rolls
back instead of queueing and amplifying an outage.

## Migration Files

### Rewrite the unapplied production migration

`20260717120000_identity_hardening.sql` will be rewritten so fresh environments
and production:

- use a normal email trigger instead of a stored generated column;
- normalize existing values without rewriting the table definition;
- add foreign keys through idempotent `NOT VALID` blocks;
- validate constraints explicitly;
- add covering indexes;
- define the merge RPC without `v_email_norm`.

The migration remains self-contained for local database resets.

### Add a forward staging reconciliation

A new migration created with `supabase migration new` will:

- safely no-op on the rewritten production result;
- normalize existing staging emails and install the trigger;
- restore the canonical email unique index;
- add any missing covering indexes and constraints;
- replace `merge_customer_identity` without the dead variable and generated
  column dependency;
- conditionally drop staging's obsolete `email_normalized` column;
- validate all identity constraints.

Only this forward migration will be applied to staging because staging already
contains the old hardening migration.

## Application Sequence

### Staging now

1. Run local migration regression tests.
2. Apply the reconciliation SQL with `frontface_staging.apply_migration`.
3. Verify columns, triggers, indexes, constraints, RPC definition, collision
   counts, and tenant mismatches with read-only SQL.
4. Re-run Supabase security and performance advisors.
5. Regenerate database TypeScript types and preserve the hand-maintained alias
   section.

### Production later

1. Re-run the read-only size, transaction, collision, and mismatch preflight.
2. Apply `customer_identity_verification`.
3. Apply the rewritten `identity_hardening`.
4. Apply the forward reconciliation migration.
5. Verify the same schema and data invariants before deploying identity-enabled
   application code.

If the production preflight changes materially—large table growth, active long
transactions, or lock pressure—the rollout will stop and switch to concurrent
index preflight rather than forcing the tracked migration through.

## Testing

Source-based migration tests will fail before implementation and assert that:

- the production migration contains no stored generated email column;
- normalization is enforced by a trigger;
- `v_email_norm` is absent;
- the RPC uses canonical `customers.email`;
- foreign keys are introduced as `NOT VALID` and explicitly validated;
- covering indexes and migration timeouts exist;
- the reconciliation migration removes the obsolete staging column
  conditionally.

After staging application, read-only verification will assert:

- `customers.email_normalized` is absent;
- no normalized-email collisions exist;
- all identity constraints are validated;
- all covering indexes exist and are valid;
- the RPC contains no `v_email_norm` reference;
- no cross-project customer references exist.

## Rollback and Failure Behavior

Supabase MCP `apply_migration` is transactional. Any statement failure rolls
back that migration and does not record it.

The short lock timeout protects availability. If staging application fails:

- inspect the exact error and current schema;
- correct the forward migration locally;
- apply a new migration name rather than mutating recorded history.

Production will not be modified until staging verification is complete.
