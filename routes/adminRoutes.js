const express = require('express');
const { getAllUsers, toggleUserActive, deleteAnyPost, getReportedPosts, getAdminStats } = require('../controllers/adminController');
const { protect, admin } = require('../middleware/auth');
const router = express.Router();

router.use(protect, admin);
router.get('/stats', getAdminStats);
router.get('/users', getAllUsers);
router.put('/users/:id/toggle', toggleUserActive);
router.delete('/posts/:id', deleteAnyPost);
router.get('/reported-posts', getReportedPosts);

module.exports = router;
