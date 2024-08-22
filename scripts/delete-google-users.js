/**
 * node scripts/delete-google-users.js
 */
//// Core modules
const fs = require('fs');
const path = require('path');
const process = require('process');

//// External modules
const csvParser = require('csv-parser')
const lodash = require('lodash');
const moment = require('moment');
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



    ; (async () => {
        try {
            const googleAdmin = require('../data/src/google-admin')
            // param
            // let isReset = lodash.toString(process.argv[2]).trim()

            let emails = []
            let results = []


            fs.createReadStream(`C:/Users/Acer Nitro/Downloads/User_Download_21082024_091609 - User_Download_21082024_091609.csv`, {
                encoding: 'utf8',
                mapValues: ({ header, index, value }) => value.trim()
            })
                .pipe(csvParser())
                .on('data', (data) => {
                    // console.log(data)
                    if (data['Last Sign In [READ ONLY]'] === 'Never logged in') {
                        let email = data['Email Address [Required]']
                        if (email.includes('@gsc.edu.ph')) {
                            emails.push(email)
                        }
                    }
                })
                .on('end', async () => {
                    // 
                    for(let i = 0; i < emails.length; i++){
                        let email = emails[i]
                        try{
                            await googleAdmin.deleteUser(email)
                            results.push(email)
                            console.log(`Deleted: ${email}`)
                        } catch (err){
                            console.log(`ERROR: ${email} - ${err.message}`)
                        }
                    }
                    console.log(`Deleted ${results.length} accounts.`)
                });

        } catch (err) {
            console.error(err)
        } finally {
        }
    })()


