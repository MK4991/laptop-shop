
const { body, param, validationResult } = require('express-validator');

const validateLaptop = [
    body('brand_name')
        .trim()
        .notEmpty()
        .withMessage('Brand name is required'),

    body('model')
        .trim()
        .notEmpty()
        .withMessage('Laptop model is required'),

    body('processor_brand')
        .trim()
        .notEmpty()
        .withMessage('Processor brand is required'),

    body('processor_model')
        .trim()
        .notEmpty()
        .withMessage('Processor model is required'),

    body('ram_capacity')
        .isInt({ min: 1 })
        .withMessage('RAM must be a positive integer'),

    body('storage_capacity')
        .isInt({ min: 1 })
        .withMessage('Storage capacity must be a positive integer'),

    body('storage_type')
        .trim()
        .notEmpty()
        .withMessage('Storage type is required'),

    body('price')
        .isFloat({ min: 0.01 })
        .withMessage('Price must be greater than zero'),

    body('condition')
        .isIn(['New', 'Used'])
        .withMessage('Condition must be New or Used'),

    body('graphics_card')
        .trim()
        .notEmpty()
        .withMessage('Graphics card information is required'),

    body('screen_size')
        .isFloat({ min: 1 })
        .withMessage('Screen size must be positive'),

    body('quantity')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Quantity must be zero or greater'),

    body('processor_generation')
        .optional({ values: 'null' })
        .isInt({ min: 1 })
        .withMessage('Processor generation must be a positive integer')
];

const validateLaptopUpdate = [
    body('brand_name').optional().isString().trim().notEmpty().isLength({ max: 50 }),
    body('model').optional().isString().trim().notEmpty().isLength({ max: 100 }),
    body('processor_brand').optional().isString().trim().notEmpty().isLength({ max: 30 }),
    body('processor_model').optional().isString().trim().notEmpty().isLength({ max: 100 }),
    body('processor_generation').optional({ nullable: true }).isInt({ min: 1 }),
    body('ram_capacity').optional().isInt({ min: 1 }),
    body('storage_capacity').optional().isInt({ min: 1 }),
    body('storage_type').optional().isString().trim().notEmpty().isLength({ max: 30 }),
    body('price').optional().isFloat({ min: 0.01 }),
    body('condition').optional().isIn(['New', 'Used']),
    body('graphics_card').optional().isString().trim().notEmpty().isLength({ max: 100 }),
    body('screen_size').optional().isFloat({ min: 1, max: 99.9 }),
    body('quantity').optional().isInt({ min: 0 }),
    body('availability').optional().isIn(['Available', 'Unavailable', 'Sold'])
];

const validateLaptopId = [
    param('id').isInt({ min: 1 }).withMessage('Laptop ID must be a positive integer.')
];

const checkValidation = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }

    next();
};

module.exports = {
    validateLaptop,
    validateLaptopUpdate,
    validateLaptopId,
    checkValidation
};
