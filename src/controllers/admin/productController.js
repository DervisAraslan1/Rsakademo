// src/controllers/admin/productController.js - Admin ürün controller
const { Product, Category, Logs } = require('../../models');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');

const adminProductController = {
    // Ürün listesi
    index: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 20;
            const offset = (page - 1) * limit;
            const search = req.query.search || '';

            let whereCondition = {};
            if (search) {
                whereCondition.name = { [Op.like]: `%${search}%` };
            }

            const { count, rows: products } = await Product.findAndCountAll({
                where: whereCondition,
                include: [{
                    model: Category,
                    as: 'categories',
                    required: false
                }],
                limit,
                offset,
                order: [['createdAt', 'DESC']]
            });

            const totalPages = Math.ceil(count / limit);

            res.render('admin/products/index', {
                title: 'Ürün Yönetimi',
                layout: 'admin/layout',
                products,
                search,
                pagination: {
                    currentPage: page,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            });

        } catch (error) {
            console.error('Admin products index error:', error);
            res.status(500).render('admin/error', {
                title: 'Hata',
                message: 'Ürünler yüklenirken hata oluştu'
            });
        }
    },

    // Ürün ekleme sayfası
    create: async (req, res) => {
        try {
            const categories = await Category.findAll({
                where: { visible: 1 },
                order: [['name', 'ASC']]
            });

            res.render('admin/products/create', {
                title: 'Yeni Ürün Ekle',
                layout: 'admin/layout',
                categories
            });

        } catch (error) {
            console.error('Admin product create page error:', error);
            res.status(500).render('admin/error', {
                title: 'Hata',
                message: 'Sayfa yüklenirken hata oluştu'
            });
        }
    },

    // Ürün ekleme işlemi
    store: async (req, res) => {
        try {
            const { name, description, price, dimensions, material, color, featured, categories } = req.body;

            // Slug oluştur
            const slug = name.toLowerCase()
                .replace(/ş/g, 's')
                .replace(/ğ/g, 'g')
                .replace(/ü/g, 'u')
                .replace(/ö/g, 'o')
                .replace(/ı/g, 'i')
                .replace(/ç/g, 'c')
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');

            // Resim dosyalarını işle
            let images = [];
            if (req.files && req.files.length > 0) {
                images = req.files.map(file => `/uploads/products/${file.filename}`);
            }

            // Ürünü oluştur
            const product = await Product.create({
                name,
                slug,
                description,
                price: price || null,
                dimensions,
                material,
                color,
                featured: featured === '1' ? 1 : 0,
                images
            });

            // Kategorileri bağla
            if (categories && categories.length > 0) {
                const categoryIds = Array.isArray(categories) ? categories : [categories];
                const categoryObjects = await Category.findAll({
                    where: { id: { [Op.in]: categoryIds } }
                });
                await product.setCategories(categoryObjects);
            }

            // Log kaydı
            await Logs.logAction(Logs.ACTIONS.CREATE, 'products', product.id, null, product.toJSON(), req);

            res.redirect('/admin/products?success=created');

        } catch (error) {
            console.error('Admin product store error:', error);
            res.redirect('/admin/products/create?error=create');
        }
    },

    // Ürün detayı
    show: async (req, res) => {
        try {
            const product = await Product.findByPk(req.params.id, {
                include: [{
                    model: Category,
                    as: 'categories'
                }]
            });

            if (!product) {
                return res.status(404).render('admin/404', {
                    title: 'Ürün Bulunamadı'
                });
            }

            res.render('admin/products/show', {
                title: `Ürün: ${product.name}`,
                layout: 'admin/layout',
                product
            });

        } catch (error) {
            console.error('Admin product show error:', error);
            res.status(500).render('admin/error', {
                title: 'Hata',
                message: 'Ürün detayı yüklenirken hata oluştu'
            });
        }
    },

    // Ürün düzenleme sayfası
    edit: async (req, res) => {
        try {
            const product = await Product.findByPk(req.params.id, {
                include: [{
                    model: Category,
                    as: 'categories'
                }]
            });

            if (!product) {
                return res.status(404).render('admin/404', {
                    title: 'Ürün Bulunamadı'
                });
            }

            const categories = await Category.findAll({
                where: { visible: 1 },
                order: [['name', 'ASC']]
            });

            res.render('admin/products/edit', {
                title: `Düzenle: ${product.name}`,
                layout: 'admin/layout',
                product,
                categories
            });

        } catch (error) {
            console.error('Admin product edit error:', error);
            res.status(500).render('admin/error', {
                title: 'Hata',
                message: 'Ürün düzenleme sayfası yüklenirken hata oluştu'
            });
        }
    },

    // Ürün güncelleme işlemi
    update: async (req, res) => {
        try {
            const productId = req.params.id;
            const { name, description, price, dimensions, material, color, featured, categories } = req.body;

            const product = await Product.findByPk(productId);
            if (!product) {
                return res.redirect('/admin/products?error=notfound');
            }

            // Eski değerleri sakla (log için)
            const oldValues = product.toJSON();

            // Slug güncelle
            const slug = name.toLowerCase()
                .replace(/ş/g, 's')
                .replace(/ğ/g, 'g')
                .replace(/ü/g, 'u')
                .replace(/ö/g, 'o')
                .replace(/ı/g, 'i')
                .replace(/ç/g, 'c')
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');

            // Yeni resimler varsa ekle
            let images = product.images || [];
            if (req.files && req.files.length > 0) {
                const newImages = req.files.map(file => `/uploads/products/${file.filename}`);
                images = [...images, ...newImages];
            }

            // Ürünü güncelle
            await product.update({
                name,
                slug,
                description,
                price: price || null,
                dimensions,
                material,
                color,
                featured: featured === '1' ? 1 : 0,
                images
            });

            // Kategorileri güncelle
            if (categories) {
                const categoryIds = Array.isArray(categories) ? categories : [categories];
                const categoryObjects = await Category.findAll({
                    where: { id: { [Op.in]: categoryIds } }
                });
                await product.setCategories(categoryObjects);
            }

            // Log kaydı
            await Logs.logAction(Logs.ACTIONS.UPDATE, 'products', product.id, oldValues, product.toJSON(), req);

            res.redirect('/admin/products?success=updated');

        } catch (error) {
            console.error('Admin product update error:', error);
            res.redirect(`/admin/products/${req.params.id}/edit?error=update`);
        }
    },

    // Ürün silme (soft delete)
    destroy: async (req, res) => {
        try {
            const productId = req.params.id;

            const product = await Product.findByPk(productId);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Ürün bulunamadı'
                });
            }

            // Eski değerleri sakla
            const oldValues = product.toJSON();

            // Soft delete (visible = 0)
            await product.update({ visible: 0 });

            // Log kaydı
            await Logs.logAction(Logs.ACTIONS.DELETE, 'products', product.id, oldValues, { visible: 0 }, req);

            res.json({
                success: true,
                message: 'Ürün başarıyla kaldırıldı'
            });

        } catch (error) {
            console.error('Admin product destroy error:', error);
            res.status(500).json({
                success: false,
                message: 'Ürün kaldırılırken hata oluştu'
            });
        }
    }
};

module.exports = adminProductController;