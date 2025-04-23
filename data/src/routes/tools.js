// Core modules

// External modules
const express = require('express')

// Modules
const passwordMan = require('../password-man')

// Router
let router = express.Router()

router.get('/password-helper', async (req, res, next) => {
    try {
        await new Promise(resolve => setTimeout(resolve, 1000)) // Rate limit 
        if (CONFIG.ipCheck && !CONFIG.ip.allowed.includes(ip)) {
            throw new Error(`IP "${ip}" is not allowed.`)
        }

        let ptype = parseInt(req.query?.ptype ?? 1)
        let length = parseInt(req.query?.length ?? 4)
        let separator = req.query?.separator ?? '-'

        let password = passwordMan.genPassphrase(length, separator)
        if (ptype == 2) {
            password = passwordMan.genPassword(length)
        } else if (ptype == 3) {
            password = passwordMan.genPasscode(length)
        }
        let data = {
            password
        }
        if (req.xhr) {
            return res.send(data)
        }
        res.render('tools/password-helper.html', data);
    } catch (err) {
        next(err);
    }
});

module.exports = router;