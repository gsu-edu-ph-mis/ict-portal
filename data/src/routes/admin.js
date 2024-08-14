//// Core modules

//// External modules
const express = require('express')
const lodash = require('lodash')
const moment = require('moment')
const flash = require('kisapmata')
const { Sequelize } = require('sequelize')
const qr = require('qr-image')
const sharp = require('sharp')

//// Core modules

//// Modules
const passwordMan = require('../password-man')
const middlewares = require('../middlewares')
const googleAdmin = require('../google-admin')

// Router
let router = express.Router()

router.use('/admin', middlewares.requireAdminUser)

router.get('/admin/all', async (req, res, next) => {
    try {
        res.redirect('/admin/gaccount/all')
    } catch (err) {
        next(err);
    }
});
//// Google/GSU Account
router.get('/admin/gaccount/all', async (req, res, next) => {
    try {
        let s = req.query?.s
        let where = {}
        if (s) {
            if (!isNaN(s)) {
                where = {
                    uid: s
                }
            } else {
                where = {
                    lastName: {
                        [Sequelize.Op.like]: `%${s}%`
                    }
                }
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
            rows: gaccounts,
            s: s,
            flash: flash.get(req, 'survey')
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
        gaccount.gsumail = `${gaccount.firstName.toLowerCase()}.${gaccount.lastName.toLowerCase()}@gsu.edu.ph`.replace('ñ', 'n').replace(/ /g, '') // remove spaces ñ
        gaccount.password = passwordMan.genPassphrase(4)

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

        const user = {
            primaryEmail: body.gsumail,
            name: {
                givenName: body.firstName,
                familyName: body.lastName,
            },
            password: body.password, // Ensure the password meets Google Workspace requirements
            changePasswordAtNextLogin: false,
            orgUnitPath: '/Student'
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


//// SURVEY
router.get('/admin/survey/all', async (req, res, next) => {
    try {
        let s = req.query?.s
        let where = {}
        if (s) {
            where = {
                name: {
                    [Sequelize.Op.like]: `%${s}%`
                }
            }
        }
        let surveys = await req.app.locals.db.models.Survey.findAll({
            where: where
        })
        let data = {
            surveys: surveys,
            s: s,
            flash: flash.get(req, 'survey')
        }
        res.render('admin/survey/all.html', data);
    } catch (err) {
        next(err);
    }
});

router.get('/admin/survey/thanks', async (req, res, next) => {
    try {
        res.render('admin/survey/thanks.html');
    } catch (err) {
        next(err);
    }
});

router.get('/admin/survey/:surveyId/download', async (req, res, next) => {
    try {
        let survey = await req.app.locals.db.models.Survey.findOne({
            where: {
                id: req.params?.surveyId
            },
            raw: true
        })
        let data = {
            survey: survey
        }
        res.render('admin/survey/survey-paper.html', data);
    } catch (err) {
        next(err);
    }
});

// Delete
router.get('/admin/survey/:surveyId/delete', middlewares.getSurvey(), async (req, res, next) => {
    try {
        let survey = res.survey
        let data = {
            survey: survey
        }
        res.render('admin/survey/delete.html', data);
    } catch (err) {
        next(err);
    }
});
router.post('/admin/survey/:surveyId/delete', middlewares.getSurvey({ raw: false }), async (req, res, next) => {
    try {
        let survey = res.survey
        await survey.destroy()
        flash.ok(req, 'survey', `Survey deleted.`)
        res.redirect('/admin/survey/all')
    } catch (err) {
        next(err);
    }
});

module.exports = router;