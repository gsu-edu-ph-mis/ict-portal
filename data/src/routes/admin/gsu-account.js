//// Core modules

//// External modules
const express = require('express')
const lodash = require('lodash')
const moment = require('moment')
const flash = require('kisapmata')
const { Sequelize } = require('sequelize')

//// Core modules

//// Modules
const passwordMan = require('../../password-man')
const middlewares = require('../../middlewares')
const googleAdmin = require('../../google-admin')

// Router
let router = express.Router()

router.use('/admin/gaccount', middlewares.requireAdminUser)

//// Google/GSU Account
router.get('/admin/gaccount/all', async (req, res, next) => {
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
        let gaccounts = await req.app.locals.db.models.Gaccount.findAll({
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
            processedCount: gaccounts.filter(i => i.status === 1).length,
            unprocessedCount: gaccounts.filter(i => i.status !== 1).length,
            s: s,
            flash: flash.get(req, 'gaccount')
        }
        res.render('admin/gaccount/all.html', data);
    } catch (err) {
        next(err);
    }
});


// Delete
router.get('/admin/gaccount/delete/:gaccountId', middlewares.getGaccount(), async (req, res, next) => {
    try {
        let gaccount = res.gaccount
        let data = {
            gaccount: gaccount
        }
        res.render('admin/gaccount/delete.html', data);
    } catch (err) {
        next(err);
    }
});
router.post('/admin/gaccount/delete/:gaccountId', middlewares.getGaccount({ raw: false }), async (req, res, next) => {
    try {
        let gaccount = res.gaccount
        await gaccount.destroy()
        flash.ok(req, 'gaccount', `GSU account request deleted.`)
        res.redirect('/admin/gaccount/all')
    } catch (err) {
        next(err);
    }
});

// process
router.get('/admin/gaccount/process/:gaccountId', middlewares.getGaccount(), async (req, res, next) => {
    try {
        let gaccount = res.gaccount
        if (gaccount.status !== 1) {
            gaccount.gsumail = `${gaccount.firstName.toLowerCase()}.${gaccount.lastName.toLowerCase()}@gsu.edu.ph`.replace('ñ', 'n').replace(/ /g, '') // remove spaces ñ
            gaccount.password = passwordMan.genPassphrase(4)
        }

        if (ENV !== 'dev') {
            let userPresence = await googleAdmin.checkUser(gaccount.gsumail)
            if (userPresence) {
                flash.error(req, 'gaccount', `${gaccount.gsumail} is already taken. Please use a different GSU Email Address.`)
            }
        }
        let data = {
            flash: flash.get(req, 'gaccount'),
            gaccount: gaccount,
            password: req.query?.password
        }
        // return res.send(data)
        res.render('admin/gaccount/process.html', data);
    } catch (err) {
        next(err);
    }
});
router.post('/admin/gaccount/process/:gaccountId', middlewares.getGaccount({ raw: false }), async (req, res, next) => {
    try {
        let gaccount = res.gaccount
        let body = req.body

        let orgUnitPath = '/Student'
        if (body.accountType == 'Faculty') {
            orgUnitPath = '/Employee';
        } else if (body.accountType == 'Staff') {
            orgUnitPath = '/Employee';
        } else if (body.accountType == 'Office') {
            orgUnitPath = '/Offices';
        }

        const user = {
            primaryEmail: body.gsumail,
            name: {
                givenName: body.firstName,
                familyName: body.lastName,
            },
            password: body.password, // Ensure the password meets Google Workspace requirements
            changePasswordAtNextLogin: false,
            orgUnitPath: orgUnitPath
        };
        if (ENV !== 'dev') {
            await googleAdmin.createUser(user)
        }
        gaccount.accountType = body.accountType
        gaccount.idNumber = body.idNumber
        gaccount.firstName = body.firstName
        gaccount.middleName = body.middleName
        gaccount.lastName = body.lastName
        gaccount.gsumail = body.gsumail
        gaccount.status = 1
        await gaccount.save()

        flash.ok(req, 'gaccount', `GSU account created.`)
        res.redirect(`/admin/gaccount/process/${gaccount.id}?password=${body.password}`)
    } catch (err) {
        next(err);
    }
});

module.exports = router;