/**
 * https://morioh.com/p/ca75996654d1
 * https://myaccount.google.com/lesssecureapps
 * 
 */

//// Core modules

//// External modules
const nodemailer = require('nodemailer');

//// Modules
const nunjucksEnv = require('./nunjucks-env')

// AWS
const transport2 = nodemailer.createTransport({
    host: 'email-smtp.ap-southeast-1.amazonaws.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: CRED.aws.ses.smtp.username,
        pass: CRED.aws.ses.smtp.password
    }
});

module.exports = {
    sendVideoEmail: async (templateVars) => {
        
        templateVars['baseUrl'] = `${CONFIG.app.url}`
        templateVars['previewText'] = `${templateVars['event']}...`
        let mailOptions = {
            from: `MIS Robot <misbot-noreply@gsu.edu.ph>`,
            to: 'mis@gsu.edu.ph',
            subject: `Photo/Video Documentation Request - ${templateVars['event']}`,
            text: nunjucksEnv.render('emails/video.txt', templateVars),
            html: nunjucksEnv.render('emails/video.html', templateVars),
        }
        let info = await transport2.sendMail(mailOptions)
        // console.log(info.response)
        return info
    },
    sendTarpEmail: async (templateVars) => {
        
        templateVars['baseUrl'] = `${CONFIG.app.url}`
        templateVars['previewText'] = `${templateVars['purpose']}...`
        let mailOptions = {
            from: `MIS Robot <misbot-noreply@gsu.edu.ph>`,
            to: 'mis@gsu.edu.ph',
            subject: `Tarpaulin Design Request - ${templateVars['purpose']}`,
            text: nunjucksEnv.render('emails/tarp.txt', templateVars),
            html: nunjucksEnv.render('emails/tarp.html', templateVars),
        }
        let info = await transport2.sendMail(mailOptions)
        // console.log(info.response)
        return info
    }
}