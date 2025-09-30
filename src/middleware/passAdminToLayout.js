// src/middleware/passAdminToLayout.js
module.exports = (req, res, next) => {
    // Admin objesini tüm view'lara aktar
    res.locals.admin = req.session?.admin || null;
    next();
};