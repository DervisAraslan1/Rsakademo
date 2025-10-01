// src/models/index.js - Model Relations ve Export
const { sequelize } = require('../config/database');
const Category = require('./Category');
const Product = require('./Product');
const Slider = require('./Slider');
const Settings = require('./Settings');
const Logs = require('./Logs');
const User = require('./User');

// Many-to-Many: Product <-> Category
Product.belongsToMany(Category, {
    through: 'productcategories', // küçük harf
    foreignKey: 'product_id',
    otherKey: 'category_id',
    as: 'categories'
});

Category.belongsToMany(Product, {
    through: 'productcategories', // küçük harf
    foreignKey: 'category_id',
    otherKey: 'product_id',
    as: 'products'
});


// Sync function
const syncDatabase = async () => {
    try {
        const env = process.env.NODE_ENV || 'development';

        // Veritabanı durumunu kontrol et
        await sequelize.authenticate();
        console.log('✅ Database connection established');

        // Tabloların varlığını kontrol et
        const [results] = await sequelize.query(
            "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'products'"
        );

        const tablesExist = results[0].count > 0;

        // Sync stratejisi
        let syncOptions;

        if (!tablesExist) {
            // İlk kurulum - tüm tabloları oluştur
            console.log('🆕 First time setup - creating tables...');
            syncOptions = { force: false, alter: false };
        } else {
            // Tablolar zaten var - hiçbir şey yapma
            console.log('✅ Tables already exist - skipping sync');
            syncOptions = { force: false, alter: false };

            // Sadece bağlantıyı doğrula, sync yapma
            console.log(`✅ Database ready (${env} mode)`);
            return;
        }

        await sequelize.sync(syncOptions);
        console.log(`✅ Database synced (${env} mode)`);

    } catch (error) {
        console.error('❌ Database sync failed:', error);
        throw error;
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
    User,
    syncDatabase
};