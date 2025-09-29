// src/controllers/categoryController.js - Kategori controller
const { Category, Product } = require('../models');
const { Op } = require('sequelize');

const categoryController = {
    // Kategori sayfası
    show: async (req, res) => {
        try {
            const { slug } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = 12;
            const offset = (page - 1) * limit;
            const sort = req.query.sort || 'newest';

            // Kategoriyi bul
            const category = await Category.findOne({
                where: { slug, visible: 1 }
            });

            if (!category) {
                return res.status(404).render('pages/404', {
                    title: 'Kategori Bulunamadı',
                    message: 'Aradığınız kategori bulunamadı.'
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

            // Kategorideki ürünleri getir
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
                order,
                distinct: true
            });

            const totalPages = Math.ceil(count / limit);

            res.render('pages/category', {
                title: category.name,
                category,
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
            console.error('Category page error:', error);
            res.status(500).render('pages/error', {
                title: 'Hata',
                message: 'Kategori sayfası yüklenirken hata oluştu'
            });
        }
    },

    // Alt kategori (ileride kullanmak için)
    showSubCategory: async (req, res) => {
        try {
            // TODO: Hierarchical kategori yapısı için
            res.redirect(`/categories/${req.params.slug}`);
        } catch (error) {
            console.error('Sub category error:', error);
            res.status(500).render('pages/error', {
                title: 'Hata',
                message: 'Alt kategori yüklenirken hata oluştu'
            });
        }
    }
};

module.exports = categoryController;