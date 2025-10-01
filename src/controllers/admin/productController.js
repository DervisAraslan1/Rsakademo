// src/controllers/admin/productController.js
const path = require('path');
const fs = require('fs');
const { Product, Category, Logs, Settings } = require('../../models');
const { Op } = require('sequelize');

const adminProductController = {
    // Ürün listesi
    index: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 20;
            const offset = (page - 1) * limit;
            const search = req.query.search || '';

            let whereCondition = { visible: 1 };
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

            // ✅ Products'ı parse et
            const parsedProducts = products.map(product => {
                const productData = product.toJSON();

                // Images'i parse et
                if (typeof productData.images === 'string') {
                    try {
                        productData.images = JSON.parse(productData.images);
                    } catch (e) {
                        productData.images = [];
                    }
                }

                if (!Array.isArray(productData.images)) {
                    productData.images = [];
                }

                return productData;
            });

            // Success/error mesajları
            let success = null;
            let error = null;

            if (req.query.success) {
                success = req.query.success;
            }
            if (req.query.error) {
                const errors = {
                    'notfound': 'Ürün bulunamadı',
                    'delete': 'Ürün kaldırılırken hata oluştu',
                    'create': 'Ürün oluşturulurken hata oluştu',
                    'update': 'Ürün güncellenirken hata oluştu'
                };
                error = errors[req.query.error] || 'Bir hata oluştu';
            }

            // Settings'i al
            const settingsArray = await Settings.findAll();
            const settings = {};
            settingsArray.forEach(setting => {
                settings[setting.key] = setting.value;
            });

            res.render('admin/products/index', {
                title: 'Ürün Yönetimi',
                layout: 'admin/layout',
                currentPage: 'products',
                products: parsedProducts, // ✅ Parse edilmiş products
                search,
                pagination: {
                    currentPage: page,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                },
                success,
                error,
                settings,
                admin: req.session.admin
            });

        } catch (error) {
            console.error('Admin products index error:', error);
            res.status(500).render('admin/error', {
                title: 'Hata',
                layout: 'admin/layout',
                currentPage: 'products',
                message: 'Ürünler yüklenirken hata oluştu',
                admin: req.session.admin
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
                currentPage: 'products',
                categories,
                admin: req.session.admin
            });

        } catch (error) {
            console.error('Admin product create page error:', error);
            res.status(500).render('admin/error', {
                title: 'Hata',
                layout: 'admin/layout',
                currentPage: 'products',
                message: 'Sayfa yüklenirken hata oluştu',
                admin: req.session.admin
            });
        }
    },

    edit: async (req, res) => {
        try {
            const productId = req.params.id;

            const product = await Product.findByPk(productId, {
                include: [{
                    model: Category,
                    as: 'categories',
                    required: false
                }]
            });

            if (!product) {
                return res.redirect('/admin/products?error=notfound');
            }

            // ✅ Images'i düzgün parse et ve temizle
            let images = [];
            try {
                images = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
                if (!Array.isArray(images)) images = [];

                // ✅ Bozuk veriyi temizle - sadece geçerli URL'leri al
                images = images.filter(img => {
                    return typeof img === 'string' &&
                        img.length > 2 &&
                        (img.startsWith('/uploads/') || img.startsWith('http'));
                });
            } catch (e) {
                console.error('Images parse error:', e);
                images = [];
            }

            // Boyutları ayrıştır
            let width = '', height = '', depth = '';
            if (product.dimensions) {
                const dims = product.dimensions.replace(' cm', '').split(' x ');
                width = dims[0] || '';
                height = dims[1] || '';
                depth = dims[2] || '';
            }

            const categories = await Category.findAll({
                where: { visible: 1 },
                order: [['name', 'ASC']]
            });

            const productData = product.toJSON();
            productData.images = images; // ✅ Temizlenmiş images

            console.log('Cleaned product images:', images); // Debug

            res.render('admin/products/edit', {
                title: `Ürün Düzenle - ${product.name}`,
                layout: 'admin/layout',
                currentPage: 'products',
                product: productData,
                categories,
                width,
                height,
                depth,
                admin: req.session.admin
            });

        } catch (error) {
            console.error('Admin product edit error:', error);
            res.redirect('/admin/products?error=notfound');
        }
    },

    // store metodu - dimensions alanını güncelle
    store: async (req, res) => {
        try {
            const { name, description, width, height, depth, categories } = req.body;

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
            const existingProduct = await Product.findOne({
                where: {
                    slug: slug,
                    visible: 1
                }
            });

            if (existingProduct) {
                let counter = 2;
                let tempSlug = `${slug}-${counter}`;

                while (await Product.findOne({
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

            // Boyutları birleştir
            const dimensions = [width, height, depth]
                .filter(d => d && d.trim())
                .join(' x ') + (width || height || depth ? ' cm' : '');

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
                dimensions: dimensions || null,
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

            res.redirect('/admin/products?success=' + encodeURIComponent('Ürün başarıyla eklendi!'));

        } catch (error) {
            console.error('Admin product store error:', error);
            res.redirect('/admin/products/create?error=create');
        }
    },

    update: async (req, res) => {
        try {
            const productId = req.params.id;
            const { name, description, width, height, depth, categories, removed_images, images_order } = req.body;

            const product = await Product.findByPk(productId);
            if (!product) {
                return res.redirect('/admin/products?error=notfound');
            }

            const oldValues = product.toJSON();

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
            const existingProduct = await Product.findOne({
                where: {
                    slug: slug,
                    visible: 1,
                    id: { [Op.ne]: productId }
                }
            });

            if (existingProduct) {
                let counter = 2;
                let tempSlug = `${slug}-${counter}`;

                while (await Product.findOne({
                    where: {
                        slug: tempSlug,
                        visible: 1,
                        id: { [Op.ne]: productId }
                    }
                })) {
                    counter++;
                    tempSlug = `${slug}-${counter}`;
                }

                slug = tempSlug;
            }

            // Boyutları birleştir
            const dimensions = [width, height, depth]
                .filter(d => d && d.trim())
                .join(' x ') + (width || height || depth ? ' cm' : '');

            // Mevcut resimleri al
            let images = [];
            try {
                images = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
                if (!Array.isArray(images)) images = [];
            } catch (e) {
                images = [];
            }

            // ✅ Silinen resimleri kaldır
            if (removed_images) {
                const removedList = JSON.parse(removed_images);
                images = images.filter(img => !removedList.includes(img));

                // Dosyaları fiziksel olarak sil
                removedList.forEach(imgPath => {
                    const fullPath = path.join(__dirname, '../../public', imgPath);
                    if (fs.existsSync(fullPath)) {
                        fs.unlinkSync(fullPath);
                    }
                });
            }

            // ✅ Resim sıralamasını güncelle
            if (images_order) {
                const newOrder = JSON.parse(images_order);
                images = newOrder.filter(img => images.includes(img));
            }

            // Yeni resimler varsa ekle
            if (req.files && req.files.length > 0) {
                const newImages = req.files.map(file => `/uploads/products/${file.filename}`);
                images = [...images, ...newImages];
            }

            // Ürünü güncelle
            await product.update({
                name,
                slug,
                description,
                dimensions: dimensions || null,
                images
            });

            // Kategorileri güncelle
            if (categories) {
                const categoryIds = Array.isArray(categories) ? categories : [categories];
                const categoryObjects = await Category.findAll({
                    where: { id: { [Op.in]: categoryIds } }
                });
                await product.setCategories(categoryObjects);
            } else {
                await product.setCategories([]);
            }

            // Log kaydı
            await Logs.logAction(Logs.ACTIONS.UPDATE, 'products', product.id, oldValues, product.toJSON(), req);

            res.redirect('/admin/products?success=' + encodeURIComponent('Ürün başarıyla güncellendi!'));

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
                return res.redirect('/admin/products?error=notfound');
            }

            // Eski değerleri sakla
            const oldValues = product.toJSON();

            // Soft delete (visible = 0)
            await product.update({ visible: 0 });

            // Log kaydı
            await Logs.logAction(Logs.ACTIONS.DELETE, 'products', product.id, oldValues, { visible: 0 }, req);

            res.redirect('/admin/products?success=' + encodeURIComponent('Ürün başarıyla kaldırıldı!'));

        } catch (error) {
            console.error('Admin product destroy error:', error);
            res.redirect('/admin/products?error=delete');
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
                return res.redirect('/admin/products?error=notfound');
            }

            res.render('admin/products/show', {
                title: `Ürün: ${product.name}`,
                layout: 'admin/layout',
                currentPage: 'products',
                product,
                admin: req.session.admin
            });

        } catch (error) {
            console.error('Admin product show error:', error);
            res.status(500).render('admin/error', {
                title: 'Hata',
                layout: 'admin/layout',
                currentPage: 'products',
                message: 'Ürün detayı yüklenirken hata oluştu',
                admin: req.session.admin
            });
        }
    },
};

module.exports = adminProductController;