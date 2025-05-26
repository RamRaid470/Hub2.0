const express = require('express');
const Security = require('../security');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();
const APPS_FILE = path.join(__dirname, '..', 'data', 'apps.json');

// Authentication middleware
function isAuthenticated(req, res, next) {
  if (req.session && req.session.authenticated) {
    next();
  } else {
    return res.status(401).json({ 
      status: 'error',
      message: "Not authenticated" 
    });
  }
}

// File operation helpers
async function readAppsFile() {
  try {
    const data = await fs.readFile(APPS_FILE, 'utf8');
    const apps = JSON.parse(data);
    if (!Array.isArray(apps)) {
      throw new Error('Invalid apps data format');
    }
    return apps;
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, create it with empty array
      await fs.writeFile(APPS_FILE, '[]');
      return [];
    }
    throw error;
  }
}

async function writeAppsFile(apps) {
  if (!Array.isArray(apps)) {
    throw new Error('Invalid apps data format');
  }
  
  // Validate the structure of the apps data
  for (const group of apps) {
    if (!group.group || typeof group.group !== 'string') {
      throw new Error('Invalid group name');
    }
    if (!Array.isArray(group.apps)) {
      throw new Error('Invalid apps array');
    }
    for (const app of group.apps) {
      if (!app.name || !app.url || !app.icon) {
        throw new Error('Invalid app data');
      }
    }
  }

  // Write to a temporary file first
  const tempFile = APPS_FILE + '.tmp';
  await fs.writeFile(tempFile, JSON.stringify(apps, null, 2));
  
  // Rename the temporary file to the actual file (atomic operation)
  await fs.rename(tempFile, APPS_FILE);
}

// Initialize apps file if it doesn't exist
async function initApps() {
  try {
    await readAppsFile();
  } catch (error) {
    console.error('Failed to initialize apps file:', error);
    throw error;
  }
}

// Get all apps
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const apps = await readAppsFile();
    res.json({
      status: 'success',
      data: apps
    });
  } catch (error) {
    console.error('Failed to load apps:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to load apps'
    });
  }
});

// Add new app group
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { group, apps } = req.body;
    
    if (!group?.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Group name is required'
      });
    }

    const groups = await readAppsFile();
    
    if (groups.some(g => g.group === group)) {
      return res.status(400).json({
        status: 'error',
        message: 'Group already exists'
      });
    }

    const newGroup = { 
      group, 
      apps: Array.isArray(apps) ? apps : [] 
    };
    
    groups.push(newGroup);
    await writeAppsFile(groups);

    res.json({
      status: 'success',
      data: newGroup
    });
  } catch (error) {
    console.error('Failed to add group:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to add group'
    });
  }
});

// Update app group
router.put('/:groupName', isAuthenticated, async (req, res) => {
  try {
    const { groupName } = req.params;
    const { group, apps } = req.body;
    
    if (!group?.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Group name is required'
      });
    }

    const data = await fs.readFile(APPS_FILE, 'utf8');
    const groups = JSON.parse(data);
    
    const index = groups.findIndex(g => g.group === groupName);
    if (index === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'Group not found'
      });
    }

    groups[index] = { group, apps };
    await fs.writeFile(APPS_FILE, JSON.stringify(groups, null, 2));

    res.json({
      status: 'success',
      data: { group, apps }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to update group'
    });
  }
});

// Delete app group
router.delete('/:groupName', isAuthenticated, async (req, res) => {
  try {
    const { groupName } = req.params;

    const data = await fs.readFile(APPS_FILE, 'utf8');
    const groups = JSON.parse(data);
    
    const index = groups.findIndex(g => g.group === groupName);
    if (index === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'Group not found'
      });
    }

    groups.splice(index, 1);
    await fs.writeFile(APPS_FILE, JSON.stringify(groups, null, 2));

    res.json({
      status: 'success',
      message: 'Group deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete group'
    });
  }
});

// Add app to group
router.post('/:groupName/apps', isAuthenticated, async (req, res) => {
  try {
    const { groupName } = req.params;
    const app = req.body;

    if (!app.name?.trim() || !app.url?.trim() || !app.icon?.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'App name, URL, and icon are required'
      });
    }

    const data = await fs.readFile(APPS_FILE, 'utf8');
    const groups = JSON.parse(data);
    
    const group = groups.find(g => g.group === groupName);
    if (!group) {
      return res.status(404).json({
        status: 'error',
        message: 'Group not found'
      });
    }

    if (group.apps.some(a => a.name === app.name)) {
      return res.status(400).json({
        status: 'error',
        message: 'App already exists in group'
      });
    }

    group.apps.push(app);
    await fs.writeFile(APPS_FILE, JSON.stringify(groups, null, 2));

    res.json({
      status: 'success',
      data: app
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to add app'
    });
  }
});

// Delete app from group
router.delete('/:groupName/apps/:appName', isAuthenticated, async (req, res) => {
  try {
    const { groupName, appName } = req.params;

    const data = await fs.readFile(APPS_FILE, 'utf8');
    const groups = JSON.parse(data);
    
    const group = groups.find(g => g.group === groupName);
    if (!group) {
      return res.status(404).json({
        status: 'error',
        message: 'Group not found'
      });
    }

    const appIndex = group.apps.findIndex(a => a.name === appName);
    if (appIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'App not found'
      });
    }

    group.apps.splice(appIndex, 1);
    await fs.writeFile(APPS_FILE, JSON.stringify(groups, null, 2));

    res.json({
      status: 'success',
      message: 'App deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete app'
    });
  }
});

// Initialize on module load
initApps().catch(console.error);

module.exports = router; 