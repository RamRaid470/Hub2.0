const express = require('express');
const router = express.Router();
const storage = require('../utils/storage');
const validate = require('../utils/validation');
const { asyncHandler } = require('../utils/errors');
const auth = require('../middleware/auth');

// Get all app groups
router.get('/', auth.requireAuth, asyncHandler(async (req, res) => {
  const apps = await storage.getApps();
  res.json({ status: 'success', data: apps });
}));

// Add a new app group
router.post('/', auth.requireAuth, asyncHandler(async (req, res) => {
  const appGroup = validate.appGroup(req.body);
  const apps = await storage.getApps();
  
  // Check for duplicate group name
  const exists = apps.some(g => g.group === appGroup.group);
  
  if (exists) {
    res.status(400).json({
      status: 'error',
      message: 'App group with this name already exists'
    });
    return;
  }

  // Check for duplicate apps across all groups
  const allApps = apps.flatMap(g => g.apps);
  const duplicateApp = appGroup.apps.find(app => 
    allApps.some(a => a.name === app.name || a.url === app.url)
  );

  if (duplicateApp) {
    res.status(400).json({
      status: 'error',
      message: `App "${duplicateApp.name}" already exists in another group`
    });
    return;
  }

  apps.push(appGroup);
  await storage.saveApps(apps);
  
  res.status(201).json({
    status: 'success',
    message: 'App group added successfully',
    data: appGroup
  });
}));

// Update an app group
router.put('/:group', auth.requireAuth, asyncHandler(async (req, res) => {
  const groupName = validate.string(req.params.group);
  const updatedGroup = validate.appGroup(req.body);
  const apps = await storage.getApps();
  
  const index = apps.findIndex(g => g.group === groupName);
  if (index === -1) {
    res.status(404).json({
      status: 'error',
      message: 'App group not found'
    });
    return;
  }

  // Check for duplicate group name
  const duplicateGroup = apps.some((g, i) => 
    i !== index && g.group === updatedGroup.group
  );

  if (duplicateGroup) {
    res.status(400).json({
      status: 'error',
      message: 'Another app group with this name already exists'
    });
    return;
  }

  // Check for duplicate apps across other groups
  const otherApps = apps.filter((_, i) => i !== index).flatMap(g => g.apps);
  const duplicateApp = updatedGroup.apps.find(app => 
    otherApps.some(a => a.name === app.name || a.url === app.url)
  );

  if (duplicateApp) {
    res.status(400).json({
      status: 'error',
      message: `App "${duplicateApp.name}" already exists in another group`
    });
    return;
  }

  apps[index] = updatedGroup;
  await storage.saveApps(apps);
  
  res.json({
    status: 'success',
    message: 'App group updated successfully',
    data: updatedGroup
  });
}));

// Delete an app group
router.delete('/:group', auth.requireAuth, asyncHandler(async (req, res) => {
  const groupName = validate.string(req.params.group);
  const apps = await storage.getApps();
  
  const index = apps.findIndex(g => g.group === groupName);
  if (index === -1) {
    res.status(404).json({
      status: 'error',
      message: 'App group not found'
    });
    return;
  }

  apps.splice(index, 1);
  await storage.saveApps(apps);
  
  res.json({
    status: 'success',
    message: 'App group deleted successfully'
  });
}));

// Add an app to a group
router.post('/:group/apps', auth.requireAuth, asyncHandler(async (req, res) => {
  const groupName = validate.string(req.params.group);
  const newApp = validate.app(req.body);
  const apps = await storage.getApps();
  
  const groupIndex = apps.findIndex(g => g.group === groupName);
  if (groupIndex === -1) {
    res.status(404).json({
      status: 'error',
      message: 'App group not found'
    });
    return;
  }

  // Check for duplicate apps across all groups
  const allApps = apps.flatMap(g => g.apps);
  const exists = allApps.some(a => a.name === newApp.name || a.url === newApp.url);

  if (exists) {
    res.status(400).json({
      status: 'error',
      message: 'App with this name or URL already exists'
    });
    return;
  }

  apps[groupIndex].apps.push(newApp);
  await storage.saveApps(apps);
  
  res.status(201).json({
    status: 'success',
    message: 'App added successfully',
    data: newApp
  });
}));

// Delete an app from a group
router.delete('/:group/apps/:name', auth.requireAuth, asyncHandler(async (req, res) => {
  const groupName = validate.string(req.params.group);
  const appName = validate.string(req.params.name);
  const apps = await storage.getApps();
  
  const groupIndex = apps.findIndex(g => g.group === groupName);
  if (groupIndex === -1) {
    res.status(404).json({
      status: 'error',
      message: 'App group not found'
    });
    return;
  }

  const appIndex = apps[groupIndex].apps.findIndex(a => a.name === appName);
  if (appIndex === -1) {
    res.status(404).json({
      status: 'error',
      message: 'App not found in group'
    });
    return;
  }

  apps[groupIndex].apps.splice(appIndex, 1);
  await storage.saveApps(apps);
  
  res.json({
    status: 'success',
    message: 'App deleted successfully'
  });
}));

module.exports = router; 