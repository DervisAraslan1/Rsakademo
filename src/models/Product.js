// src/models/Product.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('Product', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(200),
        allowNull: false
    },
    slug: {
        type: DataTypes.STRING(220),
        allowNull: false,
        unique: true
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    images: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
    },
    dimensions: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    material: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    color: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    featured: {
        type: DataTypes.TINYINT,
        defaultValue: 0
    },
    visible: {
        type: DataTypes.TINYINT,
        defaultValue: 1
    }
}, {
    tableName: 'products',
    timestamps: true
});

module.exports = Product;
