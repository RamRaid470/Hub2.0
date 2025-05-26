const express = require('express');
const path = require('path');
const config = require('./config');

// Import middleware
const { setupSecurity } = require('./middleware/security');
const { setupSession, requireAuth } = require('./middleware/auth');
const { errorHandler } = require('./utils/errors');

// Import routes
const authRoutes = require('./routes/auth');
const bookmarkRoutes = require('./routes/bookmarks');
const serviceRoutes = require('./routes/services');
const appRoutes = require('./routes/apps');

// Create Express app
const app = express();

// Setup security middleware first (includes rate limiting and headers)
setupSecurity(app);

// Then setup parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup session handling
setupSession(app);

// API routes - mount before static files to ensure proper order
app.use('/api/auth', authRoutes);
app.use('/api/bookmarks', requireAuth, bookmarkRoutes);
app.use('/api/services', requireAuth, serviceRoutes);
app.use('/api/apps', requireAuth, appRoutes);

// Serve static frontend files with cache control
app.use(express.static(path.join(__dirname, '../../frontend'), {
  setHeaders: (res, filePath) => {
    // Prevent caching for JavaScript files
    if (filePath.endsWith('.js')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
      res.setHeader('Content-Type', 'application/javascript');
    } else {
      // Cache other static files for 1 hour
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));

// Serve login.html for unauthenticated users
app.get('/', (req, res, next) => {
  if (!req.session.authenticated) {
    res.sendFile(path.join(__dirname, '../../frontend/login.html'));
  } else {
    next();
  }
});

// Serve index.html for authenticated users and all other routes (SPA support)
app.get('*', (req, res) => {
  if (req.path === '/' && !req.session.authenticated) {
    res.sendFile(path.join(__dirname, '../../frontend/login.html'));
  } else {
    res.sendFile(path.join(__dirname, '../../frontend/index.html'));
  }
});

// Error handling middleware - ensure it returns JSON for API routes
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Check if it's an API route
  if (req.path.startsWith('/api/')) {
    const statusCode = err.status || 500;
    res.status(statusCode).json({
      status: 'error',
      message: err.message || 'Internal server error'
    });
  } else {
    next(err);
  }
});

// General error handler as fallback
app.use(errorHandler);

// Start server
const port = config.app.port;
app.listen(port, () => {
  console.log(`Server running in ${config.app.env} mode on port ${port}`);
});