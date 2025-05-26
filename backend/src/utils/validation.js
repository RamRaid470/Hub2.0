const { ValidationError } = require('./errors');

const validate = {
  password(password) {
    if (!password || typeof password !== 'string') {
      throw new ValidationError('Password must be a non-empty string');
    }
    return password.trim();
  },

  newPassword(password) {
    const trimmed = validate.password(password);
    if (trimmed.length < 6) {
      throw new ValidationError('Password must be at least 6 characters long');
    }
    return trimmed;
  },

  array(arr, name = 'Array') {
    if (!Array.isArray(arr)) {
      throw new ValidationError(`${name} must be an array`);
    }
    return arr;
  },

  string(str, name = 'String', { trim = true, optional = false } = {}) {
    if (optional && (str === undefined || str === null)) {
      return '';
    }
    if (typeof str !== 'string') {
      throw new ValidationError(`${name} must be a string`);
    }
    return trim ? str.trim() : str;
  },

  url(url, name = 'URL') {
    const trimmed = validate.string(url, name);
    try {
      new URL(trimmed);
      return trimmed;
    } catch (err) {
      throw new ValidationError(`${name} must be a valid URL`);
    }
  },

  ip(ip) {
    const trimmed = validate.string(ip, 'IP address');
    // Basic IPv4 validation
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipv4Regex.test(trimmed)) {
      throw new ValidationError('Invalid IP address format');
    }
    // Validate each octet
    const octets = trimmed.split('.');
    const validOctets = octets.every(octet => {
      const num = parseInt(octet, 10);
      return num >= 0 && num <= 255;
    });
    if (!validOctets) {
      throw new ValidationError('Invalid IP address values');
    }
    return trimmed;
  },

  bookmark(bookmark) {
    if (!bookmark || typeof bookmark !== 'object') {
      throw new ValidationError('Invalid bookmark format');
    }
    return {
      name: validate.string(bookmark.name, 'Bookmark name'),
      url: validate.url(bookmark.url, 'Bookmark URL'),
      icon: validate.url(bookmark.icon, 'Icon URL')
    };
  },

  service(service) {
    if (!service || typeof service !== 'object') {
      throw new ValidationError('Invalid service format');
    }
    return {
      name: validate.string(service.name, 'Service name'),
      ip: validate.ip(service.ip)
    };
  },

  app(app) {
    if (!app || typeof app !== 'object') {
      throw new ValidationError('Invalid app format');
    }
    return {
      name: validate.string(app.name, 'App name'),
      url: validate.url(app.url, 'App URL'),
      icon: validate.url(app.icon, 'Icon URL')
    };
  },

  appGroup(group) {
    if (!group || typeof group !== 'object') {
      throw new ValidationError('Invalid app group format');
    }
    return {
      group: validate.string(group.group, 'Group name'),
      apps: validate.array(group.apps, 'Apps').map(app => validate.app(app))
    };
  }
};

module.exports = validate; 