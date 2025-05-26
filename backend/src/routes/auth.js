const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const validate = require('../utils/validation');
const { asyncHandler } = require('../utils/errors');

// Login route
router.post('/login', asyncHandler(async (req, res) => {
  const password = validate.password(req.body.password);
  const isValid = await auth.login(password);

  if (!isValid) {
    req.session.authenticated = false;
    res.status(401).json({ status: 'error', message: 'Invalid password' });
    return;
  }

  req.session.authenticated = true;
  req.session.createdAt = Date.now();
  res.json({ status: 'success', message: 'Login successful' });
}));

// Logout route
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('sessionId');
    res.json({ status: 'success', message: 'Logged out successfully' });
  });
});

// Change password route
router.post('/change-password', auth.requireAuth, asyncHandler(async (req, res) => {
  const currentPassword = validate.password(req.body.currentPassword);
  const newPassword = validate.newPassword(req.body.newPassword);

  await auth.changePassword(currentPassword, newPassword);
  res.json({ status: 'success', message: 'Password changed successfully' });
}));

// Check auth status route
router.get('/status', (req, res) => {
  res.json({
    status: 'success',
    authenticated: !!req.session.authenticated
  });
});

module.exports = router; 