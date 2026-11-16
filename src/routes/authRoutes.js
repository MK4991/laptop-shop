
const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');

const {
    getCurrentAdmin
} = require('../middleware/authMiddleware');

router.post('/login', authController.login);

router.post('/logout', authController.logout);

router.get('/me', getCurrentAdmin);

module.exports = router;

