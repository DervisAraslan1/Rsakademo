// app.js
const express = require('express');
const path = require('path');
const session = require('express-session');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();
const expressLayouts = require("express-ejs-layouts");

// Database and Models
const { syncDatabase } = require('./src/models');

// Routes
const indexRoutes = require('./src/routes/index');
const productRoutes = require('./src/routes/products');
const categoryRoutes = require('./src/routes/categories');
const adminRoutes = require('./src/routes/admin');
const apiRoutes = require('./src/routes/api');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for correct IP detection
app.set('trust proxy', true);


app.use(expressLayouts);
app.set("layout", "admin/layout"); // default layout

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Geliştirme için kapalı
    crossOriginEmbedderPolicy: false
}));

// CORS
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
}));

// Body Parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static Files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'mobilya-secret-key-2024',
    resave: false,  // ✅ false kalabilir
    saveUninitialized: false,  // ✅ false kalabilir
    name: 'mobilya.sid',  // ✅ Özel isim verin
    cookie: {
        secure: false,  // HTTPS kullanıyorsanız true yapın
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,  // 24 saat
        sameSite: 'lax',
        path: '/'
    },
    rolling: true  // ✅ Her istekte cookie'yi yenile
}));


// Logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Global Middleware - Locals for views
app.use(async (req, res, next) => {
    try {
        // Settings'leri view'lerde kullanabilmek için
        const { Settings } = require('./src/models');

        res.locals.siteName = await Settings.getSetting('site_name', 'Mobilya Dünyası');
        res.locals.siteDescription = await Settings.getSetting('site_description', 'En kaliteli mobilyalar burada');
        res.locals.currentPath = req.path;
        res.locals.isAdmin = req.path.startsWith('/admin');

        next();
    } catch (error) {
        console.error('Global middleware error:', error);
        next();
    }
});

// Routes
app.use('/', indexRoutes);
app.use('/products', productRoutes);
app.use('/categories', categoryRoutes);
app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);

// 404 Handler
app.use((req, res, next) => {
    res.status(404).render('pages/404', {
        title: '404 - Sayfa Bulunamadı',
        message: 'Aradığınız sayfa bulunamadı.'
    });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error('Error:', err);

    const status = err.status || 500;
    const message = process.env.NODE_ENV === 'production'
        ? 'Bir hata oluştu'
        : err.message;

    res.status(status).render('pages/error', {
        title: `${status} - Hata`,
        message: message,
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

// Start Server Function
const startServer = async () => {
    try {
        // Tabloları senkronize et
        await syncDatabase();

        // Default settings'leri oluştur
        await createDefaultSettings();

        // Server'ı başlat
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🌐 URL: http://localhost:${PORT}`);
            console.log(`⚙️  Admin: http://localhost:${PORT}/admin`);
        });

    } catch (error) {
        console.error('❌ Server start failed:', error);
        process.exit(1);
    }
};

// Default Settings Creator
// Default Settings Creator
const createDefaultSettings = async () => {
    try {
        const { Settings } = require('./src/models');

        const defaultSettings = [
            { key: 'site_name', value: 'Mobilya Dünyası', type: 'text', description: 'Site başlığı' },
            { key: 'site_description', value: 'En kaliteli mobilyalar burada', type: 'text', description: 'Site açıklaması' },
            { key: 'contact_email', value: 'info@mobilyadunyasi.com', type: 'text', description: 'İletişim e-postası' },
            { key: 'contact_phone', value: '+90 532 123 45 67', type: 'text', description: 'İletişim telefonu' },
            { key: 'products_per_page', value: '12', type: 'number', description: 'Sayfa başına ürün sayısı' },
            { key: 'featured_products_count', value: '8', type: 'number', description: 'Öne çıkan ürün sayısı' },
            { key: 'maintenance_mode', value: 'false', type: 'boolean', description: 'Bakım modu' },
            {
                key: 'social_links', value: JSON.stringify({
                    facebook: '',
                    instagram: '',
                    twitter: '',
                    youtube: ''
                }), type: 'json', description: 'Sosyal medya linkleri'
            }
        ];

        // ✅ Sadece eksik olanları ekle
        for (const setting of defaultSettings) {
            const exists = await Settings.findOne({
                where: { key: setting.key }
            });

            // Eğer ayar yoksa ekle
            if (!exists) {
                await Settings.create({
                    key: setting.key,
                    value: setting.value,
                    type: setting.type,
                    description: setting.description,
                    visible: true
                });
                console.log(`✅ Created default setting: ${setting.key}`);
            }
        }

        console.log('✅ Default settings checked');

    } catch (error) {
        console.error('❌ Default settings creation failed:', error);
    }
};

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('👋 SIGINT received, shutting down gracefully');
    process.exit(0);
});

// Start the server
startServer();

module.exports = app;