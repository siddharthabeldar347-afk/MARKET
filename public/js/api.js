// Central API Client and UI Helpers
const API = {
  async get(url) {
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || err.message || 'Request failed');
    }
    return res.json();
  },

  async post(url, data) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || err.message || 'Request failed');
    }
    return res.json();
  },

  async put(url, data) {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || err.message || 'Request failed');
    }
    return res.json();
  },

  async patch(url, data) {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || err.message || 'Request failed');
    }
    return res.json();
  },

  async delete(url) {
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || err.message || 'Request failed');
    }
    return res.json();
  }
};

// UI Notification Toast
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Modal Helpers
function openModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.add('active');
}

function closeModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.remove('active');
}

// Global Event Listeners for Tab Navigation and Modals
document.addEventListener('DOMContentLoaded', () => {
  // Main Tab Navigation
  document.querySelectorAll('nav.main-nav .nav-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('nav.main-nav .nav-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      const targetPane = document.getElementById(tabId);
      if (targetPane) targetPane.classList.add('active');

      // Refresh data on tab switch
      if (tabId === 'tab-pos' && window.POS) window.POS.refresh();
      if (tabId === 'tab-inventory' && window.Inventory) window.Inventory.load();
      if (tabId === 'tab-products' && window.CRUD) window.CRUD.loadProducts();
      if (tabId === 'tab-masters' && window.CRUD) window.CRUD.loadActiveSubtab();
      if (tabId === 'tab-returns' && window.Returns) window.Returns.load();
      if (tabId === 'tab-reports' && window.Reports) window.Reports.load();
      if (tabId === 'tab-viva' && window.Viva) window.Viva.load();
    });
  });

  // Master Record Subtabs
  document.querySelectorAll('.subtab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.subtab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.subtab-content').forEach(c => c.style.display = 'none');
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-subtab');
      const content = document.getElementById(targetId);
      if (content) content.style.display = 'block';
      if (window.CRUD) window.CRUD.loadActiveSubtab();
    });
  });

  // Modal Close Buttons
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal(btn.getAttribute('data-close'));
    });
  });

  // Check Database Health on Load
  checkHealth();
  setInterval(checkHealth, 20000);

  // Reseed Database Button
  const btnReseed = document.getElementById('btn-reseed');
  if (btnReseed) {
    btnReseed.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to reseed the database with the original DA-2 assignment data?')) return;
      try {
        btnReseed.disabled = true;
        btnReseed.textContent = 'Reseeding...';
        await API.post('/api/reset-seed', {});
        showToast('Database reset and reseeded with DA-2 records!', 'success');
        if (window.POS) window.POS.refresh();
        if (window.Inventory) window.Inventory.load();
        if (window.Reports) window.Reports.load();
        checkHealth();
      } catch (err) {
        showToast(`Reseed error: ${err.message}`, 'error');
      } finally {
        btnReseed.disabled = false;
        btnReseed.textContent = '🔄 Reseed DA-2 Data';
      }
    });
  }
});

async function checkHealth() {
  const badgeText = document.getElementById('db-status-text');
  try {
    const health = await API.get('/api/health');
    if (health.status === 'ok') {
      badgeText.textContent = `Connected: ${health.database} (${health.collectionsCount} collections)`;
    } else {
      badgeText.textContent = `MongoDB Error: ${health.message}`;
    }
  } catch (err) {
    if (badgeText) badgeText.textContent = 'Database Unreachable';
  }
}
