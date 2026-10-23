// CRUD Master Records Controller
// Manages Products, Categories, Suppliers, Branches, Employees, and Customers
window.CRUD = {
  products: [],
  categories: [],
  suppliers: [],
  branches: [],
  employees: [],
  customers: [],

  async init() {
    // Product Filters
    document.getElementById('prod-search').addEventListener('input', () => this.filterProducts());
    document.getElementById('prod-filter-category').addEventListener('change', () => this.filterProducts());
    document.getElementById('prod-sort').addEventListener('change', () => this.filterProducts());
    document.getElementById('btn-prod-filter-price').addEventListener('click', () => this.filterProducts());
    document.getElementById('btn-prod-reset-filter').addEventListener('click', () => {
      document.getElementById('prod-search').value = '';
      document.getElementById('prod-filter-category').value = '';
      document.getElementById('prod-sort').value = 'id';
      document.getElementById('prod-min-price').value = '';
      document.getElementById('prod-max-price').value = '';
      this.filterProducts();
    });

    // Add Product Modal & Form
    document.getElementById('btn-open-add-product').addEventListener('click', () => this.openProductModal());
    document.getElementById('form-product').addEventListener('submit', (e) => this.submitProduct(e));

    // Master Subtab Add Buttons
    document.getElementById('btn-open-add-category').addEventListener('click', () => this.addCategoryPrompt());
    document.getElementById('btn-open-add-supplier').addEventListener('click', () => this.addSupplierPrompt());
    document.getElementById('btn-open-add-branch').addEventListener('click', () => this.addBranchPrompt());
    document.getElementById('btn-open-add-employee').addEventListener('click', () => this.addEmployeePrompt());
    document.getElementById('btn-open-add-customer').addEventListener('click', () => this.openCustomerModal());
    document.getElementById('form-customer').addEventListener('submit', (e) => this.submitCustomer(e));

    // Customer search
    document.getElementById('cust-search').addEventListener('input', (e) => this.loadCustomers(e.target.value));

    await this.loadCategories();
    await this.loadProducts();
  },

  async loadActiveSubtab() {
    const activeSubtab = document.querySelector('.subtab-btn.active');
    if (!activeSubtab) return;
    const tabId = activeSubtab.getAttribute('data-subtab');
    if (tabId === 'subtab-categories') await this.loadCategories();
    if (tabId === 'subtab-suppliers') await this.loadSuppliers();
    if (tabId === 'subtab-branches') await this.loadBranches();
    if (tabId === 'subtab-employees') await this.loadEmployees();
    if (tabId === 'subtab-customers') await this.loadCustomers();
  },

  // ==========================================
  // PRODUCTS
  // ==========================================
  async loadProducts() {
    try {
      this.products = await API.get('/api/products');
      this.renderProducts(this.products);
    } catch (err) {
      console.error('Error loading products:', err);
    }
  },

  async filterProducts() {
    const search = document.getElementById('prod-search').value.trim();
    const category_id = document.getElementById('prod-filter-category').value;
    const sortBy = document.getElementById('prod-sort').value;
    const minPrice = document.getElementById('prod-min-price').value.trim();
    const maxPrice = document.getElementById('prod-max-price').value.trim();

    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category_id) params.append('category_id', category_id);
    if (sortBy) params.append('sortBy', sortBy);
    if (minPrice) params.append('minPrice', minPrice);
    if (maxPrice) params.append('maxPrice', maxPrice);

    try {
      const filtered = await API.get(`/api/products?${params.toString()}`);
      this.renderProducts(filtered);
    } catch (err) {
      console.error('Filter products failed:', err);
    }
  },

  renderProducts(list) {
    const tbody = document.getElementById('products-tbody');
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">No products found matching criteria.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(p => {
      const badgeClass = p.Price_Category === 'EXPENSIVE' ? 'badge-danger' : 'badge-info';
      return `
        <tr>
          <td><strong>#${p.Product_ID}</strong></td>
          <td><strong>${p.Name}</strong></td>
          <td>${p.Category_Name || 'Category #' + p.Category_ID}</td>
          <td>₹${Number(p.Base_Price).toFixed(2)}</td>
          <td>${p.Tax}%</td>
          <td><strong>₹${Number(p.Price_With_Tax || p.Base_Price).toFixed(2)}</strong></td>
          <td><span class="badge ${badgeClass}">${p.Price_Category || (p.Base_Price > 100 ? 'EXPENSIVE' : 'NORMAL')}</span></td>
          <td>
            <div style="display: flex; gap: 4px;">
              <button class="btn btn-secondary btn-sm" title="Increase Price by % (DA-2 PL/SQL 15)" onclick="window.CRUD.increaseProductPrice(${p.Product_ID}, '${p.Name}')">+%</button>
              <button class="btn btn-danger btn-sm" title="Delete Product" onclick="window.CRUD.deleteProduct(${p.Product_ID})">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  async openProductModal() {
    await this.loadCategories();
    const catSelect = document.getElementById('prod-form-cat');
    catSelect.innerHTML = this.categories.map(c => `<option value="${c.Category_ID}">${c.Category_ID} - ${c.Category_Name}</option>`).join('');
    document.getElementById('form-product').reset();
    openModal('modal-product');
  },

  async submitProduct(e) {
    e.preventDefault();
    const payload = {
      Name: document.getElementById('prod-form-name').value.trim(),
      Category_ID: parseInt(document.getElementById('prod-form-cat').value, 10),
      Base_Price: parseFloat(document.getElementById('prod-form-price').value),
      Tax: parseFloat(document.getElementById('prod-form-tax').value)
    };

    try {
      const res = await API.post('/api/products', payload);
      showToast(`Product '${res.product.Name}' created successfully!`, 'success');
      closeModal('modal-product');
      await this.loadProducts();
    } catch (err) {
      showToast('Error saving product: ' + err.message, 'error');
    }
  },

  async increaseProductPrice(id, name) {
    const input = prompt(`Enter percentage to increase price for '${name}' (e.g. 10 for 10%):`, '10');
    if (!input) return;
    const percentage = parseFloat(input);
    if (isNaN(percentage)) {
      showToast('Please enter a valid percentage number.', 'error');
      return;
    }

    try {
      const res = await API.patch(`/api/products/${id}/increase-price`, { percentage });
      showToast(`Price increased: ₹${res.Old_Price} -> ₹${res.New_Price} (+${percentage}%)`, 'success');
      await this.loadProducts();
    } catch (err) {
      showToast('Price increase failed: ' + err.message, 'error');
    }
  },

  async deleteProduct(id) {
    if (!confirm(`Are you sure you want to delete Product #${id}?`)) return;
    try {
      await API.delete(`/api/products/${id}`);
      showToast(`Product #${id} deleted successfully.`, 'success');
      await this.loadProducts();
    } catch (err) {
      showToast('Delete failed: ' + err.message, 'error');
    }
  },

  // ==========================================
  // CATEGORIES
  // ==========================================
  async loadCategories() {
    try {
      this.categories = await API.get('/api/categories');
      const tbody = document.getElementById('categories-tbody');
      if (tbody) {
        tbody.innerHTML = this.categories.map(c => `
          <tr>
            <td><strong>#${c.Category_ID}</strong></td>
            <td>${c.Category_Name}</td>
            <td>
              <button class="btn btn-danger btn-sm" onclick="window.CRUD.deleteCategory(${c.Category_ID})">🗑️ Delete</button>
            </td>
          </tr>
        `).join('');
      }

      // Populate filter dropdown
      const filterSelect = document.getElementById('prod-filter-category');
      if (filterSelect) {
        filterSelect.innerHTML = '<option value="">All Categories</option>' +
          this.categories.map(c => `<option value="${c.Category_ID}">${c.Category_Name}</option>`).join('');
      }
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  },

  async addCategoryPrompt() {
    const name = prompt('Enter Category Name (e.g. Frozen Foods):');
    if (!name || !name.trim()) return;
    try {
      const res = await API.post('/api/categories', { Category_Name: name.trim() });
      showToast(`Category '${res.category.Category_Name}' created!`, 'success');
      await this.loadCategories();
    } catch (err) {
      showToast('Error creating category: ' + err.message, 'error');
    }
  },

  async deleteCategory(id) {
    if (!confirm(`Delete Category #${id}?`)) return;
    try {
      await API.delete(`/api/categories/${id}`);
      showToast('Category deleted successfully.', 'success');
      await this.loadCategories();
    } catch (err) {
      showToast('Delete error: ' + err.message, 'error');
    }
  },

  // ==========================================
  // SUPPLIERS
  // ==========================================
  async loadSuppliers() {
    try {
      this.suppliers = await API.get('/api/suppliers');
      const tbody = document.getElementById('suppliers-tbody');
      tbody.innerHTML = this.suppliers.map(s => `
        <tr>
          <td><strong>#${s.Supplier_ID}</strong></td>
          <td>${s.Company_Name}</td>
          <td>${s.Contact_Person || '-'}</td>
          <td>${s.Phone || '-'}</td>
          <td>
            <button class="btn btn-danger btn-sm" onclick="window.CRUD.deleteSupplier(${s.Supplier_ID})">🗑️ Delete</button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('Error loading suppliers:', err);
    }
  },

  async addSupplierPrompt() {
    const company = prompt('Enter Supplier Company Name:');
    if (!company || !company.trim()) return;
    const contact = prompt('Enter Contact Person:');
    const phone = prompt('Enter Phone Number:');

    try {
      const res = await API.post('/api/suppliers', {
        Company_Name: company.trim(),
        Contact_Person: contact ? contact.trim() : null,
        Phone: phone ? phone.trim() : null
      });
      showToast(`Supplier '${res.supplier.Company_Name}' created!`, 'success');
      await this.loadSuppliers();
    } catch (err) {
      showToast('Error creating supplier: ' + err.message, 'error');
    }
  },

  async deleteSupplier(id) {
    if (!confirm(`Delete Supplier #${id}?`)) return;
    try {
      await API.delete(`/api/suppliers/${id}`);
      showToast('Supplier deleted.', 'success');
      await this.loadSuppliers();
    } catch (err) {
      showToast('Delete error: ' + err.message, 'error');
    }
  },

  // ==========================================
  // BRANCHES
  // ==========================================
  async loadBranches() {
    try {
      this.branches = await API.get('/api/branches');
      const tbody = document.getElementById('branches-tbody');
      tbody.innerHTML = this.branches.map(b => `
        <tr>
          <td><strong>#${b.Branch_ID}</strong></td>
          <td>${b.Location}</td>
          <td>${b.Phone || '-'}</td>
          <td>
            <button class="btn btn-danger btn-sm" onclick="window.CRUD.deleteBranch(${b.Branch_ID})">🗑️ Delete</button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('Error loading branches:', err);
    }
  },

  async addBranchPrompt() {
    const loc = prompt('Enter Branch Location (e.g., Bangalore):');
    if (!loc || !loc.trim()) return;
    const phone = prompt('Enter Branch Phone:');

    try {
      const res = await API.post('/api/branches', { Location: loc.trim(), Phone: phone ? phone.trim() : null });
      showToast(`Branch '${res.branch.Location}' created!`, 'success');
      await this.loadBranches();
    } catch (err) {
      showToast('Error creating branch: ' + err.message, 'error');
    }
  },

  async deleteBranch(id) {
    if (!confirm(`Delete Branch #${id}?`)) return;
    try {
      await API.delete(`/api/branches/${id}`);
      showToast('Branch deleted.', 'success');
      await this.loadBranches();
    } catch (err) {
      showToast('Delete error: ' + err.message, 'error');
    }
  },

  // ==========================================
  // EMPLOYEES
  // ==========================================
  async loadEmployees() {
    try {
      this.employees = await API.get('/api/employees');
      const tbody = document.getElementById('employees-tbody');
      tbody.innerHTML = this.employees.map(e => `
        <tr>
          <td><strong>#${e.Emp_ID}</strong></td>
          <td>${e.Name}</td>
          <td>${e.Role}</td>
          <td>₹${Number(e.Salary || 0).toFixed(2)}</td>
          <td>${e.Shift || '-'}</td>
          <td>${e.Branch_Location || 'Branch #' + e.Branch_ID}</td>
          <td>
            <button class="btn btn-danger btn-sm" onclick="window.CRUD.deleteEmployee(${e.Emp_ID})">🗑️ Delete</button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('Error loading employees:', err);
    }
  },

  async addEmployeePrompt() {
    const name = prompt('Enter Employee Name:');
    if (!name || !name.trim()) return;
    const role = prompt('Enter Role (e.g., Cashier, Manager, Stock Manager):', 'Cashier');
    const salary = prompt('Enter Monthly Salary:', '25000');
    const branchId = prompt('Enter Branch ID (1 to 5):', '1');

    try {
      const res = await API.post('/api/employees', {
        Name: name.trim(),
        Role: role ? role.trim() : 'Cashier',
        Salary: parseFloat(salary) || 25000,
        Branch_ID: parseInt(branchId, 10) || 1,
        Shift: 'Morning'
      });
      showToast(`Employee '${res.employee.Name}' created!`, 'success');
      await this.loadEmployees();
    } catch (err) {
      showToast('Error creating employee: ' + err.message, 'error');
    }
  },

  async deleteEmployee(id) {
    if (!confirm(`Delete Employee #${id}?`)) return;
    try {
      await API.delete(`/api/employees/${id}`);
      showToast('Employee deleted.', 'success');
      await this.loadEmployees();
    } catch (err) {
      showToast('Delete error: ' + err.message, 'error');
    }
  },

  // ==========================================
  // CUSTOMERS
  // ==========================================
  async loadCustomers(search = '') {
    try {
      const url = search ? `/api/customers?name=${encodeURIComponent(search)}` : '/api/customers';
      this.customers = await API.get(url);
      const tbody = document.getElementById('customers-tbody');
      tbody.innerHTML = this.customers.map(c => `
        <tr>
          <td><strong>#${c.Cust_ID}</strong></td>
          <td>${c.Name}</td>
          <td><strong>${c.Phn_No || '-'}</strong></td>
          <td>${c.Email || '-'}</td>
          <td>
            <div style="display: flex; gap: 4px;">
              <button class="btn btn-secondary btn-sm" title="Update Phone (DA-2 Query 11)" onclick="window.CRUD.updateCustomerPhone(${c.Cust_ID}, '${c.Name}', '${c.Phn_No || ''}')">📞 Phone</button>
              <button class="btn btn-danger btn-sm" onclick="window.CRUD.deleteCustomer(${c.Cust_ID})">🗑️</button>
            </div>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('Error loading customers:', err);
    }
  },

  openCustomerModal() {
    document.getElementById('form-customer').reset();
    openModal('modal-customer');
  },

  async submitCustomer(e) {
    e.preventDefault();
    const payload = {
      Name: document.getElementById('cust-form-name').value.trim(),
      Phn_No: document.getElementById('cust-form-phone').value.trim(),
      Email: document.getElementById('cust-form-email').value.trim()
    };

    try {
      const res = await API.post('/api/customers', payload);
      showToast(`Customer '${res.customer.Name}' added!`, 'success');
      closeModal('modal-customer');
      await this.loadCustomers();
      if (window.POS) window.POS.loadCustomers();
    } catch (err) {
      showToast('Error adding customer: ' + err.message, 'error');
    }
  },

  async updateCustomerPhone(id, name, currentPhone) {
    const input = prompt(`Update Phone Number for Customer #${id} (${name}) [DA-2 Query 11]:`, currentPhone || '9888888888');
    if (input === null) return;
    try {
      const res = await API.put(`/api/customers/${id}`, { Phn_No: input.trim() });
      showToast(`Customer #${id} phone updated to '${res.customer.Phn_No}'`, 'success');
      await this.loadCustomers();
      if (window.POS) window.POS.loadCustomers();
    } catch (err) {
      showToast('Error updating customer: ' + err.message, 'error');
    }
  },

  async deleteCustomer(id) {
    if (!confirm(`Delete Customer #${id}?`)) return;
    try {
      await API.delete(`/api/customers/${id}`);
      showToast('Customer deleted successfully.', 'success');
      await this.loadCustomers();
      if (window.POS) window.POS.loadCustomers();
    } catch (err) {
      showToast('Delete error: ' + err.message, 'error');
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.CRUD.init();
});
