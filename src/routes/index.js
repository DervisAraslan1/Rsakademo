// src/routes/index.js - Ana sayfa routes
const express = require('express');
const router = express.Router();
const indexController = require('../controllers/indexController');

// Ana sayfa
router.get('/', indexController.home);

// Hakkımızda, iletişim gibi statik sayfalar
router.get('/about', indexController.about);
router.get('/contact', indexController.contact);
router.post('/contact', indexController.contactPost);

// Sitemap ve robots.txt
router.get('/sitemap.xml', indexController.sitemap);
router.get('/robots.txt', indexController.robots);

module.exports = router;



