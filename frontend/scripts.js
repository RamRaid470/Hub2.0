// Global state
let appsData = [];
let bookmarksData = [];
let servicesData = [];

// Global variables
let authCheckTimeout = null;
let isCheckingAuth = false;
let authCheckCount = 0;
const MAX_AUTH_CHECKS = 3;
const AUTH_CHECK_INTERVAL = 30000;
let lastAuthCheck = 0;
const MIN_CHECK_INTERVAL = 5000;
let lastAuthState = null;
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 3;

// Core function declarations
function loadServiceStatus() {
  console.log("Loading service status...");
  return fetch("/api/services", {
    credentials: "include",
    headers: { "Accept": "application/json" }
  })
  .then(res => {
    if (!res.ok) throw new Error('Failed to load services');
    return res.json();
  })
  .then(response => {
    console.log("Services loaded:", response);
    if (response.status !== 'success') {
      throw new Error(response.message || 'Failed to load services');
    }
    const services = response.data || [];
    renderServices(services);
    return services;
  });
}

function loadApps() {
  console.log("Loading apps...");
  
  // Show loading state in both main grid and settings
  const appGrid = document.getElementById("appGrid");
  const settingsList = document.getElementById("settingsList");
  
  if (appGrid) {
    appGrid.innerHTML = '<div class="loading">Loading apps...</div>';
  }
  if (settingsList) {
    settingsList.innerHTML = '<div class="loading">Loading apps...</div>';
  }

  return fetch("/api/apps", {
    credentials: "include",
    headers: { "Accept": "application/json" }
  })
  .then(res => {
    if (!res.ok) throw new Error('Failed to load apps');
    return res.json();
  })
  .then(response => {
    console.log("Apps loaded:", response);
    if (response.status !== 'success') {
      throw new Error(response.message || 'Failed to load apps');
    }
    appsData = response.data || [];
    renderTiles();
    return appsData;
      })
      .catch(err => {
    console.error('Failed to load apps:', err);
    const errorMessage = `
      <div class="error">
        <p>Failed to load apps: ${err.message}</p>
        <button onclick="loadApps()" class="settings-button">Retry</button>
      </div>
    `;
    
    if (appGrid) appGrid.innerHTML = errorMessage;
    if (settingsList) settingsList.innerHTML = errorMessage;
    
    throw err; // Re-throw to handle in the calling function
      });
  }

  function renderTiles() {
    const appGrid = document.getElementById("appGrid");
  if (!appGrid) return;
  
    appGrid.innerHTML = "";

  if (!Array.isArray(appsData) || appsData.length === 0) {
    appGrid.innerHTML = `
      <div class="empty-state">
        <p>No apps configured yet. Add some in settings!</p>
      </div>
    `;
    return;
  }

    appsData.forEach(section => {
      if (!section.group || !Array.isArray(section.apps)) return;

      const groupWrapper = document.createElement("div");
      groupWrapper.className = "app-group";

    const sectionHeader = document.createElement("h2");
    sectionHeader.className = "group-header";
      sectionHeader.textContent = section.group;
      groupWrapper.appendChild(sectionHeader);

      const appRow = document.createElement("div");
      appRow.className = "apps";

      section.apps.forEach(app => {
        if (!app.name || !app.url || !app.icon) return;

        const link = document.createElement("a");
        link.href = app.url;
        link.target = "_blank";
        link.className = "app-tile";
      link.rel = "noopener noreferrer";

        const icon = document.createElement("img");
        icon.src = app.icon;
        icon.alt = app.name;
      icon.onerror = () => {
        icon.src = "https://img.icons8.com/ios-filled/50/000000/application-window.png";
      };

        const label = document.createElement("div");
      label.className = "app-label";
        label.textContent = app.name;

        link.appendChild(icon);
        link.appendChild(label);
        appRow.appendChild(link);
      });

    if (appRow.children.length === 0) {
      const emptyMessage = document.createElement("div");
      emptyMessage.className = "empty-state";
      emptyMessage.textContent = `No apps in ${section.group}`;
      groupWrapper.appendChild(emptyMessage);
    } else {
      groupWrapper.appendChild(appRow);
    }

      appGrid.appendChild(groupWrapper);
    });
  }

function initDashboard() {
  console.log("✅ initDashboard started");
  
  // Show loading states
  const appGrid = document.getElementById("appGrid");
  const serviceList = document.querySelector('#serviceStatus .service-list');
  
  if (appGrid) {
    appGrid.innerHTML = '<div class="loading">Loading apps...</div>';
  }
  if (serviceList) {
    serviceList.innerHTML = '<div class="loading">Loading services...</div>';
  }

  // Load apps and services in parallel
  Promise.all([
    loadApps().catch(err => {
      console.error('Failed to load apps:', err);
      if (appGrid) {
        appGrid.innerHTML = `
          <div class="error">
            <p>Failed to load apps. Please try again later.</p>
            <button onclick="loadApps()" class="settings-button">Retry</button>
          </div>
        `;
      }
    }),
    loadServiceStatus().catch(err => {
      console.error('Failed to load services:', err);
      if (serviceList) {
        serviceList.innerHTML = `
          <div class="error">
            <p>Failed to load services. Please try again later.</p>
            <button onclick="loadServiceStatus()" class="settings-button">Retry</button>
          </div>
        `;
      }
    })
  ]).then(() => {
    console.log('✅ Dashboard initialized');
  });

  // Start service status updates
  setInterval(loadServiceStatus, 30000);
}

function checkAuth() {
  if (isCheckingAuth) return;
  
  const now = Date.now();
  if (now - lastAuthCheck < MIN_CHECK_INTERVAL) {
    return;
  }
  lastAuthCheck = now;

  if (authCheckCount >= MAX_AUTH_CHECKS) {
    console.log("Max auth checks reached, waiting before next attempt");
    setTimeout(() => {
      authCheckCount = 0;
      checkAuth();
    }, AUTH_CHECK_INTERVAL);
    return;
  }

  isCheckingAuth = true;
  authCheckCount++;

  fetch("/api/auth/status", {
    credentials: "include",
    headers: {
      "Accept": "application/json",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache"
    },
    cache: 'no-store'
  })
    .then(res => {
      if (!res.ok) {
        if (res.status === 429) {
          console.log("Rate limited, waiting before next check");
          setTimeout(checkAuth, AUTH_CHECK_INTERVAL * 2);
          return null;
        }
        throw new Error('Auth check failed');
      }
      return res.json();
    })
    .then(data => {
      if (!data) return;
      
      const isAuthenticated = data.authenticated;
      if (isAuthenticated !== lastAuthState) {
        lastAuthState = isAuthenticated;
        if (!isAuthenticated) {
          window.location.href = '/login.html';
        } else {
          initDashboard();
        }
      }
      
      consecutiveFailures = 0;
      isCheckingAuth = false;
      
      // Schedule next check
      clearTimeout(authCheckTimeout);
      authCheckTimeout = setTimeout(checkAuth, AUTH_CHECK_INTERVAL);
    })
    .catch(err => {
      console.error('Auth check error:', err);
      consecutiveFailures++;
      
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        window.location.href = '/login.html';
      } else {
        isCheckingAuth = false;
        clearTimeout(authCheckTimeout);
        authCheckTimeout = setTimeout(checkAuth, AUTH_CHECK_INTERVAL);
      }
    });
}

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('Initializing application...');

    // Initialize settings panel
    const settingsButton = document.getElementById('settingsButton');
    const settingsPanel = document.getElementById('settingsPanel');
    const settingsOverlay = document.getElementById('settingsOverlay');
    const closeSettings = document.getElementById('closeSettings');

    if (settingsButton && settingsPanel && settingsOverlay && closeSettings) {
      console.log('Setting up settings panel event listeners...');
      
      // Settings button click handler
      settingsButton.addEventListener('click', () => {
        console.log('Opening settings panel');
        settingsPanel.classList.add('active');
        settingsOverlay.classList.add('active');
        
        // Render the currently active tab
        const activeTab = document.querySelector('.tab-button.active');
        if (activeTab) {
          const tabId = activeTab.dataset.tab;
          console.log('Initial active tab:', tabId);
          switch(tabId) {
            case 'apps':
              renderAppsSettings();
              break;
            case 'services':
              renderServiceSettings();
              break;
            case 'bookmarks':
              renderBookmarkSettings();
              break;
          }
        }
      });

      // Close button click handler
      closeSettings.addEventListener('click', () => {
        console.log('Closing settings panel');
        settingsPanel.classList.remove('active');
        settingsOverlay.classList.remove('active');
      });

      // Overlay click handler
      settingsOverlay.addEventListener('click', () => {
        console.log('Closing settings panel via overlay');
        settingsPanel.classList.remove('active');
        settingsOverlay.classList.remove('active');
      });

      // Tab switching
      document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
          const tabId = button.dataset.tab;
          console.log('Tab clicked:', tabId);
          switchTab(tabId);
        });
      });
    } else {
      console.error('Some settings panel elements are missing:', {
        settingsButton: !!settingsButton,
        settingsPanel: !!settingsPanel,
        settingsOverlay: !!settingsOverlay,
        closeSettings: !!closeSettings
      });
    }

    // Check authentication
    const authResponse = await fetch('/api/auth/status', {
      credentials: 'include',
      headers: { 'Accept': 'application/json' }
    });
    
    if (!authResponse.ok) {
      throw new Error('Failed to check authentication status');
    }

    const authData = await authResponse.json();
    if (!authData.authenticated) {
      window.location.href = '/login.html';
      return;
    }

    // Load all data
    await loadData();

    // Initialize weather updates
    updateWeather();
    setInterval(updateWeather, 300000); // Update every 5 minutes

    // Initialize clock
    updateClock();
    setInterval(updateClock, 1000);

    console.log('Application initialized successfully');
  } catch (error) {
    console.error('Initialization error:', error);
  }
});

// Update clock
function updateClock() {
  const now = new Date();
  const timeElement = document.querySelector('.time');
  const dateElement = document.querySelector('.date');

  if (timeElement) {
    timeElement.textContent = now.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  if (dateElement) {
    dateElement.textContent = now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }
}

// Update weather
async function updateWeather() {
  try {
    const response = await fetch('/api/weather', {
      credentials: 'include',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch weather data');
    }

    const data = await response.json();
    const weatherTemp = document.querySelector('.weather-temp');
    const weatherIcon = document.querySelector('.weather-icon');

    if (weatherTemp && weatherIcon) {
      weatherTemp.textContent = `${Math.round(data.temp)}°C`;
      weatherIcon.src = `https://openweathermap.org/img/wn/${data.icon}.png`;
      weatherIcon.alt = data.desc;
    }
  } catch (error) {
    console.error('Weather update error:', error);
  }
}

function initializeSettingsPanel() {
  const settingsPanel = document.getElementById("settingsPanel");
  settingsPanel.innerHTML = `
    <div class="settings-header">
      <h2>Settings</h2>
      <button id="closeSettings" class="close-button">×</button>
    </div>
    <div class="settings-tabs">
      <button class="tab-button active" data-tab="general">General</button>
      <button class="tab-button" data-tab="apps">Apps</button>
      <button class="tab-button" data-tab="services">Services</button>
      <button class="tab-button" data-tab="bookmarks">Bookmarks</button>
    </div>
    <div class="settings-content">
      <div id="generalTab" class="tab-content active">
        <div class="settings-section">
          <h3>Password Settings</h3>
          <div class="password-section">
            <input type="password" id="newPassword" placeholder="New password" class="settings-input">
            <input type="password" id="confirmPassword" placeholder="Confirm password" class="settings-input">
            <button id="changePasswordBtn" class="settings-button">Change Password</button>
            <div id="passChangeMsg" class="settings-message"></div>
          </div>
        </div>
        <div class="settings-section">
          <h3>Weather Settings</h3>
          <div class="weather-settings">
            <input type="text" id="weatherApiKey" placeholder="OpenWeatherMap API Key" class="settings-input">
            <input type="text" id="weatherCity" placeholder="City (e.g. London)" class="settings-input">
            <input type="text" id="weatherCountry" placeholder="Country Code (e.g. UK)" class="settings-input">
            <button id="saveWeatherSettings" class="settings-button">Save Weather Settings</button>
            <div id="weatherSettingsMsg" class="settings-message"></div>
          </div>
        </div>
      </div>
      <div id="appsTab" class="tab-content">
        <div id="settingsList" class="settings-section"></div>
      </div>
      <div id="servicesTab" class="tab-content">
        <div id="serviceSettings" class="settings-section"></div>
      </div>
      <div id="bookmarksTab" class="tab-content">
        <div id="bookmarkSettings" class="settings-section"></div>
      </div>
    </div>
  `;

  // Add event listeners for tabs
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all tabs and contents
      document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      // Add active class to clicked tab and corresponding content
      button.classList.add('active');
      const tabId = button.dataset.tab + 'Tab';
      document.getElementById(tabId).classList.add('active');

      // Load content based on tab
      if (button.dataset.tab === 'apps') {
        loadApps().then(() => renderSettingsPanel());
      } else if (button.dataset.tab === 'services') {
        renderServiceSettings();
      } else if (button.dataset.tab === 'bookmarks') {
        renderBookmarkSettings();
      }
    });
  });

  // Close button functionality
  document.getElementById('closeSettings').addEventListener('click', () => {
    document.getElementById('settingsPanel').classList.remove('active');
  });

  // Initialize all settings sections
  loadApps().then(() => {
    renderSettingsPanel();
    renderServiceSettings();
    renderBookmarkSettings();
    initializeWeatherSettings();
    initializePasswordSettings();
  }).catch(err => {
    console.error('Failed to load apps:', err);
    const settingsList = document.getElementById("settingsList");
    if (settingsList) {
      settingsList.innerHTML = `
        <div class="error">
          <p>Failed to load apps: ${err.message}</p>
          <button onclick="loadApps().then(() => renderSettingsPanel())" class="settings-button">Retry</button>
        </div>
      `;
    }
  });
}

function initializeWeatherSettings() {
  const saveBtn = document.getElementById('saveWeatherSettings');
  const msgDiv = document.getElementById('weatherSettingsMsg');

  // Load existing weather settings
  fetch('/api/weather/settings', {
    credentials: 'include',
    headers: { 'Accept': 'application/json' }
    })
      .then(res => res.json())
      .then(data => {
    if (data.success) {
      document.getElementById('weatherApiKey').value = data.settings.apiKey || '';
      document.getElementById('weatherCity').value = data.settings.city || '';
      document.getElementById('weatherCountry').value = data.settings.country || '';
    }
  })
  .catch(console.error);

  saveBtn.addEventListener('click', () => {
    const settings = {
      apiKey: document.getElementById('weatherApiKey').value.trim(),
      city: document.getElementById('weatherCity').value.trim(),
      country: document.getElementById('weatherCountry').value.trim()
    };

    fetch('/api/weather/settings', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(settings)
    })
    .then(res => res.json())
    .then(data => {
      msgDiv.textContent = data.success ? 'Weather settings saved successfully!' : 'Failed to save weather settings';
      msgDiv.className = 'settings-message ' + (data.success ? 'success' : 'error');
      setTimeout(() => msgDiv.textContent = '', 3000);
      if (data.success) loadServiceStatus();
      })
      .catch(err => {
      msgDiv.textContent = 'Error saving weather settings';
      msgDiv.className = 'settings-message error';
    });
  });
}

function initializePasswordSettings() {
  const changeBtn = document.getElementById('changePasswordBtn');
  const msgDiv = document.getElementById('passChangeMsg');
  const newPass = document.getElementById('newPassword');
  const confirmPass = document.getElementById('confirmPassword');

  changeBtn.addEventListener('click', () => {
    const np = newPass.value;
    const cp = confirmPass.value;

      if (!np || np.length < 6) {
      msgDiv.textContent = 'Password must be at least 6 characters';
      msgDiv.className = 'settings-message error';
        return;
      }

      if (np !== cp) {
      msgDiv.textContent = 'Passwords do not match';
      msgDiv.className = 'settings-message error';
        return;
      }

    fetch('/api/auth/set-password', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
        body: JSON.stringify({ newPassword: np })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
        msgDiv.textContent = 'Password changed successfully!';
        msgDiv.className = 'settings-message success';
        newPass.value = '';
        confirmPass.value = '';
          } else {
        throw new Error(data.message || 'Failed to change password');
      }
    })
    .catch(err => {
      msgDiv.textContent = err.message || 'Error changing password';
      msgDiv.className = 'settings-message error';
    });
  });
}

function renderSettingsPanel() {
  console.log('Rendering settings panel...');
  
  // Apps Settings
  const appsList = document.getElementById('appsList');
  if (appsList) {
    console.log('Rendering apps settings with data:', appsData);
    appsList.innerHTML = `
      <h3>Manage Applications</h3>
      <div class="settings-actions" style="margin-bottom: 15px;">
        <button id="addAppGroup" class="settings-button">Add New Group</button>
      </div>
      <div id="appGroupsList">
        ${(appsData || []).map((group, groupIndex) => `
          <div class="settings-entry">
            <div class="settings-entry-row">
              <input type="text" class="settings-input" value="${group.group}" placeholder="Group name" data-group="${groupIndex}">
              <div class="settings-actions">
                <button class="settings-button delete-group" data-group="${groupIndex}">Delete Group</button>
              </div>
            </div>
            <div class="apps-list">
              ${(group.apps || []).map((app, appIndex) => `
                <div class="settings-entry-row">
                  <input type="text" class="settings-input" value="${app.name}" placeholder="App name" data-group="${groupIndex}" data-app="${appIndex}" data-field="name">
                  <input type="text" class="settings-input" value="${app.url}" placeholder="App URL" data-group="${groupIndex}" data-app="${appIndex}" data-field="url">
                  <input type="text" class="settings-input" value="${app.icon}" placeholder="Icon URL" data-group="${groupIndex}" data-app="${appIndex}" data-field="icon">
                  <div class="settings-actions">
                    <button class="settings-button delete-app" data-group="${groupIndex}" data-app="${appIndex}">Delete</button>
                  </div>
                </div>
              `).join('')}
            </div>
            <div class="settings-actions" style="margin-top: 10px;">
              <button class="settings-button add-app" data-group="${groupIndex}">Add App</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Add event listeners for apps
    document.getElementById('addAppGroup')?.addEventListener('click', () => {
      appsData.push({ group: 'New Group', apps: [] });
      saveData('apps', appsData);
      renderSettingsPanel();
    });

    document.querySelectorAll('.delete-group').forEach(button => {
      button.addEventListener('click', (e) => {
        const groupIndex = parseInt(e.target.dataset.group);
        if (confirm('Are you sure you want to delete this group and all its apps?')) {
          appsData.splice(groupIndex, 1);
          saveData('apps', appsData);
          renderSettingsPanel();
        }
      });
    });

    document.querySelectorAll('.add-app').forEach(button => {
      button.addEventListener('click', (e) => {
        const groupIndex = parseInt(e.target.dataset.group);
        appsData[groupIndex].apps.push({
          name: 'New App',
          url: 'https://',
          icon: 'https://img.icons8.com/ios-filled/50/000000/application-window.png'
        });
        saveData('apps', appsData);
        renderSettingsPanel();
      });
    });

    document.querySelectorAll('.delete-app').forEach(button => {
      button.addEventListener('click', (e) => {
        const groupIndex = parseInt(e.target.dataset.group);
        const appIndex = parseInt(e.target.dataset.app);
        if (confirm('Are you sure you want to delete this app?')) {
          appsData[groupIndex].apps.splice(appIndex, 1);
          saveData('apps', appsData);
          renderSettingsPanel();
        }
      });
    });

    document.querySelectorAll('.settings-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const groupIndex = parseInt(e.target.dataset.group);
        const appIndex = e.target.dataset.app !== undefined ? parseInt(e.target.dataset.app) : null;
        const field = e.target.dataset.field;

        if (appIndex === null) {
          // Group name change
          appsData[groupIndex].group = e.target.value;
        } else {
          // App field change
          appsData[groupIndex].apps[appIndex][field] = e.target.value;
        }
        saveData('apps', appsData);
      });
    });
  }

  // Services Settings
  const servicesList = document.getElementById('servicesList');
  if (servicesList) {
    console.log('Rendering services settings with data:', servicesData);
    servicesList.innerHTML = `
      <h3>Manage Services</h3>
      <div class="settings-actions" style="margin-bottom: 15px;">
        <button id="addService" class="settings-button">Add New Service</button>
      </div>
      ${(servicesData || []).map((service, index) => `
        <div class="settings-entry">
          <div class="settings-entry-row">
            <input type="text" class="settings-input" value="${service.name}" placeholder="Service name" data-index="${index}" data-field="name">
            <input type="text" class="settings-input" value="${service.ip}" placeholder="Service IP" data-index="${index}" data-field="ip">
            <div class="settings-actions">
              <button class="settings-button delete-service" data-index="${index}">Delete</button>
            </div>
          </div>
        </div>
      `).join('')}
    `;

    // Add event listeners for services
    document.getElementById('addService')?.addEventListener('click', () => {
      servicesData.push({ name: 'New Service', ip: '192.168.1.1' });
      saveData('services', servicesData);
      renderSettingsPanel();
    });

    document.querySelectorAll('.delete-service').forEach(button => {
      button.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        if (confirm('Are you sure you want to delete this service?')) {
          servicesData.splice(index, 1);
          saveData('services', servicesData);
          renderSettingsPanel();
        }
      });
    });

    servicesList.querySelectorAll('.settings-input').forEach(input => {
      input.onchange = e => {
        const index = parseInt(e.target.dataset.index);
        const field = e.target.dataset.field;
        servicesData[index][field] = e.target.value;
        saveData('services', servicesData);
      };
    });
  }

  // Bookmarks Settings
  const bookmarksList = document.getElementById('bookmarksList');
  if (bookmarksList) {
    console.log('Rendering bookmarks settings with data:', bookmarksData);
    bookmarksList.innerHTML = `
      <h3>Manage Bookmarks</h3>
      <div class="settings-actions" style="margin-bottom: 15px;">
        <button id="addBookmark" class="settings-button">Add New Bookmark</button>
      </div>
      ${(bookmarksData || []).map((bookmark, index) => `
        <div class="settings-entry">
          <div class="settings-entry-row">
            <input type="text" class="settings-input" value="${bookmark.name}" placeholder="Bookmark name" data-index="${index}" data-field="name">
            <input type="text" class="settings-input" value="${bookmark.url}" placeholder="Bookmark URL" data-index="${index}" data-field="url">
            <input type="text" class="settings-input" value="${bookmark.icon}" placeholder="Icon URL" data-index="${index}" data-field="icon">
            <div class="settings-actions">
              <button class="settings-button delete-bookmark" data-index="${index}">Delete</button>
            </div>
          </div>
        </div>
      `).join('')}
    `;

    // Add event listeners for bookmarks
    document.getElementById('addBookmark')?.addEventListener('click', () => {
      bookmarksData.push({
        name: 'New Bookmark',
        url: 'https://',
        icon: 'https://img.icons8.com/ios-filled/24/bookmark.png'
      });
      saveData('bookmarks', bookmarksData);
      renderSettingsPanel();
    });

    document.querySelectorAll('.delete-bookmark').forEach(button => {
      button.onclick = e => {
        const index = parseInt(e.target.closest('.delete-bookmark').dataset.index);
        if (confirm('Are you sure you want to delete this bookmark?')) {
          bookmarksData.splice(index, 1);
          saveData('bookmarks', bookmarksData);
          renderSettingsPanel();
        }
      };
    });

    bookmarksList.querySelectorAll('.settings-input').forEach(input => {
      input.onchange = e => {
        const index = parseInt(e.target.dataset.index);
        const field = e.target.dataset.field;
        bookmarksData[index][field] = e.target.value;
        saveData('bookmarks', bookmarksData);
      };
    });
  }
}

function renderServiceSettings() {
  const serviceSettings = document.getElementById("serviceSettings");
  if (!serviceSettings) return;

  serviceSettings.innerHTML = `
    <div class="settings-group">
      <div class="settings-group-header">
        <h3>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
          Manage Services
        </h3>
        <button id="addServiceBtn" class="settings-button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add New Service
        </button>
      </div>
      <div id="servicesList" class="settings-list">
        ${servicesData.map((service, index) => `
          <div class="settings-entry-row">
            <div class="settings-entry-fields">
              <input type="text" class="settings-input" value="${service.name}" placeholder="Service name" data-index="${index}" data-field="name">
              <input type="text" class="settings-input" value="${service.ip}" placeholder="Service IP" data-index="${index}" data-field="ip">
            </div>
            <div class="settings-actions">
              <button class="settings-button delete-service" data-index="${index}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Add event listeners for service settings
  const addServiceBtn = document.getElementById('addServiceBtn');
  if (addServiceBtn) {
    addServiceBtn.onclick = () => {
      servicesData.push({ name: 'New Service', ip: '192.168.1.1' });
      saveData('services', servicesData);
      renderServiceSettings();
    };
  }

  // Add event listeners for service inputs
  document.querySelectorAll('#servicesList .settings-input').forEach(input => {
    input.onchange = e => {
      const index = parseInt(e.target.dataset.index);
      const field = e.target.dataset.field;
      servicesData[index][field] = e.target.value;
      saveData('services', servicesData);
    };
  });

  // Add event listeners for delete buttons
  document.querySelectorAll('#servicesList .delete-service').forEach(btn => {
    btn.onclick = e => {
      const index = parseInt(e.target.closest('.delete-service').dataset.index);
      if (confirm('Are you sure you want to delete this service?')) {
        servicesData.splice(index, 1);
        saveData('services', servicesData);
        renderServiceSettings();
      }
    };
  });
}

function renderBookmarkSettings() {
  const bookmarkSettings = document.getElementById("bookmarkSettings");
  if (!bookmarkSettings) return;

  bookmarkSettings.innerHTML = `
    <div class="settings-group">
      <div class="settings-group-header">
        <h3>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
          Manage Bookmarks
        </h3>
        <button id="addBookmarkBtn" class="settings-button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add New Bookmark
        </button>
      </div>
      <div id="bookmarksList" class="settings-list">
        ${bookmarksData.map((bookmark, index) => `
          <div class="settings-entry-row">
            <img src="${bookmark.icon}" alt="" onerror="this.src='https://img.icons8.com/ios-filled/50/000000/bookmark.png'">
            <div class="settings-entry-fields">
              <input type="text" class="settings-input" value="${bookmark.name}" placeholder="Bookmark name" data-index="${index}" data-field="name">
              <input type="text" class="settings-input" value="${bookmark.url}" placeholder="Bookmark URL" data-index="${index}" data-field="url">
              <input type="text" class="settings-input" value="${bookmark.icon}" placeholder="Icon URL" data-index="${index}" data-field="icon">
            </div>
            <div class="settings-actions">
              <button class="settings-button delete-bookmark" data-index="${index}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Add event listeners for bookmark settings
  const addBookmarkBtn = document.getElementById('addBookmarkBtn');
  if (addBookmarkBtn) {
    addBookmarkBtn.onclick = () => {
      bookmarksData.push({
        name: 'New Bookmark',
        url: 'https://',
        icon: 'https://img.icons8.com/ios-filled/24/bookmark.png'
      });
      saveData('bookmarks', bookmarksData);
      renderBookmarkSettings();
    };
  }

  // Add event listeners for bookmark inputs
  document.querySelectorAll('#bookmarksList .settings-input').forEach(input => {
    input.onchange = e => {
      const index = parseInt(e.target.dataset.index);
      const field = e.target.dataset.field;
      bookmarksData[index][field] = e.target.value;
      saveData('bookmarks', bookmarksData);
    };
  });

  // Add event listeners for delete buttons
  document.querySelectorAll('#bookmarksList .delete-bookmark').forEach(btn => {
    btn.onclick = e => {
      const index = parseInt(e.target.closest('.delete-bookmark').dataset.index);
      if (confirm('Are you sure you want to delete this bookmark?')) {
        bookmarksData.splice(index, 1);
        saveData('bookmarks', bookmarksData);
        renderBookmarkSettings();
      }
    };
  });
}

function renderServices(services) {
  const serviceList = document.querySelector('#serviceStatus .service-list');
  if (!serviceList) return;

  serviceList.innerHTML = "";

  if (services.length === 0) {
    serviceList.innerHTML = `
      <div class="empty-state">
        <p>No services configured yet. Add some in settings!</p>
      </div>
    `;
    return;
  }

        services.forEach(service => {
          const row = document.createElement("div");
          row.className = "service-row";
    
    const nameSpan = document.createElement("span");
    nameSpan.className = "service-name";
    nameSpan.textContent = service.name;
    
    const ipSpan = document.createElement("span");
    ipSpan.className = "service-ip";
    ipSpan.textContent = service.ip;

          const status = document.createElement("span");
    status.className = "service-status";
          status.textContent = "⏳";

    row.appendChild(nameSpan);
    row.appendChild(ipSpan);
          row.appendChild(status);
    serviceList.appendChild(row);

    // Ping the service
          fetch("/api/ping", {
            method: "POST",
      credentials: "include",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
            body: JSON.stringify({ ip: service.ip })
          })
            .then(res => res.json())
            .then(data => {
              status.textContent = data.online ? "✅" : "❌";
        status.className = `service-status ${data.online ? 'online' : 'offline'}`;
        row.title = data.online ? "Online" : "Offline";
            })
            .catch(() => {
              status.textContent = "❌";
        status.className = "service-status error";
        row.title = "Error checking status";
        });
      });
  }

// Load data from JSON files
async function loadData() {
  try {
    console.log('Loading data...');
    const [appsRes, bookmarksRes, servicesRes] = await Promise.all([
      fetch('/api/apps/load', {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      }),
      fetch('/api/bookmarks/load', {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      }),
      fetch('/api/services/load', {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      })
    ]);

    // Check if any requests failed
    if (!appsRes.ok) throw new Error(`Failed to load apps: ${appsRes.statusText}`);
    if (!bookmarksRes.ok) throw new Error(`Failed to load bookmarks: ${bookmarksRes.statusText}`);
    if (!servicesRes.ok) throw new Error(`Failed to load services: ${servicesRes.statusText}`);

    // Parse the responses
    const [apps, bookmarks, services] = await Promise.all([
      appsRes.json(),
      bookmarksRes.json(),
      servicesRes.json()
    ]);

    console.log('Data loaded:', { apps, bookmarks, services });

    // Update global state
    appsData = apps || [];
    bookmarksData = bookmarks || [];
    servicesData = services || [];

    // Render everything
    renderApps();
    renderBookmarks();
    renderServices();

    return true;
  } catch (error) {
    console.error('Error loading data:', error);
    showError('Failed to load data: ' + error.message);
    return false;
  }
}

// Save data back to JSON files
async function saveData(type, data) {
  try {
    const response = await fetch(`/api/${type}/save`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Failed to save ${type} data`);
    }

    // Update local data and UI
    switch(type) {
      case 'apps':
        appsData = data;
        renderApps();
        break;
      case 'bookmarks':
        bookmarksData = data;
        renderBookmarks();
        break;
      case 'services':
        servicesData = data;
        renderServices();
        break;
    }

    return true;
  } catch (error) {
    console.error(`Error saving ${type} data:`, error);
    showError(`Failed to save ${type}: ` + error.message);
    return false;
  }
}

// Render functions
function renderApps() {
  console.log('Rendering apps:', appsData);
  const appGrid = document.getElementById('appGrid');
  if (!appGrid) {
    console.error('App grid element not found');
    return;
  }

  if (!Array.isArray(appsData) || appsData.length === 0) {
    appGrid.innerHTML = `
      <div class="empty-state">
        <p>No apps configured yet. Add some in settings!</p>
      </div>
    `;
    return;
  }

  appGrid.innerHTML = '';
  appsData.forEach(section => {
    if (!section.group || !Array.isArray(section.apps)) {
      console.warn('Invalid app section:', section);
      return;
    }

    const groupWrapper = document.createElement('div');
    groupWrapper.className = 'app-group';

    const sectionHeader = document.createElement('h2');
    sectionHeader.className = 'group-header';
    sectionHeader.textContent = section.group;
    groupWrapper.appendChild(sectionHeader);

    const appRow = document.createElement('div');
    appRow.className = 'apps';

    section.apps.forEach(app => {
      if (!app.name || !app.url) {
        console.warn('Invalid app:', app);
        return;
      }

      const link = document.createElement('a');
      link.href = app.url;
      link.target = '_blank';
      link.className = 'app-tile';
      link.rel = 'noopener noreferrer';

      const icon = document.createElement('img');
      icon.src = app.icon || 'https://img.icons8.com/ios-filled/50/000000/application-window.png';
      icon.alt = app.name;
      icon.onerror = () => {
        icon.src = 'https://img.icons8.com/ios-filled/50/000000/application-window.png';
      };

      const label = document.createElement('div');
      label.className = 'app-label';
      label.textContent = app.name;

      link.appendChild(icon);
      link.appendChild(label);
      appRow.appendChild(link);
    });

    if (appRow.children.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'empty-state';
      emptyMessage.textContent = `No apps in ${section.group}`;
      groupWrapper.appendChild(emptyMessage);
    } else {
      groupWrapper.appendChild(appRow);
    }

    appGrid.appendChild(groupWrapper);
  });
}

function renderBookmarks() {
  console.log('Rendering bookmarks:', bookmarksData);
  const bookmarkBar = document.getElementById('bookmarkBar');
  if (!bookmarkBar) {
    console.error('Bookmark bar element not found');
    return;
  }

  if (!Array.isArray(bookmarksData) || bookmarksData.length === 0) {
    bookmarkBar.innerHTML = `
      <div class="empty-state">
        <p>No bookmarks configured yet. Add some in settings!</p>
      </div>
    `;
    return;
  }

  bookmarkBar.innerHTML = bookmarksData.map(bookmark => `
    <a href="${bookmark.url}" class="bookmark" target="_blank" rel="noopener noreferrer">
      <img src="${bookmark.icon || 'https://img.icons8.com/ios-filled/50/000000/bookmark.png'}" 
           alt="" 
           onerror="this.src='https://img.icons8.com/ios-filled/50/000000/bookmark.png'">
      ${bookmark.name}
    </a>
  `).join('');
}

function renderServices() {
  console.log('Rendering services:', servicesData);
  const serviceList = document.querySelector('.service-list');
  if (!serviceList) {
    console.error('Service list element not found');
    return;
  }

  if (!Array.isArray(servicesData) || servicesData.length === 0) {
    serviceList.innerHTML = `
      <div class="empty-state">
        <p>No services configured yet. Add some in settings!</p>
      </div>
    `;
    return;
  }

  serviceList.innerHTML = servicesData.map(service => `
    <div class="service-row">
      <div class="service-info">
        <span class="service-name">${service.name}</span>
        <span class="service-ip">${service.ip}</span>
      </div>
      <div class="service-status" data-ip="${service.ip}">
        <span class="status-indicator">⚪</span>
      </div>
    </div>
  `).join('');

  // Start monitoring services
  monitorServices();
}

// Monitor services status
async function monitorServices() {
  const updateServiceStatus = async (ip) => {
    try {
      const response = await fetch(`/api/ping`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ ip })
      });

      if (!response.ok) throw new Error('Failed to ping service');
      const data = await response.json();
      return data.online ? 'online' : 'offline';
    } catch {
      return 'offline';
    }
  };

  const updateUI = (ip, status) => {
    const statusEl = document.querySelector(`[data-ip="${ip}"] .status-indicator`);
    if (statusEl) {
      statusEl.textContent = status === 'online' ? '🟢' : '🔴';
      statusEl.title = `${status.charAt(0).toUpperCase() + status.slice(1)}`;
    }
  };

  // Monitor each service
  servicesData.forEach(service => {
    const checkService = async () => {
      const status = await updateServiceStatus(service.ip);
      updateUI(service.ip, status);
      setTimeout(checkService, 30000); // Check every 30 seconds
    };
    checkService();
  });
}

// Tab switching in settings
function switchTab(tabId) {
  console.log('Switching to tab:', tabId);
  
  // Remove active class from all tabs and contents
  document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  
  // Add active class to clicked tab and corresponding content
  const selectedTab = document.querySelector(`[data-tab="${tabId}"]`);
  const selectedContent = document.getElementById(`${tabId}Tab`);
  
  if (selectedTab && selectedContent) {
    selectedTab.classList.add('active');
    selectedContent.classList.add('active');

    // Load content based on tab
    console.log('Loading content for tab:', tabId);
    switch(tabId) {
      case 'apps':
        renderAppsSettings();
        break;
      case 'services':
          renderServiceSettings();
        break;
      case 'bookmarks':
        renderBookmarkSettings();
        break;
    }
  }
}

function renderAppsSettings() {
  console.log('Rendering apps settings...');
  const appsTab = document.getElementById('appsTab');
  if (!appsTab) return;

  appsTab.innerHTML = `
    <div class="settings-section">
      <h3>Manage Applications</h3>
      <div class="settings-actions" style="margin-bottom: 15px;">
        <button id="addAppGroup" class="settings-button">Add New Group</button>
      </div>
      <div id="appGroupsList">
        ${(appsData || []).map((group, groupIndex) => `
          <div class="settings-entry">
            <div class="settings-entry-row">
              <input type="text" class="settings-input" value="${group.group}" placeholder="Group name" data-group="${groupIndex}">
              <div class="settings-actions">
                <button class="settings-button delete-group" data-group="${groupIndex}">Delete Group</button>
              </div>
            </div>
            <div class="apps-list">
              ${(group.apps || []).map((app, appIndex) => `
                <div class="settings-entry-row">
                  <input type="text" class="settings-input" value="${app.name}" placeholder="App name" data-group="${groupIndex}" data-app="${appIndex}" data-field="name">
                  <input type="text" class="settings-input" value="${app.url}" placeholder="App URL" data-group="${groupIndex}" data-app="${appIndex}" data-field="url">
                  <input type="text" class="settings-input" value="${app.icon}" placeholder="Icon URL" data-group="${groupIndex}" data-app="${appIndex}" data-field="icon">
                  <div class="settings-actions">
                    <button class="settings-button delete-app" data-group="${groupIndex}" data-app="${appIndex}">Delete</button>
                  </div>
                </div>
              `).join('')}
            </div>
            <div class="settings-actions" style="margin-top: 10px;">
              <button class="settings-button add-app" data-group="${groupIndex}">Add App</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Add event listeners
  document.getElementById('addAppGroup')?.addEventListener('click', () => {
    appsData.push({ group: 'New Group', apps: [] });
    saveData('apps', appsData);
    renderAppsSettings();
  });

  document.querySelectorAll('.delete-group').forEach(button => {
    button.addEventListener('click', (e) => {
      const groupIndex = parseInt(e.target.dataset.group);
      if (confirm('Are you sure you want to delete this group and all its apps?')) {
        appsData.splice(groupIndex, 1);
        saveData('apps', appsData);
        renderAppsSettings();
      }
    });
  });

  document.querySelectorAll('.add-app').forEach(button => {
    button.addEventListener('click', (e) => {
      const groupIndex = parseInt(e.target.dataset.group);
      appsData[groupIndex].apps.push({
        name: 'New App',
        url: 'https://',
        icon: 'https://img.icons8.com/ios-filled/50/000000/application-window.png'
      });
      saveData('apps', appsData);
      renderAppsSettings();
    });
  });

  document.querySelectorAll('.delete-app').forEach(button => {
    button.addEventListener('click', (e) => {
      const groupIndex = parseInt(e.target.dataset.group);
      const appIndex = parseInt(e.target.dataset.app);
      if (confirm('Are you sure you want to delete this app?')) {
        appsData[groupIndex].apps.splice(appIndex, 1);
        saveData('apps', appsData);
        renderAppsSettings();
      }
    });
  });

  document.querySelectorAll('.settings-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const groupIndex = parseInt(e.target.dataset.group);
      const appIndex = e.target.dataset.app !== undefined ? parseInt(e.target.dataset.app) : null;
      const field = e.target.dataset.field;

      if (appIndex === null) {
        // Group name change
        appsData[groupIndex].group = e.target.value;
      } else {
        // App field change
        appsData[groupIndex].apps[appIndex][field] = e.target.value;
      }
      saveData('apps', appsData);
    });
  });
}

function renderServiceSettings() {
  console.log('Rendering services settings...');
  const servicesTab = document.getElementById('servicesTab');
  if (!servicesTab) return;

  servicesTab.innerHTML = `
    <div class="settings-section">
      <h3>Manage Services</h3>
      <div class="settings-actions" style="margin-bottom: 15px;">
        <button id="addService" class="settings-button">Add New Service</button>
      </div>
      <div id="servicesList">
        ${(servicesData || []).map((service, index) => `
          <div class="settings-entry">
            <div class="settings-entry-row">
              <input type="text" class="settings-input" value="${service.name}" placeholder="Service name" data-index="${index}" data-field="name">
              <input type="text" class="settings-input" value="${service.ip}" placeholder="Service IP" data-index="${index}" data-field="ip">
              <div class="settings-actions">
                <button class="settings-button delete-service" data-index="${index}">Delete</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Add event listeners
  document.getElementById('addService')?.addEventListener('click', () => {
    servicesData.push({ name: 'New Service', ip: '192.168.1.1' });
    saveData('services', servicesData);
    renderServiceSettings();
  });

  document.querySelectorAll('.delete-service').forEach(button => {
    button.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      if (confirm('Are you sure you want to delete this service?')) {
        servicesData.splice(index, 1);
        saveData('services', servicesData);
        renderServiceSettings();
      }
    });
  });

  document.querySelectorAll('.settings-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const index = parseInt(e.target.dataset.index);
      const field = e.target.dataset.field;
      servicesData[index][field] = e.target.value;
      saveData('services', servicesData);
    });
  });
}

function renderBookmarkSettings() {
  console.log('Rendering bookmarks settings...');
  const bookmarksTab = document.getElementById('bookmarksTab');
  if (!bookmarksTab) return;

  bookmarksTab.innerHTML = `
    <div class="settings-section">
      <h3>Manage Bookmarks</h3>
      <div class="settings-actions" style="margin-bottom: 15px;">
        <button id="addBookmark" class="settings-button">Add New Bookmark</button>
      </div>
      <div id="bookmarksList">
        ${(bookmarksData || []).map((bookmark, index) => `
          <div class="settings-entry">
            <div class="settings-entry-row">
              <input type="text" class="settings-input" value="${bookmark.name}" placeholder="Bookmark name" data-index="${index}" data-field="name">
              <input type="text" class="settings-input" value="${bookmark.url}" placeholder="Bookmark URL" data-index="${index}" data-field="url">
              <input type="text" class="settings-input" value="${bookmark.icon}" placeholder="Icon URL" data-index="${index}" data-field="icon">
              <div class="settings-actions">
                <button class="settings-button delete-bookmark" data-index="${index}">Delete</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Add event listeners
  document.getElementById('addBookmark')?.addEventListener('click', () => {
    bookmarksData.push({
      name: 'New Bookmark',
      url: 'https://',
      icon: 'https://img.icons8.com/ios-filled/24/bookmark.png'
    });
    saveData('bookmarks', bookmarksData);
        renderBookmarkSettings();
      });

  document.querySelectorAll('.delete-bookmark').forEach(button => {
    button.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      if (confirm('Are you sure you want to delete this bookmark?')) {
        bookmarksData.splice(index, 1);
        saveData('bookmarks', bookmarksData);
        renderBookmarkSettings();
      }
          });
      });

  document.querySelectorAll('.settings-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const index = parseInt(e.target.dataset.index);
      const field = e.target.dataset.field;
      bookmarksData[index][field] = e.target.value;
      saveData('bookmarks', bookmarksData);
    });
  });
}

// Helper function to show errors
function showError(message) {
  const errorHtml = `
    <div class="error-message">
      <p>${message}</p>
      <button onclick="loadData()" class="retry-button">Retry</button>
    </div>
  `;

  const appGrid = document.getElementById('appGrid');
  const bookmarkBar = document.getElementById('bookmarkBar');
  const serviceList = document.querySelector('.service-list');

  if (appGrid) appGrid.innerHTML = errorHtml;
  if (bookmarkBar) bookmarkBar.innerHTML = errorHtml;
  if (serviceList) serviceList.innerHTML = errorHtml;
}