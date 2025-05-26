class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', {
      name: err.name,
      message: err.message,
      stack: err.stack,
      statusCode: err.statusCode
    });
  }

  // Only log unexpected errors in production
  if (process.env.NODE_ENV === 'production' && !err.isOperational) {
    console.error('Unexpected error:', err);
  }

  // Send error response
  res.status(err.statusCode).json({
    status: err.status,
    error: err.name,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Async handler wrapper to avoid try-catch blocks
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  errorHandler,
  asyncHandler
}; 