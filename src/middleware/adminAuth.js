// src/middleware/adminAuth.js
const adminAuth = (req, res, next) => {
    console.log('AdminAuth - Session:', req.session);
    console.log('AdminAuth - req.session.admin:', req.session.admin);

    // DOĞRU: req.session.admin kontrolü
    if (req.session && req.session.admin) {
        console.log('✅ Admin authenticated');
        return next();
    }

    console.log('❌ Admin auth failed, redirecting to login');

    // Login sayfasındaysa sonsuz döngüyü önle
    if (req.path === '/admin/login') {
        return next();
    }

    res.redirect('/admin/login');
};

module.exports = { adminAuth };