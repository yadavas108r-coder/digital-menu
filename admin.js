// =============================================
// ✅ ADMIN.JS - Complete updated client-side admin script
// - Image uploads -> base64 DataURL
// - Category dropdown + quick "Add category"
// - Uses existing Apps Script JSONP endpoints
// =============================================

// ========= CONFIG - update SCRIPT_URL to your Apps Script web app URL =========
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwbqVEaOG_IbolOCuIhwFSBWuwFNWhg8MFJlOARKQZTNh7lX9YzyfUk0MbgazmZx56Z/exec';

// ========= GLOBAL STATE =========
let allProducts = [];
let allOrders = [];
let storedCategories = []; // additional categories saved locally (quick add)

// ========= JSONP helper =========
function jsonpRequest(url, timeout = 12000) {
  return new Promise((resolve, reject) => {
    const cb = 'cb_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const script = document.createElement('script');

    window[cb] = function(data) {
      cleanup();
      resolve(data);
    };

    script.onerror = function() {
      cleanup();
      reject(new Error('Network/script load error'));
    };

    // append callback param if not present
    const sep = url.includes('?') ? '&' : '?';
    script.src = `${url}${sep}callback=${cb}&t=${Date.now()}`;
    document.head.appendChild(script);

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Request timeout'));
    }, timeout);

    function cleanup() {
      clearTimeout(timer);
      try { delete window[cb]; } catch (e) {}
      if (script.parentNode) script.parentNode.removeChild(script);
    }
  });
}

// ========= UI helpers =========
function showLoading(id, text = 'Loading...') {
  const el = document.getElementById(id + 'Loading');
  if (!el) return;
  el.style.display = 'block';
  el.innerHTML = `<div class="loading">${text}</div>`;
}

function hideLoading(id) {
  const el = document.getElementById(id + 'Loading');
  if (!el) return;
  el.style.display = 'none';
}

function showAlert(message, type = 'info') {
  // remove existing
  document.querySelectorAll('.alert').forEach(a => a.remove());
  const div = document.createElement('div');
  div.className = 'alert alert-' + type;
  const bg = type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1';
  const color = type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460';
  const border = type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#bee5eb';
  div.innerHTML = `<div style="padding:12px;border-radius:8px;margin:10px 0;
        background:${bg};color:${color};border:1px solid ${border};font-weight:600;">
        ${type==='success'?'✅':type==='error'?'❌':'ℹ️'} ${message}
    </div>`;
  document.body.insertBefore(div, document.body.firstChild);
  setTimeout(() => div.remove(), 5000);
}

function resetImagePreview() {
  const preview = document.getElementById('imagePreview');
  if (preview) preview.innerHTML = '<span>Image Preview</span>';
}
function resetEditImagePreview() {
  const preview = document.getElementById('editImagePreview');
  if (preview) preview.innerHTML = '<span>Image Preview</span>';
}

// ========= Utilities =========
function buildCategoryListFromProducts(products) {
  const cats = new Set();
  products.forEach(p => {
    if (p.category) cats.add(p.category);
  });
  // include local stored categories
  (JSON.parse(localStorage.getItem('admin_extra_categories') || '[]')).forEach(c => cats.add(c));
  storedCategories = Array.from(new Set(JSON.parse(localStorage.getItem('admin_extra_categories') || '[]')));
  return Array.from(cats);
}

function populateCategoryDropdown() {
  const sel = document.getElementById('itemCategory');
  if (!sel) return;
  const cats = buildCategoryListFromProducts(allProducts);
  sel.innerHTML = '';
  const defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = 'Select / Type category';
  sel.appendChild(defaultOpt);
  cats.forEach(c => {
    const o = document.createElement('option');
    o.value = c;
    o.textContent = c;
    sel.appendChild(o);
  });
}

function populateEditCategoryDropdown() {
  const sel = document.getElementById('editItemCategory');
  if (!sel) return;
  const cats = buildCategoryListFromProducts(allProducts);
  sel.innerHTML = '';
  cats.forEach(c => {
    const o = document.createElement('option');
    o.value = c;
    o.textContent = c;
    sel.appendChild(o);
  });
}

// ========= Renderers =========
function renderProductsTable(products) {
  const tbody = document.getElementById('menuTableBody');
  const table = document.getElementById('menuTable');
  const loading = document.getElementById('menuLoading');
  if (!tbody || !table || !loading) return;

  if (!products || products.length === 0) {
    table.style.display = 'none';
    loading.style.display = 'block';
    loading.innerHTML = '<div class="loading">No products found</div>';
    return;
  }

  const html = products.map(prod => {
    // safe values
    const img = prod.image || (`https://via.placeholder.com/300x200/ff6b6b/white?text=${encodeURIComponent(prod.name || 'Product')}`);
    return `
      <tr>
        <td style="max-width:360px;">
          <div style="display:flex;gap:10px;align-items:center;">
            <img src="${img}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;" alt="">
            <div>
              <strong>${escapeHtml(prod.name)}</strong>
              ${prod.description ? `<div style="font-size:12px;color:#666">${escapeHtml(prod.description)}</div>` : ''}
            </div>
          </div>
        </td>
        <td><strong>₹${Number(prod.price).toFixed(2)}</strong></td>
        <td><img src="${img}" style="width:50px;height:50px;object-fit:cover;border-radius:6px"></td>
        <td>${escapeHtml(prod.category || 'General')}</td>
        <td>${prod.type === 'veg' ? '🟢 Veg' : '🔴 Non-Veg'}</td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="complete-btn" onclick="editProduct('${escapeJs(prod.name)}')">✏️ Edit</button>
            <button class="delete-btn" onclick="deleteProduct('${encodeURIComponent(prod.name)}')">🗑️ Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  tbody.innerHTML = html;
  loading.style.display = 'none';
  table.style.display = 'table';
}

function renderOrdersTable(orders) {
  const tbody = document.getElementById('ordersTableBody');
  const table = document.getElementById('ordersTable');
  const loading = document.getElementById('ordersLoading');
  if (!tbody || !table || !loading) return;

  if (!orders || orders.length === 0) {
    table.style.display = 'none';
    loading.style.display = 'block';
    loading.innerHTML = '<div class="loading">No orders found</div>';
    return;
  }

  const html = orders.map(order => {
    const rawTimestamp = order.Timestamp || order.timestamp || order.Date || order.Time || '';
    const orderDate = rawTimestamp ? new Date(rawTimestamp).toLocaleString('en-IN') : (order.Timestamp || 'N/A');
    const items = parseOrderItems(order.Items || order.items || order.ItemsJSON || order.itemsJSON);
    const total = order.Total || order.total || order.totalAmount || calculateOrderTotal(items);
    const status = (order.Status || order.status || 'pending').toString().toLowerCase();
    const orderId = rawTimestamp || (order.Timestamp || order.timestamp || order.Date);

    const itemsHtml = items.map(it => `<div style="font-size:12px;color:#666">${it.quantity}x ${escapeHtml(it.name)} - ₹${(Number(it.price)*Number(it.quantity)).toFixed(2)}</div>`).join('');

    return `
      <tr>
        <td>${orderDate}</td>
        <td><strong>${escapeHtml(order.Name || order.name || 'N/A')}</strong></td>
        <td>${escapeHtml(order.Phone || order.phone || 'N/A')}</td>
        <td>${escapeHtml(order.Table || order.table || 'N/A')}</td>
        <td style="max-width:260px">${itemsHtml}</td>
        <td><strong>₹${Number(total).toFixed(2)}</strong></td>
        <td><span class="status-badge ${status === 'completed' ? 'status-completed' : 'status-pending'}">${escapeHtml(status)}</span></td>
        <td>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="invoice-btn" onclick="generateBill('${encodeURIComponent(orderId)}')">🧾 Bill</button>
            ${status !== 'completed' ? `<button class="complete-btn" onclick="updateOrderStatus('${encodeURIComponent(orderId)}','completed')">✅ Complete</button>` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  tbody.innerHTML = html;
  loading.style.display = 'none';
  table.style.display = 'table';
}

// ========= Small helpers =========
function escapeHtml(s='') {
  return String(s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function escapeJs(s='') {
  return String(s).replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function parseOrderItems(itemsJson) {
  try {
    if (!itemsJson) return [];
    if (typeof itemsJson === 'string') {
      try { const parsed = JSON.parse(itemsJson); return Array.isArray(parsed) ? parsed : []; } catch(e){ /* fallback */ }
      // fallback: try to interpret as single numeric total
      const n = parseFloat(itemsJson);
      if (!isNaN(n)) return [{ name:'Order Total', price: n, quantity:1 }];
      return [];
    }
    return Array.isArray(itemsJson) ? itemsJson : [];
  } catch (e) { return []; }
}
function calculateOrderTotal(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((s, it) => s + (Number(it.price)||0) * (Number(it.quantity)||1), 0);
}

// ========= Load / init =========
async function loadDashboardData() {
  try {
    showLoading('dashboard','Loading dashboard...');
    showLoading('orders','Loading orders...');
    showLoading('menu','Loading menu...');
    // get stats, orders, products in parallel
    const [statsRes, ordersRes, productsRes] = await Promise.all([
      jsonpRequest(`${SCRIPT_URL}?action=getDashboardStats`).catch(e=>({status:'error', error:e.message})),
      jsonpRequest(`${SCRIPT_URL}?action=getOrders`).catch(e=>({status:'error', error:e.message})),
      jsonpRequest(`${SCRIPT_URL}?action=getAllProducts`).catch(e=>({status:'error', error:e.message}))
    ]);

    if (statsRes && statsRes.status === 'success') {
      document.getElementById('totalOrders').textContent = statsRes.totalOrders || 0;
      document.getElementById('totalSales').textContent = '₹' + (statsRes.totalSales || 0);
      document.getElementById('todayOrders').textContent = statsRes.todayOrders || 0;
      document.getElementById('pendingOrders').textContent = statsRes.pendingOrders || 0;
    }

    if (ordersRes && ordersRes.status === 'success') {
      allOrders = ordersRes.orders || [];
      renderOrdersTable(allOrders);
    } else {
      renderOrdersTable([]);
    }

    if (productsRes && productsRes.status === 'success') {
      allProducts = productsRes.products || [];
      renderProductsTable(allProducts);
      populateCategoryDropdown();
      populateEditCategoryDropdown();
    } else {
      renderProductsTable([]);
      populateCategoryDropdown();
      populateEditCategoryDropdown();
    }

    hideLoading('dashboard');
    hideLoading('orders');
    hideLoading('menu');
    showAlert('Dashboard updated', 'success');
  } catch (err) {
    console.error(err);
    hideLoading('dashboard'); hideLoading('orders'); hideLoading('menu');
    showAlert('Failed to load dashboard: ' + (err.message || err), 'error');
  }
}

// ========= Product CRUD =========

// helper: convert File to DataURL (returns promise)
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = e => reject(new Error('File read error'));
    reader.readAsDataURL(file);
  });
}

// Add product (from Add form)
async function addMenuItem(e) {
  if (e && e.preventDefault) e.preventDefault();

  const name = (document.getElementById('itemName')?.value || '').trim();
  const price = (document.getElementById('itemPrice')?.value || '').trim();
  let category = (document.getElementById('itemCategory')?.value || '').trim();
  const type = (document.getElementById('itemType')?.value || 'veg').trim();
  const description = (document.getElementById('itemDescription')?.value || '').trim();

  // allow typing a custom category in the select: if empty -> ask
  if (!category) {
    showAlert('Please select or type a category', 'error');
    return;
  }

  if (!name || !price) {
    showAlert('Please enter name and price', 'error');
    return;
  }

  // read file input (optional)
  const fileInput = document.getElementById('itemImage');
  let imageData = null;
  if (fileInput && fileInput.files && fileInput.files[0]) {
    try {
      imageData = await fileToDataURL(fileInput.files[0]); // base64 data URL
    } catch (err) {
      console.warn('Image to data url failed', err);
    }
  }

  // if admin used "Add category" quick input, store locally
  const extraCats = JSON.parse(localStorage.getItem('admin_extra_categories') || '[]');
  if (!extraCats.includes(category) && !Array.from(new Set(allProducts.map(p=>p.category))).includes(category)) {
    extraCats.push(category);
    localStorage.setItem('admin_extra_categories', JSON.stringify(extraCats));
  }

  const btn = document.querySelector('.menu-form button');
  if (btn) { btn.disabled = true; btn.textContent = 'Adding...'; }

  try {
    const url = `${SCRIPT_URL}?action=addProduct&name=${encodeURIComponent(name)}
      &price=${encodeURIComponent(price)}&category=${encodeURIComponent(category)}
      &type=${encodeURIComponent(type)}&description=${encodeURIComponent(description)}
      &image=${encodeURIComponent(imageData || ('https://via.placeholder.com/300x200/ff6b6b/white?text='+encodeURIComponent(name)))}`.replace(/\s+/g,'');

    const res = await jsonpRequest(url);
    if (res && res.status === 'success') {
      showAlert('Product added', 'success');
      document.querySelector('.menu-form')?.reset();
      resetImagePreview();
      await loadDashboardData();
    } else {
      showAlert('Failed to add product: ' + (res.error || 'Unknown'), 'error');
    }
  } catch (err) {
    showAlert('Add product failed: ' + err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '➕ Add Item'; }
  }
}

// Edit product: open modal with data
function editProduct(productName) {
  const name = decodeURIComponent(productName);
  const product = allProducts.find(p => p.name === name);
  if (!product) { showAlert('Product not found', 'error'); return; }

  document.getElementById('editItemOldName').value = product.name;
  document.getElementById('editItemName').value = product.name;
  document.getElementById('editItemPrice').value = product.price;
  document.getElementById('editItemCategory').value = product.category;
  document.getElementById('editItemType').value = product.type;
  document.getElementById('editItemDescription').value = product.description || '';
  const preview = document.getElementById('editImagePreview');
  if (preview) preview.innerHTML = `<img src="${product.image}" alt="Preview">`;

  showModal('editProductModal');
}

// Update product (modal save)
async function updateProduct(e) {
  if (e && e.preventDefault) e.preventDefault();

  const oldName = (document.getElementById('editItemOldName')?.value || '').trim();
  const name = (document.getElementById('editItemName')?.value || '').trim();
  const price = (document.getElementById('editItemPrice')?.value || '').trim();
  const category = (document.getElementById('editItemCategory')?.value || '').trim();
  const type = (document.getElementById('editItemType')?.value || '').trim();
  const description = (document.getElementById('editItemDescription')?.value || '').trim();

  if (!oldName || !name || !price || !category) {
    showAlert('Please fill required fields', 'error');
    return;
  }

  // check if new image chosen
  let imageData = null;
  const fileInput = document.getElementById('editItemImage');
  if (fileInput && fileInput.files && fileInput.files[0]) {
    try { imageData = await fileToDataURL(fileInput.files[0]); } catch(e){ console.warn(e); }
  } else {
    // use current preview if exists
    const previewSrc = document.getElementById('editImagePreview')?.querySelector('img')?.src;
    if (previewSrc) imageData = previewSrc;
  }

  try {
    const url = `${SCRIPT_URL}?action=updateProduct&oldName=${encodeURIComponent(oldName)}&name=${encodeURIComponent(name)}
      &price=${encodeURIComponent(price)}&category=${encodeURIComponent(category)}&type=${encodeURIComponent(type)}
      &description=${encodeURIComponent(description)}&image=${encodeURIComponent(imageData || '')}`.replace(/\s+/g,'');

    const res = await jsonpRequest(url);
    if (res && res.status === 'success') {
      showAlert('Product updated', 'success');
      closeModal('editProductModal');
      await loadDashboardData();
    } else {
      showAlert('Failed to update product: ' + (res.error || 'Unknown'), 'error');
    }
  } catch (err) {
    showAlert('Update failed: ' + err.message, 'error');
  }
}

// Delete product
async function deleteProduct(productNameEncoded) {
  const productName = decodeURIComponent(productNameEncoded);
  if (!confirm(`Delete "${productName}"?`)) return;
  try {
    const url = `${SCRIPT_URL}?action=deleteProduct&name=${encodeURIComponent(productName)}`;
    const res = await jsonpRequest(url);
    if (res && res.status === 'success') {
      showAlert('Product deleted', 'success');
      closeModal('editProductModal');
      await loadDashboardData();
    } else {
      showAlert('Delete failed: ' + (res.error || 'Unknown'), 'error');
    }
  } catch (err) {
    showAlert('Delete failed: ' + err.message, 'error');
  }
}

// ========= Orders =========
async function updateOrderStatus(orderIdEncoded, status) {
  const orderId = decodeURIComponent(orderIdEncoded || '');
  if (!orderId) { showAlert('Order id missing', 'error'); return; }
  try {
    const url = `${SCRIPT_URL}?action=updateOrderStatus&orderId=${encodeURIComponent(orderId)}&status=${encodeURIComponent(status)}`;
    const res = await jsonpRequest(url);
    if (res && res.status === 'success') {
      showAlert(`Order marked ${status}`, 'success');
      await loadDashboardData();
    } else {
      showAlert('Failed to update order: ' + (res.error||'Unknown'), 'error');
    }
  } catch (err) {
    showAlert('Update order failed: ' + err.message, 'error');
  }
}

async function generateBill(orderIdEncoded) {
  const orderId = decodeURIComponent(orderIdEncoded || '');
  if (!orderId) { showAlert('Order id missing', 'error'); return; }
  try {
    const url = `${SCRIPT_URL}?action=generateBill&orderId=${encodeURIComponent(orderId)}`;
    const res = await jsonpRequest(url);
    if (res && res.status === 'success') {
      renderBill(res.bill);
      showModal('billModal');
    } else {
      showAlert('Failed to generate bill: ' + (res.error || 'Unknown'), 'error');
    }
  } catch (err) {
    showAlert('Generate bill failed: ' + err.message, 'error');
  }
}

function renderBill(bill) {
  const content = document.getElementById('billContent');
  if (!content) return;
  const items = bill.items || [];
  const total = bill.totalAmount || calculateOrderTotal(items);
  const html = `
    <div class="bill-header"><h2>🍦 Yadava's</h2><p>Digital Bill</p></div>
    <div class="bill-info">
      <div class="bill-info-item"><strong>Order ID:</strong> <span>${escapeHtml(bill.orderId || '')}</span></div>
      <div class="bill-info-item"><strong>Date:</strong> <span>${new Date(bill.timestamp||'').toLocaleString('en-IN') || ''}</span></div>
      <div class="bill-info-item"><strong>Customer:</strong> <span>${escapeHtml(bill.customerName || '')}</span></div>
      <div class="bill-info-item"><strong>Phone:</strong> <span>${escapeHtml(bill.customerPhone || '')}</span></div>
      <div class="bill-info-item"><strong>Table:</strong> <span>${escapeHtml(bill.tableNumber || '')}</span></div>
    </div>
    <div class="bill-items"><h4>Items</h4>
      ${items.map(it=>`<div class="bill-item"><span class="item-name">${escapeHtml(it.name)}</span><span class="item-quantity">${it.quantity} x ₹${Number(it.price).toFixed(2)}</span><span class="item-price">₹${(Number(it.price)*Number(it.quantity)).toFixed(2)}</span></div>`).join('')}
    </div>
    <div class="bill-total"><h3>Total</h3><div class="amount">₹${Number(total).toFixed(2)}</div></div>
    <div class="bill-actions"><button class="print-btn" onclick="printBill()">🖨️ Print Bill</button></div>
  `;
  content.innerHTML = html;
}

function printBill() { window.print(); }
function closeBillModal() { closeModal('billModal'); }

// ========= Image preview handlers =========
function previewImage(input) {
  const preview = document.getElementById('imagePreview');
  if (!preview) return;
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = e => { preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`; };
    reader.readAsDataURL(input.files[0]);
  } else resetImagePreview();
}

function previewEditImage(input) {
  const preview = document.getElementById('editImagePreview');
  if (!preview) return;
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = e => { preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`; };
    reader.readAsDataURL(input.files[0]);
  } else resetEditImagePreview();
}

// ========= Category quick add UI =========
function setupCategoryQuickAdd() {
  // create small UI next to category select
  const container = document.querySelector('.menu-form');
  if (!container) return;
  let node = document.getElementById('categoryQuickAdd');
  if (node) return;

  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.gap = '8px';
  wrapper.style.alignItems = 'center';

  wrapper.innerHTML = `
    <input id="newCategoryInput" placeholder="+ Add category" style="padding:8px;border-radius:8px;border:1px solid #e9ecef;font-size:13px;">
    <button id="addCategoryBtn" style="padding:8px 10px;border-radius:8px;background:#ff6b6b;color:white;border:none;cursor:pointer;font-weight:700;">Add</button>
  `;
  wrapper.id = 'categoryQuickAdd';
  container.insertBefore(wrapper, container.querySelector('#imagePreview')?.nextSibling || container.firstChild);

  document.getElementById('addCategoryBtn').addEventListener('click', () => {
    const v = (document.getElementById('newCategoryInput').value || '').trim();
    if (!v) { showAlert('Enter category name', 'error'); return; }
    // save to localStorage (temporary category store until you add categories sheet on server)
    const arr = JSON.parse(localStorage.getItem('admin_extra_categories') || '[]');
    if (!arr.includes(v)) {
      arr.push(v);
      localStorage.setItem('admin_extra_categories', JSON.stringify(arr));
    }
    document.getElementById('newCategoryInput').value = '';
    populateCategoryDropdown();
    populateEditCategoryDropdown();
    showAlert('Category added locally. Use it while adding products, and it will be saved when a product uses it.', 'success');
  });
}

// ========= Initialization =========
function setupEventListeners() {
  document.querySelectorAll('form.menu-form').forEach(f => f.addEventListener('submit', addMenuItem));
  const editForm = document.getElementById('editProductForm');
  if (editForm) editForm.addEventListener('submit', updateProduct);

  // file inputs
  const file1 = document.getElementById('itemImage'); if (file1) file1.addEventListener('change', (e)=>previewImage(e.target));
  const file2 = document.getElementById('editItemImage'); if (file2) file2.addEventListener('change', (e)=>previewEditImage(e));

  // add quick category UI
  setupCategoryQuickAdd();
}

function initializeAdminPanel() {
  showAlert('Initializing admin panel...', 'info');
  setupEventListeners();
  loadDashboardData();
  // set clock if available
  updateCurrentTime();
  setInterval(updateCurrentTime, 60000);
}

// small current time function (header)
function updateCurrentTime() {
  const el = document.getElementById('currentTime');
  if (el) el.textContent = new Date().toLocaleString('en-IN');
}

// ========= Exports for HTML to call =========
window.addMenuItem = addMenuItem;
window.updateProduct = updateProduct;
window.deleteProduct = deleteProduct;
window.updateOrderStatus = updateOrderStatus;
window.generateBill = generateBill;
window.printBill = printBill;
window.closeBillModal = closeBillModal;
window.previewImage = previewImage;
window.previewEditImage = previewEditImage;
window.loadDashboard = loadDashboardData;
window.editProduct = editProduct;
window.closeModal = closeModal;
window.logout = () => { if (confirm('Logout?')) location.reload(); };

// Initialize on DOM ready
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeAdminPanel);
else initializeAdminPanel();
