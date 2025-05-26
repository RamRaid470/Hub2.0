const session = require('express-session');
const crypto = require('crypto');
const config = require('../config');
const storage = require('../utils/storage');
const { AuthenticationError } = require('../utils/errors');

// Session middleware setup
const setupSession = (app) => {
  app.use(session({
    ...config.session,
    store: new session.MemoryStore(), // For development, use a proper store in production
    resave: true, // Required for MemoryStore
    saveUninitialized: false
  }));
};

// Hash password
const hashPassword = (password) => {
  return crypto
    .createHash('sha256')
    .update(password)
    .digest('hex');
};

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.authenticated) {
    res.status(401).json({
      status: 'error',
      message: 'Not authenticated'
    });
    return;
  }
  next();
};

// Login handler
const login = async (password) => {
  try {
    const env = await storage.readEnv();
    const storedHash = env.PASSWORD_HASH;
    const inputHash = hashPassword(password);

    if (!storedHash) {
      // First time setup - store default password hash
      const defaultHash = hashPassword(config.app.defaultPassword);
      await storage.updateEnv({ PASSWORD_HASH: defaultHash });
      return inputHash === defaultHash;
    }

    return inputHash === storedHash;
  } catch (err) {
    console.error('Login error:', err);
    // If there's an error reading/writing env, allow login with default password
    const defaultHash = hashPassword(config.app.defaultPassword);
    return hashPassword(password) === defaultHash;
  }
};

// Change password handler
const changePassword = async (currentPassword, newPassword) => {
  const env = await storage.readEnv();
  const storedHash = env.PASSWORD_HASH;
  const currentHash = hashPassword(currentPassword);

  if (currentHash !== storedHash) {
    throw new AuthenticationError('Current password is incorrect');
  }

  const newHash = hashPassword(newPassword);
  await storage.updateEnv({ PASSWORD_HASH: newHash });
  return true;
};

module.exports = {
  setupSession,
  requireAuth,
  login,
  changePassword,
  hashPassword
};