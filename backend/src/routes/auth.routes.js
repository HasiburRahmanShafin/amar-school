const express = require('express');
const { registerSchool, login, getMe } = require('../controllers/auth.controller');
const protect = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/register-school', registerSchool);
router.post('/login', login);
router.get('/me', protect, getMe);

module.exports = router;
