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
                include: [
                    {
                        model: Product,
                        as: 'products',
                        required: false,
                        where: { visible: 1 }
                    },
                    {
                        model: Category,
                        as: 'parent',
                        required: false,
                        attributes: ['id', 'name']
                    }
                ],
                order: [['name', 'ASC']]
            });

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
                    'update': 'Kategori güncellenirken hata oluştu',
                    'circular': 'Döngüsel referans oluşturulamaz!'
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

    store: async (req, res) => {
        try {
            const { name, description, parent_id } = req.body;

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
                where: { slug: slug, visible: 1 }
            });

            if (existingCategory) {
                let counter = 2;
                let tempSlug = `${slug}-${counter}`;
                while (await Category.findOne({ where: { slug: tempSlug, visible: 1 } })) {
                    counter++;
                    tempSlug = `${slug}-${counter}`;
                }
                slug = tempSlug;
            }

            // Kategoriyi oluştur
            const category = await Category.create({
                name,
                slug,
                description: description || null,
                parent_id: parent_id || null
            });

            await Logs.logAction(Logs.ACTIONS.CREATE, 'categories', category.id, null, category.toJSON(), req);

            res.redirect('/admin/categories?success=' + encodeURIComponent('Kategori başarıyla eklendi!'));

        } catch (error) {
            console.error('Admin category store error:', error);
            res.redirect('/admin/categories/create?error=create');
        }
    },

    update: async (req, res) => {
        try {
            const categoryId = req.params.id;
            const { name, description, parent_id } = req.body;

            const category = await Category.findByPk(categoryId);
            if (!category) {
                return res.redirect('/admin/categories?error=notfound');
            }

            // ✅ Döngüsel referans kontrolü
            if (parent_id) {
                const hasCircular = await checkCircularReference(parseInt(categoryId), parseInt(parent_id));
                if (hasCircular) {
                    return res.redirect(`/admin/categories/${categoryId}/edit?error=circular`);
                }

                // ✅ Alt kategorilerden birini üst kategori yapma kontrolü
                const childIds = await getAllChildIds(parseInt(categoryId));
                if (childIds.includes(parseInt(parent_id))) {
                    return res.redirect(`/admin/categories/${categoryId}/edit?error=circular`);
                }
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

            await category.update({
                name,
                slug,
                description,
                parent_id: parent_id || null
            });

            await Logs.logAction(Logs.ACTIONS.UPDATE, 'categories', category.id, oldValues, category.toJSON(), req);

            res.redirect('/admin/categories?success=' + encodeURIComponent('Kategori başarıyla güncellendi!'));

        } catch (error) {
            console.error('Admin category update error:', error);
            res.redirect(`/admin/categories/${req.params.id}/edit?error=update`);
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

            // Alt kategorileri say
            const childCategories = await Category.findAll({
                where: { parent_id: req.params.id, visible: 1 }
            });

            // Diğer kategorileri getir (silinecek olan hariç)
            const otherCategories = await Category.findAll({
                where: {
                    visible: 1,
                    id: { [Op.ne]: req.params.id }
                },
                order: [['name', 'ASC']]
            });

            const productCount = category.products ? category.products.length : 0;
            const childCount = childCategories.length;

            res.render('admin/categories/delete', {
                title: `Kategori Sil: ${category.name}`,
                layout: 'admin/layout',
                currentPage: 'categories',
                category: category.toJSON(),
                productCount,
                childCount,
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

            // Alt kategorileri bul
            const childCategories = await Category.findAll({
                where: { parent_id: categoryId, visible: 1 }
            });

            const productCount = category.products ? category.products.length : 0;
            const childCount = childCategories.length;

            // Eğer ürün varsa ve taşınacak kategori seçilmemişse hata
            if (productCount > 0 && !move_to_category) {
                return res.redirect(`/admin/categories/${categoryId}/delete?error=no_target`);
            }

            // Eski değerleri sakla
            const oldValues = category.toJSON();

            // Hedef kategori varsa işlemleri yap
            if (move_to_category) {
                const targetCategory = await Category.findByPk(move_to_category);

                if (!targetCategory) {
                    return res.redirect(`/admin/categories/${categoryId}/delete?error=invalid_target`);
                }

                // 1. Ürünleri taşı
                if (productCount > 0) {
                    for (const product of category.products) {
                        const currentCategories = await product.getCategories();
                        const newCategories = currentCategories
                            .filter(cat => cat.id !== parseInt(categoryId))
                            .concat([targetCategory]);
                        await product.setCategories(newCategories);
                    }
                }

                // 2. Alt kategorileri taşı
                if (childCount > 0) {
                    for (const child of childCategories) {
                        await child.update({
                            parent_id: move_to_category
                        });
                    }
                }
            } else {
                // Hedef kategori yoksa alt kategorileri ana kategori yap
                if (childCount > 0) {
                    for (const child of childCategories) {
                        await child.update({
                            parent_id: null
                        });
                    }
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
                {
                    visible: 0,
                    movedTo: move_to_category || null,
                    movedProducts: productCount,
                    movedChildren: childCount
                },
                req
            );

            // Başarı mesajı
            let successMessage = 'Kategori silindi';
            const moved = [];
            if (productCount > 0) moved.push(`${productCount} ürün`);
            if (childCount > 0) moved.push(`${childCount} alt kategori`);

            if (moved.length > 0) {
                successMessage += ` ve ${moved.join(' ve ')} taşındı`;
            }

            res.redirect('/admin/categories?success=' + encodeURIComponent(successMessage));

        } catch (error) {
            console.error('Admin category destroy error:', error);
            res.redirect('/admin/categories?error=delete');
        }
    },

    // Üst kategori belirleme
    setParent: async (req, res) => {
        try {
            const categoryId = req.params.id;
            const { parent_id } = req.body;

            const category = await Category.findByPk(categoryId);
            if (!category) {
                return res.redirect('/admin/categories?error=notfound');
            }

            // Döngüsel referans kontrolü
            if (parent_id) {
                const hasCircular = await checkCircularReference(parseInt(categoryId), parseInt(parent_id));
                if (hasCircular) {
                    return res.redirect('/admin/categories?error=circular');
                }

                const childIds = await getAllChildIds(parseInt(categoryId));
                if (childIds.includes(parseInt(parent_id))) {
                    return res.redirect('/admin/categories?error=circular');
                }
            }

            const oldValues = category.toJSON();

            await category.update({
                parent_id: parent_id || null
            });

            await Logs.logAction(Logs.ACTIONS.UPDATE, 'categories', category.id, oldValues, category.toJSON(), req);

            res.redirect('/admin/categories?success=' + encodeURIComponent('Üst kategori başarıyla güncellendi!'));

        } catch (error) {
            console.error('Admin category set parent error:', error);
            res.redirect('/admin/categories?error=update');
        }
    }

};

const checkCircularReference = async (categoryId, parentId) => {
    if (!parentId) return false;
    if (categoryId === parentId) return true;

    let currentParent = await Category.findByPk(parentId);
    const visited = new Set([categoryId]);

    while (currentParent) {
        if (visited.has(currentParent.id)) {
            return true; // Döngü tespit edildi
        }
        visited.add(currentParent.id);

        if (currentParent.parent_id) {
            currentParent = await Category.findByPk(currentParent.parent_id);
        } else {
            break;
        }
    }

    return false;
};

const getAllChildIds = async (categoryId) => {
    const children = await Category.findAll({
        where: { parent_id: categoryId, visible: 1 },
        attributes: ['id']
    });

    let allIds = children.map(c => c.id);

    for (const child of children) {
        const subChildren = await getAllChildIds(child.id);
        allIds = allIds.concat(subChildren);
    }

    return allIds;
};

module.exports = adminCategoryController;