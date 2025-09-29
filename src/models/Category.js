// src/models/Category.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Category = sequelize.define('Category', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    slug: {
        type: DataTypes.STRING(120),
        allowNull: false,
        unique: true
    },
    image: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    visible: {
        type: DataTypes.TINYINT,
        defaultValue: 1
    }
}, {
    tableName: 'categories',
    timestamps: true
});

module.exports = Category;
