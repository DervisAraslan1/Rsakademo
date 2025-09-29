// src/routes/api.js - API routes (AJAX için)
const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');

// Public API
router.get('/products', apiController.products);
router.get('/products/:id', apiController.product);
router.get('/categories', apiController.categories);
router.get('/sliders', apiController.sliders);
router.get('/settings', apiController.settings);

// Search API
router.get('/search/products', apiController.searchProducts);
router.get('/search/suggestions', apiController.searchSuggestions);

// Popular/Recent products (LocalStorage bazlı)
router.post('/products/view', apiController.addProductView);
router.get('/products/recent', apiController.recentProducts);

// Filter API
router.get('/products/filter', apiController.filterProducts);
router.get('/categories/:slug/products', apiController.categoryProducts);

module.exports = router;
