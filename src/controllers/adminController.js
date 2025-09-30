// src/controllers/adminController.js
const { Product, Category, Slider, Settings, Logs } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcrypt');

const adminController = {
    // Login sayfası
    loginPage: (req, res) => {
        if (req.session.admin) {
            return res.redirect('/admin/dashboard');
        }
        res.render('admin/login', {
            title: 'Admin Giriş',
            layout: false,
            error: req.query.error
        });
    },

    login: async (req, res) => {
        try {
            const { username, password } = req.body;

            const adminUsername = process.env.ADMIN_USERNAME || 'admin';
            const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

            if (username === adminUsername && password === adminPassword) {
                req.session.admin = {
                    username: adminUsername,
                    loginTime: new Date()
                };

                await Logs.logAction(Logs.ACTIONS.LOGIN, 'admin', null, null, { username }, req);

                return res.redirect('/admin/dashboard');
            }

            res.redirect('/admin/login?error=invalid');

        } catch (error) {
            console.error('Admin login error:', error);
            res.redirect('/admin/login?error=server');
        }
    },

    // Logout
    logout: async (req, res) => {
        try {
            if (req.session.admin) {
                await Logs.logAction(Logs.ACTIONS.LOGOUT, 'admin', null, null,
                    { username: req.session.admin.username }, req);
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
            // İstatistikleri çek
            const totalProducts = await Product.count({ where: { visible: 1 } });
            const totalCategories = await Category.count({ where: { visible: 1 } });
            const featuredProducts = await Product.count({
                where: { visible: 1, featured: 1 }
            });

            const currentMonth = new Date();
            currentMonth.setDate(1);
            currentMonth.setHours(0, 0, 0, 0);

            const recentLogs = await Logs.findAll({
                limit: 10,
                order: [['createdAt', 'DESC']],
                where: {
                    action: {
                        [Op.in]: [
                            Logs.ACTIONS.CREATE,
                            Logs.ACTIONS.UPDATE,
                            Logs.ACTIONS.DELETE
                        ]
                    }
                }
            });

            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            weekStart.setHours(0, 0, 0, 0);

            const weeklyNewProducts = await Product.count({
                where: {
                    createdAt: {
                        [Op.gte]: weekStart
                    }
                }
            });

            const weeklyLogs = await Logs.count({
                where: {
                    createdAt: {
                        [Op.gte]: weekStart
                    }
                }
            });

            // 🔹 Site ayarlarını çek
            const settingsArray = await Settings.findAll();
            const settings = {};
            settingsArray.forEach(setting => {
                settings[setting.key] = setting.value;
            });

            res.render('admin/dashboard', {
                title: `Dashboard - ${settings.site_name || 'Mobilya Dünyası'} Admin`,
                layout: 'admin/layout',
                currentPage: 'dashboard',
                admin: req.session.admin,
                settings, // 🔹 Settings'i ekle
                stats: {
                    totalProducts,
                    totalCategories,
                    featuredProducts,
                    monthlyViews: 1234,
                    weeklyNewProducts,
                    weeklyPageViews: weeklyLogs * 10,
                    weeklyFavorites: Math.floor(Math.random() * 100)
                },
                recentLogs
            });

        } catch (error) {
            console.error('Admin dashboard error:', error);
            res.status(500).render('admin/error', {
                title: 'Hata',
                layout: 'admin/layout',
                message: 'Dashboard yüklenirken hata oluştu'
            });
        }
    }
};

module.exports = adminController;