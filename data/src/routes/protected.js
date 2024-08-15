//// Core modules
const url = require('url')

//// External modules
const express = require('express')
const lodash = require('lodash')
const moment = require('moment')
const flash = require('kisapmata')
const { Sequelize } = require('sequelize')

//// Core modules

//// Modules
const mailer = require('../mailer');
const middlewares = require('../middlewares');
const passwordMan = require('../password-man');
const S3_CLIENT = require('../aws-s3-client')  // V3 SDK

// Router
let router = express.Router()


router.get('/services/gsu-account', async (req, res, next) => {
    try {
        let data = {}
        res.render('services/gsu-account/home.html', data);
    } catch (err) {
        next(err);
    }
});
router.post('/services/gsu-account', async (req, res, next) => {
    try {
        let data = req.body

        // Recaptcha
        let recaptchaToken = data.recaptchaToken
        if (CONFIG.recaptchav3.enable) {

            let params = new url.URLSearchParams({
                secret: CRED.recaptchav3.secret,
                response: recaptchaToken
            });

            let response = await fetch(`https://www.google.com/recaptcha/api/siteverify?${params.toString()}`, {
                method: 'POST',
                headers: {
                    'Content-Type': "application/x-www-form-urlencoded"
                }
            })
            if (!response.ok) {
                throw new Error(await response.text())
            }
            response = await response.json()
            console.log(response)
            let score = lodash.get(response, 'score', 0.0)
            if (score < 0.5) {
                throw new Error(`Security error.`)
            }


        }
        data.idNumber = `${data.idNumber}`.trim()
        data.firstName = `${data.firstName}`.trim()
        data.middleName = `${data.middleName}`.trim()
        data.lastName = `${data.lastName}`.trim()

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
        if(found){
            throw new Error(`You have already applied. Please visit the ICTU.`)
        }

        let gaccount = req.app.locals.db.models.Gaccount.build({
            uid: `${passwordMan.genPasscode(4)}`,
            accountType: data.accountType,
            idNumber:  data.idNumber,
            firstName:  data.firstName,
            middleName:  data.middleName,
            lastName:  data.lastName,
            email:  data.email,
            mobileNumber:  data.mobileNumber,
        })
        await gaccount.save()

        // console.log(gaccount)
        res.redirect(`/services/gsu-account/transaction/${gaccount.uid}`)
    } catch (err) {
        next(err);
    }
});

router.get('/services/gsu-account/transaction/:gaccountUid', async (req, res, next) => {
    try {
        let gaccount = await req.app.locals.db.models.Gaccount.findOne({
            where: {
                uid: req.params.gaccountUid
            }
        })
        if(!gaccount){
            throw new Error(`Transaction not found.`)
        }
        let data = {
            gaccount: gaccount
        }
        res.render('services/gsu-account/transaction.html', data);
    } catch (err) {
        next(err);
    }
});

router.get('/services/gsu-account/thanks', async (req, res, next) => {
    try {
        let data = {}
        res.render('services/gsu-account/thanks.html', data);
    } catch (err) {
        next(err);
    }
});

// REQUIRE AUTH
router.use('/services', middlewares.requireAuthUser)

router.get('/services/survey', async (req, res, next) => {
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