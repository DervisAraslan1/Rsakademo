// src/controllers/adminController.js
const { Product, Category, Slider, Settings, Logs, User } = require('../models');
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

            const user = await User.findOne({
                where: {
                    username: username,
                    role: {
                        [Op.in]: ['super_admin', 'admin', 'editor']
                    },
                    is_active: true
                }
            });

            if (!user) {
                return res.redirect('/admin/login?error=invalid');
            }

            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return res.redirect('/admin/login?error=invalid');
            }

            // Session'a kaydet
            req.session.admin = {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                full_name: user.full_name,
                loginTime: new Date()
            };

            req.session.save(async (err) => {
                if (err) {
                    return res.redirect('/admin/login?error=session');
                }

                try {
                    await user.update({ last_login: new Date() });

                    await Logs.logAction(
                        Logs.ACTIONS.LOGIN,
                        'users',
                        user.id,
                        null,
                        { username: user.username, role: user.role },
                        req
                    );

                    return res.redirect('/admin/dashboard');
                } catch {
                    // Log hatası olsa bile dashboard'a yönlendir
                    return res.redirect('/admin/dashboard');
                }
            });

        } catch (error) {
            console.error('❌ Admin login error:', error);
            res.redirect('/admin/login?error=server');
        }
    },

    // Logout
    logout: async (req, res) => {
        try {
            if (req.session.admin) {
                const adminData = { ...req.session.admin };

                await Logs.logAction(
                    Logs.ACTIONS.LOGOUT,
                    'users',
                    adminData.id,
                    null,
                    { username: adminData.username },
                    req
                );

                req.session.destroy((err) => {
                    if (err) {
                        console.error('Logout error:', err);
                    }
                    res.clearCookie('connect.sid');
                    res.redirect('/admin/login');
                });
            } else {
                res.redirect('/admin/login');
            }
        } catch (error) {
            console.error('Admin logout error:', error);
            res.redirect('/admin/login');
        }
    },

    // Dashboard
    dashboard: async (req, res) => {
        try {
            const totalProducts = await Product.count({ where: { visible: 1 } });
            const totalCategories = await Category.count({ where: { visible: 1 } });
            const featuredProducts = await Product.count({
                where: { visible: 1, featured: 1 }
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

            const weeklyUpdates = await Logs.count({
                where: {
                    action: Logs.ACTIONS.UPDATE,
                    createdAt: {
                        [Op.gte]: weekStart
                    }
                }
            });

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
                settings,
                stats: {
                    totalProducts,
                    totalCategories,
                    featuredProducts,
                    weeklyNewProducts,
                    weeklyUpdates,
                    monthlyViews: 0
                },
                recentLogs
            });

        } catch (error) {
            console.error('Admin dashboard error:', error);
            res.status(500).render('admin/error', {
                title: 'Hata',
                layout: 'admin/layout',
                currentPage: 'dashboard',
                message: 'Dashboard yüklenirken hata oluştu',
                admin: req.session.admin
            });
        }
    }
};

module.exports = adminController;
