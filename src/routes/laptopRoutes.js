
const express = require('express');
const router = express.Router();

const laptopController = require('../controllers/laptopController');
const laptopImageController = require('../controllers/laptopImageController');

const upload = require('../config/multer');

const {
    validateLaptop,
    validateLaptopUpdate,
    validateLaptopId,
    checkValidation
} = require('../middleware/laptopValidation');

const {
    requireAdmin
} = require('../middleware/authMiddleware');

// Public routes
router.get('/', laptopController.getAllLaptops);
router.get('/filters', laptopController.getLaptopFilterOptions);
router.get('/:id', validateLaptopId, checkValidation, laptopController.getLaptopById);

// Protected laptop management routes
router.post(
    '/',
    requireAdmin,
    validateLaptop,
    checkValidation,
    laptopController.createLaptop
);

router.put(
    '/:id',
    requireAdmin,
    validateLaptopId,
    checkValidation,
    validateLaptopUpdate,
    checkValidation,
    laptopController.updateLaptop
);

router.delete(
    '/:id',
    requireAdmin,
    validateLaptopId,
    checkValidation,
    laptopController.deleteLaptop
);

// Protected image upload route
router.post(
    '/:id/images',
    requireAdmin,
    upload.array('images', 5),
    upload.handleUploadError,
    upload.validateFileSignatures,
    laptopImageController.uploadLaptopImages
);

// Protected image management routes
router.get(
    '/:id/images',
    requireAdmin,
    laptopImageController.getLaptopImages
);

router.patch(
    '/:id/images/:imageId/primary',
    requireAdmin,
    laptopImageController.setPrimaryImage
);

router.delete(
    '/:id/images/:imageId',
    requireAdmin,
    laptopImageController.deleteLaptopImage
);

module.exports = router;



