
//// Core modules
const fs = require('fs')

//// External modules
const access = require('acrb')
const lodash = require('lodash')

//// Modules
const uploader = require('./uploader')

module.exports = {
    rateLimit: async (req, res, next) => {
        try {
            if (ENV !== 'dev') await new Promise(resolve => setTimeout(resolve, 5000)) // Rate limit if on live 
            next();
        } catch (err) {
            next(err)
        }
    },
    allowIp: async (req, res, next) => {
        try {
            if (CONFIG.ipCheck === false) {
                return next();
            }

            let ips = await req.app.locals.db.models.AllowedIP.findAll(); // Get from db
            let allowed = lodash.map(ips, (ip) => { // Simplify
                return ip.address;
            })

            if (allowed.length <= 0) { // If none from db, get from config
                allowed = CONFIG.ip.allowed;
            }
            let ip = req.headers['x-real-ip'] || req.connection.remoteAddress;

            if (allowed.includes(ip) || allowed.length <= 0) {
                return next();
            }
            res.setHeader('X-IP', ip);
            res.status(400).send('Access denied from ' + ip)
        } catch (err) {
            next(err);
        }
    },
    antiCsrfCheck: async (req, res, next) => {
        try {
            let acsrf = lodash.get(req, 'body.acsrf')

            if (lodash.get(req, 'session.acsrf') === acsrf) {
                return next();
            }
            throw new Error(`Anti-CSRF error detected.`)
        } catch (err) {
            next(err);
        }
    },
    guardRoute: (permissions, condition = 'and') => {
        return async (req, res, next) => {
            try {
                let user = res.user
                let rolesList = await req.app.locals.db.models.Role.findAll()
                if (condition === 'or') {
                    if (!access.or(user, permissions, rolesList)) {
                        return res.render('error.html', {
                            error: `Access denied. Must have one of these permissions: ${permissions.join(', ')}.`
                        })
                    }
                } else {
                    if (!access.and(user, permissions, rolesList)) {
                        return res.render('error.html', {
                            error: `Access denied. Required all these permissions: ${permissions.join(', ')}.`
                        })
                    }
                }
                next()
            } catch (err) {
                next(err)
            }
        }
    },
    getUser: async (req, res, next) => {
        try {
            let userId = req.params.userId || ''
            let user = await req.app.locals.db.models.User.findByPk(userId);
            if (!user) {
                return res.render('error.html', { error: "Sorry, user not found." })
            }
            res.user = user
            next();
        } catch (err) {
            next(err);
        }
    },
    dataUrlToReqFiles: (names = []) => {
        return async (req, res, next) => {
            try {

                names.forEach((fieldName) => {
                    let fieldValue = lodash.get(req, `body.${fieldName}`)
                    if (fieldValue) {
                        lodash.set(req, `files.${fieldName}`, [
                            uploader.toReqFile(fieldValue)
                        ])
                    }
                })

                next()
            } catch (err) {
                next(err)
            }
        }
    },
    handleExpressUploadMagic: async (req, res, next) => {
        try {
            let files = lodash.get(req, 'files', [])
            let localFiles = await uploader.handleExpressUploadLocalAsync(files, CONFIG.app.dirs.upload)
            let imageVariants = await uploader.resizeImagesAsync(localFiles, null, CONFIG.app.dirs.upload); // Resize uploaded images

            let uploadList = uploader.generateUploadList(imageVariants, localFiles)
            let saveList = uploader.generateSaveList(imageVariants, localFiles)
            await uploader.uploadToS3Async(uploadList)
            await uploader.deleteUploadsAsync(localFiles, imageVariants)
            req.localFiles = localFiles
            req.imageVariants = imageVariants
            req.saveList = saveList
            next()
        } catch (err) {
            next(err)
        }
    },
    handleUpload: (o) => {
        return async (req, res, next) => {
            try {
                let files = lodash.get(req, 'files', [])
                let localFiles = await uploader.handleExpressUploadLocalAsync(files, CONFIG.app.dirs.upload, o.allowedMimes)
                let imageVariants = await uploader.resizeImagesAsync(localFiles, null, CONFIG.app.dirs.upload); // Resize uploaded images

                let uploadList = uploader.generateUploadList(imageVariants, localFiles)
                let saveList = uploader.generateSaveList(imageVariants, localFiles)
                await uploader.uploadToS3Async(uploadList)
                await uploader.deleteUploadsAsync(localFiles, imageVariants)
                req.localFiles = localFiles
                req.imageVariants = imageVariants
                req.saveList = saveList
                next()
            } catch (err) {
                next(err)
            }
        }
    },
    requireAuthUser: async (req, res, next) => {
        try {
            let authUserId = lodash.get(req, 'session.authUserId')
            if (!authUserId) {
                return res.redirect('/login')
            }
            let user = await req.app.locals.db.models.User.findOne({
                where: {
                    id: authUserId
                },
            })

            if (!user) {
                return res.redirect('/logout') // Prevent redirect loop when user is null
            }
            if (!user.active) {
                return res.redirect('/logout')
            }
            res.user = user
            next()
        } catch (err) {
            next(err)
        }
    },
    requireAdminUser: async (req, res, next) => {
        try {
            let authUserId = lodash.get(req, 'session.authUserId')
            if (!authUserId) {
                return res.redirect('/login')
            }
            let user = await req.app.locals.db.models.User.findOne({
                where: {
                    id: authUserId
                },
            })
            if (!['ict@gsu.edu.ph', 'nico.amarilla@gsu.edu.ph', 'crisvincent.ferrer@gsu.edu.ph', 'mark.nolasco@gsu.edu.ph', 'rocsan.cantuja@gsu.edu.ph', 'sieryl.laudato@gsu.edu.ph'].includes(user.email)) {
                throw new Error(`Admin access required. Email: ${user.email}`)
            }
            next()
        } catch (err) {
            next(err)
        }
    },
    /**
     * See: https://expressjs.com/en/api.html#app.locals
     * See: https://expressjs.com/en/api.html#req.app
     * 
     * @param {*} req 
     * @param {*} res 
     * @param {*} next 
     */
    perAppViewVars: function (req, res, next) {
        req.app.locals.app = {
            title: CONFIG.app.title,
            description: CONFIG.description,
        }
        req.app.locals.ENV = ENV
        req.app.locals.CONFIG = lodash.cloneDeep(CONFIG) // Config

        let courses = fs.readFileSync(`${CONFIG.app.dir}/scripts/install-data/courses.csv`, { encoding: 'utf8' })
            courses = courses.split("\n")
            courses = courses.map(e => {
                e = e.split(',')
                return {
                    id: e.at(0),
                    name: e.at(1)
                }
            })
            req.app.locals.COURSES = courses

        next()
    },
    /**
     * See: https://expressjs.com/en/api.html#res.locals
     * 
     * @param {*} req 
     * @param {*} res 
     * @param {*} next 
     */
    perRequestViewVars: async (req, res, next) => {
        try {
            res.locals.user = null
            let authUserId = lodash.get(req, 'session.authUserId');
            if (authUserId) {
                let user = await req.app.locals.db.models.User.findByPk(authUserId)
                if (user) {
                    user = user.toJSON() // Plain object
                    user = lodash.pickBy(user, (_, key) => {
                        return !['createdAt', 'updatedAt', '__v', 'passwordHash', 'salt'].includes(key) // Remove these props
                    })
                }
                res.locals.user = user
            }

            res.locals.acsrf = lodash.get(req, 'session.acsrf');

            res.locals.url = req.url
            res.locals.urlPath = req.path
            res.locals.query = req.query

            let bodyClass = 'page' + (req.baseUrl + req.path).replace(/\//g, '-');
            bodyClass = lodash.trim(bodyClass, '-');
            bodyClass = lodash.trimEnd(bodyClass, '.html');
            const bodyClasses = [bodyClass]
            const hideNav = lodash.get(req, 'cookies.hideNav', 'true')
            if (hideNav === 'true') {
                bodyClasses.push('hide-menu')
            }
            res.locals.hideNav = hideNav
            res.locals.bodyClass = bodyClasses.join(' ')

            next();
        } catch (error) {
            next(error);
        }
    },
    saneTitles: async (req, res, next) => {
        try {
            if (!res.locals.title && !req.xhr) {
                let title = lodash.trim(req.originalUrl.split('/').join(' '));
                title = lodash.trim(title.replace('-', ' '));
                let words = lodash.map(title.split(' '), (word) => {
                    return lodash.capitalize(word);
                })
                title = words.join(' - ')
                if (title) {
                    res.locals.title = `${title} | ${req.app.locals.app.title} `;
                } else {
                    res.locals.title = `${req.app.locals.app.title}`;

                }
            }
            next();
        } catch (error) {
            next(error);
        }
    },
    getSurvey: (opts) => {
        return async (req, res, next) => {
            try {
                let _opts = {
                    raw: true
                }
                let options = {..._opts, ...opts}
                let survey = await req.app.locals.db.models.Survey.findOne({
                    where: {
                        id: req.params?.surveyId
                    },
                    ...options
                })
                if(!survey) throw new Error('Survey not found')
                res.survey = survey
                next();
            } catch (error) {
                next(error);
            }
        }
    },
    getGaccount: (opts={}) => {
        return async (req, res, next) => {
            try {
                let _opts = {
                    raw: true
                }
                let options = {..._opts, ...opts}
                let gaccount = await req.app.locals.db.models.Gaccount.findOne({
                    where: {
                        id: req.params?.gaccountId
                    },
                    ...options
                })
                if(!gaccount) throw new Error('GSU Account not found')
                res.gaccount = gaccount
                next();
            } catch (error) {
                next(error);
            }
        }
    },
    getGsuid: (opts={}) => {
        return async (req, res, next) => {
            try {
                let _opts = {
                    raw: true
                }
                let options = {..._opts, ...opts}
                let instance = await req.app.locals.db.models.Gsuid.findOne({
                    where: {
                        id: req.params?.gsuidId
                    },
                    ...options
                })
                if(!instance) throw new Error('GSU ID application not found')
                res.gsuid = instance
                next();
            } catch (error) {
                next(error);
            }
        }
    },
}