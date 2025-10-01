// src/controllers/indexController.js - Ana sayfa controller
const { Product, Category, Slider, Settings } = require('../models');
const { Op } = require('sequelize');

const indexController = {
    // Ana sayfa
    home: async (req, res) => {
        try {
            // Ana kategoriler ve alt kategorileri getir
            const categories = await Category.findAll({
                where: {
                    visible: 1,
                    parent_id: null
                },
                include: [{
                    model: Category,
                    as: 'children',
                    where: { visible: 1 },
                    required: false
                }],
                order: [['name', 'ASC']]
            });

            // Settings
            const settingsArray = await Settings.findAll();
            const settings = {};
            settingsArray.forEach(setting => {
                settings[setting.key] = setting.value;
            });

            res.render('pages/home', {
                title: settings.site_title || 'RSAKA',
                categories,
                settings
            });

        } catch (error) {
            console.error('Home page error:', error);
            res.status(500).send('Sayfa yüklenirken hata oluştu');
        }
    },

    // Hakkımızda sayfası
    // indexController.js - about metodu
    about: async (req, res) => {
        try {
            const settingsArray = await Settings.findAll();
            const settings = {};
            settingsArray.forEach(setting => {
                settings[setting.key] = setting.value;
            });

            res.render('pages/about', {
                title: settings.site_name || 'RSAKA',
                content: settings.about_us || 'Hakkımızda içeriği henüz eklenmemiş.'
            });
        } catch (error) {
            console.error('About page error:', error);
            res.status(500).send('Sayfa yüklenirken hata oluştu');
        }
    },

    // İletişim sayfası
    contact: async (req, res) => {
        try {
            const contactInfo = {
                email: await Settings.getSetting('contact_email', 'info@mobilyadunyasi.com'),
                phone: await Settings.getSetting('contact_phone', '+90 532 123 45 67'),
                address: await Settings.getSetting('contact_address', 'İstanbul, Türkiye')
            };

            res.render('pages/contact', {
                title: 'İletişim',
                contactInfo
            });
        } catch (error) {
            console.error('Contact page error:', error);
            res.status(500).render('pages/error', {
                title: 'Hata',
                message: 'Sayfa yüklenirken hata oluştu'
            });
        }
    },

    // İletişim form submit
    contactPost: async (req, res) => {
        try {
            const { name, email, phone, message } = req.body;

            // TODO: Email gönderme işlemi burada olacak
            console.log('Contact form:', { name, email, phone, message });

            res.json({
                success: true,
                message: 'Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.'
            });
        } catch (error) {
            console.error('Contact form error:', error);
            res.status(500).json({
                success: false,
                message: 'Mesaj gönderilirken hata oluştu.'
            });
        }
    },

    // SEO - Sitemap
    sitemap: async (req, res) => {
        try {
            const products = await Product.findAll({
                where: { visible: 1 },
                attributes: ['slug', 'updatedAt']
            });

            const categories = await Category.findAll({
                where: { visible: 1 },
                attributes: ['slug', 'updatedAt']
            });

            res.set('Content-Type', 'text/xml');
            res.render('sitemap', { products, categories });
        } catch (error) {
            console.error('Sitemap error:', error);
            res.status(500).send('Sitemap oluşturulamadı');
        }
    },

    // SEO - Robots.txt
    robots: (req, res) => {
        res.set('Content-Type', 'text/plain');
        res.send(`User-agent: *
Allow: /
Disallow: /admin/
Sitemap: ${process.env.APP_URL}/sitemap.xml`);
    }
};

module.exports = indexController;