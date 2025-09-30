// src/controllers/admin/categoryController.js
const { Category, Product, Logs } = require('../../models');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');

const adminCategoryController = {
    // Kategori listesi
    index: async (req, res) => {
        try {
            const categories = await Category.findAll({
                where: { visible: 1 },
                include: [{
                    model: Product,
                    as: 'products',
                    required: false,
                    where: { visible: 1 }
                }],
                order: [['name', 'ASC']]
            });

            // Her kategorideki ürün sayısını hesapla
            const categoriesWithCount = categories.map(cat => {
                const categoryData = cat.toJSON();
                categoryData.productCount = cat.products ? cat.products.length : 0;
                return categoryData;
            });

            // Success/error mesajları
            let success = null;
            let error = null;

            if (req.query.success) {
                success = req.query.success;
            }
            if (req.query.error) {
                const errors = {
                    'notfound': 'Kategori bulunamadı',
                    'delete': 'Kategori kaldırılırken hata oluştu',
                    'create': 'Kategori oluşturulurken hata oluştu',
                    'update': 'Kategori güncellenirken hata oluştu'
                };
                error = errors[req.query.error] || 'Bir hata oluştu';
            }

            res.render('admin/categories/index', {
                title: 'Kategori Yönetimi',
                layout: 'admin/layout',
                currentPage: 'categories',
                categories: categoriesWithCount,
                success,
                error,
                admin: req.session.admin
            });

        } catch (error) {
            console.error('Admin categories index error:', error);
            res.status(500).render('admin/error', {
                title: 'Hata',
                layout: 'admin/layout',
                currentPage: 'categories',
                message: 'Kategoriler yüklenirken hata oluştu',
                admin: req.session.admin
            });
        }
    },

    // Kategori ekleme sayfası
    create: async (req, res) => {
        try {
            res.render('admin/categories/create', {
                title: 'Yeni Kategori Ekle',
                layout: 'admin/layout',
                currentPage: 'categories',
                admin: req.session.admin
            });

        } catch (error) {
            console.error('Admin category create page error:', error);
            res.status(500).render('admin/error', {
                title: 'Hata',
                layout: 'admin/layout',
                currentPage: 'categories',
                message: 'Sayfa yüklenirken hata oluştu',
                admin: req.session.admin
            });
        }
    },

    // Kategori ekleme işlemi
    store: async (req, res) => {
        try {
            const { name, description } = req.body;

            // Slug oluştur
            let slug = name.toLowerCase()
                .replace(/ş/g, 's')
                .replace(/ğ/g, 'g')
                .replace(/ü/g, 'u')
                .replace(/ö/g, 'o')
                .replace(/ı/g, 'i')
                .replace(/ç/g, 'c')
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');

            // Slug kontrolü
            const existingCategory = await Category.findOne({
                where: {
                    slug: slug,
                    visible: 1
                }
            });

            if (existingCategory) {
                let counter = 2;
                let tempSlug = `${slug}-${counter}`;

                while (await Category.findOne({
                    where: {
                        slug: tempSlug,
                        visible: 1
                    }
                })) {
                    counter++;
                    tempSlug = `${slug}-${counter}`;
                }

                slug = tempSlug;
            }

            // Kategoriyi oluştur
            const category = await Category.create({
                name,
                slug,
                description: description || null
            });

            // Log kaydı
            await Logs.logAction(Logs.ACTIONS.CREATE, 'categories', category.id, null, category.toJSON(), req);

            // ✅ Kategoriler sayfasına yönlendir
            res.redirect('/admin/categories?success=' + encodeURIComponent('Kategori başarıyla eklendi!'));

        } catch (error) {
            console.error('Admin category store error:', error);
            // ✅ Hata durumunda kategori oluşturma sayfasına dön
            res.redirect('/admin/categories/create?error=create');
        }
    },

    // Kategori düzenleme sayfası
    edit: async (req, res) => {
        try {
            const category = await Category.findByPk(req.params.id);

            if (!category) {
                return res.redirect('/admin/categories?error=notfound');
            }

            res.render('admin/categories/edit', {
                title: `Düzenle: ${category.name}`,
                layout: 'admin/layout',
                currentPage: 'categories',
                category,
                admin: req.session.admin
            });

        } catch (error) {
            console.error('Admin category edit error:', error);
            res.status(500).render('admin/error', {
                title: 'Hata',
                layout: 'admin/layout',
                currentPage: 'categories',
                message: 'Kategori düzenleme sayfası yüklenirken hata oluştu',
                admin: req.session.admin
            });
        }
    },

    // Kategori güncelleme işlemi
    update: async (req, res) => {
        try {
            const categoryId = req.params.id;
            const { name, description } = req.body;

            const category = await Category.findByPk(categoryId);
            if (!category) {
                return res.redirect('/admin/categories?error=notfound');
            }

            const oldValues = category.toJSON();

            // Slug güncelle
            let slug = name.toLowerCase()
                .replace(/ş/g, 's')
                .replace(/ğ/g, 'g')
                .replace(/ü/g, 'u')
                .replace(/ö/g, 'o')
                .replace(/ı/g, 'i')
                .replace(/ç/g, 'c')
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');

            // Slug kontrolü
            const existingCategory = await Category.findOne({
                where: {
                    slug: slug,
                    visible: 1,
                    id: { [Op.ne]: categoryId }
                }
            });

            if (existingCategory) {
                let counter = 2;
                let tempSlug = `${slug}-${counter}`;

                while (await Category.findOne({
                    where: {
                        slug: tempSlug,
                        visible: 1,
                        id: { [Op.ne]: categoryId }
                    }
                })) {
                    counter++;
                    tempSlug = `${slug}-${counter}`;
                }

                slug = tempSlug;
            }

            // Kategoriyi güncelle
            await category.update({
                name,
                slug,
                description
            });

            // Log kaydı
            await Logs.logAction(Logs.ACTIONS.UPDATE, 'categories', category.id, oldValues, category.toJSON(), req);

            res.redirect('/admin/categories?success=' + encodeURIComponent('Kategori başarıyla güncellendi!'));

        } catch (error) {
            console.error('Admin category update error:', error);
            res.redirect(`/admin/categories/${req.params.id}/edit?error=update`);
        }
    },

    // Kategori silme (soft delete)
    deleteForm: async (req, res) => {
        try {
            const category = await Category.findByPk(req.params.id, {
                include: [{
                    model: Product,
                    as: 'products',
                    required: false,
                    where: { visible: 1 }
                }]
            });

            if (!category) {
                return res.redirect('/admin/categories?error=notfound');
            }

            // Diğer kategorileri getir (silinecek olan hariç)
            const otherCategories = await Category.findAll({
                where: {
                    visible: 1,
                    id: { [Op.ne]: req.params.id }
                },
                order: [['name', 'ASC']]
            });

            const productCount = category.products ? category.products.length : 0;

            res.render('admin/categories/delete', {
                title: `Kategori Sil: ${category.name}`,
                layout: 'admin/layout',
                currentPage: 'categories',
                category: category.toJSON(),
                productCount,
                otherCategories,
                admin: req.session.admin
            });

        } catch (error) {
            console.error('Admin category delete form error:', error);
            res.redirect('/admin/categories?error=notfound');
        }
    },

    // Kategori silme işlemi
    destroy: async (req, res) => {
        try {
            const categoryId = req.params.id;
            const { move_to_category } = req.body;

            const category = await Category.findByPk(categoryId, {
                include: [{
                    model: Product,
                    as: 'products',
                    required: false,
                    where: { visible: 1 }
                }]
            });

            if (!category) {
                return res.redirect('/admin/categories?error=notfound');
            }

            const productCount = category.products ? category.products.length : 0;

            // Eğer ürün varsa ve taşınacak kategori seçilmemişse hata
            if (productCount > 0 && !move_to_category) {
                return res.redirect(`/admin/categories/${categoryId}/delete?error=no_target`);
            }

            // Eski değerleri sakla
            const oldValues = category.toJSON();

            // Ürünleri yeni kategoriye taşı
            if (productCount > 0 && move_to_category) {
                const targetCategory = await Category.findByPk(move_to_category);

                if (!targetCategory) {
                    return res.redirect(`/admin/categories/${categoryId}/delete?error=invalid_target`);
                }

                // Tüm ürünleri yeni kategoriye taşı
                for (const product of category.products) {
                    // Mevcut kategorileri al
                    const currentCategories = await product.getCategories();

                    // Silinecek kategoriyi çıkar, yeni kategoriyi ekle
                    const newCategories = currentCategories
                        .filter(cat => cat.id !== parseInt(categoryId))
                        .concat([targetCategory]);

                    await product.setCategories(newCategories);
                }
            }

            // Kategoriyi soft delete
            await category.update({ visible: 0 });

            // Log kaydı
            await Logs.logAction(
                Logs.ACTIONS.DELETE,
                'categories',
                category.id,
                oldValues,
                { visible: 0, movedTo: move_to_category || null },
                req
            );

            res.redirect('/admin/categories?success=' + encodeURIComponent(`Kategori silindi${productCount > 0 ? ` ve ${productCount} ürün taşındı` : ''}`));

        } catch (error) {
            console.error('Admin category destroy error:', error);
            res.redirect('/admin/categories?error=delete');
        }
    }
};

module.exports = adminCategoryController;