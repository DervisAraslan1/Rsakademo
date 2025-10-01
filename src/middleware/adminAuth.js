// src/middleware/adminAuth.js

const adminAuth = (req, res, next) => {
    console.log('🔐 AdminAuth Check:', {
        path: req.path,
        sessionID: req.sessionID,
        hasSession: !!req.session,
        hasAdmin: !!req.session?.admin,
        cookies: req.headers.cookie
    });

    // Login ve public sayfalar için auth bypass
    const publicPaths = ['/admin/login', '/admin/forgot-password'];
    if (publicPaths.includes(req.path)) {
        return next();
    }

    // Session ve admin kontrolü
    if (req.session && req.session.admin) {
        console.log('✅ Admin authenticated:', req.session.admin.username);
        return next();
    }

    console.log('❌ Admin not authenticated, redirecting to login');
    res.redirect('/admin/login');
};

// Logout route için helper
const adminLogout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.clearCookie('connect.sid');
        res.redirect('/admin/login');
    });
};

module.exports = { adminAuth, adminLogout };