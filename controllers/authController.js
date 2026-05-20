const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { validationResult } = require('express-validator');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, email, password } = req.body;
    const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const result = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)').run(username, email, hashedPassword);

    const token = generateToken(result.lastInsertRowid);
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'strict' });
    res.status(201).json({ id: result.lastInsertRowid, username, email, role: 'user' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    if (!user.is_active) return res.status(403).json({ message: 'Account deactivated' });

    const token = generateToken(user.id);
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'strict' });
    res.json({ id: user.id, username: user.username, email: user.email, role: user.role });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const logout = (req, res) => {
  const token = req.cookies.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const expiresAt = new Date(decoded.exp * 1000).toISOString().slice(0, 19).replace('T', ' ');
      db.prepare('INSERT INTO token_blacklist (token, expires_at) VALUES (?, ?)').run(token, expiresAt);
    } catch (_) {}
  }
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
};

const getMe = (req, res) => {
  const user = db.prepare('SELECT id, username, email, role, bio, avatar, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
};

const updateProfile = async (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { username, bio, avatar } = req.body;
    if (username && username.trim().length >= 3) {
      const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, req.user.id);
      if (existing) return res.status(400).json({ message: 'Username taken' });
      db.prepare('UPDATE users SET username = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(username.trim(), req.user.id);
    }
    if (bio !== undefined) db.prepare('UPDATE users SET bio = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(bio, req.user.id);
    if (avatar !== undefined) db.prepare('UPDATE users SET avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(avatar, req.user.id);

    const updated = db.prepare('SELECT id, username, email, role, bio, avatar, created_at FROM users WHERE id = ?').get(req.user.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteProfile = (req, res) => {
  db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id);
  res.clearCookie('token');
  res.json({ message: 'Account deleted successfully' });
};

module.exports = { register, login, logout, getMe, updateProfile, deleteProfile };
