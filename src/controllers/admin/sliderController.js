// src/controllers/admin/sliderController.js - Admin slider controller
const { Slider, Logs } = require('../../models');
const { Op } = require('sequelize');

const adminSliderController = {
    // Slider listesi
    index: async (req, res) => {
        try {
            const sliders = await Slider.findAll({
                order: [['order', 'ASC'], ['createdAt', 'DESC']]
            });

            res.render('admin/sliders/index', {
                title: 'Slider Yönetimi',
                layout: 'admin/layout',
                sliders
            });

        } catch (error) {
            console.error('Admin sliders index error:', error);
            res.status(500).render('admin/error', {
                title: 'Hata',
                message: 'Slider\'lar yüklenirken hata oluştu'
            });
        }
    },

    // Slider ekleme sayfası
    create: async (req, res) => {
        try {
            // En yüksek order değerini bul (yeni slide en sona eklenecek)
            const maxOrder = await Slider.max('order') || 0;

            res.render('admin/sliders/create', {
                title: 'Yeni Slider Ekle',
                layout: 'admin/layout',
                nextOrder: maxOrder + 1
            });

        } catch (error) {
            console.error('Admin slider create page error:', error);
            res.status(500).render('admin/error', {
                title: 'Hata',
                message: 'Sayfa yüklenirken hata oluştu'
            });
        }
    },

    // Slider ekleme işlemi
    store: async (req, res) => {
        try {
            const { title, subtitle, link, button_text, order } = req.body;

            // Resim dosyası zorunlu
            if (!req.file) {
                return res.redirect('/admin/sliders/create?error=image_required');
            }

            const image = `/uploads/sliders/${req.file.filename}`;

            // Slider oluştur
            const slider = await Slider.create({
                title,
                subtitle,
                image,
                link,
                button_text: button_text || 'Daha Fazla',
                order: parseInt(order) || 0
            });

            // Log kaydı
            await Logs.logAction(Logs.ACTIONS.CREATE, 'sliders', slider.id, null, slider.toJSON(), req);

            res.redirect('/admin/sliders?success=created');

        } catch (error) {
            console.error('Admin slider store error:', error);
            res.redirect('/admin/sliders/create?error=create');
        }
    },

    // Slider düzenleme sayfası
    edit: async (req, res) => {
        try {
            const slider = await Slider.findByPk(req.params.id);

            if (!slider) {
                return res.status(404).render('admin/404', {
                    title: 'Slider Bulunamadı'
                });
            }

            res.render('admin/sliders/edit', {
                title: `Düzenle: ${slider.title}`,
                layout: 'admin/layout',
                slider
            });

        } catch (error) {
            console.error('Admin slider edit error:', error);
            res.status(500).render('admin/error', {
                title: 'Hata',
                message: 'Slider düzenleme sayfası yüklenirken hata oluştu'
            });
        }
    },

    // Slider güncelleme işlemi
    update: async (req, res) => {
        try {
            const sliderId = req.params.id;
            const { title, subtitle, link, button_text, order } = req.body;

            const slider = await Slider.findByPk(sliderId);
            if (!slider) {
                return res.redirect('/admin/sliders?error=notfound');
            }

            // Eski değerleri sakla
            const oldValues = slider.toJSON();

            // Yeni resim varsa güncelle, yoksa eskisini koru
            let image = slider.image;
            if (req.file) {
                image = `/uploads/sliders/${req.file.filename}`;
            }

            // Slider'ı güncelle
            await slider.update({
                title,
                subtitle,
                image,
                link,
                button_text: button_text || 'Daha Fazla',
                order: parseInt(order) || 0
            });

            // Log kaydı
            await Logs.logAction(Logs.ACTIONS.UPDATE, 'sliders', slider.id, oldValues, slider.toJSON(), req);

            res.redirect('/admin/sliders?success=updated');

        } catch (error) {
            console.error('Admin slider update error:', error);
            res.redirect(`/admin/sliders/${req.params.id}/edit?error=update`);
        }
    },

    // Slider silme (soft delete)
    destroy: async (req, res) => {
        try {
            const sliderId = req.params.id;

            const slider = await Slider.findByPk(sliderId);
            if (!slider) {
                return res.status(404).json({
                    success: false,
                    message: 'Slider bulunamadı'
                });
            }

            // Eski değerleri sakla
            const oldValues = slider.toJSON();

            // Soft delete (visible = 0)
            await slider.update({ visible: 0 });

            // Log kaydı
            await Logs.logAction(Logs.ACTIONS.DELETE, 'sliders', slider.id, oldValues, { visible: 0 }, req);

            res.json({
                success: true,
                message: 'Slider başarıyla kaldırıldı'
            });

        } catch (error) {
            console.error('Admin slider destroy error:', error);
            res.status(500).json({
                success: false,
                message: 'Slider kaldırılırken hata oluştu'
            });
        }
    },

    // Slider sıralama güncelleme
    updateOrder: async (req, res) => {
        try {
            const sliderId = req.params.id;
            const { order } = req.body;

            const slider = await Slider.findByPk(sliderId);
            if (!slider) {
                return res.status(404).json({
                    success: false,
                    message: 'Slider bulunamadı'
                });
            }

            // Eski değerleri sakla
            const oldValues = slider.toJSON();

            // Order güncelle
            await slider.update({ order: parseInt(order) || 0 });

            // Log kaydı
            await Logs.logAction(Logs.ACTIONS.UPDATE, 'sliders', slider.id, oldValues, { order: slider.order }, req);

            res.json({
                success: true,
                message: 'Slider sıralaması güncellendi'
            });

        } catch (error) {
            console.error('Admin slider update order error:', error);
            res.status(500).json({
                success: false,
                message: 'Sıralama güncellenirken hata oluştu'
            });
        }
    }
};

module.exports = adminSliderController;