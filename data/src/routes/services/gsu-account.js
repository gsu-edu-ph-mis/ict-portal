// Core modules
const url = require('url')

// External modules
const express = require('express')
const lodash = require('lodash')
const moment = require('moment')
const flash = require('kisapmata')
const { Sequelize } = require('sequelize')

// Core modules

// Modules
const mailer = require('../../mailer');
const middlewares = require('../../middlewares');
const passwordMan = require('../../password-man');
const S3_CLIENT = require('../../aws-s3-client')  // V3 SDK

// Router
let router = express.Router()


router.get('/services/gsu-account', async (req, res, next) => {
    try {
        let data = {}
        res.render('services/gsu-account/create.html', data);
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
            if (score < CONFIG.recaptchav3.threshold) {
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


module.exports = router;