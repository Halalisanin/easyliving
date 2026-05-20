const jwt = require('jsonwebtoken');
const db = require('../config/db');

const protect = (req, res, next) => {
  let token;
  if (req.cookies.token) token = req.cookies.token;
  else if (req.headers.authorization?.startsWith('Bearer')) token = req.headers.authorization.split(' ')[1];

  if (!token) {
    if (req.accepts('html')) return res.redirect('/login');
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const blacklisted = db.prepare('SELECT id FROM token_blacklist WHERE token = ?').get(token);
    if (blacklisted) {
      res.clearCookie('token');
      return res.status(401).json({ message: 'Token revoked' });
    }

    const user = db.prepare('SELECT id, username, email, role, bio, avatar, is_active, created_at FROM users WHERE id = ?').get(decoded.id);
    if (!user) return res.status(401).json({ message: 'User not found' });
    if (!user.is_active) {
      res.clearCookie('token');
      return res.status(403).json({ message: 'Account deactivated' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.clearCookie('token');
    if (req.accepts('html')) return res.redirect('/login');
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  if (req.accepts('html')) return res.status(403).render('error', { message: 'Admin access required' });
  res.status(403).json({ message: 'Admin access required' });
};

module.exports = { protect, admin };
