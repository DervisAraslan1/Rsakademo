// src/routes/admin.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminProductController = require('../controllers/admin/productController');
const adminCategoryController = require('../controllers/admin/categoryController');
const adminSliderController = require('../controllers/admin/sliderController');
const adminSettingsController = require('../controllers/admin/settingsController');
const adminLogsController = require('../controllers/admin/logsController');
const { adminAuth } = require('../middleware/adminAuth');
const { uploadMiddleware } = require('../middleware/upload');
const loadAdminSettings = require('../middleware/adminSettings');
const passAdminToLayout = require('../middleware/passAdminToLayout');

// Tüm admin route'larına settings middleware'ini ekle
router.use(loadAdminSettings);
router.use(passAdminToLayout);

// Admin login (auth olmadan)
router.get('/login', adminController.loginPage);
router.post('/login', adminController.login);
router.get('/logout', adminController.logout);

// Admin auth middleware - bundan sonraki tüm route'lar auth gerektirir
router.use(adminAuth);

// Dashboard
router.get('/', adminController.dashboard);
router.get('/dashboard', adminController.dashboard);

// Products Management
router.get('/products', adminProductController.index);
router.get('/products/create', adminProductController.create);
router.post('/products', uploadMiddleware.array('images', 5), adminProductController.store);
router.get('/products/:id/edit', adminProductController.edit);
router.post('/products/:id/update', uploadMiddleware.array('images', 5), adminProductController.update);
router.post('/products/:id/delete', adminProductController.destroy);
router.get('/products/:id', adminProductController.show); // Detay sayfası en sona

// Categories Management
router.get('/categories', adminCategoryController.index);
router.get('/categories/create', adminCategoryController.create);
router.post('/categories', adminCategoryController.store);
router.get('/categories/:id/edit', adminCategoryController.edit);
router.post('/categories/:id/update', adminCategoryController.update);
router.get('/categories/:id/delete', adminCategoryController.deleteForm);
router.post('/categories/:id/delete', adminCategoryController.destroy);
router.post('/categories/:id/set-parent', adminCategoryController.setParent);

// Slider Management
router.get('/sliders', adminSliderController.index);
router.get('/sliders/create', adminSliderController.create);
router.post('/sliders', uploadMiddleware.single('image'), adminSliderController.store);
router.get('/sliders/:id/edit', adminSliderController.edit);
router.post('/sliders/:id/update', uploadMiddleware.single('image'), adminSliderController.update);
router.post('/sliders/:id/delete', adminSliderController.destroy);
router.post('/sliders/:id/order', adminSliderController.updateOrder);

// Settings Management
router.get('/settings', adminSettingsController.index);
router.post('/settings', uploadMiddleware.fields([
    { name: 'site_logo', maxCount: 1 },
    { name: 'site_favicon', maxCount: 1 },
    { name: 'default_product_image', maxCount: 1 },
    { name: 'home_background', maxCount: 1 }
]), adminSettingsController.update);

// Logs Management
router.get('/logs', adminLogsController.index);
router.get('/logs/:id', adminLogsController.show);
router.post('/logs/clear', adminLogsController.clear);

module.exports = router;