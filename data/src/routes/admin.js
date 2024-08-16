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