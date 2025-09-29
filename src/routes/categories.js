// src/routes/categories.js - Kategori routes
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

// Kategori sayfası
router.get('/:slug', categoryController.show);

// Alt kategori
router.get('/:parentSlug/:slug', categoryController.showSubCategory);

module.exports = router;