const express = require('express');
const router = express.Router();
const controller = require('../controllers/platformController');
const { requirePlatformOwner } = require('../middleware/authMiddleware');

router.post('/auth/login', controller.login);
router.post('/auth/logout', controller.logout);
router.get('/auth/me', controller.me);

router.get('/stores', requirePlatformOwner, controller.listStores);
router.post('/stores', requirePlatformOwner, controller.createStore);
router.patch('/stores/:id', requirePlatformOwner, controller.updateStore);
router.patch('/stores/:id/status', requirePlatformOwner, controller.setStoreStatus);
router.get('/stores/:id/admins', requirePlatformOwner, controller.listAdmins);
router.post('/stores/:id/admins', requirePlatformOwner, controller.createAdmin);
router.post('/stores/:id/admins/:adminId/reset-password', requirePlatformOwner, controller.resetAdminPassword);

module.exports = router;
