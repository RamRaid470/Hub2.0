function loadServiceStatus() {
  fetch("services.json")
    .then(res => res.json())
    .then(services => {
      const container = document.getElementById("serviceStatus");
      container.innerHTML = "";

      services.forEach(service => {
        const row = document.createElement("div");
        row.className = "service-row";
        row.textContent = `${service.name} (${service.ip}): `;

        const status = document.createElement("span");
        status.textContent = "⏳";

        row.appendChild(status);
        container.appendChild(row);

        fetch("/api/services/ping", {
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
            status.style.color = data.online ? "#00ff88" : "#ff4d4d";
          })
          .catch(() => {
            status.textContent = "❌";
            status.style.color = "#ff4d4d";
          });
      });
    });
}

// Auto-refresh every 30 seconds
setInterval(loadServiceStatus, 30000);


function renderServiceSettings() {
  fetch("services.json")
    .then(res => res.json())
    .then(services => {
      const settingsContainer = document.getElementById("serviceSettings");
      settingsContainer.innerHTML = "";

      services.forEach((service, index) => {
        const row = document.createElement("div");
        row.className = "settings-entry";

        const nameInput = document.createElement("input");
        nameInput.value = service.name;
        nameInput.placeholder = "Name";
        nameInput.onchange = e => services[index].name = e.target.value;

        const ipInput = document.createElement("input");
        ipInput.value = service.ip;
        ipInput.placeholder = "IP Address";
        ipInput.onchange = e => services[index].ip = e.target.value;

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "🗑";
        deleteBtn.onclick = () => {
          services.splice(index, 1);
          saveServices(services);  // Save immediately after delete
          renderServiceSettings();
        };

        row.appendChild(nameInput);
        row.appendChild(ipInput);
        row.appendChild(deleteBtn);
        settingsContainer.appendChild(row);
      });

      const addBtn = document.createElement("button");
      addBtn.textContent = "+ Add Service";
      addBtn.onclick = () => {
        services.push({ name: "New Service", ip: "" });
        saveServices(services);  // Save immediately after add
        renderServiceSettings();
      };
      settingsContainer.appendChild(addBtn);

      const saveBtn = document.createElement("button");
      saveBtn.textContent = "💾 Save Services";
      saveBtn.onclick = () => {
        saveServices(services);
      };
      settingsContainer.appendChild(saveBtn);
    });
}

function saveServices(services) {
  return fetch("/api/services", {
    method: "POST",
    credentials: "include",
    headers: { 
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify(services)
  })
    .then(res => {
      if (!res.ok) {
        return res.json().then(err => {
          throw new Error(err.message || 'Failed to save services');
        });
      }
      return res.json();
    })
    .then(data => {
      if (data.status === 'success') {
        alert("Services saved!");
        loadServiceStatus();
        return true;
      } else {
        throw new Error(data.message || 'Failed to save services');
      }
    })
    .catch(error => {
      console.error("Error saving services:", error);
      alert(error.message || "Failed to save services. Please try again.");
      return false;
    });
}