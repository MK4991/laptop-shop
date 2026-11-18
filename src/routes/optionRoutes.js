const express = require('express');
const router = express.Router();
const optionController = require('../controllers/optionController');
const { requireAdmin } = require('../middleware/authMiddleware');

router.get('/', optionController.getOptions);
router.post('/:type', requireAdmin, optionController.createOption);
router.patch('/:type/:id', requireAdmin, optionController.renameOption);
router.delete('/:type/:id', requireAdmin, optionController.deleteOption);

module.exports = router;
