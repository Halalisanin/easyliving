const db = require('../config/db');
const { validationResult } = require('express-validator');

const createPost = (req, res) => {
  try {
    const { content } = req.body;
    const result = db.prepare('INSERT INTO posts (content, author_id) VALUES (?, ?)').run(content.trim(), req.user.id);
    const post = db.prepare(`
      SELECT p.*, u.username, u.avatar
      FROM posts p JOIN users u ON p.author_id = u.id
      WHERE p.id = ?
    `).get(result.lastInsertRowid);
    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getFeed = (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  const posts = db.prepare(`
    SELECT p.*, u.username, u.avatar,
      (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) as like_count,
      (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count,
      (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id AND l.user_id = ?) as liked_by_me
    FROM posts p
    JOIN users u ON p.author_id = u.id
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(req.user.id, limit, offset);

  const total = db.prepare('SELECT COUNT(*) as count FROM posts').get();
  const hasMore = offset + limit < total.count;

  res.json({ posts, page, hasMore, total: total.count });
};

const getPostById = (req, res) => {
  const post = db.prepare(`
    SELECT p.*, u.username, u.avatar
    FROM posts p JOIN users u ON p.author_id = u.id
    WHERE p.id = ?
  `).get(req.params.id);

  if (!post) return res.status(404).json({ message: 'Post not found' });

  const likes = db.prepare('SELECT user_id FROM likes WHERE post_id = ?').all(post.id).map(l => l.user_id);
  const likedByMe = likes.includes(req.user.id);

  const comments = db.prepare(`
    SELECT c.*, u.username, u.avatar
    FROM comments c JOIN users u ON c.user_id = u.id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
  `).all(post.id);

  res.json({ ...post, likes, likedByMe, comments });
};

const updatePost = (req, res) => {
  try {
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.author_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ message: 'Not authorized' });

    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ message: 'Content is required' });

    db.prepare('UPDATE posts SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(content.trim(), req.params.id);
    const updated = db.prepare(`
      SELECT p.*, u.username, u.avatar
      FROM posts p JOIN users u ON p.author_id = u.id WHERE p.id = ?
    `).get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deletePost = (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ message: 'Post not found' });
  if (post.author_id !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ message: 'Not authorized' });

  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  res.json({ message: 'Post deleted' });
};

const likePost = (req, res) => {
  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ message: 'Post not found' });

  const existing = db.prepare('SELECT id FROM likes WHERE user_id = ? AND post_id = ?').get(req.user.id, req.params.id);
  if (existing) {
    db.prepare('DELETE FROM likes WHERE user_id = ? AND post_id = ?').run(req.user.id, req.params.id);
    const count = db.prepare('SELECT COUNT(*) as count FROM likes WHERE post_id = ?').get(req.params.id);
    return res.json({ likes: count.count, liked: false });
  }

  db.prepare('INSERT INTO likes (user_id, post_id) VALUES (?, ?)').run(req.user.id, req.params.id);
  const count = db.prepare('SELECT COUNT(*) as count FROM likes WHERE post_id = ?').get(req.params.id);
  res.json({ likes: count.count, liked: true });
};

const addComment = (req, res) => {
  try {
    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const result = db.prepare('INSERT INTO comments (text, user_id, post_id) VALUES (?, ?, ?)').run(req.body.text.trim(), req.user.id, req.params.id);
    const comment = db.prepare(`
      SELECT c.*, u.username, u.avatar
      FROM comments c JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).get(result.lastInsertRowid);
    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createPost, getFeed, getPostById, updatePost, deletePost, likePost, addComment };
