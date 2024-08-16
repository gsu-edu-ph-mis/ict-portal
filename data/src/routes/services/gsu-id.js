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
const middlewares = require('../../middlewares');
const passwordMan = require('../../password-man');

// Router
let router = express.Router()


router.get('/services/gsu-id', async (req, res, next) => {
    try {
        let data = {}
        res.render('services/gsu-id/create.html', data);
    } catch (err) {
        next(err);
    }
});
router.post('/services/gsu-id', async (req, res, next) => {
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
        // return res.send(data)
        data.idNumber = `${data.idNumber}`.trim()
        data.firstName = `${data.firstName}`.trim()
        data.middleName = `${data.middleName}`.trim()
        data.lastName = `${data.lastName}`.trim()

        let found = await req.app.locals.db.models.Gsuid.findOne({
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

        let gsuid = req.app.locals.db.models.Gsuid.build({
            uid: `${passwordMan.genPasscode(4)}`,
            accountType: data.accountType,
            idNumber:  data.idNumber,
            course:  data.course,
            firstName:  data.firstName,
            middleName:  data.middleName,
            lastName:  data.lastName,
            suffix:  data.suffix,
            gender:  data.gender,
            bloodType:  data.bloodType,
            birthDate:  data.birthDate,
            email:  data.email,
            mobileNumber:  data.mobileNumber,
            guardianName:  data.guardianName,
            guardianNumber:  data.guardianNumber,
            address:  data.address,
        })
        await gsuid.save()

        // console.log(gsuid)
        res.redirect(`/services/gsu-id/transaction/${gsuid.uid}`)
    } catch (err) {
        next(err);
    }
});

router.get('/services/gsu-id/transaction/:gsuidId', async (req, res, next) => {
    try {
        let gsuid = await req.app.locals.db.models.Gsuid.findOne({
            where: {
                uid: req.params.gsuidId
            }
        })
        if(!gsuid){
            throw new Error(`Transaction not found.`)
        }
        let data = {
            gsuid: gsuid
        }
        res.render('services/gsu-id/transaction.html', data);
    } catch (err) {
        next(err);
    }
});

router.get('/services/gsu-id/thanks', async (req, res, next) => {
    try {
        let data = {}
        res.render('services/gsu-id/thanks.html', data);
    } catch (err) {
        next(err);
    }
});


router.get('/services/gsu-id', async (req, res, next) => {
    try {
        let data = {}
        res.locals.title ='ID Services - GSU ID'
        res.render('services/gsu-id/create.html', data);
    } catch (err) {
        next(err);
    }
});
router.post('/services/gsu-id', async (req, res, next) => {
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

        let found = await req.app.locals.db.models.Gsuid.findOne({
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

        let gsuid = req.app.locals.db.models.Gsuid.build({
            uid: `${passwordMan.genPasscode(4)}`,
            accountType: data.accountType,
            idNumber:  data.idNumber,
            firstName:  data.firstName,
            middleName:  data.middleName,
            lastName:  data.lastName,
            email:  data.email,
            mobileNumber:  data.mobileNumber,
        })
        await gsuid.save()

        // console.log(gsuid)
        res.redirect(`/services/gsu-id/transaction/${gsuid.uid}`)
    } catch (err) {
        next(err);
    }
});

router.get('/services/gsu-id/transaction/:gsuidId', async (req, res, next) => {
    try {
        let gsuid = await req.app.locals.db.models.Gsuid.findOne({
            where: {
                uid: req.params.gsuidId
            }
        })
        if(!gsuid){
            throw new Error(`Transaction not found.`)
        }
        let data = {
            gsuid: gsuid
        }
        res.render('services/gsu-id/transaction.html', data);
    } catch (err) {
        next(err);
    }
});

router.get('/services/gsu-id/thanks', async (req, res, next) => {
    try {
        let data = {}
        res.render('services/gsu-id/thanks.html', data);
    } catch (err) {
        next(err);
    }
});

module.exports = router;