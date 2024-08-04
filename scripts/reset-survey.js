/**
 * Clear survey
 * Usage: node scripts/reset-survey.js
 */
//// Core modules
const path = require('path');

//// External modules
const lodash = require('lodash');

//// Modules
const pigura = require('pigura');


//// First things first
//// Save full path of our root app directory and load config and credentials
global.APP_DIR = path.resolve(__dirname+'/../').replace(/\\/g, '/'); // Turn back slash to slash for cross-platform compat
global.ENV = lodash.get(process, 'env.NODE_ENV', 'dev')

const configLoader = new pigura.ConfigLoader({
    configName: './configs/config.json',
    appDir: APP_DIR,
    env: ENV,
    logging: true
})
global.CONFIG = configLoader.getConfig()

const credLoader = new pigura.ConfigLoader({
    configName: './credentials/credentials.json',
    appDir: APP_DIR,
    env: ENV,
    logging: true
})
global.CRED = credLoader.getConfig()

const dbConn = require('../data/src/db-connect');


(async ()=>{
    let dbInstance = await dbConn.connect()

    try {
        let Survey = require('../data/src/models/survey')('Survey', dbInstance)
        // await Survey.drop()
        await Survey.sync()

        console.log('Clearing survey collection...')

    } catch (err) {
        console.error(err)
    } finally {
        dbInstance.close();
    }
})()

