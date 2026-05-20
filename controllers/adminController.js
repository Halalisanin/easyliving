const db = require('../config/db');

const getAllUsers = (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  const users = db.prepare(`
    SELECT id, username, email, role, bio, avatar, is_active, created_at,
      (SELECT COUNT(*) FROM posts WHERE author_id = users.id) as post_count
    FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).all(limit, offset);

  const total = db.prepare('SELECT COUNT(*) as count FROM users').get();
  res.json({ users, page, hasMore: offset + limit < total.count, total: total.count });
};

const toggleUserActive = (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.role === 'admin') return res.status(403).json({ message: 'Cannot deactivate admin' });

  const newStatus = user.is_active ? 0 : 1;
  db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(newStatus, req.params.id);
  res.json({ message: `User ${newStatus ? 'activated' : 'deactivated'}`, isActive: !!newStatus });
};

const deleteAnyPost = (req, res) => {
  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ message: 'Post not found' });

  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  res.json({ message: 'Post deleted by admin' });
};

const getReportedPosts = (req, res) => {
  res.json({ posts: [], message: 'Reporting feature coming soon' });
};

const getAdminStats = (req, res) => {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  const postCount = db.prepare('SELECT COUNT(*) as count FROM posts').get();
  const commentCount = db.prepare('SELECT COUNT(*) as count FROM comments').get();
  const likeCount = db.prepare('SELECT COUNT(*) as count FROM likes').get();
  const activeUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').get();
  res.json({ users: userCount.count, posts: postCount.count, comments: commentCount.count, likes: likeCount.count, activeUsers: activeUsers.count });
};

module.exports = { getAllUsers, toggleUserActive, deleteAnyPost, getReportedPosts, getAdminStats };
