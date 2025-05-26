const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const ping = require('ping');

const router = express.Router();
const SERVICES_FILE = path.join(__dirname, '..', 'data', 'services.json');

// Initialize services file if it doesn't exist
async function initServices() {
  try {
    await fs.access(SERVICES_FILE);
  } catch {
    await fs.mkdir(path.dirname(SERVICES_FILE), { recursive: true });
    await fs.writeFile(SERVICES_FILE, JSON.stringify([], null, 2));
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

// Get all services
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const data = await fs.readFile(SERVICES_FILE, 'utf8');
    res.json({
      status: 'success',
      data: JSON.parse(data)
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to load services'
    });
  }
});

// Save all services
router.put('/', isAuthenticated, async (req, res) => {
  try {
    const services = req.body;
    
    if (!Array.isArray(services)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid services data'
      });
    }

    // Validate each service
    for (const service of services) {
      if (!service.name?.trim() || !service.ip?.trim()) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid service data'
        });
      }
    }

    await fs.writeFile(SERVICES_FILE, JSON.stringify(services, null, 2));

    res.json({
      status: 'success',
      data: services
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to save services'
    });
  }
});

// Add new service
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const service = req.body;
    
    if (!service.name?.trim() || !service.ip?.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid service data'
      });
    }

    const data = await fs.readFile(SERVICES_FILE, 'utf8');
    const services = JSON.parse(data);
    
    if (services.some(s => s.name === service.name)) {
      return res.status(400).json({
        status: 'error',
        message: 'Service already exists'
      });
    }

    services.push(service);
    await fs.writeFile(SERVICES_FILE, JSON.stringify(services, null, 2));

    res.json({
      status: 'success',
      data: service
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to add service'
    });
  }
});

// Delete service
router.delete('/:serviceName', isAuthenticated, async (req, res) => {
  try {
    const { serviceName } = req.params;

    const data = await fs.readFile(SERVICES_FILE, 'utf8');
    const services = JSON.parse(data);
    
    const index = services.findIndex(s => s.name === serviceName);
    if (index === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'Service not found'
      });
    }

    services.splice(index, 1);
    await fs.writeFile(SERVICES_FILE, JSON.stringify(services, null, 2));

    res.json({
      status: 'success',
      message: 'Service deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete service'
    });
  }
});

// Ping service
router.post('/ping', isAuthenticated, async (req, res) => {
  try {
    const { ip } = req.body;
    
    if (!service.ip?.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid IP address'
      });
    }

    const result = await ping.promise.probe(ip, {
      timeout: 2,
      extra: ['-c', '1']
    });

    res.json({
      status: 'success',
      online: result.alive
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to ping service'
    });
  }
});

// Initialize on module load
initServices().catch(console.error);

module.exports = router; 