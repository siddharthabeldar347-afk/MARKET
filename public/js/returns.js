// Returns and Restocking Management Controller
window.Returns = {
  returnsList: [],

  async init() {
    const retDate = document.getElementById('return-date');
    if (retDate) retDate.value = new Date().toISOString().split('T')[0];

    document.getElementById('form-process-return').addEventListener('submit', (e) => this.submitReturn(e));

    await this.load();
  },

  async load() {
    await Promise.all([
      this.loadBatchesDropdown(),
      this.loadReturnsHistory()
    ]);
  },

  async loadBatchesDropdown() {
    try {
      const batches = await API.get('/api/inventory');
      const select = document.getElementById('return-batch-select');
      select.innerHTML = '<option value="">-- Select Batch to Return --</option>' +
        batches.map(b => `<option value="${b.Batch_Number}">Batch #${b.Batch_Number} - ${b.Product_Name} (Current Stock: ${b.Stock_qty})</option>`).join('');
    } catch (err) {
      console.error('Error loading return batches dropdown:', err);
    }
  },

  async loadReturnsHistory() {
    try {
      this.returnsList = await API.get('/api/returns');
      const tbody = document.getElementById('returns-tbody');
      if (this.returnsList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No customer returns recorded yet.</td></tr>';
        return;
      }

      tbody.innerHTML = this.returnsList.map(r => `
        <tr>
          <td><strong>#${r.Return_ID}</strong></td>
          <td>${r.Return_date}</td>
          <td><strong>#${r.Batch_Number}</strong></td>
          <td>${r.Product_Name || 'Product #' + r.Product_ID}</td>
          <td><span class="badge badge-success">+${r.Quantity_returned} units</span></td>
          <td>${r.Reason || 'Customer Return'}</td>
          <td>${r.Current_Stock !== undefined ? r.Current_Stock : '-'}</td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('Error loading returns history:', err);
    }
  },

  async submitReturn(e) {
    e.preventDefault();
    const batchSelect = document.getElementById('return-batch-select');
    const qtyInput = document.getElementById('return-quantity');
    const dateInput = document.getElementById('return-date');
    const reasonInput = document.getElementById('return-reason');

    const Batch_Number = parseInt(batchSelect.value, 10);
    const Quantity_returned = parseInt(qtyInput.value, 10);
    const Return_date = dateInput.value;
    const Reason = reasonInput.value.trim();

    if (!Batch_Number) {
      showToast('Please select a batch for the return.', 'error');
      return;
    }
    if (isNaN(Quantity_returned) || Quantity_returned <= 0) {
      showToast('Quantity returned must be at least 1.', 'error');
      return;
    }

    try {
      const res = await API.post('/api/returns', {
        Batch_Number,
        Quantity_returned,
        Return_date,
        Reason
      });

      showToast(`Return #${res.returnRecord.Return_ID} processed! Stock increased to ${res.updatedBatchStock}.`, 'success');

      // Reset form fields
      qtyInput.value = 1;
      reasonInput.value = '';

      await this.load();
      if (window.Inventory) window.Inventory.load();
      if (window.POS) window.POS.loadBatches();
    } catch (err) {
      showToast('Error processing return: ' + err.message, 'error');
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.Returns.init();
});
