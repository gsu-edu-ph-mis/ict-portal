/**
 * Clear permissions collection and insert permissions
 * Usage: node scripts/install-permissions.js
 */
//// Core modules
const path = require('path');

//// External modules
const lodash = require('lodash');
const pigura = require('pigura');

//// Modules


//// First things first
//// Save full path of our root app directory and load config and credentials
global.APP_DIR = path.resolve(__dirname + '/../').replace(/\\/g, '/'); // Turn back slash to slash for cross-platform compat
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
let permissionList = require('./install-data/permissions-list'); // Do not remove semi-colon

(async () => {
    let dbInstance = await dbConn.connect()
    let Permission = require('../data/src/models/permission')('Permission', dbInstance)

    try {
        await Permission.drop()
        await Permission.sync()
        
        console.log('Clearing permissions collection...')

        let promises = lodash.map(permissionList, (p) => {
            let permission = Permission.build({
                key: p,
            });
            console.log(`Inserting "${p}" ...`)
            return permission.save()
        })
        await Promise.all(promises)
        console.log(`Inserted ${promises.length} permissions.`)

    } catch (err) {
        console.error(err)
        console.log('Rolling back permissions collection...')
        await Permission.destroy({
            truncate: true
        });
    } finally {
        dbInstance.close();
    }
})()


