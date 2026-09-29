# Code Patterns

Concrete templates distilled from the codebase. Match these shapes — imports,
error handling, and data flow — when adding new code. Substitute the example
resource (`Widget` / `widget` / `widgets`) with the real name.

## Module system & imports

- ESM everywhere (`"type": "module"`). Top-level `await` is used in `app.js`.
- Node subpath imports are configured in `package.json`:
  - `#app/*` → project root (`./*.js`), e.g. `#app/middleware/auth.middleware`,
    `#app/services/admin/widget.service`, `#app/validators/widget.validator`.
  - `#core/*` → `./core/*.js`, e.g. `#core/errors`, `#core/password.man`,
    `#core/roles`.
- Import order convention, with comment headers: Core modules → External
  modules → Local modules.

## Database access

- **Never import models directly in routes/services.** Access them through
  `req.app.locals.db.models.<ModelName>` and the instance via
  `req.app.locals.db.instance`.
- Wrap writes in a transaction:
  `await req.app.locals.db.instance.transaction(async (t) => { ... }, { transaction: t })`.
- Model name is derived from the filename: dot-parts are capitalized and joined,
  so `stock.transaction.model.js` → `StockTransaction`, `widget.model.js` →
  `Widget`. Files starting with `_` or `.` are skipped by the loader.
- Dev DB is SQLite; `mysql2` is available for other environments. Don't hardcode
  a dialect in feature code.

## Model — `database/models/widget.model.js`

```js
import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
    class _Model extends Model {
        static associate(models) {
            // define associations here, e.g.
            // _Model.belongsTo(models.Brand, { foreignKey: 'brandId' })
        }
    }

    const modelName = 'Widget';

    _Model.init(
        {
            id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
            description: { type: DataTypes.STRING(255), allowNull: false },
            price: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0.00 },
        },
        { sequelize, modelName, timestamps: true }
    );

    return _Model;
};
```

Notes: `associate()` is called after all models load. `id` is BIGINT/INTEGER
autoIncrement. Money uses `DECIMAL(12,2)`. Associations belong here only.

## Migration — `database/migrations/<ts>-create-widgets.js`

Table names are **PascalCase plural**. Always include explicit `createdAt` /
`updatedAt`. See SKILL.md for the dev-only "edit in place + rebuild" workflow.

```js
export default {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('Widgets', {
            id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true, allowNull: false },
            description: { type: Sequelize.STRING(255), allowNull: false },
            price: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0.00 },
            createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
            updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
        });
    },
    async down(queryInterface) {
        await queryInterface.dropTable('Widgets');
    },
};
```

## Seeder — `database/seeders/<ts>-widgets-seeder.js`

Use the `truncateTable` helper (dialect-aware, resets auto-increment) from
`#app/core/database` in `down` (and often at the top of `up`).

```js
import { truncateTable } from '#app/core/database';

const TABLE_NAME = 'Widgets';

const ROWS = [ /* ...plain objects with createdAt/updatedAt: new Date() ... */ ];

export default {
    async up(queryInterface) {
        await truncateTable(queryInterface, TABLE_NAME);
        await queryInterface.bulkInsert(TABLE_NAME, ROWS);
    },
    async down(queryInterface) {
        await truncateTable(queryInterface, TABLE_NAME);
        await queryInterface.bulkDelete(TABLE_NAME, null, {});
    },
};
```

JSON columns must be `JSON.stringify`-ed before `bulkInsert` (see how roles/users
seed `permissions` and `roles`).

## Route — `routes/admin/widget.route.js`

RESTful, one `express.Router()` per resource. Gate the whole group with an auth
middleware via `router.use(...)`. Numeric ids use the `:id(\\d+)` constraint.
`PATCH`/`DELETE` come through `method-override` (`_method`). Every handler is
`try/catch` → `next(err)`. Flash uses `kisapmata`. A `?json` query returns JSON
instead of rendering (handy for debugging).

```js
import express from 'express'
import { matchedData } from 'express-validator'
import flash from 'kisapmata'

import { requireAuthAdminUser } from '#app/middleware/auth.middleware'
import { widgetValidator, widgetUpdateValidator } from '#app/validators/widget.validator'
import { store as storeWidget, edit as editWidget, update as updateWidget } from '#app/services/admin/widget.service'

const router = express.Router()

router.use('/admin/widgets', requireAuthAdminUser())

router.get('/admin/widgets', async (req, res, next) => {
    try {
        const widgets = await req.app.locals.db.models.Widget.findAll({ where: {} })
        const data = { widgets }
        if (req.query?.json) return res.json(data)
        res.render('admin/widgets/index.njk', data)
    } catch (err) { next(err) }
})

router.get('/admin/widgets/new', async (req, res, next) => {
    try {
        res.render('admin/widgets/create.njk', { acsrf: req.session.acsrf })
    } catch (err) { next(err) }
})

router.post('/admin/widgets',
    widgetValidator,
    async (req, res, next) => {
        try {
            const data = matchedData(req)
            await storeWidget(req, res, data)
            flash.ok(req, 'widget', 'Widget added.')
            res.redirect('/admin/widgets')
        } catch (err) { next(err) }
    })

router.get('/admin/widgets/:id(\\d+)/edit', async (req, res, next) => {
    try {
        const data = await editWidget(req, res)
        res.render('admin/widgets/edit.njk', { ...data, acsrf: req.session.acsrf })
    } catch (err) { next(err) }
})

router.patch('/admin/widgets/:id(\\d+)',
    widgetUpdateValidator,
    async (req, res, next) => {
        try {
            const data = matchedData(req)
            await updateWidget(req, res, data)
            flash.ok(req, 'widget', 'Widget updated.')
            res.redirect('/admin/widgets')
        } catch (err) { next(err) }
    })

export default router
```

Routes are auto-registered by `#core/routes` scanning the `routes/` dir — a new
`*.route.js` that `export default`s a router is picked up without manual wiring.

## Service — `services/admin/widget.service.js`

Named exports following the `index / create / store / edit / update / show`
convention. Business logic and all Sequelize queries live here. Return plain
objects for the route to render. On missing records, `throw new Error('… not found.')`.

```js
import moment from 'moment'

export async function store(req, res, data) {
    await req.app.locals.db.instance.transaction(async (t) => {
        await req.app.locals.db.models.Widget.create({
            description: data.description,
            price: data.price,
        }, { transaction: t })
    })
}

export async function edit(req, _res) {
    const widget = await req.app.locals.db.models.Widget.findByPk(req.params.id)
    if (!widget) throw new Error('Widget not found.')
    const plain = widget.get({ plain: true })
    return { widget: plain, autoFillData: plain }
}

export async function update(req, _res, data) {
    const widget = await req.app.locals.db.models.Widget.findByPk(req.params.id)
    if (!widget) throw new Error('Widget not found.')
    await req.app.locals.db.instance.transaction(async (t) => {
        await widget.update({ description: data.description, price: data.price }, { transaction: t })
    })
}
```

## Validator — `validators/widget.validator.js`

`express-validator` chains. **Every write validates the ACSRF token first** with
`.bail({ level: 'request' })`. The terminal middleware, on failure, formats
errors with `errorFormatter` from `#core/errors` and **re-renders the same form
view** with `formError`, `fieldErrors`, `autoFillData: req.body`, and a fresh
`acsrf`. Export a create validator and an update validator.

```js
import { body, validationResult } from 'express-validator'
import { errorFormatter } from '#core/errors'
import { create as createWidget, edit as editWidget } from '#app/services/admin/widget.service'

const rules = [
  body('acsrf').custom(async (acsrf, { req }) => {
      if (acsrf !== req?.session?.acsrf) throw new Error('Security error.')
      return true
    }).bail({ level: 'request' }),
  body('description').notEmpty().withMessage('Required.').isLength({ min: 2, max: 50 }),
  body('price').notEmpty().withMessage('Required.').isFloat({ gt: 0.00 }).withMessage('Must be greater than 0.00'),
]

export const widgetValidator = [
  ...rules,
  async (req, res, next) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        const { formError, fieldErrors } = errorFormatter(errors)
        const defaultData = await createWidget(req, res)
        return res.render('admin/widgets/create.njk', {
          ...defaultData, formError, fieldErrors,
          autoFillData: req.body, acsrf: req.session.acsrf,
        })
      }
      next()
    } catch (err) { next(err) }
  }
]
```

## View — `views/admin/widgets/create.njk`

Extends `layouts/app.njk`, includes `partials/flash.njk`, puts the ACSRF token in
a hidden input, and (when interactive) mounts a Vue app in `{% block scripts %}`.

Critical Vue detail: the app uses **custom delimiters `['${', '}']`** so Vue's
interpolation doesn't collide with Nunjucks `{{ }}`. Server data is injected with
`{{ value | default([], true) | stringify | safe }}`. Mixins come from
`window.VueHelpersMixin`; PrimeVue components are registered on the app.

```njk
{% extends "layouts/app.njk" %}
{% block body %}
<div id="app" v-cloak class="col-md-12 pt-3">
    {% include 'partials/flash.njk' %}
    <form method="POST" action="/admin/widgets">
        <input type="hidden" name="acsrf" value="{{acsrf}}">
        <div class="form-group" v-bind:data-error="hasFieldError('description')" v-on:click="clearFieldError('description')">
            <input name="description" class="form-control" v-model="description">
            <div v-if="fieldErrors?.description?.msg" class="invalid-feedback">${fieldErrors?.description?.msg}</div>
        </div>
        <button type="submit" class="btn btn-win">Save Widget</button>
    </form>
</div>
{% endblock %}
{% block scripts %}
{{ super() }}
<script src="{{app.url}}/js/vue-helpers.js"></script>
<script type="module">
    const { createApp } = Vue;
    const app = createApp({
        delimiters: ['${', '}'],
        mixins: [window.VueHelpersMixin.errorHandling, window.VueHelpersMixin.textHelpers],
        data() {
            return {
                fieldErrors: {{fieldErrors|default({}, true)|stringify|safe}},
                description: `{{autoFillData.description}}`,
            };
        },
    });
    app.use(PrimeVue.Config, { theme: { preset: PrimeUIX.Themes.Aura } });
    app.mount('#app');
</script>
{% endblock %}
```

For a `PATCH`/`DELETE` form, add `method="POST"` plus a
`<input type="hidden" name="_method" value="PATCH">` (method-override).

## Error handling

`core/error.handler.js` default-exports `[notFoundHandler, errorHandler]`,
mounted **last** in `app.js`. Both are JSON-aware (`req.is('application/json')`)
and otherwise render `error.njk`. Throwing inside a route/service and calling
`next(err)` routes into this handler. For richer errors use `AppError` from
`#core/errors` (`new AppError(message, id, data)`; the message is also on `.msg`).
`errorFormatter(validationResult)` returns `{ formError, fieldErrors }` for forms.
