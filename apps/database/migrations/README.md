# Database Migrations

This directory contains SQL migration files for the Crestar Commerce platform.

## How to Run Migrations

Connect to your database and run the SQL files in order:

```bash
psql $DATABASE_URL -f create_admin_logs.sql
```

Or use your preferred database migration tool.

## Available Migrations

### `create_admin_logs.sql`
Creates the `admin_logs` table used by admin endpoints to track administrative actions.

**Required by:**
- `/api/admin/verification`
- `/api/admin/content-moderation`
- `/api/admin/users/promote`
- `/api/admin/support-inbox`

**Columns:**
- `id` — Serial primary key
- `admin_id` — Foreign key to `auth_users.id`
- `action_type` — Type of admin action (e.g., `verification_toggle`, `user_promote`)
- `target_user_id` — User being acted upon (nullable)
- `target_entity_type` — Type of entity (e.g., `user`, `report`)
- `target_entity_id` — UUID of entity (nullable)
- `details` — JSONB for additional context
- `created_at` — Timestamp

## Schema Source

The main database schema is defined in:
- Production database (managed by Neon/Supabase)
- Schema dump available in `/apps/DATABASE_CONFIGURATION_VERIFIED.md`

## Notes

- All migrations are idempotent (`CREATE TABLE IF NOT EXISTS`)
- Run migrations before deploying API changes that depend on them
- Check database user permissions after running migrations
