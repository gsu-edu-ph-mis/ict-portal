---
name: express-nunjucks-app
description: >
  Build features for Node.js web apps built on Express + Sequelize with
  server-rendered Nunjucks views, session-based auth, role/area-grouped routing,
  and a Vue global build + PrimeVue + Bootstrap frontend (progressive
  enhancement, not a SPA). Use this whenever the user asks to add, edit, or
  scaffold anything in a project of this shape — a new resource, CRUD screens,
  a route, a model, a migration, a service, a validator, or a view — even if
  they don't mention the file layout explicitly. Also use it when placing new
  files anywhere in such a codebase, so they land in the right directory with
  the right naming. Applies whenever a project uses Sequelize migrations under
  database/, dot-namespaced filenames (name.type.js), and role-grouped
  routes/services/views.
---

# Express + Nunjucks App Development

This skill captures the architecture and conventions of a Node.js web app built
on Express, Sequelize, and server-rendered Nunjucks views, so new code matches
the existing codebase instead of drifting into a different style.

Reference files — read the relevant one before working:
- `references/project-structure.md` — directory layout and where each file goes.
- `references/code-patterns.md` — concrete templates for every layer (model,
  migration, seeder, route, service, validator, view). Read this before writing
  code for any layer; match the imports, error handling, and data flow shown.
- `references/auth-and-rbac.md` — the required permissions/roles/users baseline,
  the permission catalog, auth middleware, and the ACSRF token flow.
- `references/adding-a-resource.md` — the end-to-end checklist for a new resource.

The layout and conventions below describe the *pattern*. Confirm the concrete
details against the actual project (its real folder names, roles/areas, and any
project-specific helpers) before assuming — the tree in the reference is a
representative template, not a fixed spec.

## Stack

- **Runtime/modules**: Node.js, ESM (`"type": "module"`), top-level `await` in
  `app.js`. Node subpath imports: `#app/*` → project root, `#core/*` → `core/`.
- **Server**: Express 4, `async/await` throughout (no callback chains). Single
  entry point (`app.js`) with shared globals (`globals.js`). Socket.IO attached
  to the HTTP server. `method-override` provides PATCH/DELETE from forms.
- **ORM**: Sequelize 6, driven by `sequelize-cli` and configured via
  `.sequelizerc` (config in `config/config.cjs`). Dev DB is **SQLite**; `mysql2`
  is available for other environments — don't hardcode a dialect in feature code.
  Models are accessed via `req.app.locals.db.models.<Name>`, never imported
  directly into routes/services.
- **Views**: Nunjucks (`.njk`), server-rendered. Nunjucks env + custom filters
  set up in `core/`.
- **Frontend JS**: Vue global build + PrimeVue (Aura theme), jQuery, Bootstrap.
  Progressive enhancement on rendered HTML — not a SPA. Vue uses custom
  delimiters `['${', '}']` to avoid clashing with Nunjucks `{{ }}`.
- **Auth**: `express-session` with a Sequelize store, session-based identity
  (`req.session.authUserId`), role checks + `acrb` permission library, plus an
  ACSRF token on every form. `bcryptjs` (via `#core/password.man`) for passwords.
  `passport`/JWT deps are present for API/token scenarios.
- **Validation**: `express-validator` (`body`, `validationResult`, `matchedData`).
- **Flash messages**: `kisapmata` (`flash.ok(req, key, msg)` / `flash.get`).
- **Uploads/media**: `multer`, `sharp`, AWS S3 (`@aws-sdk/client-s3`) via `core/`.
- **Config**: YAML at `config/config.yaml` (+ `config.live.yaml` override in
  `live` env), loaded via `core/config.loader.js`; secrets from `.env`.

## Required baseline: permissions, roles, users

**Permissions, Roles, and Users are the minimum models the app needs to run.**
A new project built on this pattern must have all three (models + migrations +
seeders) plus the permission catalog in `core/roles.js` before any feature
resource works. Create this baseline first. Details in
`references/auth-and-rbac.md`.

## Migrations & seeders — DEVELOPMENT WORKFLOW

**Migrations and seeders in this project are development-only, not production
migrations.** This changes the usual rule. The goal is a clean, readable set of
migrations that describes the *current* schema — not an append-only history of
patches.

- **Editing an existing table's schema: edit the original migration in place.**
  Do NOT add a new corrective/"alter" migration for a change to a table that
  already has a migration. Modify that table's original `create-*` migration
  directly.
- **Only create a new migration when adding a completely new model/table.**
  Same for seeders: only add a new seeder for a brand-new model that needs seed
  data.
- **After any schema change, rebuild from scratch.** Because migrations were
  edited in place, re-run the whole set from the beginning:

  ```bash
  npx sequelize-cli db:migrate:undo:all
  npx sequelize-cli db:migrate
  npx sequelize-cli db:seed:undo:all
  npx sequelize-cli db:seed:all
  ```

  (Use the project's actual scripts if it wraps these in `package.json`.)

- Because this drops and recreates everything, it destroys existing data. That
  is acceptable in development; never run this flow against a production
  database. Flag it clearly if there's any doubt about which environment is
  targeted.
- Keep a new model's timestamp ordered *after* the migrations of any tables it
  references, so foreign keys resolve when migrating from the beginning.

## Naming conventions

Match the existing tree exactly.

- **Dot-namespaced filenames** grouping concern + type: `product.route.js`,
  `product.service.js`, `product.model.js`, `product.validator.js`,
  `auth.middleware.js`. Not camelCase or kebab-case filenames.
- **Models** are singular; the loader derives the Sequelize model name from the
  filename by capitalizing dot-parts: `widget.model.js` → `Widget`,
  `stock.transaction.model.js` → `StockTransaction`. Table names are PascalCase
  plural (`Widgets`).
- **Migrations & seeders** are timestamp-prefixed with a kebab-case description:
  `<YYYYMMDDHHMMSS>-create-<name>.js`.
- **Routes, services, and views are grouped by role/area** (e.g. `admin/`,
  `cashier/`) — mirror whatever grouping the project already uses.
- **JavaScript identifiers** use camelCase, with deliberate, consistent object
  property ordering.

## Layered responsibilities

Keep each layer doing its own job.

- **Routes** (`routes/`) wire URLs to handlers, apply middleware, and call
  services. Thin.
- **Services** (`services/`) hold business logic and Sequelize queries; grouped
  by role/area where relevant.
- **Validators** (`validators/`) validate and normalize request input before it
  reaches a service.
- **Models** (`database/models/`) define schema and associations only.
- **Views** (`views/`) render, reusing `layouts/` and `partials/` instead of
  duplicating markup.
- **core/** holds cross-cutting setup (db, sessions, error handling, uploaders,
  string/util helpers). Reach for an existing helper before writing a new one.

## Working style

- Read `references/code-patterns.md` before writing any layer, and
  `references/project-structure.md` before proposing file paths. State the paths
  you intend to create before writing them.
- Access models via `req.app.locals.db.models.<Name>`; wrap writes in
  `req.app.locals.db.instance.transaction(...)`. Never import models directly.
- Every route handler is `try/catch` → `next(err)`. Throw `new Error('… not
  found.')` in services for missing records; the central handler renders it.
- State-changing forms and their validators must round-trip the session ACSRF
  token (see `references/auth-and-rbac.md`).
