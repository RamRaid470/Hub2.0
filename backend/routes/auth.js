const express = require('express');
const { checkPassword, setPassword } = require('../auth');
const Security = require('../security');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({
        error: 'Password is required'
      });
    }

    const isValid = await checkPassword(password);
    
    if (!isValid) {
      return res.status(401).json({
        error: 'Invalid password'
      });
    }

    // Create session
    req.session.authenticated = true;
    req.session.createdAt = Date.now();

    res.json({
      success: true,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('sessionId');
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });
});

// Check auth status
router.get('/status', (req, res) => {
  res.json({
    authenticated: !!req.session.authenticated
  });
});

// Change password
router.post('/set-password', Security.authMiddleware, async (req, res) => {
  try {
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters'
      });
    }

    await setPassword(newPassword);
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('❌ Password change error:', error);
    res.status(400).json({
      error: error.message
    });
  }
});

module.exports = router; 