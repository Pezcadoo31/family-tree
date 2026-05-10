# Database Migrations

This folder contains the SQL migrations that build the Family Tree database schema.

## How to apply

Run each migration in order against your Supabase project, either via:

- The SQL Editor in the Supabase Dashboard
- The Supabase CLI: `supabase db push`

## File naming convention

`YYYYMMDD_NN_description.sql`

- `YYYYMMDD` — date of creation
- `NN` — sequence number within that date
- `description` — short snake_case description

Migrations are executed in alphabetical order, which matches creation order.

## Current migrations

1. **01_create_enums** — Custom enum types for gender and relationship classification
2. **02_create_persons_table** — Main persons table with all biographical fields
3. **03_create_dependent_tables** — relationships, residences, and person_links tables
4. **04_create_triggers** — Auto-update of updated_at columns

## Future migrations (planned)

- `05_add_auth_and_ownership` — Add owner_id columns and RLS policies after enabling Auth
- `06_create_trees_and_members` — Multi-tenant support: trees and tree_members tables
- `07_add_tree_id_columns` — Add tree_id to all data tables