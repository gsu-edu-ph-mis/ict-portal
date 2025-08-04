// Core modules

// External modules
const express = require('express');

// Modules

// Routes
let router = express.Router();
router.use(require('./routes/admin'));
router.use(require('./routes/admin/gsu-account'));
router.use(require('./routes/admin/gsu-id'));
router.use(require('./routes/admin/aws'));
router.use(require('./routes/public'));
router.use(require('./routes/tools'));
router.use(require('./routes/protected'));
router.use(require('./routes/services/gsu-account'));
router.use(require('./routes/services/gsu-id'));

// 404 Page
router.use((req, res) => {
    res.status(404)
    if (req.xhr || /^\/api\//.test(req.originalUrl)) {
        return res.send("Page not found.")
    }
    res.render('error.html', { error: "Page not found." });
});


module.exports = router;