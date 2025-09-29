// src/middleware/logger.js - Custom logging middleware
const fs = require('fs');
const path = require('path');

// Log dosyası rotasyonu
const rotateLogFile = (logPath) => {
    if (fs.existsSync(logPath)) {
        const stats = fs.statSync(logPath);
        const fileSizeInMB = stats.size / (1024 * 1024);

        // 10MB'dan büyükse rotate et
        if (fileSizeInMB > 10) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const rotatedPath = logPath.replace('.log', `-${timestamp}.log`);
            fs.renameSync(logPath, rotatedPath);
        }
    }
};

// Custom logger
const customLogger = (req, res, next) => {
    const startTime = Date.now();

    // Response bittiğinde logla
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const logEntry = {
            timestamp: new Date().toISOString(),
            method: req.method,
            url: req.originalUrl,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            statusCode: res.statusCode,
            duration: duration + 'ms',
            contentLength: res.get('Content-Length') || 0
        };

        // Hata durumlarında detaylı log
        if (res.statusCode >= 400) {
            logEntry.error = true;
            logEntry.referrer = req.get('Referrer');
        }

        const logPath = path.join(__dirname, '../../logs/access.log');

        // Log rotasyonu kontrol et
        rotateLogFile(logPath);

        // Log dosyasına yaz
        fs.appendFile(logPath, JSON.stringify(logEntry) + '\n', (err) => {
            if (err) console.error('Log yazma hatası:', err);
        });

        // Console'da da göster (development'te)
        if (process.env.NODE_ENV === 'development') {
            const colorCode = res.statusCode >= 400 ? '\x1b[31m' : res.statusCode >= 300 ? '\x1b[33m' : '\x1b[32m';
            console.log(`${colorCode}${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms\x1b[0m`);
        }
    });

    next();
};

module.exports = {
    customLogger
};