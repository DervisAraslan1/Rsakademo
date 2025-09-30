// src/controllers/admin/logsController.js
const { Logs } = require('../../models');
const { Op } = require('sequelize');

const adminLogsController = {
    // Log listesi
    index: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 50;
            const offset = (page - 1) * limit;
            const filter = req.query.filter || 'all';

            let whereCondition = {};
            if (filter !== 'all') {
                whereCondition.action = filter;
            }

            const { count, rows: logs } = await Logs.findAndCountAll({
                where: whereCondition,
                limit,
                offset,
                order: [['createdAt', 'DESC']]
            });

            const totalPages = Math.ceil(count / limit);

            // Success/error mesajları
            let success = null;
            let error = null;

            if (req.query.success) {
                success = req.query.success;
            }

            res.render('admin/logs/index', {
                title: 'Sistem Logları',
                layout: 'admin/layout',
                currentPage: 'logs',
                logs,
                filter,
                pagination: {
                    currentPage: page,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                },
                success,
                error,
                admin: req.session.admin
            });

        } catch (error) {
            console.error('Admin logs index error:', error);
            res.status(500).render('admin/error', {
                title: 'Hata',
                layout: 'admin/layout',
                currentPage: 'logs',
                message: 'Loglar yüklenirken hata oluştu',
                admin: req.session.admin
            });
        }
    },

    // Log detayı
    show: async (req, res) => {
        try {
            const log = await Logs.findByPk(req.params.id);

            if (!log) {
                return res.redirect('/admin/logs?error=notfound');
            }

            res.render('admin/logs/show', {
                title: 'Log Detayı',
                layout: 'admin/layout',
                currentPage: 'logs',
                log,
                admin: req.session.admin
            });

        } catch (error) {
            console.error('Admin log show error:', error);
            res.status(500).render('admin/error', {
                title: 'Hata',
                layout: 'admin/layout',
                currentPage: 'logs',
                message: 'Log detayı yüklenirken hata oluştu',
                admin: req.session.admin
            });
        }
    },

    // Logları temizle
    clear: async (req, res) => {
        try {
            // 30 günden eski logları sil
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            await Logs.destroy({
                where: {
                    createdAt: {
                        [Op.lt]: thirtyDaysAgo
                    }
                }
            });

            res.redirect('/admin/logs?success=' + encodeURIComponent('Eski loglar temizlendi!'));

        } catch (error) {
            console.error('Admin logs clear error:', error);
            res.redirect('/admin/logs?error=clear');
        }
    }
};

module.exports = adminLogsController;