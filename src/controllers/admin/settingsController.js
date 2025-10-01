// src/controllers/admin/settingsController.js
const { Settings, Logs } = require('../../models');
const path = require('path');
const fs = require('fs');

const adminSettingsController = {
    // Settings sayfası
    index: async (req, res) => {
        try {
            // Tüm ayarları çek
            const settingsArray = await Settings.findAll();

            // Ayarları key-value objesine çevir
            const settings = {};
            settingsArray.forEach(setting => {
                settings[setting.key] = setting.value;
            });

            // Success/error mesajları
            let success = null;
            let error = null;

            if (req.query.success) {
                success = req.query.success;
            }
            if (req.query.error) {
                error = 'Ayarlar güncellenirken hata oluştu';
            }

            res.render('admin/settings/index', {
                title: 'Site Ayarları',
                layout: 'admin/layout',
                currentPage: 'settings',
                settings,
                success,
                error,
                admin: req.session.admin
            });

        } catch (error) {
            console.error('Admin settings index error:', error);
            res.status(500).render('admin/error', {
                title: 'Hata',
                layout: 'admin/layout',
                currentPage: 'settings',
                message: 'Ayarlar yüklenirken hata oluştu',
                admin: req.session.admin
            });
        }
    },

    update: async (req, res) => {
        try {
            const {
                site_name,
                site_description,
                site_keywords,
                contact_email,
                contact_phone,
                contact_address,
                about_us,  // ✅ YENİ
                social_facebook,
                social_instagram,
                social_twitter,
                social_linkedin
            } = req.body;

            // Ayarları güncelle
            const settingsToUpdate = {
                site_name,
                site_description,
                site_keywords,
                contact_email,
                contact_phone,
                contact_address,
                about_us,  // ✅ YENİ
                social_facebook,
                social_instagram,
                social_twitter,
                social_linkedin
            };

            for (const [key, value] of Object.entries(settingsToUpdate)) {
                if (value !== undefined) {
                    await Settings.upsert({
                        key,
                        value: value || ''
                    });
                }
            }

            // Logo, favicon ve default product image işle
            if (req.files) {
                // Site Logo
                if (req.files.site_logo && req.files.site_logo.length > 0) {
                    const logoPath = `/uploads/settings/${req.files.site_logo[0].filename}`;
                    const oldLogo = await Settings.findOne({ where: { key: 'site_logo' } });
                    if (oldLogo && oldLogo.value) {
                        const oldLogoPath = path.join(__dirname, '../../public', oldLogo.value);
                        if (fs.existsSync(oldLogoPath)) {
                            fs.unlinkSync(oldLogoPath);
                        }
                    }
                    await Settings.upsert({
                        key: 'site_logo',
                        value: logoPath
                    });
                }

                // Favicon
                if (req.files.site_favicon && req.files.site_favicon.length > 0) {
                    const faviconPath = `/uploads/settings/${req.files.site_favicon[0].filename}`;
                    const oldFavicon = await Settings.findOne({ where: { key: 'site_favicon' } });
                    if (oldFavicon && oldFavicon.value) {
                        const oldFaviconPath = path.join(__dirname, '../../public', oldFavicon.value);
                        if (fs.existsSync(oldFaviconPath)) {
                            fs.unlinkSync(oldFaviconPath);
                        }
                    }
                    await Settings.upsert({
                        key: 'site_favicon',
                        value: faviconPath
                    });
                }

                // ✅ Default Product Image
                if (req.files.default_product_image && req.files.default_product_image.length > 0) {
                    const imagePath = `/uploads/settings/${req.files.default_product_image[0].filename}`;
                    const oldImage = await Settings.findOne({ where: { key: 'default_product_image' } });
                    if (oldImage && oldImage.value) {
                        const oldImagePath = path.join(__dirname, '../../public', oldImage.value);
                        if (fs.existsSync(oldImagePath)) {
                            fs.unlinkSync(oldImagePath);
                        }
                    }
                    await Settings.upsert({
                        key: 'default_product_image',
                        value: imagePath
                    });
                }
            }

            // Log kaydı
            await Logs.logAction(Logs.ACTIONS.UPDATE, 'settings', null, null, settingsToUpdate, req);

            res.redirect('/admin/settings?success=' + encodeURIComponent('Ayarlar başarıyla güncellendi!'));

        } catch (error) {
            console.error('Admin settings update error:', error);
            res.redirect('/admin/settings?error=update');
        }
    }
};

module.exports = adminSettingsController;