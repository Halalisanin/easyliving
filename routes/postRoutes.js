const express = require('express');
const { body } = require('express-validator');
const { createPost, getFeed, getPostById, updatePost, deletePost, likePost, addComment } = require('../controllers/postController');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.route('/')
  .get(protect, getFeed)
  .post(protect, [body('content').trim().isLength({ min: 1, max: 5000 }).withMessage('Content must be 1-5000 characters')], createPost);

router.route('/:id')
  .get(protect, getPostById)
  .put(protect, [body('content').trim().isLength({ min: 1, max: 5000 }).withMessage('Content must be 1-5000 characters')], updatePost)
  .delete(protect, deletePost);

router.post('/:id/like', protect, likePost);
router.post('/:id/comments', protect, [body('text').trim().notEmpty().withMessage('Comment text required')], addComment);

module.exports = router;
