// src/routes/products.js - Ürün routes
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// Tüm ürünler
router.get('/', productController.index);

// Ürün detayı
router.get('/:slug', productController.show);


// Arama
router.get('/search', productController.search);

// Favoriler (LocalStorage bazlı)
router.post('/favorites/add', productController.addToFavorites);
router.post('/favorites/remove', productController.removeFromFavorites);

module.exports = router;