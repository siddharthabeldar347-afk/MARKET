// POS Billing Counter Controller
window.POS = {
  cart: [],
  batches: [],

  async init() {
    // Set default date to today
    const dateInput = document.getElementById('pos-bill-date');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

    // Event listeners
    document.getElementById('pos-batch-select').addEventListener('change', (e) => this.onBatchSelect(e));
    document.getElementById('btn-add-to-cart').addEventListener('click', () => this.addToCart());
    document.getElementById('btn-clear-cart').addEventListener('click', () => this.clearCart());
    document.getElementById('pos-discount').addEventListener('input', () => this.updateTotals());
    document.getElementById('btn-complete-checkout').addEventListener('click', () => this.checkout());

    await this.refresh();
  },

  async refresh() {
    await Promise.all([
      this.loadCustomers(),
      this.loadEmployees(),
      this.loadBatches(),
      this.loadRecentBills()
    ]);
  },

  async loadCustomers() {
    try {
      const customers = await API.get('/api/customers');
      const select = document.getElementById('pos-customer-select');
      select.innerHTML = '<option value="">-- Select Customer --</option>' +
        customers.map(c => `<option value="${c.Cust_ID}">${c.Cust_ID} - ${c.Name} (${c.Phn_No || 'No phone'})</option>`).join('');
    } catch (err) {
      console.error('Error loading customers:', err);
    }
  },

  async loadEmployees() {
    try {
      const employees = await API.get('/api/employees');
      const select = document.getElementById('pos-employee-select');
      select.innerHTML = '<option value="">-- Select Cashier --</option>' +
        employees.map(e => `<option value="${e.Emp_ID}">${e.Emp_ID} - ${e.Name} (${e.Role})</option>`).join('');
    } catch (err) {
      console.error('Error loading employees:', err);
    }
  },

  async loadBatches() {
    try {
      this.batches = await API.get('/api/inventory');
      const select = document.getElementById('pos-batch-select');
      select.innerHTML = '<option value="">-- Select Inventory Batch --</option>' +
        this.batches
          .filter(b => b.Stock_qty > 0)
          .map(b => `<option value="${b.Batch_Number}">Batch #${b.Batch_Number} - ${b.Product_Name} (Stock: ${b.Stock_qty}, ₹${b.Selling_Price})</option>`)
          .join('');
    } catch (err) {
      console.error('Error loading batches:', err);
    }
  },

  onBatchSelect(e) {
    const batchNo = parseInt(e.target.value, 10);
    const batch = this.batches.find(b => b.Batch_Number === batchNo);
    const stockInput = document.getElementById('pos-avail-stock');
    if (batch) {
      stockInput.value = batch.Stock_qty;
      const qtyInput = document.getElementById('pos-item-qty');
      qtyInput.max = batch.Stock_qty;
    } else {
      stockInput.value = '';
    }
  },

  addToCart() {
    const batchSelect = document.getElementById('pos-batch-select');
    const batchNo = parseInt(batchSelect.value, 10);
    const qty = parseInt(document.getElementById('pos-item-qty').value, 10);

    if (!batchNo) {
      showToast('Please select a batch from inventory', 'error');
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      showToast('Please enter a valid quantity greater than 0', 'error');
      return;
    }

    const batch = this.batches.find(b => b.Batch_Number === batchNo);
    if (!batch) return;

    if (qty > batch.Stock_qty) {
      showToast(`Quantity exceeds available stock (${batch.Stock_qty})`, 'error');
      return;
    }

    // Check if item already in cart
    const existingIndex = this.cart.findIndex(i => i.Batch_Number === batchNo);
    if (existingIndex > -1) {
      const newTotalQty = this.cart[existingIndex].Quantity_sold + qty;
      if (newTotalQty > batch.Stock_qty) {
        showToast(`Total quantity in cart (${newTotalQty}) exceeds available stock (${batch.Stock_qty})`, 'error');
        return;
      }
      this.cart[existingIndex].Quantity_sold = newTotalQty;
      this.cart[existingIndex].Subtotal = Number((newTotalQty * batch.Selling_Price).toFixed(2));
    } else {
      this.cart.push({
        Batch_Number: batch.Batch_Number,
        Product_ID: batch.Product_ID,
        Product_Name: batch.Product_Name,
        UnitPrice: batch.Selling_Price,
        Quantity_sold: qty,
        Subtotal: Number((qty * batch.Selling_Price).toFixed(2)),
        MaxStock: batch.Stock_qty
      });
    }

    this.renderCart();
    this.updateTotals();
    showToast(`Added ${batch.Product_Name} to bill cart`, 'info');
  },

  removeFromCart(index) {
    this.cart.splice(index, 1);
    this.renderCart();
    this.updateTotals();
  },

  clearCart() {
    this.cart = [];
    this.renderCart();
    this.updateTotals();
  },

  renderCart() {
    const tbody = document.getElementById('pos-cart-tbody');
    if (this.cart.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Cart is empty. Select a batch above to add items.</td></tr>';
      return;
    }

    tbody.innerHTML = this.cart.map((item, idx) => `
      <tr>
        <td><strong>#${item.Batch_Number}</strong></td>
        <td>${item.Product_Name}</td>
        <td>₹${item.UnitPrice.toFixed(2)}</td>
        <td>${item.Quantity_sold}</td>
        <td>₹${item.Subtotal.toFixed(2)}</td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="window.POS.removeFromCart(${idx})">✖</button>
        </td>
      </tr>
    `).join('');
  },

  updateTotals() {
    const gross = this.cart.reduce((sum, i) => sum + i.Subtotal, 0);
    const discountInput = document.getElementById('pos-discount');
    const discount = Math.max(0, parseFloat(discountInput.value) || 0);
    const net = Math.max(0, gross - discount);

    document.getElementById('pos-gross-amt').textContent = `₹${gross.toFixed(2)}`;
    document.getElementById('pos-net-amt').textContent = `₹${net.toFixed(2)}`;
  },

  async checkout() {
    const custSelect = document.getElementById('pos-customer-select');
    const empSelect = document.getElementById('pos-employee-select');
    const dateInput = document.getElementById('pos-bill-date');
    const discountInput = document.getElementById('pos-discount');

    const Cust_ID = parseInt(custSelect.value, 10);
    const Emp_ID = parseInt(empSelect.value, 10);
    const Time = dateInput.value;
    const Discount = parseFloat(discountInput.value) || 0;

    if (!Cust_ID) {
      showToast('Please select a customer for this bill.', 'error');
      return;
    }
    if (!Emp_ID) {
      showToast('Please select a cashier employee.', 'error');
      return;
    }
    if (this.cart.length === 0) {
      showToast('Cart is empty. Please add items before checkout.', 'error');
      return;
    }

    const payload = {
      Cust_ID,
      Emp_ID,
      Time,
      Discount,
      items: this.cart.map(i => ({
        Batch_Number: i.Batch_Number,
        Quantity_sold: i.Quantity_sold
      }))
    };

    try {
      const checkoutBtn = document.getElementById('btn-complete-checkout');
      checkoutBtn.disabled = true;
      checkoutBtn.textContent = 'Processing Checkout...';

      const res = await API.post('/api/bills', payload);
      showToast(`Bill #${res.bill.Bill_No} completed! Stock decremented.`, 'success');

      // Show receipt modal
      this.showInvoiceModal(res.bill);

      // Reset cart
      this.clearCart();
      discountInput.value = 0;

      // Refresh batches & bills
      await this.refresh();
      if (window.Inventory) window.Inventory.load();
    } catch (err) {
      showToast(`Checkout Error: ${err.message}`, 'error');
    } finally {
      const checkoutBtn = document.getElementById('btn-complete-checkout');
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = '✅ Complete Bill & Update Stock';
    }
  },

  showInvoiceModal(bill) {
    const container = document.getElementById('invoice-receipt-body');
    const itemsHtml = (bill.detailedItems || bill.items).map(i => `
      <div style="display: flex; justify-content: space-between; font-size: 0.85rem; padding: 2px 0;">
        <span>Batch #${i.Batch_Number} (x${i.Quantity_sold})</span>
        <span>₹${i.Subtotal.toFixed(2)}</span>
      </div>
    `).join('');

    container.innerHTML = `
      <div style="text-align: center; border-bottom: 1px dashed #666; padding-bottom: 0.5rem; margin-bottom: 0.5rem;">
        <h3 style="margin: 0; font-size: 1.1rem;">SUPERMARKET RETAIL</h3>
        <p style="margin: 0; font-size: 0.8rem;">INVOICE BILL TRANSACTION</p>
        <p style="margin: 0; font-size: 0.75rem;">DBMS Lab DA-3 | Siddhartha Beldar (25BCE5089)</p>
      </div>
      <div style="font-size: 0.85rem; margin-bottom: 0.5rem;">
        <div><strong>Bill No:</strong> #${bill.Bill_No}</div>
        <div><strong>Date:</strong> ${bill.Time}</div>
        <div><strong>Customer:</strong> ${bill.Customer_Name || bill.Cust_ID}</div>
        <div><strong>Cashier:</strong> ${bill.Employee_Name || bill.Emp_ID}</div>
      </div>
      <div style="border-top: 1px dashed #666; border-bottom: 1px dashed #666; padding: 0.5rem 0; margin-bottom: 0.5rem;">
        ${itemsHtml}
      </div>
      <div style="font-size: 0.9rem; text-align: right;">
        <div>Gross Amount: ₹${bill.Gross_Amt.toFixed(2)}</div>
        <div>Discount: -₹${bill.Discount.toFixed(2)}</div>
        <div style="font-size: 1.1rem; font-weight: bold; margin-top: 4px;">NET TOTAL: ₹${bill.Net_Amt.toFixed(2)}</div>
      </div>
      <div style="text-align: center; margin-top: 1rem; font-size: 0.75rem; border-top: 1px dashed #666; padding-top: 0.5rem;">
        *** THANK YOU FOR SHOPPING WITH US ***<br>
        Stock updated atomically in MongoDB!
      </div>
    `;

    openModal('modal-invoice');
  },

  async loadRecentBills() {
    try {
      const bills = await API.get('/api/bills');
      const container = document.getElementById('pos-recent-bills');
      if (bills.length === 0) {
        container.innerHTML = '<div style="color: var(--text-muted);">No bills recorded yet.</div>';
        return;
      }
      container.innerHTML = bills.slice(0, 5).map(b => `
        <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid var(--border);">
          <span><strong>#${b.Bill_No}</strong> - ${b.Customer_Name || 'Cust ' + b.Cust_ID} (${b.Time})</span>
          <span style="font-weight: 700; color: var(--primary);">₹${b.Net_Amt.toFixed(2)}</span>
        </div>
      `).join('');
    } catch (err) {
      console.error('Error loading recent bills:', err);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.POS.init();
});
