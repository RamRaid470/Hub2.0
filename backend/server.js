const express = require("express");
const session = require("express-session");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { checkPassword, setPassword } = require("./auth");
const { sanitizeInput, validateIP } = require("./security");
const cookieParser = require('cookie-parser');
const compression = require('compression');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],  // Allow inline event handlers
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "https:", "data:"],
      connectSrc: ["'self'", "https://api.openweathermap.org"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'none'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later"
});

const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 login attempts per hour
  message: "Too many login attempts, please try again later"
});

app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: "50kb" })); // Limit payload size
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(compression());

// Session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET || "supersecret",
  name: "sessionId",
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/'
  },
  store: new session.MemoryStore() // Explicitly use memory store
};

app.use(session(sessionConfig));

// Security middleware for authenticated routes
function isAuthenticated(req, res, next) {
  if (req.session && req.session.authenticated) {
    next();
  } else {
  return res.status(401).json({ error: "Not authenticated" });
}
}

// Rate limiting for auth check
const authCheckLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: { error: "Too many auth checks, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true
});

// ===== AUTH =====
app.post("/api/login", loginLimiter, async (req, res) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({ error: "Password is required" });
  }

  try {
    const isValid = await checkPassword(password);
    
    if (isValid) {
      // Regenerate session on login
      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).json({ error: "Failed to create session" });
        }

        // Set session data
        req.session.authenticated = true;
        req.session.createdAt = Date.now();

        // Save session
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            return res.status(500).json({ error: "Failed to save session" });
          }
          
          console.log("Login successful - New session ID:", req.session.id);
          res.json({ success: true });
        });
      });
  } else {
      res.status(401).json({ error: "Invalid password" });
    }
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/auth/status", authCheckLimiter, (req, res) => {
  try {
    // Check if session exists and is valid
    if (!req.session) {
      console.log("Auth check - No session found");
      return res.json({ authenticated: false });
    }

    // Check authentication status
    const isAuthenticated = !!req.session.authenticated;
    
    console.log("Auth check - Session ID:", req.session.id);
    console.log("Auth check - Is authenticated:", isAuthenticated);
    console.log("Auth check - Session data:", {
      authenticated: req.session.authenticated,
      createdAt: req.session.createdAt
    });

    // If authenticated, touch the session
    if (isAuthenticated) {
      req.session.touch(); // Update session expiry
    }

    // Send response with cache control headers
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.json({ authenticated: isAuthenticated });
  } catch (err) {
    console.error("Auth check error:", err);
    res.status(500).json({ error: "Internal server error", authenticated: false });
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("sessionId");
    res.json({ success: true });
  });
});

app.post("/auth/set-password", isAuthenticated, async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: "Password too short" });
  }

  await setPassword(newPassword);
  res.json({ success: true });
});

// ===== SAVE DATA =====
app.post("/api/save", isAuthenticated, (req, res) => {
  const apps = req.body;
  
  // Validate apps structure
  if (!Array.isArray(apps)) {
    return res.status(400).json({ error: "Invalid format" });
  }

  // Sanitize input
  const sanitizedApps = apps.map(group => ({
    group: sanitizeInput(group.group),
    apps: Array.isArray(group.apps) ? group.apps.map(app => ({
      name: sanitizeInput(app.name),
      url: sanitizeInput(app.url),
      icon: sanitizeInput(app.icon)
    })) : []
  }));

  const filePath = path.join(__dirname, "data", "apps.json");
  try {
    fs.writeFileSync(filePath, JSON.stringify(sanitizedApps, null, 2));
    res.json({ success: true });
  } catch (err) {
    console.error("Save error:", err);
    res.status(500).json({ error: "Failed to save" });
  }
});

app.post("/api/save-services", isAuthenticated, (req, res) => {
  const services = req.body;
  
  if (!Array.isArray(services)) {
    return res.status(400).json({ error: "Invalid format" });
  }

  // Validate and sanitize services
  const sanitizedServices = services.map(service => ({
    name: sanitizeInput(service.name),
    ip: validateIP(service.ip) ? service.ip : ""
  })).filter(service => service.name && service.ip);

  const filePath = path.join(__dirname, "..", "frontend", "services.json");
  try {
    fs.writeFileSync(filePath, JSON.stringify(sanitizedServices, null, 2));
    res.json({ success: true });
  } catch (err) {
    console.error("Service save error:", err);
    res.status(500).json({ error: "Failed to save services" });
  }
});

// ===== PING MONITOR =====
app.post("/api/ping", isAuthenticated, (req, res) => {
  const { ip } = req.body;
  
  if (!ip || !validateIP(ip)) {
    return res.status(400).json({ error: "Invalid IP address" });
  }

  // Use a timeout to prevent hanging
  const timeout = 2000; // 2 seconds
  const cmd = `ping -c 1 -W 2 ${ip}`;
  
  const pingProcess = exec(cmd, { timeout }, (error) => {
    if (error && error.killed) {
      return res.json({ online: false, reason: "timeout" });
    }
    res.json({ online: !error });
  });

  // Ensure the process is killed if the request is aborted
  req.on("close", () => {
    pingProcess.kill();
  });
});

// ===== WEATHER =====
app.get("/api/weather", isAuthenticated, (req, res) => {
  const key = process.env.WEATHER_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "Weather API key not configured" });
  }

  const city = process.env.CITY || "Palmerston North";
  const country = process.env.COUNTRY || "NZ";

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)},${encodeURIComponent(country)}&units=metric&appid=${key}`;
  
  fetch(url, { 
    timeout: 5000,
    headers: {
      "Accept": "application/json"
    }
  })
    .then(res => res.json())
    .then(data => {
      if (data.cod !== 200) {
        throw new Error(data.message || "Weather API error");
      }
      const { main, weather, name } = data;
      res.json({
        city: name,
        temp: main.temp,
        desc: weather[0].description,
        icon: weather[0].icon
      });
    })
    .catch(err => {
      console.error("Weather error:", err.message);
      res.status(500).json({ error: "Failed to fetch weather" });
    });
});

// ===== STATIC FILES =====
// Serve static files with strict caching and security headers
app.use(express.static(path.join(__dirname, "../frontend"), {
  maxAge: "1h",
  setHeaders: (res, path) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (path.endsWith(".js")) {
      res.setHeader("Content-Type", "application/javascript");
    }
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// API routes
const authRoutes = require('./routes/auth');
const appsRoutes = require('./routes/apps');
const servicesRoutes = require('./routes/services');
const bookmarksRoutes = require('./routes/bookmarks');
const weatherRoutes = require('./routes/weather');

app.use('/api/auth', authRoutes);
app.use('/api/apps', appsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/bookmarks', bookmarksRoutes);
app.use('/api/weather', weatherRoutes);

// ===== DATA ROUTES =====
app.get("/api/:type/load", isAuthenticated, (req, res) => {
  const { type } = req.params;
  
  // Validate type
  if (!['apps', 'bookmarks', 'services'].includes(type)) {
    return res.status(400).json({ error: "Invalid data type" });
  }

  try {
    // Load from file
    const filePath = path.join(__dirname, '..', 'frontend', `${type}.json`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json(data);
  } catch (error) {
    console.error(`Error loading ${type} data:`, error);
    res.status(500).json({ error: "Failed to load data" });
  }
});

app.post("/api/:type/save", isAuthenticated, (req, res) => {
  const { type } = req.params;
  const data = req.body;
  
  // Validate type
  if (!['apps', 'bookmarks', 'services'].includes(type)) {
    return res.status(400).json({ error: "Invalid data type" });
  }

  // Validate data
  if (!Array.isArray(data)) {
    return res.status(400).json({ error: "Data must be an array" });
  }

  try {
    // Save to file
    const filePath = path.join(__dirname, '..', 'frontend', `${type}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error(`Error saving ${type} data:`, error);
    res.status(500).json({ error: "Failed to save data" });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal server error'
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});