// src/controllers/apiController.js - API controller
const { Product, Category, Slider, Settings } = require('../models');
const { Op } = require('sequelize');

const apiController = {
    // Ürünler API
    products: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 12;
            const offset = (page - 1) * limit;

            const products = await Product.findAll({
                where: { visible: 1 },
                include: [{
                    model: Category,
                    as: 'categories',
                    where: { visible: 1 },
                    required: false
                }],
                limit,
                offset,
                order: [['createdAt', 'DESC']]
            });

            res.json({
                success: true,
                data: products,
                pagination: {
                    currentPage: page,
                    limit,
                    totalItems: await Product.count({ where: { visible: 1 } })
                }
            });

        } catch (error) {
            console.error('API products error:', error);
            res.status(500).json({
                success: false,
                message: 'Ürünler yüklenirken hata oluştu'
            });
        }
    },

    // Tek ürün API
    product: async (req, res) => {
        try {
            const product = await Product.findByPk(req.params.id, {
                where: { visible: 1 },
                include: [{
                    model: Category,
                    as: 'categories',
                    where: { visible: 1 },
                    required: false
                }]
            });

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Ürün bulunamadı'
                });
            }

            res.json({
                success: true,
                data: product
            });

        } catch (error) {
            console.error('API product error:', error);
            res.status(500).json({
                success: false,
                message: 'Ürün yüklenirken hata oluştu'
            });
        }
    },

    // Kategoriler API
    categories: async (req, res) => {
        try {
            const categories = await Category.findAll({
                where: { visible: 1 },
                order: [['name', 'ASC']]
            });

            res.json({
                success: true,
                data: categories
            });

        } catch (error) {
            console.error('API categories error:', error);
            res.status(500).json({
                success: false,
                message: 'Kategoriler yüklenirken hata oluştu'
            });
        }
    },

    // Slider API
    sliders: async (req, res) => {
        try {
            const sliders = await Slider.findAll({
                where: { visible: 1 },
                order: [['order', 'ASC'], ['createdAt', 'DESC']]
            });

            res.json({
                success: true,
                data: sliders
            });

        } catch (error) {
            console.error('API sliders error:', error);
            res.status(500).json({
                success: false,
                message: 'Slider yüklenirken hata oluştu'
            });
        }
    },

    // Settings API
    settings: async (req, res) => {
        try {
            const publicSettings = await Settings.findAll({
                where: {
                    visible: 1,
                    key: {
                        [Op.in]: [
                            'site_name',
                            'site_description',
                            'contact_email',
                            'contact_phone',
                            'social_links'
                        ]
                    }
                }
            });

            const settingsObj = {};
            publicSettings.forEach(setting => {
                let value = setting.value;
                if (setting.type === 'json') {
                    try {
                        value = JSON.parse(value);
                    } catch (e) {
                        value = setting.value;
                    }
                } else if (setting.type === 'boolean') {
                    value = value === 'true' || value === '1';
                } else if (setting.type === 'number') {
                    value = parseFloat(value) || 0;
                }
                settingsObj[setting.key] = value;
            });

            res.json({
                success: true,
                data: settingsObj
            });

        } catch (error) {
            console.error('API settings error:', error);
            res.status(500).json({
                success: false,
                message: 'Ayarlar yüklenirken hata oluştu'
            });
        }
    },

    // Ürün arama API
    searchProducts: async (req, res) => {
        try {
            const query = req.query.q || '';
            const limit = parseInt(req.query.limit) || 10;

            if (!query.trim()) {
                return res.json({
                    success: true,
                    data: []
                });
            }

            const products = await Product.findAll({
                where: {
                    visible: 1,
                    [Op.or]: [
                        { name: { [Op.like]: `%${query}%` } },
                        { description: { [Op.like]: `%${query}%` } },
                        { material: { [Op.like]: `%${query}%` } },
                        { color: { [Op.like]: `%${query}%` } }
                    ]
                },
                include: [{
                    model: Category,
                    as: 'categories',
                    where: { visible: 1 },
                    required: false
                }],
                limit,
                order: [['createdAt', 'DESC']]
            });

            res.json({
                success: true,
                data: products,
                query
            });

        } catch (error) {
            console.error('API search error:', error);
            res.status(500).json({
                success: false,
                message: 'Arama yapılırken hata oluştu'
            });
        }
    },

    // Arama önerileri API
    searchSuggestions: async (req, res) => {
        try {
            const query = req.query.q || '';
            const limit = parseInt(req.query.limit) || 5;

            if (!query.trim()) {
                return res.json({
                    success: true,
                    data: []
                });
            }

            const products = await Product.findAll({
                where: {
                    visible: 1,
                    name: { [Op.like]: `%${query}%` }
                },
                attributes: ['id', 'name', 'slug'],
                limit,
                order: [['name', 'ASC']]
            });

            res.json({
                success: true,
                data: products.map(p => ({
                    id: p.id,
                    name: p.name,
                    slug: p.slug
                }))
            });

        } catch (error) {
            console.error('API suggestions error:', error);
            res.status(500).json({
                success: false,
                message: 'Öneriler yüklenirken hata oluştu'
            });
        }
    },

    // Ürün görüntüleme kaydı (LocalStorage için)
    addProductView: async (req, res) => {
        try {
            const { productId } = req.body;

            const product = await Product.findByPk(productId, {
                where: { visible: 1 },
                attributes: ['id', 'name', 'slug', 'price', 'images']
            });

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Ürün bulunamadı'
                });
            }

            res.json({
                success: true,
                data: product
            });

        } catch (error) {
            console.error('API add product view error:', error);
            res.status(500).json({
                success: false,
                message: 'Görüntüleme kaydedilirken hata oluştu'
            });
        }
    },

    // Son gezilen ürünler (LocalStorage'dan gelen ID'lere göre)
    recentProducts: async (req, res) => {
        try {
            const ids = req.query.ids || '';
            const productIds = ids.split(',').filter(id => id && !isNaN(id));

            if (productIds.length === 0) {
                return res.json({
                    success: true,
                    data: []
                });
            }

            const products = await Product.findAll({
                where: {
                    visible: 1,
                    id: { [Op.in]: productIds }
                },
                include: [{
                    model: Category,
                    as: 'categories',
                    where: { visible: 1 },
                    required: false
                }],
                order: [['createdAt', 'DESC']]
            });

            res.json({
                success: true,
                data: products
            });

        } catch (error) {
            console.error('API recent products error:', error);
            res.status(500).json({
                success: false,
                message: 'Son gezilen ürünler yüklenirken hata oluştu'
            });
        }
    },

    // Filtreleme API
    filterProducts: async (req, res) => {
        try {
            const { category, minPrice, maxPrice, material, color, sort = 'newest' } = req.query;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 12;
            const offset = (page - 1) * limit;

            let whereCondition = { visible: 1 };
            let includeCondition = [];

            // Fiyat filtreleri
            if (minPrice || maxPrice) {
                whereCondition.price = {};
                if (minPrice) whereCondition.price[Op.gte] = parseFloat(minPrice);
                if (maxPrice) whereCondition.price[Op.lte] = parseFloat(maxPrice);
            }

            // Malzeme filtresi
            if (material) {
                whereCondition.material = { [Op.like]: `%${material}%` };
            }

            // Renk filtresi
            if (color) {
                whereCondition.color = { [Op.like]: `%${color}%` };
            }

            // Kategori filtresi
            if (category) {
                includeCondition.push({
                    model: Category,
                    as: 'categories',
                    where: {
                        visible: 1,
                        slug: category
                    },
                    required: true
                });
            } else {
                includeCondition.push({
                    model: Category,
                    as: 'categories',
                    where: { visible: 1 },
                    required: false
                });
            }

            // Sıralama
            let order = [['createdAt', 'DESC']];
            switch (sort) {
                case 'price-low':
                    order = [['price', 'ASC']];
                    break;
                case 'price-high':
                    order = [['price', 'DESC']];
                    break;
                case 'name':
                    order = [['name', 'ASC']];
                    break;
            }

            const { count, rows: products } = await Product.findAndCountAll({
                where: whereCondition,
                include: includeCondition,
                limit,
                offset,
                order,
                distinct: true
            });

            res.json({
                success: true,
                data: products,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(count / limit),
                    totalItems: count,
                    limit
                }
            });

        } catch (error) {
            console.error('API filter products error:', error);
            res.status(500).json({
                success: false,
                message: 'Ürünler filtrelenirken hata oluştu'
            });
        }
    },

    // Kategoriye göre ürünler API
    categoryProducts: async (req, res) => {
        try {
            const { slug } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 12;
            const offset = (page - 1) * limit;

            const category = await Category.findOne({
                where: { slug, visible: 1 }
            });

            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Kategori bulunamadı'
                });
            }

            const { count, rows: products } = await Product.findAndCountAll({
                where: { visible: 1 },
                include: [{
                    model: Category,
                    as: 'categories',
                    where: {
                        visible: 1,
                        id: category.id
                    },
                    required: true
                }],
                limit,
                offset,
                order: [['createdAt', 'DESC']],
                distinct: true
            });

            res.json({
                success: true,
                data: {
                    category,
                    products
                },
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(count / limit),
                    totalItems: count,
                    limit
                }
            });

        } catch (error) {
            console.error('API category products error:', error);
            res.status(500).json({
                success: false,
                message: 'Kategori ürünleri yüklenirken hata oluştu'
            });
        }
    }
};

module.exports = apiController;