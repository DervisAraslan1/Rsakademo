// src/models/Slider.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Slider = sequelize.define('Slider', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: DataTypes.STRING(200),
        allowNull: false
    },
    subtitle: {
        type: DataTypes.STRING(300),
        allowNull: true
    },
    image: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    link: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    button_text: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: 'Daha Fazla'
    },
    order: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    visible: {
        type: DataTypes.TINYINT,
        defaultValue: 1
    }
}, {
    tableName: 'sliders',
    timestamps: true
});

module.exports = Slider;