const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();
const CONFIG_FILE = path.join(__dirname, '..', 'data', 'config.json');

// Initialize config file if it doesn't exist
async function initConfig() {
  try {
    await fs.access(CONFIG_FILE);
  } catch {
    const defaultConfig = {
      weather: {
        apiKey: "",
        city: "Palmerston North",
        country: "NZ"
      },
      search: {
        provider: "duckduckgo",
        providers: {
          duckduckgo: "https://duckduckgo.com/?q=",
          google: "https://www.google.com/search?q=",
          bing: "https://www.bing.com/search?q="
        }
      },
      theme: {
        mode: "dark",
        accentColor: "#00bfa5"
      }
    };

    await fs.mkdir(path.dirname(CONFIG_FILE), { recursive: true });
    await fs.writeFile(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
  }
}

// Authentication middleware
function isAuthenticated(req, res, next) {
  if (req.session && (req.session.loggedIn || req.session.authenticated)) {
    next();
  } else {
    res.status(401).json({ error: "Not authenticated" });
  }
}

// Get config
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf8');
    const config = JSON.parse(data);
    
    // Don't send the API key to the frontend
    const sanitizedConfig = { ...config };
    if (sanitizedConfig.weather) {
      sanitizedConfig.weather = {
        ...sanitizedConfig.weather,
        hasApiKey: !!config.weather.apiKey,
        apiKey: undefined
      };
    }
    
    res.json({
      status: 'success',
      data: sanitizedConfig
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to load configuration'
    });
  }
});

// Update config
router.put('/', isAuthenticated, async (req, res) => {
  try {
    const newConfig = req.body;
    const data = await fs.readFile(CONFIG_FILE, 'utf8');
    const currentConfig = JSON.parse(data);
    
    // Validate and merge the configs
    const updatedConfig = {
      weather: {
        ...currentConfig.weather,
        ...(newConfig.weather || {}),
        // Only update API key if provided
        apiKey: newConfig.weather?.apiKey || currentConfig.weather.apiKey
      },
      search: {
        ...currentConfig.search,
        ...(newConfig.search || {}),
        // Ensure providers object is preserved
        providers: currentConfig.search.providers
      },
      theme: {
        ...currentConfig.theme,
        ...(newConfig.theme || {})
      }
    };

    await fs.writeFile(CONFIG_FILE, JSON.stringify(updatedConfig, null, 2));

    // Send back sanitized config
    const sanitizedConfig = { ...updatedConfig };
    if (sanitizedConfig.weather) {
      sanitizedConfig.weather = {
        ...sanitizedConfig.weather,
        hasApiKey: !!updatedConfig.weather.apiKey,
        apiKey: undefined
      };
    }

    res.json({
      status: 'success',
      data: sanitizedConfig
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to update configuration'
    });
  }
});

// Initialize on module load
initConfig().catch(console.error);

module.exports = router; 