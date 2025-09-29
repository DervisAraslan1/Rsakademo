// src/middleware/adminAuth.js - Admin authentication middleware
const adminAuth = (req, res, next) => {
    // Basit session bazlı auth
    if (req.session && req.session.isAdmin) {
        return next();
    }

    // AJAX request ise JSON response
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Admin girişi gerekli'
        });
    }

    // Normal request ise login sayfasına yönlendir
    return res.redirect('/admin/login');
};

module.exports = { adminAuth };