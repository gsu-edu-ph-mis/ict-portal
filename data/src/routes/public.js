//// Core modules
let { timingSafeEqual } = require('crypto')
const url = require('url');

//// External modules
const express = require('express')
const flash = require('kisapmata')
const lodash = require('lodash')
const moment = require('moment')

//// Modules
// const mailer = require('../mailer')
const passwordMan = require('../password-man')

// Router
let router = express.Router()

router.get('/', async (req, res, next) => {
    try {

        res.render('home.html', {});
    } catch (err) {
        next(err);
    }
});

router.get('/about-us', async (req, res, next) => {
    try {

        res.render('about-us.html', {});
    } catch (err) {
        next(err);
    }
});

router.get('/login', async (req, res, next) => {
    try {
        if (lodash.get(req, 'session.authUserId')) {
            return res.redirect(`/`)
        }
        // console.log(req.session)
        let ip = req.headers['x-real-ip'] || req.connection.remoteAddress;
        res.render('login.html', {
            flash: flash.get(req, 'login'),
            ip: ip,
            username: lodash.get(req, 'query.username', ''),
        });
    } catch (err) {
        next(err);
    }
});
router.post('/login', async (req, res, next) => {
    try {
        if (CONFIG.loginDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, CONFIG.loginDelay)) // Rate limit 
        }

        let post = req.body;
        let user = null
        if (post.credential) {

            const { OAuth2Client } = require('google-auth-library');
            const CLIENT_ID = `1089280647908-51j47hevhq7k0c502vur2rf876itsrcb.apps.googleusercontent.com`

            const client = new OAuth2Client(CLIENT_ID);
            try {
                const ticket = await client.verifyIdToken({
                    idToken: post.credential,
                    audience: CLIENT_ID,
                });
                const payload = ticket.getPayload();
                // const userid = payload['sub'];
                // console.log(`payload`, payload)
                /*
                {
                    iss: 'https://accounts.google.com',
                    nbf: 1678458819,
                    aud: '626719409676-33r3r1rcai88462q3p70kj89hshco5s7.apps.googleusercontent.com',
                    sub: '115284064957933519698',
                    hd: 'gsc.edu.ph',
                    email: 'nico.amarilla@gsc.edu.ph',
                    email_verified: true,
                    azp: '626719409676-33r3r1rcai88462q3p70kj89hshco5s7.apps.googleusercontent.com',
                    name: 'Nico Amarilla',
                    picture: 'https://lh3.googleusercontent.com/a/AGNmyxb1kr_FuOm6A5m7DS5plgWj6-sK4I7qCdziqK4z=s96-c',
                    given_name: 'Nico',
                    family_name: 'Amarilla',
                    iat: 1678459119,
                    exp: 1678462719,
                    jti: 'fed5c83dc8ee604fc3bba58b5d987163176e7ed7'
                }
                */
                user = await req.app.locals.db.models.User.findOne({ where: { username: payload.email } })
                if (!user) {
                    let roles = ['client']
                    if (['ict@gsu.edu.ph', 'nico.amarilla@gsu.edu.ph', 'johnmichael.gadot@gsu.edu.ph', 'mark.nolasco@gsu.edu.ph', 'rocsan.cantuja@gsu.edu.ph', 'sieryl.laudato@gsu.edu.ph'].includes(payload.email)) {
                        roles = ['admin']
                    }
                    user = req.app.locals.db.models.User.build({
                        passwordHash: '',
                        salt: '',
                        roles: roles,
                        firstName: payload.given_name,
                        middleName: '',
                        lastName: payload.family_name,
                        email: payload.email,
                        username: payload.email,
                        active: true,
                        //permissions: JSON.stringify(o.permissions),
                    });
                    await user.save()
                }
                user = await req.app.locals.db.models.User.findOne({ where: { username: payload.email } })
            } catch (err) {
                console.error(err)
                throw err
            }
        } else {

            let username = lodash.get(post, 'username', '');
            let password = lodash.trim(lodash.get(post, 'password', ''))

            // Find admin
            user = await req.app.locals.db.models.User.findOne({ where: { username: username } })
            if (!user) {
                throw new Error('Incorrect username.')
            }

            // Check password
            let passwordHash = passwordMan.hashPassword(password, user.salt);
            if (!timingSafeEqual(Buffer.from(passwordHash, 'utf8'), Buffer.from(user.passwordHash, 'utf8'))) {
                throw new Error('Incorrect password.');
            }
        }

        if (!user.active) {
            throw new Error('Your account is deactivated.');
        }

        // Save user id to session
        lodash.set(req, 'session.authUserId', user.id);

        // Security: Anti-CSRF token.
        let antiCsrfToken = await passwordMan.randomStringAsync(16)
        lodash.set(req, 'session.acsrf', antiCsrfToken);

        return res.redirect('/');
    } catch (err) {
        console.error(err)
        flash.error(req, 'login', err.message);
        return res.redirect('/login');
    }
});

router.get('/logout', async (req, res, next) => {
    try {
        lodash.set(req, 'session.authUserId', null);
        lodash.set(req, 'session.acsrf', null);
        lodash.set(req, 'session.flash', null);
        res.clearCookie(CONFIG.session.name, CONFIG.session.cookie);

        res.redirect('/login');
    } catch (err) {
        next(err);
    }
});
router.get('/gmail', async (req, res, next) => {
    try {


        res.render('gmail.html');
    } catch (err) {
        next(err);
    }
});


module.exports = router;