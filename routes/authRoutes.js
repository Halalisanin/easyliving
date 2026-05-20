const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { register, login, logout, getMe, updateProfile, deleteProfile } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const router = express.Router();

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { message: 'Too many login attempts, try again later' } });

router.post('/register', [
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], register);
router.post('/login', loginLimiter, login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/profile', protect, [
  body('username').optional().trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters')
], updateProfile);
router.delete('/profile', protect, deleteProfile);

module.exports = router;
