// src/controllers/admin/sliderController.js
const { Slider, Logs } = require('../../models');
const path = require('path');
const fs = require('fs');

const adminSliderController = {
    // Slider listesi
    index: async (req, res) => {
        try {
            const sliders = await Slider.findAll({
                where: { visible: 1 },
                order: [['order', 'ASC'], ['createdAt', 'DESC']]
            });

            // Success/error mesajları
            let success = null;
            let error = null;

            if (req.query.success) {
                success = req.query.success;
            }
            if (req.query.error) {
                const errors = {
                    'notfound': 'Slider bulunamadı',
                    'delete': 'Slider kaldırılırken hata oluştu',
                    'create': 'Slider oluşturulurken hata oluştu',
                    'update': 'Slider güncellenirken hata oluştu'
                };
                error = errors[req.query.error] || 'Bir hata oluştu';
            }

            res.render('admin/sliders/index', {
                title: 'Slider Yönetimi',
                layout: 'admin/layout',
                currentPage: 'sliders',
                sliders,
                success,
                error,
                admin: req.session.admin
            });

        } catch (error) {
            console.error('Admin sliders index error:', error);
            res.status(500).render('admin/error', {
                title: 'Hata',
                layout: 'admin/layout',
                currentPage: 'sliders',
                message: 'Sliderlar yüklenirken hata oluştu',
                admin: req.session.admin
            });
        }
    },

    // Slider ekleme sayfası
    create: async (req, res) => {
        try {
            // Mevcut slider sayısını al (sıralama için)
            const sliderCount = await Slider.count({ where: { visible: 1 } });

            res.render('admin/sliders/create', {
                title: 'Yeni Slider Ekle',
                layout: 'admin/layout',
                currentPage: 'sliders',
                nextOrder: sliderCount + 1,
                admin: req.session.admin
            });

        } catch (error) {
            console.error('Admin slider create page error:', error);
            res.status(500).render('admin/error', {
                title: 'Hata',
                layout: 'admin/layout',
                currentPage: 'sliders',
                message: 'Sayfa yüklenirken hata oluştu',
                admin: req.session.admin
            });
        }
    },

    // Slider ekleme işlemi
    store: async (req, res) => {
        try {
            const { title, subtitle, button_text, button_link, order } = req.body;

            // Resim dosyasını işle
            if (!req.file) {
                return res.redirect('/admin/sliders/create?error=create');
            }

            const image = `/uploads/sliders/${req.file.filename}`;

            // Slider'ı oluştur
            const slider = await Slider.create({
                title,
                subtitle,
                image,
                button_text,
                button_link,
                order: parseInt(order) || 1
            });

            // Log kaydı
            await Logs.logAction(Logs.ACTIONS.CREATE, 'sliders', slider.id, null, slider.toJSON(), req);

            res.redirect('/admin/sliders?success=' + encodeURIComponent('Slider başarıyla eklendi!'));

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
                return res.redirect('/admin/sliders?error=notfound');
            }

            res.render('admin/sliders/edit', {
                title: `Slider Düzenle: ${slider.title}`,
                layout: 'admin/layout',
                currentPage: 'sliders',
                slider,
                admin: req.session.admin
            });

        } catch (error) {
            console.error('Admin slider edit error:', error);
            res.status(500).render('admin/error', {
                title: 'Hata',
                layout: 'admin/layout',
                currentPage: 'sliders',
                message: 'Slider düzenleme sayfası yüklenirken hata oluştu',
                admin: req.session.admin
            });
        }
    },

    // Slider güncelleme işlemi
    update: async (req, res) => {
        try {
            const sliderId = req.params.id;
            const { title, subtitle, button_text, button_link, order } = req.body;

            const slider = await Slider.findByPk(sliderId);
            if (!slider) {
                return res.redirect('/admin/sliders?error=notfound');
            }

            // Eski değerleri sakla
            const oldValues = slider.toJSON();

            // Yeni resim varsa güncelle
            let image = slider.image;
            if (req.file) {
                // Eski resmi sil
                if (slider.image) {
                    const oldImagePath = path.join(__dirname, '../../public', slider.image);
                    if (fs.existsSync(oldImagePath)) {
                        fs.unlinkSync(oldImagePath);
                    }
                }
                image = `/uploads/sliders/${req.file.filename}`;
            }

            // Slider'ı güncelle
            await slider.update({
                title,
                subtitle,
                image,
                button_text,
                button_link,
                order: parseInt(order) || 1
            });

            // Log kaydı
            await Logs.logAction(Logs.ACTIONS.UPDATE, 'sliders', slider.id, oldValues, slider.toJSON(), req);

            res.redirect('/admin/sliders?success=' + encodeURIComponent('Slider başarıyla güncellendi!'));

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
                return res.redirect('/admin/sliders?error=notfound');
            }

            // Eski değerleri sakla
            const oldValues = slider.toJSON();

            // Soft delete
            await slider.update({ visible: 0 });

            // Log kaydı
            await Logs.logAction(Logs.ACTIONS.DELETE, 'sliders', slider.id, oldValues, { visible: 0 }, req);

            res.redirect('/admin/sliders?success=' + encodeURIComponent('Slider başarıyla kaldırıldı!'));

        } catch (error) {
            console.error('Admin slider destroy error:', error);
            res.redirect('/admin/sliders?error=delete');
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

            await slider.update({ order: parseInt(order) });

            res.json({
                success: true,
                message: 'Sıralama güncellendi'
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