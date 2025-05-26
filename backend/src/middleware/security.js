const xss = require("xss");
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const config = require('../config');
const { ValidationError } = require('../utils/errors');
const express = require('express');

/**
 * Sanitize user input to prevent XSS attacks
 * @param {string} input - The input to sanitize
 * @returns {string} - Sanitized input
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
    return '';
  }
  return xss(input.trim(), {
    whiteList: {}, // No tags allowed
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style']
  });
};

/**
 * Validate IP address format
 * @param {string} ip - The IP address to validate
 * @returns {string} - Validated IP address
 */
const validateIP = (ip) => {
  if (typeof ip !== 'string') {
    throw new ValidationError('IP address must be a string');
  }
  
  // IPv4 validation
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Regex.test(ip)) {
    throw new ValidationError('Invalid IP address format');
  }
  
  // Check each octet
  const octets = ip.split('.');
  const validOctets = octets.every(octet => {
    const num = parseInt(octet, 10);
    return num >= 0 && num <= 255;
  });
  
  if (!validOctets) {
    throw new ValidationError('Invalid IP address values');
  }
  
  return ip;
};

// Rate limiting middleware
const globalLimiter = rateLimit(config.rateLimits.global);
const loginLimiter = rateLimit(config.rateLimits.login);

// Security middleware setup
const setupSecurity = (app) => {
  // Basic security headers
  app.use(helmet(config.security.helmet));

  // CORS configuration
  app.use(cors(config.cors));

  // Rate limiting
  app.use(globalLimiter);
  app.use('/api/auth/login', loginLimiter);

  // Prevent clickjacking
  app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    next();
  });

  // Security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'same-origin');
    next();
  });

  // Disable powered-by header
  app.disable('x-powered-by');
};

module.exports = {
  sanitizeInput,
  validateIP,
  setupSecurity,
  globalLimiter,
  loginLimiter
}; 