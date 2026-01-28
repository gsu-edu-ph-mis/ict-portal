// Core modules

// External modules
const express = require('express')

const lodash = require('lodash')
const moment = require('moment')
const flash = require('kisapmata')
const { Sequelize } = require('sequelize')

// Core modules

// Modules
const middlewares = require('../../middlewares')
const {
    LightsailClient,
    GetInstanceStateCommand,
    StopInstanceCommand,
    StartInstanceCommand
} = require("@aws-sdk/client-lightsail")

// Router
let router = express.Router()

// User: LightsailBot
const clientInstance = new LightsailClient({
    credentials: {
        accessKeyId: CRED.aws.LightsailBot.accessKeyId,
        secretAccessKey: CRED.aws.LightsailBot.secretAccessKey,
    },
    region: "ap-southeast-1", // change if needed
})

router.use('/admin/aws', middlewares.requireAdminUser)

// AWS
router.get('/admin/aws/all', async (req, res, next) => {
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
        res.render('admin/aws/all.html', data);
    } catch (err) {
        next(err);
    }
});


// Create
router.get('/admin/aws/instance/:instanceName', async (req, res, next) => {
    try {
        const instanceName = req.params.instanceName

        // await new Promise(resolve => setTimeout(resolve, 2000)) // Rate limit 
        // throw new Error('Bad request.')
        // return res.send({
        //     name: instanceName,
        //     status: 'running',
        // })
        console.log(`Getting...`)
        const command = new GetInstanceStateCommand({ instanceName });
        const response = await clientInstance.send(command);
        console.log(response)
        console.log(`${instanceName}: ${response.state.name}`) // running | stopped | pending

        let data = {
            name: instanceName,
            status: response.state.name,
        }
        res.send(data)
    } catch (err) {
        next(err);
    }
});
router.post('/admin/aws/instance/:instanceName/stop', middlewares.antiCsrfCheck, async (req, res, next) => {
    try {
        const instanceName = req.params.instanceName

        // await new Promise(resolve => setTimeout(resolve, 2000)) // Rate limit 
        // throw new Error('Bad request.')
        // return res.send({
        //     name: instanceName,
        //     status: 'unknown',
        // })
        console.log(`Stopping...`)
        const command = new StopInstanceCommand({ instanceName });
        const response = await clientInstance.send(command);
        console.log(response)
        const lastOp = response.operations.pop()
        console.log(`${instanceName}: ${lastOp?.operationType}`)

        let data = {
            name: instanceName,
            status: 'unknown',
        }
        res.send(data)
    } catch (err) {
        next(err);
    }
});

router.post('/admin/aws/instance/:instanceName/start', middlewares.antiCsrfCheck, async (req, res, next) => {
    try {
        const instanceName = req.params.instanceName

        // await new Promise(resolve => setTimeout(resolve, 2000)) // Rate limit 
        // return res.send({
        //     name: instanceName,
        //     status: 'unknown',
        // })
        console.log(`Starting...`)
        const command = new StartInstanceCommand({ instanceName });
        const response = await clientInstance.send(command);
        console.log(response)
        const lastOp = response.operations.pop()
        console.log(`${instanceName}: ${lastOp?.operationType}`)

        let data = {
            name: instanceName,
            status: 'unknown',
        }
        res.send(data)
    } catch (err) {
        next(err);
    }
});


module.exports = router;