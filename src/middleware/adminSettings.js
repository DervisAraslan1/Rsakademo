// src/middleware/adminSettings.js
const { Settings } = require('../models');

const loadAdminSettings = async (req, res, next) => {
    try {
        // Tüm ayarları çek
        const settingsArray = await Settings.findAll();

        // Key-value objesine çevir
        const settings = {};
        settingsArray.forEach(setting => {
            settings[setting.key] = setting.value;
        });

        // res.locals'a ekle (tüm view'larda kullanılabilir)
        res.locals.settings = settings;

        next();
    } catch (error) {
        console.error('Admin settings load error:', error);
        res.locals.settings = {
            site_name: 'Mobilya Dünyası' // Varsayılan değer
        };
        next();
    }
};

module.exports = loadAdminSettings;