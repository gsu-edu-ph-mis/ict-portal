# Auth & RBAC Baseline

**Permissions, Roles, and Users are the minimum models the app requires to
run.** Any new project built on this pattern must have all three — their models,
migrations, and seeders — plus the permission catalog in `core/roles.js`, before
any feature resource will work. When scaffolding a fresh project, create this
baseline first.

## The three models

- **Permission** (`permission.model.js`) — a single `key` string (e.g.
  `product.create`). The full catalog is seeded from `core/roles.js`.
- **Role** (`role.model.js`) — `key`, `name`, `description`, and a `permissions`
  JSON array of permission keys.
- **User** (`user.model.js`) — `username`, `email`, `passwordHash`, `salt`,
  `roles` (JSON array of role keys, e.g. `['sysadmin']`), `active` boolean.

Passwords are never stored plain: a per-user `salt` from `randomString()` and a
`passwordHash` from `hashPassword(password, salt)`, both from `#core/password.man`.

## Permission catalog — `core/roles.js`

Permissions are grouped into exported arrays per role tier and follow a
`resource.action` naming scheme (`readAll`, `create`, `read`, `edit`, `delete`):

```js
export const OWN_ACCOUNT = ['account.readOwn', 'account.editOwnPassword']
export const CASHIER = ['product.readAll', 'product.read', /* cart.* ... */]
export const SYS_ADMIN = [
    'permission.readAll', 'permission.create', /* ... */
    'user.readAll', 'user.create', 'user.read', 'user.edit', 'user.delete',
    'product.readAll', 'product.create', 'product.read', 'product.edit', 'product.delete',
]
export const ALL = [...OWN_ACCOUNT, ...CASHIER, ...SYS_ADMIN]
```

When you add a resource that needs access control, add its
`resource.{readAll,create,read,edit,delete}` permissions to the relevant tier
here, then rebuild the DB so the permissions and roles seeders pick them up.

## Seeding order

Because roles reference the permission catalog and users reference roles, seed in
this order (the timestamps already enforce it): **permissions → roles → users.**
- Permissions seeder inserts every key in `ALL`.
- Roles seeder inserts roles with their `permissions` array (`JSON.stringify`-ed).
- Users seeder inserts users with hashed passwords; it also writes seeded
  credentials to a CSV log for first login.

## Auth middleware — `middleware/auth.middleware.js`

Factory functions returning Express middleware. Apply per route group with
`router.use('/path', requireAuthAdminUser())`:

- `requireAuthUser()` — requires a logged-in, active user (redirects to `/` or
  `/logout` otherwise).
- `requireAuthAdminUser()` — same, and requires `user.roles.includes('sysadmin')`;
  otherwise throws `Not authorized.` Used for `/admin/*`.
- `requireAuthCashierUser()` — for cashier-facing routes; bounces sysadmins to the
  admin area.
- `guardRoute(permissions, condition = 'and')` — fine-grained permission check via
  the `acrb` library (`access.and` / `access.or`) against the user's roles and the
  roles list. Use for per-action gating beyond the coarse role check.

Identity lives in the session: `req.session.authUserId` and `req.session.acsrf`
are set at login (`services/auth.service.js` regenerates the session, stores the
user id, and mints an ACSRF token). `core/middleware/core.middleware.js`
(`perRequestViewVars`) loads the user into `res.locals.user` on every request,
stripped of `passwordHash`/`salt`, and exposes `res.locals.acsrf` to views.

## ACSRF (anti-CSRF) tokens

Every state-changing form must round-trip the session ACSRF token:
- The token is minted at login and available as `res.locals.acsrf` / `{{acsrf}}`.
- Forms include `<input type="hidden" name="acsrf" value="{{acsrf}}">`.
- Validators check it first (`body('acsrf').custom(...).bail({ level: 'request' })`)
  and reject mismatches with a `Security error.`

New create/edit forms and their validators must follow this pattern.
