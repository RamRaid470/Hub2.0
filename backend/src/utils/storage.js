const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const { NotFoundError, AppError } = require('./errors');

class Storage {
  constructor(basePath = config.paths.data) {
    this.basePath = basePath;
  }

  async readJSON(filename) {
    try {
      const filePath = path.join(this.basePath, filename);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new NotFoundError(`File ${filename} not found`);
      }
      throw new AppError(`Error reading ${filename}: ${err.message}`);
    }
  }

  async writeJSON(filename, data) {
    try {
      const filePath = path.join(this.basePath, filename);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (err) {
      throw new AppError(`Error writing ${filename}: ${err.message}`);
    }
  }

  async readEnv() {
    try {
      const data = await fs.readFile(config.paths.env, 'utf-8');
      const envData = {};
      data.split('\n').forEach(line => {
        const [key, ...values] = line.split('=');
        if (key && values.length) {
          envData[key.trim()] = values.join('=').trim();
        }
      });
      return envData;
    } catch (err) {
      if (err.code === 'ENOENT') {
        return {};
      }
      throw new AppError(`Error reading .env: ${err.message}`);
    }
  }

  async writeEnv(data) {
    try {
      const content = Object.entries(data)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
      await fs.writeFile(config.paths.env, content + '\n');
    } catch (err) {
      throw new AppError(`Error writing .env: ${err.message}`);
    }
  }

  async updateEnv(updates) {
    const current = await this.readEnv();
    const updated = { ...current, ...updates };
    await this.writeEnv(updated);
    return updated;
  }

  // Specific data methods
  async getApps() {
    return this.readJSON('apps.json').catch(() => []);
  }

  async saveApps(apps) {
    await this.writeJSON('apps.json', apps);
  }

  async getBookmarks() {
    return this.readJSON('bookmarks.json').catch(() => []);
  }

  async saveBookmarks(bookmarks) {
    await this.writeJSON('bookmarks.json', bookmarks);
  }

  async getServices() {
    return this.readJSON('services.json').catch(() => []);
  }

  async saveServices(services) {
    await this.writeJSON('services.json', services);
  }
}

module.exports = new Storage(); 