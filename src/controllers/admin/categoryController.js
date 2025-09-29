// src/controllers/admin/categoryController.js - Admin kategori controller
const { Category, Product, Logs } = require('../../models');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');

const adminCategoryController = {
    // Kategori listesi
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

            const { count, rows: categories } = await Category.findAndCountAll({
                where: whereCondition,
                include: [{
                    model: Product,
                    as: 'products',
                    required: false,
                    where: { visible: 1 },
                    attributes: ['id']
                }],
                limit,
                offset,
                order: [['createdAt', 'DESC']]
            });

            // Her kategorideki ürün sayısını hesapla
            const categoriesWithCount = categories.map(category => {
                const categoryObj = category.toJSON();
                categoryObj.productCount = categoryObj.products ? categoryObj.products.length : 0;
                delete categoryObj.products; // products array'ini kaldır, sadece count'u kullan
                return categoryObj;
            });

            const totalPages = Math.ceil(count / limit);

            res.render('admin/categories/index', {
                title: 'Kategori Yönetimi',
                layout: 'admin/layout',
                categories: categoriesWithCount,
                search,
                pagination: {
                    currentPage: page,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            });

        } catch (error) {
            console.error('Admin categories index error:', error);
            res.status(500).render('admin/error', {
                title: 'Hata',
                message: 'Kategoriler yüklenirken hata oluştu'
            });
        }
    },

    // Kategori ekleme sayfası
    create: async (req, res) => {
        try {
            res.render('admin/categories/create', {
                title: 'Yeni Kategori Ekle',
                layout: 'admin/layout'
            });
        } catch (error) {
            console.error('Admin category create page error:', error);
            res.status(500).render('admin/error', {
                title: 'Hata',
                message: 'Sayfa yüklenirken hata oluştu'
            });
        }
    },

    // Kategori ekleme işlemi
    store: async (req, res) => {
        try {
            const { name } = req.body;

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

            // Resim dosyasını işle
            let image = null;
            if (req.file) {
                image = `/uploads/categories/${req.file.filename}`;
            }

            // Kategoryi oluştur
            const category = await Category.create({
                name,
                slug,
                image
            });

            // Log kaydı
            await Logs.logAction(Logs.ACTIONS.CREATE, 'categories', category.id, null, category.toJSON(), req);

            res.redirect('/admin/categories?success=created');

        } catch (error) {
            console.error('Admin category store error:', error);
            res.redirect('/admin/categories/create?error=create');
        }
    },

    // Kategori düzenleme sayfası
    edit: async (req, res) => {
        try {
            const category = await Category.findByPk(req.params.id);

            if (!category) {
                return res.status(404).render('admin/404', {
                    title: 'Kategori Bulunamadı'
                });
            }

            res.render('admin/categories/edit', {
                title: `Düzenle: ${category.name}`,
                layout: 'admin/layout',
                category
            });

        } catch (error) {
            console.error('Admin category edit error:', error);
            res.status(500).render('admin/error', {
                title: 'Hata',
                message: 'Kategori düzenleme sayfası yüklenirken hata oluştu'
            });
        }
    },

    // Kategori güncelleme işlemi
    update: async (req, res) => {
        try {
            const categoryId = req.params.id;
            const { name } = req.body;

            const category = await Category.findByPk(categoryId);
            if (!category) {
                return res.redirect('/admin/categories?error=notfound');
            }

            // Eski değerleri sakla
            const oldValues = category.toJSON();

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

            // Yeni resim varsa güncelle
            let image = category.image;
            if (req.file) {
                image = `/uploads/categories/${req.file.filename}`;
            }

            // Kategoriyi güncelle
            await category.update({
                name,
                slug,
                image
            });

            // Log kaydı
            await Logs.logAction(Logs.ACTIONS.UPDATE, 'categories', category.id, oldValues, category.toJSON(), req);

            res.redirect('/admin/categories?success=updated');

        } catch (error) {
            console.error('Admin category update error:', error);
            res.redirect(`/admin/categories/${req.params.id}/edit?error=update`);
        }
    },

    // Kategori silme (soft delete)
    destroy: async (req, res) => {
        try {
            const categoryId = req.params.id;

            const category = await Category.findByPk(categoryId);
            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Kategori bulunamadı'
                });
            }

            // Bu kategorideki aktif ürün sayısını kontrol et
            const productCount = await Product.count({
                include: [{
                    model: Category,
                    as: 'categories',
                    where: { id: categoryId },
                    required: true
                }],
                where: { visible: 1 }
            });

            if (productCount > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Bu kategoride ${productCount} adet aktif ürün var. Önce ürünleri başka kategorilere taşıyın.`
                });
            }

            // Eski değerleri sakla
            const oldValues = category.toJSON();

            // Soft delete (visible = 0)
            await category.update({ visible: 0 });

            // Log kaydı
            await Logs.logAction(Logs.ACTIONS.DELETE, 'categories', category.id, oldValues, { visible: 0 }, req);

            res.json({
                success: true,
                message: 'Kategori başarıyla kaldırıldı'
            });

        } catch (error) {
            console.error('Admin category destroy error:', error);
            res.status(500).json({
                success: false,
                message: 'Kategori kaldırılırken hata oluştu'
            });
        }
    }
};

module.exports = adminCategoryController;