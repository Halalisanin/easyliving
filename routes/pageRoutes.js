const express = require('express');
const db = require('../config/db');
const { protect, admin } = require('../middleware/auth');
const router = express.Router();

router.get('/', (req, res) => {
  const token = req.cookies.token;
  if (token) return res.redirect('/feed');
  res.render('index', { title: 'Home' });
});

router.get('/login', (req, res) => {
  if (req.cookies.token) return res.redirect('/feed');
  res.render('login', { title: 'Login' });
});

router.get('/register', (req, res) => {
  if (req.cookies.token) return res.redirect('/feed');
  res.render('register', { title: 'Register' });
});

router.get('/feed', protect, (req, res) => {
  res.render('feed', { title: 'Feed', user: req.user });
});

router.get('/posts/create', protect, (req, res) => {
  res.render('create-post', { title: 'New Post', user: req.user });
});

router.get('/posts/:id', protect, (req, res) => {
  const post = db.prepare(`
    SELECT p.*, u.username, u.avatar FROM posts p
    JOIN users u ON p.author_id = u.id WHERE p.id = ?
  `).get(req.params.id);
  if (!post) return res.status(404).render('error', { layout: 'layouts/main', message: 'Post not found', status: 404 });
  res.render('post', { title: 'Post', user: req.user, post });
});

router.get('/profile', protect, (req, res) => {
  const userPosts = db.prepare('SELECT COUNT(*) as count FROM posts WHERE author_id = ?').get(req.user.id);
  res.render('profile', { title: 'Profile', user: req.user, postCount: userPosts.count });
});

router.get('/admin', protect, admin, (req, res) => {
  res.render('admin/dashboard', { layout: 'layouts/admin', title: 'Dashboard', user: req.user });
});

router.get('/admin/users', protect, admin, (req, res) => {
  res.render('admin/users', { layout: 'layouts/admin', title: 'Users', user: req.user });
});

module.exports = router;
