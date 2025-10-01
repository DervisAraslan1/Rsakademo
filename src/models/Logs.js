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
    updatedAt: false
});

// Helper methods
Logs.logAction = async function (action, tableName, recordId = null, oldValues = null, newValues = null, req = null) {
    try {
        const logData = {
            action,
            table_name: tableName,
            record_id: recordId,
            old_values: oldValues,
            new_values: newValues,
            admin_user: req?.session?.admin?.username || 'admin'
        };

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

// Detaylı açıklama metodu
// Detaylı açıklama metodu
Logs.prototype.getDescription = function () {
    const actionTexts = {
        'CREATE': 'oluşturdu',
        'UPDATE': 'güncelledi',
        'DELETE': 'kaldırdı',
        'RESTORE': 'geri yükledi',
        'LOGIN': 'giriş yaptı',
        'LOGOUT': 'çıkış yaptı'
    };

    const tableTexts = {
        'products': 'ürünü',
        'categories': 'kategoriyi',
        'sliders': 'slider\'ı',
        'settings': 'ayarları'
    };

    const action = actionTexts[this.action] || this.action;
    const table = tableTexts[this.table_name] || 'kaydı';  // ✅ this.table değil this.table_name
    const adminName = this.admin_user || 'Admin';

    // Kayıt adını al
    let recordName = '';
    if (this.new_values) {
        try {
            const data = typeof this.new_values === 'string' ? JSON.parse(this.new_values) : this.new_values;
            if (data.name) {
                recordName = `"${data.name}"`;
            }
        } catch (e) {
            console.error('Parse error:', e);
        }
    }

    if (recordName) {
        return `${adminName}, ${recordName} ${table} ${action}`;
    } else {
        return `${adminName} bir ${this.table_name || 'kayıt'} ${action}`;  // ✅ Fallback
    }
};
// Zaman farkı hesaplama
Logs.prototype.getTimeAgo = function () {
    if (!this.createdAt) return 'Bilinmeyen zaman';

    const now = new Date();
    const logDate = new Date(this.createdAt);
    const diff = now - logDate;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} gün önce`;
    if (hours > 0) return `${hours} saat önce`;
    if (minutes > 0) return `${minutes} dakika önce`;
    return 'Az önce';
};

module.exports = Logs;