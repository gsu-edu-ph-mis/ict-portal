# Project Structure

A representative directory layout for this stack. Real projects vary in the
exact resource names and role/area groupings — treat the specific names here
(products, admin, cashier) as *examples* of the pattern, and confirm the
project's actual names before placing files. What's fixed is the shape:
role-grouped `routes/services/views`, dot-namespaced filenames, and Sequelize
under `database/`.

## Table of contents
- Top-level layout
- Where new files go (quick lookup)
- core/ — cross-cutting setup
- database/ — Sequelize migrations, models, seeders
- routes/ and services/ — role/area-grouped
- views/ — Nunjucks templates
- public/ — static assets

## Top-level layout

```
project-root/
├── config/                       # app config (e.g. config.yaml)
├── core/                         # cross-cutting setup & helpers
├── database/
│   ├── migrations/               # schema (edited in place in dev — see SKILL.md)
│   ├── models/                   # Sequelize models (singular names)
│   └── seeders/                  # seed data
├── middleware/                   # express middleware
├── public/                       # static assets (css, js, fonts, images)
├── routes/                       # url -> handler, grouped by role/area
├── services/                     # business logic & queries, grouped by role/area
├── validators/                   # request input validation
├── views/                        # nunjucks templates
├── tests/
├── uploads/                      # local upload staging
├── .gitignore
├── .sequelizerc                  # tells sequelize-cli where things live
├── app.js                        # express entry point
├── globals.js                    # shared globals
├── jsconfig.json
└── package.json
```

## Where new files go (quick lookup)

| You're adding...            | Put it here                                             |
|-----------------------------|---------------------------------------------------------|
| A brand-new table/model     | new `database/migrations/<timestamp>-create-<name>.js`  |
| A change to an existing table | edit that table's original `create-*` migration (dev)  |
| A model                     | `database/models/<name>.model.js` (singular)            |
| Seed data (new model)       | `database/seeders/<timestamp>-<name>-seeder.js`         |
| Business logic / queries    | `services/<area>/<name>.service.js`                     |
| Input validation            | `validators/<name>.validator.js`                        |
| A route group               | `routes/<area>/<name>.route.js`                         |
| CRUD screens for a resource | `views/<area>/<resource>/{index,show,create,edit,delete}.njk` |
| Reusable markup             | `views/partials/<name>.njk`                             |
| A page layout               | `views/layouts/<name>.njk`                              |
| Shared helper / setup       | `core/<name>.<concern>.js`                              |
| Express middleware          | `middleware/<name>.middleware.js`                       |
| Static JS/CSS/font/image    | `public/{js,css,fonts,images}/`                         |

## core/ — cross-cutting setup

Typical helpers found here (names vary by project):

```
core/
├── config.loader.js       # loads the config file
├── database.js            # sequelize connection
├── error.handler.js       # central error handling
├── errors.js              # custom error classes
├── middlewares.js         # shared middleware registration
├── nunjucks.env.js        # nunjucks environment setup
├── nunjucks.filters.js    # custom template filters
├── password.man.js        # password hashing/verification
├── roles.js               # role/permission definitions
├── routes.js              # route registration
├── session.js             # session config
├── upload.js / uploader.js / aws-s3-client.js  # upload handling
├── string.helpers.js
└── util.js
```

Check here for an existing helper (hashing, string utils, upload handling,
error classes) before writing a new one.

## database/ — Sequelize

```
database/
├── migrations/            # timestamp-prefixed, kebab-case description
│   ├── <ts>-create-permissions.js
│   ├── <ts>-create-roles.js
│   ├── <ts>-create-users.js
│   ├── <ts>-create-products.js
│   └── <ts>-create-<join-table>.js   # for many-to-many relations
├── models/                # singular, <name>.model.js
│   ├── permission.model.js
│   ├── role.model.js
│   ├── user.model.js
│   ├── product.model.js
│   └── <join>.model.js               # join model for M:N
└── seeders/               # timestamp-prefixed
    ├── <ts>-permissions-seeder.js
    ├── <ts>-roles-seeder.js
    └── <ts>-users-seeder.js
```

**Many-to-many** relations use an explicit join table + join model (e.g. a
`create-<a>-<b>.js` migration and matching `<a>.<b>.model.js`) rather than
embedded arrays. Reuse this pattern for new join tables.

**Migration edits are done in place during development** — see the
"Migrations & seeders" section in SKILL.md. Only a brand-new model gets a new
migration/seeder; everything else is edited into the original and the whole set
is re-run from the beginning.

## routes/ and services/ — role/area-grouped

```
routes/
├── admin/
│   ├── product.route.js
│   └── user.route.js
├── cashier/
│   └── product.route.js
└── public.route.js

services/
├── admin/
│   └── product.service.js
└── auth.service.js
```

A resource that appears for more than one role gets a route file per role,
scoped by that role's permissions.

## views/ — Nunjucks

```
views/
├── admin/
│   └── <resource>/        # index, show, create, edit, delete
├── cashier/
│   └── <resource>/
├── layouts/
│   ├── app.njk            # main authenticated layout
│   ├── email.njk
│   └── public.njk
├── partials/
│   ├── flash.njk          # flash message rendering
│   ├── pagination.njk     # reuse for any paginated list
│   ├── sidebar.njk        # nav — add new links here
│   └── ...
├── error.njk
├── home.njk
└── login.njk
```

Each resource folder uses the same action set: `index.njk` (list), `show.njk`
(detail), `create.njk`, `edit.njk`, `delete.njk`. New resources provide the
same set, extend the correct layout, and reuse `partials/pagination.njk` and
`partials/flash.njk`.

## public/ — static assets

```
public/
├── css/     # bootstrap + app styles
├── fonts/
├── images/
├── js/      # vue global build, primevue, jquery, plus app scripts
└── favicon
```

Prefer existing frontend libraries (Vue global build, PrimeVue, jQuery,
Bootstrap, and whatever else is already vendored in `public/js`) over adding new
dependencies.
