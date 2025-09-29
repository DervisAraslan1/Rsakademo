// src/middleware/rateLimiter.js - Rate limiting middleware
const rateLimit = require('express-rate-limit');

// Genel rate limiter
const generalLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 dakika
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 request
    message: {
        error: 'Çok fazla istek gönderdiniz. Lütfen daha sonra tekrar deneyin.',
        retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000) / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Static dosyaları rate limit'ten muaf tut
        return req.path.startsWith('/css') ||
            req.path.startsWith('/js') ||
            req.path.startsWith('/images') ||
            req.path.startsWith('/uploads');
    }
});

// Contact form için özel rate limiter
const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 saat
    max: 5, // Saatte 5 mesaj
    message: {
        error: 'Çok fazla iletişim mesajı gönderdiniz. Lütfen 1 saat sonra tekrar deneyin.'
    }
});

// Admin login için rate limiter
const adminLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 dakika
    max: 5, // 5 deneme
    message: {
        error: 'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.'
    },
    skipSuccessfulRequests: true
});

module.exports = {
    generalLimiter,
    contactLimiter,
    adminLoginLimiter
};