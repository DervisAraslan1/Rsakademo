// src/middleware/cache.js - Caching middleware
const cache = (duration = 300) => { // 5 dakika default
    return (req, res, next) => {
        // Cache sadece GET requestler için
        if (req.method !== 'GET') {
            return next();
        }

        // Admin sayfaları cache'lenmesin
        if (req.path.startsWith('/admin')) {
            return next();
        }

        const key = req.originalUrl || req.url;
        const cachedResponse = req.app.locals.cache && req.app.locals.cache[key];

        if (cachedResponse && (Date.now() - cachedResponse.timestamp) < (duration * 1000)) {
            res.setHeader('Content-Type', cachedResponse.contentType);
            res.setHeader('X-Cache', 'HIT');
            return res.send(cachedResponse.body);
        }

        // Response'u intercept et
        const originalSend = res.send;
        res.send = function (body) {
            // Cache'e kaydet
            if (!req.app.locals.cache) {
                req.app.locals.cache = {};
            }

            req.app.locals.cache[key] = {
                body: body,
                contentType: res.get('Content-Type'),
                timestamp: Date.now()
            };

            res.setHeader('X-Cache', 'MISS');
            originalSend.call(this, body);
        };

        next();
    };
};

// Cache temizleme
const clearCache = (req, res, next) => {
    if (req.app.locals.cache) {
        req.app.locals.cache = {};
        console.log('✅ Cache cleared');
    }
    next();
};

module.exports = {
    cache,
    clearCache
};
