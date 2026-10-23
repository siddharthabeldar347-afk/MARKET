// Reports & Analytics Controller
window.Reports = {
  async init() {
    await this.load();
  },

  async load() {
    await Promise.all([
      this.loadSummaryKPIs(),
      this.loadCategoryBreakdown(),
      this.loadPriceStatistics(),
      this.loadLowStockReport()
    ]);
  },

  async loadSummaryKPIs() {
    try {
      const summary = await API.get('/api/analytics/summary');
      document.getElementById('rep-kpi-revenue').textContent = `₹${summary.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      document.getElementById('rep-kpi-bills').textContent = summary.totalBills;
      document.getElementById('rep-kpi-discounts').textContent = `₹${summary.totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    } catch (err) {
      console.error('Error loading summary KPIs:', err);
    }
  },

  async loadCategoryBreakdown() {
    try {
      const data = await API.get('/api/analytics/category-breakdown');
      const tbody = document.getElementById('rep-category-tbody');
      if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No category data available.</td></tr>';
        return;
      }

      tbody.innerHTML = data.map(c => `
        <tr>
          <td><strong>#${c.Category_ID}</strong></td>
          <td>${c.Category_Name || '-'}</td>
          <td><strong>${c.Product_Count}</strong></td>
          <td>₹${Number(c.Avg_Price || 0).toFixed(2)}</td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('Error loading category breakdown:', err);
    }
  },

  async loadPriceStatistics() {
    try {
      const stats = await API.get('/api/analytics/price-stats');
      document.getElementById('rep-stat-sum').textContent = `₹${Number(stats.Total_Price || 0).toFixed(2)}`;
      document.getElementById('rep-stat-avg').textContent = `₹${Number(stats.Average_Price || 0).toFixed(2)}`;
      document.getElementById('rep-stat-max').textContent = `₹${Number(stats.Maximum_Price || 0).toFixed(2)}`;
      document.getElementById('rep-stat-min').textContent = `₹${Number(stats.Minimum_Price || 0).toFixed(2)}`;

      const kpiAvg = document.getElementById('rep-kpi-avgprice');
      if (kpiAvg) kpiAvg.textContent = `₹${Number(stats.Average_Price || 0).toFixed(2)}`;
    } catch (err) {
      console.error('Error loading price statistics:', err);
    }
  },

  async loadLowStockReport() {
    try {
      const lowStock = await API.get('/api/inventory/low-stock');
      const tbody = document.getElementById('rep-lowstock-tbody');
      if (lowStock.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--success); font-weight: 600;">All inventory batches are above reorder threshold!</td></tr>';
        return;
      }

      tbody.innerHTML = lowStock.map(b => `
        <tr>
          <td><strong>#${b.Batch_Number}</strong></td>
          <td>#${b.Product_ID}</td>
          <td>${b.Product_Name}</td>
          <td><strong style="color: var(--danger);">${b.Stock_qty}</strong></td>
          <td>${b.Reorder_level}</td>
          <td><span class="badge badge-danger">-${b.Deficit} units needed</span></td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('Error loading low stock report:', err);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.Reports.init();
});
