// src/models/Settings.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Settings = sequelize.define('Settings', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    key: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    },
    value: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    type: {
        type: DataTypes.ENUM('text', 'number', 'boolean', 'json', 'image'),
        defaultValue: 'text'
    },
    description: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    visible: {
        type: DataTypes.TINYINT,
        defaultValue: 1
    }
}, {
    tableName: 'settings',
    timestamps: true
});

// Helper methods
Settings.getSetting = async function (key, defaultValue = null) {
    try {
        const setting = await this.findOne({
            where: { key, visible: 1 }
        });

        if (!setting) return defaultValue;

        // Type'a göre value'yu parse et
        switch (setting.type) {
            case 'boolean':
                return setting.value === 'true' || setting.value === '1';
            case 'number':
                return parseFloat(setting.value) || 0;
            case 'json':
                try {
                    return JSON.parse(setting.value);
                } catch (e) {
                    return defaultValue;
                }
            default:
                return setting.value;
        }
    } catch (error) {
        console.error('Settings getSetting error:', error);
        return defaultValue;
    }
};

Settings.setSetting = async function (key, value, type = 'text', description = null) {
    try {
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

        const [setting, created] = await this.upsert({
            key,
            value: stringValue,
            type,
            description
        });

        return setting;
    } catch (error) {
        console.error('Settings setSetting error:', error);
        return null;
    }
};

module.exports = Settings;