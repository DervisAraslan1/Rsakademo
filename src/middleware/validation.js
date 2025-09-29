// src/middleware/validation.js - Input validation middleware
const { body, validationResult } = require('express-validator');

// Validation sonucunu kontrol et
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg);

        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(400).json({
                success: false,
                errors: errorMessages,
                fields: errors.array().reduce((acc, error) => {
                    acc[error.param] = error.msg;
                    return acc;
                }, {})
            });
        }

        // Form sayfasına hata mesajlarıyla geri dön
        return res.redirect('back?error=' + encodeURIComponent(errorMessages.join(', ')));
    }

    next();
};

// Product validation rules
const validateProduct = [
    body('name')
        .notEmpty()
        .withMessage('Ürün adı zorunludur')
        .isLength({ min: 2, max: 200 })
        .withMessage('Ürün adı 2-200 karakter arasında olmalıdır'),

    body('price')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Fiyat geçerli bir sayı olmalıdır'),

    body('description')
        .optional()
        .isLength({ max: 5000 })
        .withMessage('Açıklama 5000 karakterden uzun olamaz'),

    handleValidationErrors
];

// Category validation rules
const validateCategory = [
    body('name')
        .notEmpty()
        .withMessage('Kategori adı zorunludur')
        .isLength({ min: 2, max: 100 })
        .withMessage('Kategori adı 2-100 karakter arasında olmalıdır'),

    handleValidationErrors
];

// Slider validation rules
const validateSlider = [
    body('title')
        .notEmpty()
        .withMessage('Slider başlığı zorunludur')
        .isLength({ min: 2, max: 200 })
        .withMessage('Başlık 2-200 karakter arasında olmalıdır'),

    body('subtitle')
        .optional()
        .isLength({ max: 300 })
        .withMessage('Alt başlık 300 karakterden uzun olamaz'),

    body('link')
        .optional()
        .isURL()
        .withMessage('Geçerli bir URL giriniz'),

    handleValidationErrors
];

// Contact form validation
const validateContact = [
    body('name')
        .notEmpty()
        .withMessage('İsim zorunludur')
        .isLength({ min: 2, max: 100 })
        .withMessage('İsim 2-100 karakter arasında olmalıdır'),

    body('email')
        .isEmail()
        .withMessage('Geçerli bir e-posta adresi giriniz')
        .normalizeEmail(),

    body('phone')
        .optional()
        .isMobilePhone('tr-TR')
        .withMessage('Geçerli bir telefon numarası giriniz'),

    body('message')
        .notEmpty()
        .withMessage('Mesaj zorunludur')
        .isLength({ min: 10, max: 1000 })
        .withMessage('Mesaj 10-1000 karakter arasında olmalıdır'),

    handleValidationErrors
];

// Settings validation
const validateSettings = [
    body('site_name')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Site adı 2-100 karakter arasında olmalıdır'),

    body('contact_email')
        .optional()
        .isEmail()
        .withMessage('Geçerli bir e-posta adresi giriniz'),

    body('contact_phone')
        .optional()
        .isLength({ max: 20 })
        .withMessage('Telefon numarası 20 karakterden uzun olamaz'),

    handleValidationErrors
];

module.exports = {
    validateProduct,
    validateCategory,
    validateSlider,
    validateContact,
    validateSettings,
    handleValidationErrors
};