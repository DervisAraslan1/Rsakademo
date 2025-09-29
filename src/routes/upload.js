// src/middleware/upload.js - File upload middleware
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
        if (file.fieldname.includes('product')) {
            uploadPath += 'products/';
        } else if (file.fieldname.includes('category')) {
            uploadPath += 'categories/';
        } else if (file.fieldname.includes('slider')) {
            uploadPath += 'sliders/';
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
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
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
        cb(new Error('Sadece resim dosyaları yüklenebilir!'), false);
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

// Error handler
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: 'Dosya boyutu çok büyük. Maksimum 10MB.'
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                error: 'Çok fazla dosya. Maksimum 10 dosya.'
            });
        }
    }

    if (err.message === 'Sadece resim dosyaları yüklenebilir!') {
        return res.status(400).json({ error: err.message });
    }

    next(err);
};

module.exports = {
    uploadMiddleware: upload,
    handleUploadError
};