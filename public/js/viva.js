// Interactive Lab Viva & MongoDB Query Demonstration Explorer
window.Viva = {
  catalog: [],
  currentFilter: 'all',

  async init() {
    document.querySelectorAll('.filter-query-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-query-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilter = btn.getAttribute('data-filter');
        this.render();
      });
    });

    document.getElementById('btn-run-all-queries').addEventListener('click', () => this.runAllQueries());

    await this.load();
  },

  async load() {
    try {
      this.catalog = await API.get('/api/analytics/queries');
      this.render();
    } catch (err) {
      console.error('Error loading query catalog:', err);
    }
  },

  render() {
    const container = document.getElementById('viva-queries-container');
    if (!container) return;

    let filtered = this.catalog;
    if (this.currentFilter === 'sql') {
      filtered = this.catalog.filter(q => q.id.startsWith('sql'));
    } else if (this.currentFilter === 'plsql') {
      filtered = this.catalog.filter(q => q.id.startsWith('plsql'));
    }

    container.innerHTML = filtered.map(q => `
      <div class="query-card" id="card-${q.id}">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <span class="badge ${q.id.startsWith('sql') ? 'badge-info' : 'badge-warning'}">${q.category}</span>
            <strong style="margin-left: 0.5rem; font-size: 1rem;">${q.title}</strong>
          </div>
          <button class="btn btn-primary btn-sm" id="btn-run-${q.id}" onclick="window.Viva.runSingleQuery('${q.id}')">
            ▶️ Run Live Query
          </button>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div>
            <div class="code-label">Original DA-2 SQL / PL-SQL</div>
            <pre class="code-box"><code>${this.escapeHtml(q.sql)}</code></pre>
          </div>
          <div>
            <div class="code-label">MongoDB Driver & Aggregation Equivalent</div>
            <pre class="code-box" style="background: #1e1b4b; color: #a5b4fc;"><code>${this.escapeHtml(q.mongo)}</code></pre>
          </div>
        </div>

        <div class="query-result-box" id="result-${q.id}" style="display: none;">
          <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 0.25rem;">
            <span>Live MongoDB Execution Output</span>
            <span id="timing-${q.id}" style="color: var(--primary); font-size: 0.8rem;"></span>
          </div>
          <pre id="output-${q.id}" style="margin: 0; font-family: monospace; white-space: pre-wrap; font-size: 0.82rem;"></pre>
        </div>
      </div>
    `).join('');
  },

  async runSingleQuery(id) {
    const btn = document.getElementById(`btn-run-${id}`);
    const resultBox = document.getElementById(`result-${id}`);
    const outputEl = document.getElementById(`output-${id}`);
    const timingEl = document.getElementById(`timing-${id}`);

    try {
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Running...';
      }

      const res = await API.post(`/api/analytics/queries/run/${id}`, {});
      resultBox.style.display = 'block';
      timingEl.textContent = `Completed in ${res.executionTimeMs} ms`;
      outputEl.textContent = JSON.stringify(res.result, null, 2);
      showToast(`Query ${id.toUpperCase()} executed successfully!`, 'success');
    } catch (err) {
      resultBox.style.display = 'block';
      timingEl.textContent = 'Failed';
      outputEl.textContent = `Error: ${err.message}`;
      showToast(`Query ${id} error: ${err.message}`, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '▶️ Run Live Query';
      }
    }
  },

  async runAllQueries() {
    const btn = document.getElementById('btn-run-all-queries');
    btn.disabled = true;
    btn.textContent = 'Running All Queries...';

    let count = 0;
    for (const q of this.catalog) {
      await this.runSingleQuery(q.id);
      count++;
    }

    btn.disabled = false;
    btn.textContent = `🚀 Run All 30 Queries (Done: ${count}/${this.catalog.length})`;
    showToast(`All ${count} queries executed against live MongoDB!`, 'success');
  },

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.Viva.init();
});
