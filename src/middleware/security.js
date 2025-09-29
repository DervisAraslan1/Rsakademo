// src/middleware/security.js - Security middleware
const helmet = require('helmet');

// Security headers
const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            connectSrc: ["'self'"],
            mediaSrc: ["'self'"],
            objectSrc: ["'none'"],
            childSrc: ["'none'"],
            workerSrc: ["'none'"],
            frameSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false, // İframe kullanımı için
    crossOriginResourcePolicy: { policy: "cross-origin" }
});

// XSS Protection
const xssProtection = (req, res, next) => {
    // Response header'ları ekle
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    next();
};

// CSRF Protection (basit token sistemi)
const csrfProtection = (req, res, next) => {
    if (req.method === 'GET') {
        // GET requestlerde token oluştur
        req.session.csrfToken = req.session.csrfToken || Math.random().toString(36).substring(2);
        res.locals.csrfToken = req.session.csrfToken;
    } else if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
        // POST/PUT/DELETE'de token kontrol et
        const token = req.body._csrf || req.headers['x-csrf-token'];

        if (!token || token !== req.session.csrfToken) {
            if (req.xhr) {
                return res.status(403).json({ error: 'CSRF token mismatch' });
            }
            return res.status(403).render('pages/error', {
                title: 'Güvenlik Hatası',
                message: 'İsteğiniz güvenlik kontrolünden geçemedi.'
            });
        }
    }

    next();
};

// IP-based request tracking
const requestTracker = (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || 'Unknown';

    // Log suspicious activities
    if (req.path.includes('admin') && !req.session.isAdmin) {
        console.log(`🚨 Admin access attempt from ${clientIP} - ${userAgent}`);
    }

    next();
};

module.exports = {
    securityHeaders,
    xssProtection,
    csrfProtection,
    requestTracker
};