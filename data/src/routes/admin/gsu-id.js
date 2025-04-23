// Core modules

// External modules
const express = require('express')
const lodash = require('lodash')
const moment = require('moment')
const flash = require('kisapmata')
const { Sequelize } = require('sequelize')

// Core modules

// Modules
const passwordMan = require('../../password-man')
const middlewares = require('../../middlewares')
const googleAdmin = require('../../google-admin')

// Router
let router = express.Router()

router.use('/admin/gsu-id', middlewares.requireAdminUser)

// GSU ID
router.get('/admin/gsuid/all', async (req, res, next) => {
    try {
        let momentDate = (req.query?.date) ? moment(req.query?.date) : moment()
        let s = (req.query?.s) ? `${req.query?.s}`.trim() : ''
        let where = {}
        if (s) {
            if (s.slice(0, 2) === 'id') {
                where = lodash.set(where, 'idNumber', s.slice(2))
            } else {
                // where = {
                //     lastName: ,
                //     createdAt: {
                //         [Sequelize.Op.gte]: momentDate.clone().startOf('day').toDate(),
                //         [Sequelize.Op.lte]: momentDate.clone().endOf('day').toDate(),
                //     }
                // }
                where = lodash.set(where, 'lastName', {
                    [Sequelize.Op.like]: `%${s}%`
                })
            }
        } else {
            if (req.query.date !== '-1') {
                where = lodash.set(where, 'createdAt', {
                    [Sequelize.Op.gte]: momentDate.clone().startOf('day').toDate(),
                    [Sequelize.Op.lte]: momentDate.clone().endOf('day').toDate(),
                })
            }
        }
        // console.log(where)
        let gaccounts = await req.app.locals.db.models.Gsuid.findAll({
            where: where,
            order: [
                ['status', 'ASC'],
                ['createdAt', 'ASC'],
            ]
        })
        let data = {
            momentDate: momentDate,
            prevDate: momentDate.clone().subtract(1, 'day'),
            nextDate: momentDate.clone().add(1, 'day'),
            rows: gaccounts,
            processed: gaccounts.filter(i => i.status === 1),
            unprocessed: gaccounts.filter(i => i.status !== 1),
            s: s,
            flash: flash.get(req, 'gsuid')
        }
        res.render('admin/gsuid/all.html', data);
    } catch (err) {
        next(err);
    }
});


// Delete
router.get('/admin/gsuid/delete/:gsuidId', middlewares.getGsuid(), async (req, res, next) => {
    try {
        let gsuid = res.gsuid
        let data = {
            gsuid: gsuid
        }
        res.render('admin/gsuid/delete.html', data);
    } catch (err) {
        next(err);
    }
});
router.post('/admin/gsuid/delete/:gsuidId', middlewares.getGsuid({ raw: false }), async (req, res, next) => {
    try {
        let gsuid = res.gsuid
        await gsuid.destroy()
        flash.ok(req, 'gsuid', `GSU account request deleted.`)
        res.redirect('/admin/gsuid/all')
    } catch (err) {
        next(err);
    }
});

// Allow GSU account to be created when applied for ID
router.get('/admin/gsuid/process-gsuaccount/:gsuidId', middlewares.antiCsrfCheck, middlewares.getGsuid({ raw: false }), async (req, res, next) => {
    try {
        let gsuid = res.gsuid

        let data = {}
        data.idNumber = gsuid.idNumber
        data.firstName = gsuid.firstName
        data.middleName = gsuid.middleName
        data.lastName = gsuid.lastName

        let found = await req.app.locals.db.models.Gaccount.findOne({
            where: {
                firstName: {
                    [Sequelize.Op.like]: `${data.firstName}`
                },
                middleName: {
                    [Sequelize.Op.like]: `${data.middleName}`
                },
                lastName: {
                    [Sequelize.Op.like]: `${data.lastName}`
                }
            }
        })
        if (found) {
            return res.redirect(`/admin/gaccount/process/${found.id}`)
        }

        let gaccount = req.app.locals.db.models.Gaccount.build({
            uid: `${passwordMan.genPasscode(4)}`,
            accountType: gsuid.accountType,
            idNumber: data.idNumber,
            firstName: data.firstName,
            middleName: data.middleName,
            lastName: data.lastName,
        })
        await gaccount.save()

        res.redirect(`/admin/gaccount/process/${gaccount.id}`)
    } catch (err) {
        next(err);
    }
});

router.get('/admin/gsuid/process/:gsuidId', middlewares.getGsuid({ raw: false }), async (req, res, next) => {
    try {
        let gsuid = res.gsuid

        gsuid.status = 1
        await gsuid.save()

        flash.ok(req, 'gsuid', `GSU ID app. status updated.`)
        res.redirect(`/admin/gsuid/all`)
    } catch (err) {
        next(err);
    }
});
router.get('/admin/gsuid/unprocess/:gsuidId', middlewares.getGsuid({ raw: false }), async (req, res, next) => {
    try {
        let gsuid = res.gsuid

        gsuid.status = 0
        await gsuid.save()

        flash.ok(req, 'gsuid', `GSU ID app. status updated.`)
        res.redirect(`/admin/gsuid/all`)
    } catch (err) {
        next(err);
    }
});

module.exports = router;