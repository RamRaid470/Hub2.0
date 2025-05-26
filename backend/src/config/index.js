const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const config = {
  app: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
    defaultPassword: 'admin'
  },
  
  paths: {
    root: path.resolve(__dirname, '../../'),
    env: path.resolve(__dirname, '../../.env'),
    frontend: path.resolve(__dirname, '../../../frontend'),
    data: path.resolve(__dirname, '../../data')
  },

  session: {
    secret: process.env.SESSION_SECRET || 'supersecret',
    name: 'sessionId',
    resave: true,
    rolling: true,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600000, // 1 hour
      path: '/'
    }
  },

  cors: {
    origin: process.env.ALLOWED_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },

  rateLimits: {
    global: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // Limit each IP to 100 requests per windowMs
    },
    login: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 5 // 5 login attempts per hour
    }
  },

  security: {
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          scriptSrcAttr: ["'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "https://openweathermap.org", "data:", "https:"],
          connectSrc: ["'self'", "https://openweathermap.org"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'none'"],
          frameSrc: ["'none'"]
        }
      },
      crossOriginEmbedderPolicy: false
    }
  },

  weather: {
    apiKey: process.env.WEATHER_API_KEY,
    defaultCity: process.env.CITY || 'Palmerston North',
    defaultCountry: process.env.COUNTRY || 'NZ',
    refreshInterval: 300000 // 5 minutes
  }
};

// Ensure required directories exist
const fs = require('fs');
const mkdirp = require('mkdirp');

[config.paths.data].forEach(dir => {
  if (!fs.existsSync(dir)) {
    mkdirp.sync(dir);
  }
});

module.exports = config; 