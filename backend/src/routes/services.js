const express = require('express');
const router = express.Router();
const storage = require('../utils/storage');
const validate = require('../utils/validation');
const { asyncHandler } = require('../utils/errors');
const auth = require('../middleware/auth');
const ping = require('ping');

// Get all services
router.get('/', auth.requireAuth, asyncHandler(async (req, res) => {
  const services = await storage.getServices();
  res.json({ status: 'success', data: services });
}));

// Ping a service
router.post('/ping', auth.requireAuth, asyncHandler(async (req, res) => {
  const { ip } = req.body;
  
  if (!ip) {
    res.status(400).json({
      status: 'error',
      message: 'IP address is required'
    });
    return;
  }

  try {
    validate.ip(ip);
    const result = await ping.promise.probe(ip, {
      timeout: 2,
      extra: ['-c', '1']
    });
    
    res.json({
      status: 'success',
      online: result.alive
    });
  } catch (err) {
    res.status(400).json({
      status: 'error',
      message: err.message
    });
  }
}));

// Add a new service
router.post('/', auth.requireAuth, asyncHandler(async (req, res) => {
  const service = validate.service(req.body);
  const services = await storage.getServices();
  
  // Check for duplicates
  const exists = services.some(s => 
    s.name === service.name || s.ip === service.ip
  );
  
  if (exists) {
    res.status(400).json({
      status: 'error',
      message: 'Service with this name or IP already exists'
    });
    return;
  }

  services.push(service);
  await storage.saveServices(services);
  
  res.status(201).json({
    status: 'success',
    message: 'Service added successfully',
    data: service
  });
}));

// Update a service
router.put('/:name', auth.requireAuth, asyncHandler(async (req, res) => {
  const serviceName = validate.string(req.params.name);
  const updatedService = validate.service(req.body);
  const services = await storage.getServices();
  
  const index = services.findIndex(s => s.name === serviceName);
  if (index === -1) {
    res.status(404).json({
      status: 'error',
      message: 'Service not found'
    });
    return;
  }

  // Check for duplicates if name or IP changed
  const duplicate = services.some((s, i) => 
    i !== index && (s.name === updatedService.name || s.ip === updatedService.ip)
  );

  if (duplicate) {
    res.status(400).json({
      status: 'error',
      message: 'Another service with this name or IP already exists'
    });
    return;
  }

  services[index] = updatedService;
  await storage.saveServices(services);
  
  res.json({
    status: 'success',
    message: 'Service updated successfully',
    data: updatedService
  });
}));

// Delete a service
router.delete('/:name', auth.requireAuth, asyncHandler(async (req, res) => {
  const serviceName = validate.string(req.params.name);
  const services = await storage.getServices();
  
  const index = services.findIndex(s => s.name === serviceName);
  if (index === -1) {
    res.status(404).json({
      status: 'error',
      message: 'Service not found'
    });
    return;
  }

  services.splice(index, 1);
  await storage.saveServices(services);
  
  res.json({
    status: 'success',
    message: 'Service deleted successfully'
  });
}));

module.exports = router; 