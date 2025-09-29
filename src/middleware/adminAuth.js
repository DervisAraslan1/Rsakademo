const adminAuth = (req, res, next) => {
    console.log('AdminAuth - Session:', req.session);
    console.log('AdminAuth - isAdmin:', req.session?.isAdmin);

    if (req.session && req.session.isAdmin) {
        console.log('✅ Admin auth passed');
        return next();
    }

    console.log('❌ Admin auth failed, redirecting to login');
    return res.redirect('/admin/login');
};

module.exports = { adminAuth };