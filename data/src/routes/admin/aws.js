// Core modules

// External modules
const express = require('express')


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
        res.render('admin/aws/all.html');
    } catch (err) {
        next(err);
    }
});


// Create
router.get('/admin/aws/instance/:instanceName', async (req, res, next) => {
    try {
        const instanceName = req.params.instanceName

        await new Promise(resolve => setTimeout(resolve, 600)) // Rate limit 
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

        await new Promise(resolve => setTimeout(resolve, 600)) // Rate limit
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

        await new Promise(resolve => setTimeout(resolve, 600)) // Rate limit
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