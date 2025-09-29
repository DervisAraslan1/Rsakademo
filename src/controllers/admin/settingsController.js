
// src/controllers/admin/settingsController.js - Admin ayarlar controller
const { Settings, Logs } = require('../../models');

const adminSettingsController = {
    // Ayarlar sayfası
    index: async (req, res) => {
        try {
            // Tüm ayarları getir
            const allSettings = await Settings.findAll({
                where: { visible: 1 },
                order: [['key', 'ASC']]
            });

            // Ayarları kategorilere göre grupla
            const settingsObj = {};
            allSettings.forEach(setting => {
                let value = setting.value;

                // Type'a göre değeri parse et
                if (setting.type === 'json') {
                    try {
                        value = JSON.parse(value);
                    } catch (e) {
                        value = {};
                    }
                } else if (setting.type === 'boolean') {
                    value = value === 'true' || value === '1';
                } else if (setting.type === 'number') {
                    value = parseFloat(value) || 0;
                }

                settingsObj[setting.key] = {
                    value: value,
                    type: setting.type,
                    description: setting.description
                };
            });

            res.render('admin/settings/index', {
                title: 'Site Ayarları',
                layout: 'admin/layout',
                settings: settingsObj
            });

        } catch (error) {
            console.error('Admin settings index error:', error);
            res.status(500).render('admin/error', {
                title: 'Hata',
                message: 'Ayarlar yüklenirken hata oluştu'
            });
        }
    },

    // Ayarları güncelleme
    update: async (req, res) => {
        try {
            const formData = req.body;
            const files = req.files || {};

            // Her form alanını işle
            for (const [key, value] of Object.entries(formData)) {
                if (key === '_csrf') continue; // CSRF token'ı atla

                // Mevcut ayarı bul
                const existingSetting = await Settings.findOne({ where: { key } });
                const oldValue = existingSetting ? existingSetting.value : null;

                // Ayar tipini belirle
                let settingType = 'text';
                if (key.includes('_count') || key.includes('_limit')) {
                    settingType = 'number';
                } else if (key.includes('_mode') || key.includes('_enabled')) {
                    settingType = 'boolean';
                } else if (key === 'social_links') {
                    settingType = 'json';
                }

                // JSON ayarları için özel işlem
                let processedValue = value;
                if (settingType === 'json' && key === 'social_links') {
                    // Social links alanları form'dan geliyorsa birleştir
                    const socialLinks = {
                        facebook: formData['social_facebook'] || '',
                        instagram: formData['social_instagram'] || '',
                        twitter: formData['social_twitter'] || '',
                        youtube: formData['social_youtube'] || ''
                    };
                    processedValue = JSON.stringify(socialLinks);
                } else if (settingType === 'boolean') {
                    processedValue = value ? 'true' : 'false';
                }

                // Ayarı kaydet veya güncelle
                await Settings.setSetting(key, processedValue, settingType);

                // Log kaydı
                if (oldValue !== processedValue) {
                    await Logs.logAction(
                        Logs.ACTIONS.UPDATE,
                        'settings',
                        null,
                        { [key]: oldValue },
                        { [key]: processedValue },
                        req
                    );
                }
            }

            // File uploads'ları işle
            if (files.site_logo && files.site_logo[0]) {
                const logoPath = `/uploads/misc/${files.site_logo[0].filename}`;
                await Settings.setSetting('site_logo', logoPath, 'image', 'Site logosu');
                await Logs.logAction(Logs.ACTIONS.UPDATE, 'settings', null, null, { site_logo: logoPath }, req);
            }

            if (files.site_favicon && files.site_favicon[0]) {
                const faviconPath = `/uploads/misc/${files.site_favicon[0].filename}`;
                await Settings.setSetting('site_favicon', faviconPath, 'image', 'Site favicon');
                await Logs.logAction(Logs.ACTIONS.UPDATE, 'settings', null, null, { site_favicon: faviconPath }, req);
            }

            res.redirect('/admin/settings?success=updated');

        } catch (error) {
            console.error('Admin settings update error:', error);
            res.redirect('/admin/settings?error=update');
        }
    }
};

module.exports = adminSettingsController;