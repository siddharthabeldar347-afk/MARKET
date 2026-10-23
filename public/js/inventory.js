// Inventory and Batch Management Controller
window.Inventory = {
  data: [],

  async init() {
    document.getElementById('inv-search').addEventListener('input', () => this.render());
    document.getElementById('inv-filter-status').addEventListener('change', () => this.render());
    document.getElementById('btn-open-add-batch').addEventListener('click', () => this.openAddModal());
    document.getElementById('form-batch').addEventListener('submit', (e) => this.submitBatch(e));

    await this.load();
  },

  async load() {
    try {
      this.data = await API.get('/api/inventory');
      this.updateKPIs();
      this.render();
    } catch (err) {
      console.error('Failed to load inventory:', err);
    }
  },

  updateKPIs() {
    const totalBatches = this.data.length;
    const totalStock = this.data.reduce((sum, b) => sum + (b.Stock_qty || 0), 0);
    const totalValue = this.data.reduce((sum, b) => sum + (b.Stock_Value || (b.Stock_qty * b.Cost_Price) || 0), 0);
    const lowStockCount = this.data.filter(b => b.Stock_qty <= b.Reorder_level).length;

    document.getElementById('kpi-inv-batches').textContent = totalBatches;
    document.getElementById('kpi-inv-stock').textContent = totalStock;
    document.getElementById('kpi-inv-value').textContent = `₹${totalValue.toLocaleString('en-IN')}`;
    document.getElementById('kpi-inv-low').textContent = lowStockCount;
  },

  render() {
    const searchTerm = document.getElementById('inv-search').value.toLowerCase().trim();
    const statusFilter = document.getElementById('inv-filter-status').value;

    const filtered = this.data.filter(b => {
      const matchSearch =
        String(b.Batch_Number).includes(searchTerm) ||
        (b.Product_Name && b.Product_Name.toLowerCase().includes(searchTerm)) ||
        (b.Branch_Location && b.Branch_Location.toLowerCase().includes(searchTerm));

      const matchStatus = statusFilter === 'ALL' || b.Stock_Status === statusFilter;
      return matchSearch && matchStatus;
    });

    const tbody = document.getElementById('inventory-tbody');
    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="13" style="text-align: center; color: var(--text-muted);">No inventory batches match the filter.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(b => {
      let badgeClass = 'badge-success';
      if (b.Stock_Status === 'Low Stock') badgeClass = 'badge-warning';
      if (b.Stock_Status === 'Out of Stock') badgeClass = 'badge-danger';

      return `
        <tr>
          <td><strong>#${b.Batch_Number}</strong></td>
          <td>${b.Product_Name || 'Product #' + b.Product_ID}</td>
          <td>${b.Branch_Location || 'Branch #' + b.Branch_ID}</td>
          <td>${b.Supplier_Name || 'Supplier #' + b.Supplier_ID}</td>
          <td>${b.Mfg_date || '-'}</td>
          <td>${b.Exp_date || '-'}</td>
          <td>${b.Reorder_level}</td>
          <td><strong style="color: ${b.Stock_qty <= b.Reorder_level ? 'var(--danger)' : 'inherit'};">${b.Stock_qty}</strong></td>
          <td>₹${Number(b.Cost_Price).toFixed(2)}</td>
          <td>₹${Number(b.Selling_Price).toFixed(2)}</td>
          <td>₹${Number(b.Stock_Value || (b.Stock_qty * b.Cost_Price)).toFixed(2)}</td>
          <td><span class="badge ${badgeClass}">${b.Stock_Status}</span></td>
          <td>
            <div style="display: flex; gap: 4px;">
              <button class="btn btn-secondary btn-sm" onclick="window.Inventory.quickUpdateStock(${b.Batch_Number}, ${b.Stock_qty})">Stock</button>
              <button class="btn btn-danger btn-sm" onclick="window.Inventory.deleteBatch(${b.Batch_Number})">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  async openAddModal() {
    try {
      const [products, suppliers, branches] = await Promise.all([
        API.get('/api/products'),
        API.get('/api/suppliers'),
        API.get('/api/branches')
      ]);

      const prodSelect = document.getElementById('batch-form-prod');
      prodSelect.innerHTML = products.map(p => `<option value="${p.Product_ID}">${p.Product_ID} - ${p.Name} (₹${p.Base_Price})</option>`).join('');

      const suppSelect = document.getElementById('batch-form-supp');
      suppSelect.innerHTML = suppliers.map(s => `<option value="${s.Supplier_ID}">${s.Supplier_ID} - ${s.Company_Name}</option>`).join('');

      const branchSelect = document.getElementById('batch-form-branch');
      branchSelect.innerHTML = branches.map(b => `<option value="${b.Branch_ID}">${b.Branch_ID} - ${b.Location}</option>`).join('');

      document.getElementById('batch-form-mfg').value = new Date().toISOString().split('T')[0];
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      document.getElementById('batch-form-exp').value = nextYear.toISOString().split('T')[0];

      openModal('modal-batch');
    } catch (err) {
      showToast('Error preparing batch form: ' + err.message, 'error');
    }
  },

  async submitBatch(e) {
    e.preventDefault();
    const payload = {
      Product_ID: parseInt(document.getElementById('batch-form-prod').value, 10),
      Supplier_ID: parseInt(document.getElementById('batch-form-supp').value, 10),
      Branch_ID: parseInt(document.getElementById('batch-form-branch').value, 10),
      Mfg_date: document.getElementById('batch-form-mfg').value,
      Exp_date: document.getElementById('batch-form-exp').value,
      Stock_qty: parseInt(document.getElementById('batch-form-stock').value, 10),
      Reorder_level: parseInt(document.getElementById('batch-form-reorder').value, 10),
      Cost_Price: parseFloat(document.getElementById('batch-form-cost').value),
      Selling_Price: parseFloat(document.getElementById('batch-form-sell').value)
    };

    try {
      const res = await API.post('/api/inventory', payload);
      showToast(`Batch #${res.batch.Batch_Number} added successfully!`, 'success');
      closeModal('modal-batch');
      await this.load();
      if (window.POS) window.POS.loadBatches();
    } catch (err) {
      showToast('Failed to add batch: ' + err.message, 'error');
    }
  },

  async quickUpdateStock(batchNumber, currentStock) {
    const input = prompt(`Update Stock Quantity for Batch #${batchNumber}:`, currentStock);
    if (input === null) return;
    const newQty = parseInt(input, 10);
    if (isNaN(newQty) || newQty < 0) {
      showToast('Stock quantity must be a non-negative number.', 'error');
      return;
    }

    try {
      await API.put(`/api/inventory/${batchNumber}`, { Stock_qty: newQty });
      showToast(`Batch #${batchNumber} stock updated to ${newQty}.`, 'success');
      await this.load();
      if (window.POS) window.POS.loadBatches();
    } catch (err) {
      showToast('Failed to update stock: ' + err.message, 'error');
    }
  },

  async deleteBatch(batchNumber) {
    if (!confirm(`Are you sure you want to delete Batch #${batchNumber}?`)) return;
    try {
      await API.delete(`/api/inventory/${batchNumber}`);
      showToast(`Batch #${batchNumber} deleted successfully.`, 'success');
      await this.load();
      if (window.POS) window.POS.loadBatches();
    } catch (err) {
      showToast('Delete error: ' + err.message, 'error');
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.Inventory.init();
});
