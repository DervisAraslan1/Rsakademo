// src/models/index.js - Model Relations ve Export
const { sequelize } = require('../config/database');
const Category = require('./Category');
const Product = require('./Product');
const Slider = require('./Slider');
const Settings = require('./Settings');
const Logs = require('./Logs');

// Many-to-Many: Product <-> Category
Product.belongsToMany(Category, {
    through: 'ProductCategories',
    foreignKey: 'product_id',
    otherKey: 'category_id',
    as: 'categories'
});

Category.belongsToMany(Product, {
    through: 'ProductCategories',
    foreignKey: 'category_id',
    otherKey: 'product_id',
    as: 'products'
});

// Sync function
const syncDatabase = async () => {
    try {
        await sequelize.sync({ alter: true });
        console.log('✅ Database synced successfully');
    } catch (error) {
        console.error('❌ Database sync failed:', error);
    }
};

// Export everything
module.exports = {
    sequelize,
    Category,
    Product,
    Slider,
    Settings,
    Logs,
    syncDatabase
};