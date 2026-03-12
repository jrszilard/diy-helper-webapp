---
name: migration-validator
description: Validate Supabase migrations for breaking changes, RLS gaps, and rollback safety before applying
---

# Migration Validator

Checks new Supabase migrations for problems before you apply them.

## How to Use

Specify the migration file to validate. Example: "Validate migration 20260312000000_intent_type_column.sql"

## Validation Checks

### Check 1: Breaking Column Changes

Look for `ALTER TABLE ... DROP COLUMN` or `ALTER TABLE ... ALTER COLUMN ... TYPE`:

1. Read the migration file
2. Extract any column drops or type changes
3. For each affected table.column, Grep across `lib/` and `app/api/` for references to that column name
4. Flag any code that references a dropped or type-changed column

**Output:** List of files that reference the affected column, with line numbers

### Check 2: RLS Policy Coverage

For every `CREATE TABLE` in the migration:

1. Check that `ALTER TABLE <name> ENABLE ROW LEVEL SECURITY` exists
2. Check that at least one `CREATE POLICY` exists for the table
3. If missing, flag as **BLOCKING** — all tables must have RLS

**Pattern to Grep:**
```
ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY
```

### Check 3: Foreign Key Cascade Behavior

For every `REFERENCES` clause:

1. Check `ON DELETE` behavior (CASCADE, RESTRICT, SET NULL, or missing)
2. If `ON DELETE CASCADE` on a table with lots of dependent data, flag as **WARNING**
3. If no `ON DELETE` specified, flag as **WARNING** (defaults to RESTRICT)

### Check 4: Index Coverage

For every foreign key column:

1. Check if an index exists on that column (either in this migration or existing migrations)
2. If no index, flag as **WARNING** — queries filtering by foreign keys will be slow

### Check 5: Rollback Safety

1. Check if the migration is reversible (can be undone with a simple ALTER/DROP)
2. `ADD COLUMN` — reversible (DROP COLUMN)
3. `DROP COLUMN` — **not reversible** (data loss), flag as **WARNING**
4. `ALTER COLUMN TYPE` — may not be reversible, flag as **WARNING**
5. `CREATE TABLE` — reversible (DROP TABLE)

### Check 6: Cross-Reference with Existing Schema

1. Read `supabase/migrations/` directory for all existing migrations
2. Verify the migration doesn't create tables/columns that already exist (unless using IF NOT EXISTS)
3. Verify referenced tables in REFERENCES clauses exist

## Output Format

```
Migration Validation: 20260312000000_intent_type_column.sql
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ No breaking column changes detected
✓ RLS enabled (N/A — no new tables)
✓ No foreign keys (N/A)
✓ Rollback safe (ADD COLUMN is reversible)
⚠ No index on new column (consider if queried frequently)

RESULT: SAFE TO APPLY (1 warning)
```

Severity levels:
- **BLOCKING**: Must fix before applying (missing RLS, breaking code references)
- **WARNING**: Should review but can proceed (missing indexes, cascade concerns)
- **INFO**: Informational note (reversibility, naming conventions)
