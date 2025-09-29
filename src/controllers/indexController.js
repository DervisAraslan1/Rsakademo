// src/controllers/indexController.js - Ana sayfa controller
const { Product, Category, Slider, Settings } = require('../models');
const { Op } = require('sequelize');

const indexController = {
    // Ana sayfa
    home: async (req, res) => {
        try {
            // Slider'ları getir
            const sliders = await Slider.findAll({
                where: { visible: 1 },
                order: [['order', 'ASC'], ['createdAt', 'DESC']],
                limit: 5
            });

            // Öne çıkan ürünler
            const featuredCount = await Settings.getSetting('featured_products_count', 8);
            const featuredProducts = await Product.findAll({
                where: {
                    visible: 1,
                    featured: 1
                },
                include: [{
                    model: Category,
                    as: 'categories',
                    where: { visible: 1 },
                    required: false
                }],
                limit: parseInt(featuredCount),
                order: [['createdAt', 'DESC']]
            });

            // Kategoriler
            const categories = await Category.findAll({
                where: { visible: 1 },
                limit: 8,
                order: [['createdAt', 'DESC']]
            });

            res.render('pages/home', {
                title: 'Ana Sayfa',
                sliders,
                featuredProducts,
                categories
            });

        } catch (error) {
            console.error('Home page error:', error);
            res.status(500).render('pages/error', {
                title: 'Hata',
                message: 'Ana sayfa yüklenirken hata oluştu'
            });
        }
    },

    // Hakkımızda sayfası
    about: async (req, res) => {
        try {
            const aboutContent = await Settings.getSetting('about_content', 'Hakkımızda içeriği burada olacak.');

            res.render('pages/about', {
                title: 'Hakkımızda',
                content: aboutContent
            });
        } catch (error) {
            console.error('About page error:', error);
            res.status(500).render('pages/error', {
                title: 'Hata',
                message: 'Sayfa yüklenirken hata oluştu'
            });
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