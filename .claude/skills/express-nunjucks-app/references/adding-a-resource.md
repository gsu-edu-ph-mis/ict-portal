# Adding a New CRUD Resource

The end-to-end checklist for adding a resource so it matches existing ones.
Uses "supplier" / "suppliers" as a running example — substitute the real name
and the project's actual role/area folders.

Before starting, read the most complete existing resource end-to-end (its
model, route, service, validator, and views) and mirror it: match its
pagination, error handling, flash messages, and response shape rather than
inventing new patterns.

## Checklist

1. **Migration** — a *new* migration only because this is a brand-new table:
   `database/migrations/<YYYYMMDDHHMMSS>-create-suppliers.js`
   - Define the table with `up`/`down`, including foreign keys and indexes.
   - Order the timestamp *after* any table it references, so foreign keys
     resolve when migrating from the beginning.
   - Many-to-many? Add a separate join-table migration + join model.
   - (Reminder: this is a new-model case. For changes to a table that already
     has a migration, do NOT add a migration here — see "Schema changes" below.)

2. **Model** — `database/models/supplier.model.js` (singular filename)
   - Define columns and wire relations in the associations block
     (`hasMany`, `belongsTo`, `belongsToMany` through a join model).

3. **Seeder (optional)** — new seeder only if this new model needs default rows:
   `database/seeders/<timestamp>-suppliers-seeder.js`

4. **Validator** — `validators/supplier.validator.js`
   - Validate/normalize create and update payloads, mirroring an existing
     validator.

5. **Service** — `services/<area>/supplier.service.js`
   - All Sequelize queries and business logic: list (with pagination),
     findById, create, update, delete. Keep the route thin.

6. **Route** — `routes/<area>/supplier.route.js`
   - Wire URLs to handlers, apply auth middleware with the right
     role/permission, call the service, render the matching view.
   - Add a per-role file if more than one role needs it.
   - Register the route wherever routes are wired (e.g. `core/routes.js`).

7. **Views** — `views/<area>/suppliers/`
   - Full action set: `index.njk`, `show.njk`, `create.njk`, `edit.njk`,
     `delete.njk`. Extend the main layout; reuse `partials/pagination.njk` and
     `partials/flash.njk`.

8. **Navigation** — add a link in the sidebar partial(s) for the relevant roles.

9. **Permissions** — if access is permission-gated, add the new permission to
   the permissions seeder / roles definition and assign it to the relevant
   roles.

10. **Rebuild the database** — because seeders/permissions changed, re-run the
    full migrate + seed flow from the beginning (see below).

## Schema changes (development workflow)

Migrations here are **development-only**, so the rule is different from
production:

- **Changing an existing table** (add/drop/rename a column, tweak a type or
  index): **edit that table's original `create-*` migration in place.** Do NOT
  add a new "alter" migration.
- **New table**: create a new migration (and a new seeder if it needs data) —
  step 1 above.
- **After any change, rebuild from scratch** so the edited migrations take
  effect from the beginning:

  ```bash
  npx sequelize-cli db:migrate:undo:all
  npx sequelize-cli db:migrate
  npx sequelize-cli db:seed:undo:all
  npx sequelize-cli db:seed:all
  ```

  Use the project's own npm scripts if it wraps these. This drops and recreates
  everything and destroys existing data — fine in development, never against a
  production database. Confirm the environment if there's any doubt.

## Order of operations

Data layer first (migration → model → seeder), then logic (validator →
service), then delivery (route → views → sidebar → permissions), then rebuild
the database. State the full list of file paths you intend to create before
writing them, so the user can confirm the resource name and role scope.

## Common pitfalls

- Don't add an "alter" migration for an existing table — edit its original
  migration and re-run from the beginning.
- Don't run the rebuild flow against production data.
- Don't pick a new-model timestamp that sorts before the tables it references.
- Don't put queries in routes or business logic in views.
- Keep filenames dot-namespaced and models singular.
