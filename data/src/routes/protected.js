// Core modules
const url = require('url')

// External modules
const express = require('express')
const lodash = require('lodash')
const moment = require('moment')
const flash = require('kisapmata')
const { Sequelize } = require('sequelize')
const { PhAddress } = require('ph-address')

// Core modules

// Modules
const mailer = require('../mailer');
const middlewares = require('../middlewares');
const passwordMan = require('../password-man');
const S3_CLIENT = require('../aws-s3-client')  // V3 SDK

// Router
let router = express.Router()


// REQUIRE AUTH
router.get('/services/survey', middlewares.requireAuthUser, async (req, res, next) => {
    try {
        let data = {
            dateStart: moment().format('YYYY-MM-DD')
        }
        res.render('services/survey.html', data);
    } catch (err) {
        next(err);
    }
});
router.post('/services/survey', async (req, res, next) => {
    try {
        let data = {
            survey: req.body
        }
        data.survey.service = !Array.isArray(data.survey.service) ? [data.survey.service] : data.survey.service
        if (data.survey.serviceOthers) {
            let i = data.survey.service.indexOf('Others')
            if (i > -1) data.survey.service[i] = (data.survey.serviceOthers)
        }
        data.survey.service = data?.survey?.service?.join(', ')
        let survey = req.app.locals.db.models.Survey.build(data.survey)
        await survey.save()

        // console.log(survey)
        res.redirect('/services/survey/thanks')
    } catch (err) {
        next(err);
    }
});
router.get('/services/survey/thanks', async (req, res, next) => {
    try {
        let data = {}
        res.render('survey/thanks.html', data);
    } catch (err) {
        next(err);
    }
});

router.get('/services/thanks', async (req, res, next) => {
    try {
        let data = {}
        res.render('services/thanks.html', data);
    } catch (err) {
        next(err);
    }
});

router.get('/courses', async (req, res, next) => {
    try {
        let search = lodash.get(req, 'query.s', '');
        search = new RegExp(search, 'i')

        let courses = req.app.locals.COURSES.filter(course => search.test(course.id) || search.test(course.name))
        return res.send(courses)

    } catch (err) {
        next(err);
    }
});

router.get('/address', async (req, res, next) => {
    try {
        let search = lodash.get(req, 'query.s', '');
        const phAddress = new PhAddress()
        const addressFinder = await phAddress.useSqlite()
        const formatter = (a) => {
            let full = []
            if (a.name) full.push(a.name)
            if (a.cityMunName) full.push(a.cityMunName)
            if (a.provName && (a.provName !== a.cityMunName)) full.push(a.provName)
            // if (a.regName) full.push(a.regName)

            return {
                name: full.join(', '),
                id: a.psgc
            }
        }
        let addresses = await addressFinder.find(search, 2, 5, formatter)
        let addresses2 = await addressFinder.find(search.replace('sta.', 'Santa'), 2, 5, formatter)
        let a2 = [...addresses, ...addresses2].filter((obj, index, self) =>
            index === self.findIndex((o) => o.id === obj.id)
        );
        return res.send(a2)
    } catch (err) {
        next(err);
    }
});

// View s3 object using html page
router.get('/file-viewer/:bucket/:prefix/:key', middlewares.requireAuthUser, async (req, res, next) => {
    try {
        let bucket = lodash.get(req, "params.bucket", "");
        let prefix = lodash.get(req, "params.prefix", "");
        let key = lodash.get(req, "params.key", "");

        let url = await S3_CLIENT.getSignedUrl(bucket, prefix + '/' + key)

        res.render('file-viewer.html', {
            url: url,
        });
    } catch (err) {
        next(err);
    }
});

// Get s3 object content
router.get('/file-getter/:bucket/:prefix/:key', async (req, res, next) => {
    try {
        let bucket = lodash.get(req, "params.bucket", "");
        let prefix = lodash.get(req, "params.prefix", "");
        let key = lodash.get(req, "params.key", "");

        let url = await S3_CLIENT.getSignedUrl(bucket, prefix + '/' + key)

        res.redirect(url);
    } catch (err) {
        next(err);
    }
});

module.exports = router;