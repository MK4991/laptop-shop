const express = require('express');
const router = express.Router();
const controller = require('../controllers/customSpecificationController');
const { requireAdmin } = require('../middleware/authMiddleware');

router.get('/', controller.list);
router.post('/', requireAdmin, controller.create);
router.post('/:id/options', requireAdmin, controller.addChoice);
router.patch('/:id/options', requireAdmin, controller.renameChoice);
router.delete('/:id/options', requireAdmin, controller.deleteChoice);
router.patch('/:id', requireAdmin, controller.rename);
router.delete('/:id', requireAdmin, controller.remove);

module.exports = router;
