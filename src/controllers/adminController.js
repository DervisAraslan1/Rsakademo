// src/controllers/adminController.js - Ana admin controller
const { Product, Category, Slider, Logs, Settings } = require('../models');

const adminController = {
    // Login sayfası
    loginPage: (req, res) => {
        if (req.session && req.session.isAdmin) {
            return res.redirect('/admin/dashboard');
        }

        res.render('admin/login', {
            title: 'Admin Girişi',
            layout: false,
            error: req.query.error
        });
    },

    login: async (req, res) => {
        try {
            console.log('Login attempt:', req.body);
            const { username, password } = req.body;

            const adminUsername = process.env.ADMIN_USERNAME || 'admin';
            const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

            if (username === adminUsername && password === adminPassword) {
                req.session.isAdmin = true;
                req.session.adminUser = username;

                console.log('Setting session, current session:', req.session);

                // Session'ı zorla kaydet
                req.session.save((err) => {
                    if (err) {
                        console.error('Session save error:', err);
                        return res.redirect('/admin/login?error=session');
                    }
                    console.log('Session saved successfully, redirecting...');
                    res.redirect('/admin/dashboard');
                });

            } else {
                console.log('Invalid credentials');
                res.redirect('/admin/login?error=invalid');
            }

        } catch (error) {
            console.error('Admin login error:', error);
            res.redirect('/admin/login?error=system');
        }
    },

    // Logout işlemi
    logout: async (req, res) => {
        try {
            if (req.session) {
                await Logs.logAction(Logs.ACTIONS.LOGOUT, 'admin', null, null, { username: req.session.adminUser }, req);
                req.session.destroy();
            }
            res.redirect('/admin/login');
        } catch (error) {
            console.error('Admin logout error:', error);
            res.redirect('/admin/login');
        }
    },

    // Dashboard
    dashboard: async (req, res) => {
        try {
            // İstatistikler
            const stats = {
                totalProducts: await Product.count({ where: { visible: 1 } }),
                totalCategories: await Category.count({ where: { visible: 1 } }),
                totalSliders: await Slider.count({ where: { visible: 1 } }),
                hiddenProducts: await Product.count({ where: { visible: 0 } })
            };

            // Son eklenen ürünler
            const recentProducts = await Product.findAll({
                where: { visible: 1 },
                limit: 5,
                order: [['createdAt', 'DESC']]
            });

            // Son aktiviteler
            const recentLogs = await Logs.findAll({
                limit: 10,
                order: [['createdAt', 'DESC']]
            });

            res.render('admin/dashboard', {
                title: 'Dashboard',
                layout: 'admin/layout',
                stats,
                recentProducts,
                recentLogs
            });

        } catch (error) {
            console.error('Dashboard error:', error);
            res.status(500).render('admin/error', {
                title: 'Hata',
                message: 'Dashboard yüklenirken hata oluştu'
            });
        }
    }
};

module.exports = adminController;