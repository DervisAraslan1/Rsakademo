// src/middleware/upload.js - File upload middleware
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Upload klasörlerini oluştur
const ensureDirectoryExists = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

// Storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadPath = 'public/uploads/';

        // Field name'e göre klasör belirle
        if (file.fieldname.includes('product') || file.fieldname === 'images') {
            uploadPath += 'products/';
        } else if (file.fieldname.includes('category')) {
            uploadPath += 'categories/';
        } else if (file.fieldname.includes('slider')) {
            uploadPath += 'sliders/';
        } else if (file.fieldname.includes('logo') || file.fieldname.includes('favicon')) {
            uploadPath += 'misc/';
        } else {
            uploadPath += 'misc/';
        }

        ensureDirectoryExists(uploadPath);
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Unique filename oluştur
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        const cleanName = file.fieldname.replace(/[^a-zA-Z0-9]/g, '');
        cb(null, cleanName + '-' + uniqueSuffix + ext);
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    // Sadece resim dosyalarını kabul et
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Sadece resim dosyaları yüklenebilir! (JPG, PNG, GIF, WebP)'), false);
    }
};

// Multer config
const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
        files: 10
    },
    fileFilter: fileFilter
});

// Resim optimizasyonu middleware
const optimizeImage = async (req, res, next) => {
    if (!req.files && !req.file) {
        return next();
    }

    try {
        const files = req.files || [req.file];

        for (const file of files) {
            if (!file) continue;

            const filePath = file.path;
            const outputPath = filePath;

            // Sharp ile resmi optimize et
            await sharp(filePath)
                .resize(1200, 1200, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .jpeg({
                    quality: 85,
                    progressive: true
                })
                .png({
                    quality: 85,
                    progressive: true
                })
                .webp({
                    quality: 85
                })
                .toFile(outputPath + '.optimized');

            // Optimized dosyayı orijinalin üzerine taşı
            fs.renameSync(outputPath + '.optimized', outputPath);
        }

        next();
    } catch (error) {
        console.error('Image optimization error:', error);
        // Optimizasyon hatası olursa devam et (kritik değil)
        next();
    }
};

// Error handler
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            const message = 'Dosya boyutu çok büyük. Maksimum 10MB.';
            return req.xhr ?
                res.status(400).json({ error: message }) :
                res.redirect('back?error=' + encodeURIComponent(message));
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            const message = 'Çok fazla dosya. Maksimum 10 dosya.';
            return req.xhr ?
                res.status(400).json({ error: message }) :
                res.redirect('back?error=' + encodeURIComponent(message));
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            const message = 'Beklenmeyen dosya alanı.';
            return req.xhr ?
                res.status(400).json({ error: message }) :
                res.redirect('back?error=' + encodeURIComponent(message));
        }
    }

    if (err.message.includes('Sadece resim dosyaları')) {
        return req.xhr ?
            res.status(400).json({ error: err.message }) :
            res.redirect('back?error=' + encodeURIComponent(err.message));
    }

    next(err);
};

module.exports = {
    uploadMiddleware: upload,
    optimizeImage,
    handleUploadError
};