// src/controllers/admin/logsController.js - Admin log controller
const { Logs } = require('../../models');
const { Op } = require('sequelize');

const adminLogsController = {
    // Log listesi
    index: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 50;
            const offset = (page - 1) * limit;

            // Filtreler
            const action = req.query.action || '';
            const table = req.query.table || '';
            const dateFrom = req.query.date_from || '';
            const dateTo = req.query.date_to || '';

            let whereCondition = {};

            if (action) {
                whereCondition.action = action;
            }

            if (table) {
                whereCondition.table_name = table;
            }

            if (dateFrom || dateTo) {
                whereCondition.createdAt = {};
                if (dateFrom) {
                    whereCondition.createdAt[Op.gte] = new Date(dateFrom);
                }
                if (dateTo) {
                    whereCondition.createdAt[Op.lte] = new Date(dateTo + ' 23:59:59');
                }
            }

            const { count, rows: logs } = await Logs.findAndCountAll({
                where: whereCondition,
                limit,
                offset,
                order: [['createdAt', 'DESC']]
            });

            // Filtre seçenekleri için unique değerleri al
            const actions = await Logs.findAll({
                attributes: ['action'],
                group: ['action'],
                order: [['action', 'ASC']]
            });

            const tables = await Logs.findAll({
                attributes: ['table_name'],
                group: ['table_name'],
                order: [['table_name', 'ASC']]
            });

            const totalPages = Math.ceil(count / limit);

            res.render('admin/logs/index', {
                title: 'Aktivite Logları',
                layout: 'admin/layout',
                logs,
                filters: {
                    action,
                    table,
                    dateFrom,
                    dateTo
                },
                filterOptions: {
                    actions: actions.map(a => a.action),
                    tables: tables.map(t => t.table_name)
                },
                pagination: {
                    currentPage: page,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1,
                    totalItems: count
                }
            });

        } catch (error) {
            console.error('Admin logs index error:', error);
            res.status(500).render('admin/error', {
                title: 'Hata',
                message: 'Loglar yüklenirken hata oluştu'
            });
        }
    },

    // Log detayı
    show: async (req, res) => {
        try {
            const log = await Logs.findByPk(req.params.id);

            if (!log) {
                return res.status(404).render('admin/404', {
                    title: 'Log Bulunamadı'
                });
            }

            res.render('admin/logs/show', {
                title: `Log Detayı #${log.id}`,
                layout: 'admin/layout',
                log
            });

        } catch (error) {
            console.error('Admin log show error:', error);
            res.status(500).render('admin/error', {
                title: 'Hata',
                message: 'Log detayı yüklenirken hata oluştu'
            });
        }
    },

    // Log temizleme
    clear: async (req, res) => {
        try {
            const daysToKeep = parseInt(req.body.days) || 30;
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

            const deletedCount = await Logs.destroy({
                where: {
                    createdAt: {
                        [Op.lt]: cutoffDate
                    }
                }
            });

            // Bu temizleme işlemini de logla
            await Logs.logAction(
                'CLEAR_LOGS',
                'logs',
                null,
                null,
                { deleted_count: deletedCount, days_kept: daysToKeep },
                req
            );

            res.json({
                success: true,
                message: `${deletedCount} adet log kaydı temizlendi. Son ${daysToKeep} günün kayıtları korundu.`
            });

        } catch (error) {
            console.error('Admin logs clear error:', error);
            res.status(500).json({
                success: false,
                message: 'Log temizleme işlemi sırasında hata oluştu'
            });
        }
    }
};

module.exports = adminLogsController;