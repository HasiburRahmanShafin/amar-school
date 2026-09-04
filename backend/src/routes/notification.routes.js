const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth.middleware');
const notificationCtrl = require('../controllers/notification.controller');

router.get('/', protect, notificationCtrl.getMyNotifications);
router.patch('/read-all', protect, notificationCtrl.markAllAsRead);
router.patch('/:id/read', protect, notificationCtrl.markAsRead);

module.exports = router;
