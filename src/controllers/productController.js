// src/controllers/productController.js - Ürün controller
const { Product, Category } = require('../models');
const { Op } = require('sequelize');

const productController = {
    // Tüm ürünler
    index: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 12;
            const offset = (page - 1) * limit;
            const sort = req.query.sort || 'newest';

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
                where: { visible: 1 },
                include: [{
                    model: Category,
                    as: 'categories',
                    where: { visible: 1 },
                    required: false
                }],
                limit,
                offset,
                order,
                distinct: true
            });

            const totalPages = Math.ceil(count / limit);

            res.render('pages/products', {
                title: 'Tüm Ürünler',
                products,
                pagination: {
                    currentPage: page,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1,
                    totalItems: count
                },
                sort
            });

        } catch (error) {
            console.error('Products page error:', error);
            res.status(500).render('pages/error', {
                title: 'Hata',
                message: 'Ürünler yüklenirken hata oluştu'
            });
        }
    },

    // Ürün detayı
    show: async (req, res) => {
        try {
            const { slug } = req.params;

            const product = await Product.findOne({
                where: { slug, visible: 1 },
                include: [{
                    model: Category,
                    as: 'categories',
                    where: { visible: 1 },
                    required: false
                }]
            });

            if (!product) {
                return res.status(404).render('pages/404', {
                    title: 'Ürün Bulunamadı',
                    message: 'Aradığınız ürün bulunamadı.'
                });
            }

            // Benzer ürünler (aynı kategorideki diğer ürünler)
            let relatedProducts = [];
            if (product.categories && product.categories.length > 0) {
                const categoryIds = product.categories.map(cat => cat.id);

                relatedProducts = await Product.findAll({
                    where: {
                        visible: 1,
                        id: { [Op.ne]: product.id }
                    },
                    include: [{
                        model: Category,
                        as: 'categories',
                        where: {
                            visible: 1,
                            id: { [Op.in]: categoryIds }
                        },
                        required: true
                    }],
                    limit: 4,
                    order: [['createdAt', 'DESC']]
                });
            }

            res.render('pages/product-detail', {
                title: product.name,
                product,
                relatedProducts
            });

        } catch (error) {
            console.error('Product detail error:', error);
            res.status(500).render('pages/error', {
                title: 'Hata',
                message: 'Ürün detayı yüklenirken hata oluştu'
            });
        }
    },

    // Ürün arama
    search: async (req, res) => {
        try {
            const query = req.query.q || '';
            const page = parseInt(req.query.page) || 1;
            const limit = 12;
            const offset = (page - 1) * limit;

            if (!query.trim()) {
                return res.render('pages/search', {
                    title: 'Arama',
                    products: [],
                    query: '',
                    pagination: null
                });
            }

            const { count, rows: products } = await Product.findAndCountAll({
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
                offset,
                order: [['createdAt', 'DESC']]
            });

            const totalPages = Math.ceil(count / limit);

            res.render('pages/search', {
                title: `"${query}" için Arama Sonuçları`,
                products,
                query,
                pagination: {
                    currentPage: page,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1,
                    totalItems: count
                }
            });

        } catch (error) {
            console.error('Search error:', error);
            res.status(500).render('pages/error', {
                title: 'Hata',
                message: 'Arama yapılırken hata oluştu'
            });
        }
    },

    // Favorilere ekle (LocalStorage bazlı - sadece response)
    addToFavorites: async (req, res) => {
        try {
            const { productId } = req.body;

            const product = await Product.findByPk(productId, {
                where: { visible: 1 }
            });

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Ürün bulunamadı'
                });
            }

            res.json({
                success: true,
                message: 'Ürün favorilere eklendi',
                product: {
                    id: product.id,
                    name: product.name,
                    slug: product.slug,
                    price: product.price,
                    images: product.images
                }
            });

        } catch (error) {
            console.error('Add to favorites error:', error);
            res.status(500).json({
                success: false,
                message: 'Favorilere eklenirken hata oluştu'
            });
        }
    },

    // Favorilerden çıkar
    removeFromFavorites: async (req, res) => {
        try {
            const { productId } = req.body;

            res.json({
                success: true,
                message: 'Ürün favorilerden çıkarıldı'
            });

        } catch (error) {
            console.error('Remove from favorites error:', error);
            res.status(500).json({
                success: false,
                message: 'Favorilerden çıkarılırken hata oluştu'
            });
        }
    }
};

module.exports = productController;
