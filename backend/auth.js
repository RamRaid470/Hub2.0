const Security = require('./security');
const fs = require('fs').promises;
const path = require('path');

const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const DEFAULT_PASSWORD = 'admin123';

/**
 * Check password for admin user
 * @param {string} password - Password to check
 * @returns {Promise<boolean>} - Whether password is valid
 */
async function checkPassword(password) {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf8');
    const { password: hashedPassword } = JSON.parse(data);
    
    if (!hashedPassword) {
      console.error('❌ No password hash found');
      return false;
    }

    const isValid = await Security.verifyPassword(password, hashedPassword);
    console.log('Password check result:', isValid);
    return isValid;
  } catch (err) {
    console.error('❌ Password check error:', err);
    return false;
  }
}

/**
 * Set new password for admin user
 * @param {string} newPassword - New password to set
 */
async function setPassword(newPassword) {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  const hashedPassword = await Security.hashPassword(newPassword);
  await fs.writeFile(USERS_FILE, JSON.stringify({ password: hashedPassword }, null, 2));
}

/**
 * Initialize users file if it doesn't exist
 */
async function init() {
  try {
    console.log('Checking for users file at:', USERS_FILE);
    await fs.access(USERS_FILE);
    console.log('✅ Users file exists');
  } catch {
    console.log('Creating users file...');
    try {
      await fs.mkdir(path.dirname(USERS_FILE), { recursive: true });
      const hashedPassword = await Security.hashPassword(DEFAULT_PASSWORD);
      await fs.writeFile(USERS_FILE, JSON.stringify({ password: hashedPassword }, null, 2));
      console.log('✅ Created default password file');
    } catch (err) {
      console.error('❌ Error creating password file:', err);
      throw err;
    }
  }
}

// Initialize on module load
init().catch(console.error);

module.exports = {
  checkPassword,
  setPassword
};