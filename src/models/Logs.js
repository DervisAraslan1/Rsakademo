// src/models/Logs.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Logs = sequelize.define('Logs', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    action: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    table_name: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    record_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    old_values: {
        type: DataTypes.JSON,
        allowNull: true
    },
    new_values: {
        type: DataTypes.JSON,
        allowNull: true
    },
    ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true
    },
    user_agent: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    admin_user: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: 'admin'
    }
}, {
    tableName: 'logs',
    timestamps: true,
    updatedAt: false // Sadece createdAt
});

// Helper methods
Logs.logAction = async function (action, tableName, recordId = null, oldValues = null, newValues = null, req = null) {
    try {
        const logData = {
            action,
            table_name: tableName,
            record_id: recordId,
            old_values: oldValues,
            new_values: newValues
        };

        // Request varsa IP ve User-Agent bilgilerini al
        if (req) {
            logData.ip_address = req.ip || req.connection.remoteAddress;
            logData.user_agent = req.get('User-Agent');
        }

        await this.create(logData);
    } catch (error) {
        console.error('Log kaydetme hatası:', error);
    }
};

// Predefined action types
Logs.ACTIONS = {
    CREATE: 'CREATE',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
    RESTORE: 'RESTORE',
    LOGIN: 'LOGIN',
    LOGOUT: 'LOGOUT'
};

module.exports = Logs;
