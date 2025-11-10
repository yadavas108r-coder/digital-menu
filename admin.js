// =============================================
// ✅ admin.js — Updated (safe event wiring + categories + fixes)
// =============================================

// =============================================
// ✅ CONFIG - update SCRIPT_URL if needed
// =============================================
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwQgQK476IxPuPxxbdY9kcec-SEKAu9nVTynuDc0E3BYhkVEy3Qvio2uVw1dhYRSzDm/exec';

// =============================================
// GLOBAL STATE
// =============================================
let allProducts = [];
let allOrders = [];
let savedCategories = JSON.parse(localStorage.getItem('gd_categories') || '[]');

// =============================================
// ✅ SIMPLE JSONP HELPER
// =============================================
function jsonpRequest(url) {
    return new Promise((resolve, reject) => {
        const callbackName = 'jsonp_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
        const script = document.createElement('script');

        window[callbackName] = function(data) {
            try {
                resolve(data);
            } finally {
                // cleanup
                try { delete window[callbackName]; } catch(e) {}
                if (script.parentNode) script.parentNode.removeChild(script);
            }
        };

        script.onerror = function() {
            try { delete window[callbackName]; } catch(e) {}
            if (script.parentNode) script.parentNode.removeChild(script);
            reject(new Error('Failed to load script'));
        };

        // append callback param exactly "callback"
        script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + callbackName;
        document.head.appendChild(script);

        setTimeout(() => {
            if (window[callbackName]) {
                try { delete window[callbackName]; } catch(e) {}
                if (script.parentNode) script.parentNode.removeChild(script);
                reject(new Error('Request timeout'));
            }
        }, 15000); // 15s
    });
}

// =============================================
// UTILITIES
// =============================================
function showLoading(section) {
    const el = document.getElementById(section + 'Loading');
    if (!el) return;
    el.style.display = 'block';
    el.innerHTML = '<div class="loading">Loading ' + section + '...</div>';
}
function hideLoading(section) {
    const el = document.getElementById(section + 'Loading');
    if (!el) return;
    el.style.display = 'none';
}
function showAlert(message, type = 'info') {
    document.querySelectorAll('.alert').forEach(a => a.remove());
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <div style="padding: 12px; border-radius: 8px; margin: 10px 0; 
                    background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'}; 
                    color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'}; 
                    border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#bee5eb'};">
            <strong>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</strong> ${message}
        </div>
    `;
    document.body.insertBefore(alertDiv, document.body.firstChild);
    setTimeout(() => { try { alertDiv.remove(); } catch(e){} }, 5000);
}
function showModal(id) { const m = document.getElementById(id); if (m) m.style.display = 'block'; }
function closeModal(id) { const m = document.getElementById(id); if (m) m.style.display = 'none'; }
function updateCurrentTime() { const e = document.getElementById('currentTime'); if (e) e.textContent = new Date().toLocaleString('en-IN'); }

// =============================================
// DASHBOARD / RENDER HELPERS
// =============================================
function parseOrderItems(itemsJson) {
    try {
        if (!itemsJson) return [];
        if (typeof itemsJson === 'string') {
            try {
                const parsed = JSON.parse(itemsJson);
                return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                const num = parseFloat(itemsJson);
                return !isNaN(num) ? [{ name: 'Order Total', price: num, quantity: 1 }] : [];
            }
        }
        return Array.isArray(itemsJson) ? itemsJson : [];
    } catch (e) { return []; }
}
function calculateOrderTotal(items) {
    return items.reduce((t, it) => t + (parseFloat(it.price) * parseInt(it.quantity || 1)), 0);
}

// Render orders table and attach events safely
function renderOrdersTable(orders) {
    const tbody = document.getElementById('ordersTableBody');
    const table = document.getElementById('ordersTable');
    const loading = document.getElementById('ordersLoading');
    if (!tbody || !table || !loading) return;

    if (!orders || orders.length === 0) {
        table.style.display = 'none';
        loading.innerHTML = '<div class="loading">No orders found</div>';
        loading.style.display = 'block';
        return;
    }

    // Build rows using DOM for safe event binding
    tbody.innerHTML = '';
    orders.forEach(order => {
        const orderDateVal = order.Timestamp || order.Date || order.timestamp || '';
        const orderDate = orderDateVal ? new Date(orderDateVal).toLocaleString('en-IN') : 'N/A';
        const items = parseOrderItems(order.Items || order.items);
        const total = order.Total || order.total || order.totalAmount || calculateOrderTotal(items);
        const status = (order.Status || order.status || 'pending').toString().toLowerCase();
        const orderId = order.Timestamp || order.timestamp || order.Date || '';

        const tr = document.createElement('tr');

        const tdTime = document.createElement('td'); tdTime.textContent = orderDate; tr.appendChild(tdTime);
        const tdName = document.createElement('td'); tdName.innerHTML = `<strong>${order.Name || order.name || 'N/A'}</strong>`; tr.appendChild(tdName);
        const tdPhone = document.createElement('td'); tdPhone.textContent = order.Phone || order.phone || 'N/A'; tr.appendChild(tdPhone);
        const tdTable = document.createElement('td'); tdTable.textContent = order.Table || order.table || 'N/A'; tr.appendChild(tdTable);

        const tdItems = document.createElement('td');
        const itemsDiv = document.createElement('div'); itemsDiv.style.maxWidth = '200px';
        items.forEach(it => {
            const itemLine = document.createElement('div');
            itemLine.style.fontSize = '12px'; itemLine.style.color = '#666';
            const qty = it.quantity || 1;
            const price = parseFloat(it.price) || 0;
            itemLine.textContent = `${qty}x ${it.name} - ₹${(price * qty).toFixed(2)}`;
            itemsDiv.appendChild(itemLine);
        });
        tdItems.appendChild(itemsDiv); tr.appendChild(tdItems);

        const tdTotal = document.createElement('td'); tdTotal.innerHTML = `<strong>₹${parseFloat(total).toFixed(2)}</strong>`; tr.appendChild(tdTotal);

        const tdStatus = document.createElement('td');
        const span = document.createElement('span');
        span.className = `status-badge status-${status}`;
        span.textContent = status;
        tdStatus.appendChild(span); tr.appendChild(tdStatus);

        const tdActions = document.createElement('td');
        const actionsDiv = document.createElement('div');
        actionsDiv.style.display = 'flex';
        actionsDiv.style.gap = '5px';
        actionsDiv.style.flexWrap = 'wrap';

        const invoiceBtn = document.createElement('button');
        invoiceBtn.className = 'invoice-btn';
        invoiceBtn.textContent = '🧾 Bill';
        invoiceBtn.dataset.orderId = orderId;
        invoiceBtn.addEventListener('click', () => generateBill(orderId));
        actionsDiv.appendChild(invoiceBtn);

        if (status !== 'completed') {
            const completeBtn = document.createElement('button');
            completeBtn.className = 'complete-btn';
            completeBtn.textContent = '✅ Complete';
            completeBtn.dataset.orderId = orderId;
            completeBtn.addEventListener('click', () => updateOrderStatus(orderId, 'completed'));
            actionsDiv.appendChild(completeBtn);
        }

        tdActions.appendChild(actionsDiv);
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
    });

    loading.style.display = 'none';
    table.style.display = 'table';
}

// Render products table and wire edit/delete buttons
function renderProductsTable(products) {
    const tbody = document.getElementById('menuTableBody');
    const table = document.getElementById('menuTable');
    const loading = document.getElementById('menuLoading');
    if (!tbody || !table || !loading) return;

    if (!products || products.length === 0) {
        table.style.display = 'none';
        loading.innerHTML = '<div class="loading">No products found</div>';
        loading.style.display = 'block';
        return;
    }

    tbody.innerHTML = '';
    products.forEach(product => {
        const tr = document.createElement('tr');

        const tdItem = document.createElement('td');
        tdItem.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;">
               <img src="${product.image}" style="width:50px;height:50px;object-fit:cover;border-radius:8px;">
               <div>
                 <strong>${product.name}</strong>
                 ${product.description ? `<div style="font-size:12px;color:#666">${product.description}</div>` : ''}
               </div>
            </div>
        `;
        tr.appendChild(tdItem);

        const tdPrice = document.createElement('td'); tdPrice.innerHTML = `<strong>₹${product.price}</strong>`; tr.appendChild(tdPrice);

        const tdImg = document.createElement('td');
        tdImg.innerHTML = `<img src="${product.image}" style="width:50px;height:50px;object-fit:cover;border-radius:8px;">`;
        tr.appendChild(tdImg);

        const tdCategory = document.createElement('td'); tdCategory.textContent = product.category; tr.appendChild(tdCategory);

        const tdType = document.createElement('td');
        tdType.innerHTML = `<span style="color:${product.type === 'veg' ? 'green' : 'red'}">${product.type === 'veg' ? '🟢 Veg' : '🔴 Non-Veg'}</span>`;
        tr.appendChild(tdType);

        const tdActions = document.createElement('td');
        tdActions.style.display = 'flex';
        tdActions.style.gap = '5px';
        tdActions.style.alignItems = 'center';

        const editBtn = document.createElement('button');
        editBtn.className = 'complete-btn';
        editBtn.textContent = '✏️ Edit';
        editBtn.addEventListener('click', () => editProduct(product.name));
        tdActions.appendChild(editBtn);

        const delBtn = document.createElement('button');
        delBtn.className = 'delete-btn';
        delBtn.textContent = '🗑️ Delete';
        delBtn.addEventListener('click', () => deleteProduct(product.name));
        tdActions.appendChild(delBtn);

        tr.appendChild(tdActions);
        tbody.appendChild(tr);
    });

    loading.style.display = 'none';
    table.style.display = 'table';
}

// =============================================
// LOAD DASHBOARD DATA (safe)
async function loadDashboardData() {
    try {
        showLoading('dashboard');
        showLoading('orders');
        showLoading('menu');

        // gather data
        const stats = await jsonpRequest(SCRIPT_URL + '?action=getDashboardStats');
        const ordersData = await jsonpRequest(SCRIPT_URL + '?action=getOrders');
        const productsData = await jsonpRequest(SCRIPT_URL + '?action=getAllProducts');

        if (stats && stats.status === 'success') {
            document.getElementById('totalOrders').textContent = stats.totalOrders || 0;
            document.getElementById('totalSales').textContent = '₹' + (stats.totalSales || 0);
            document.getElementById('todayOrders').textContent = stats.todayOrders || 0;
            document.getElementById('pendingOrders').textContent = stats.pendingOrders || 0;
        }

        if (ordersData && ordersData.status === 'success') {
            allOrders = ordersData.orders || [];
            renderOrdersTable(allOrders);
        }

        if (productsData && productsData.status === 'success') {
            allProducts = productsData.products || [];
            renderProductsTable(allProducts);
            // populate category dropdowns from products + savedCategories
            populateCategoryDropdowns();
        }

        hideLoading('dashboard');
        hideLoading('orders');
        hideLoading('menu');
        showAlert('✅ Dashboard loaded successfully!', 'success');
    } catch (err) {
        console.error('Dashboard load error', err);
        hideLoading('dashboard'); hideLoading('orders'); hideLoading('menu');
        showAlert('❌ Failed to load dashboard: ' + (err.message || err.toString()), 'error');
    }
}

// =============================================
// PRODUCT CRUD (calls Apps Script via JSONP)
async function addMenuItem(e) {
    if (e) e.preventDefault();

    const name = document.getElementById('itemName')?.value?.trim();
    const price = document.getElementById('itemPrice')?.value;
    let category = document.getElementById('itemCategory')?.value;
    const type = document.getElementById('itemType')?.value;
    const description = document.getElementById('itemDescription')?.value || '';

    // If user selected Add New Category option
    if (category === 'add_new') {
        const newCat = prompt('Enter new category name:');
        if (newCat && newCat.trim()) {
            addCategory(newCat.trim());
            category = newCat.trim();
            // select it
            populateCategoryDropdowns(category);
        } else {
            showAlert('Category not added', 'error'); return;
        }
    }

    if (!name || !price || !category || !type) {
        showAlert('Please fill all required fields', 'error'); return;
    }

    // image preview base64 or placeholder
    const image = document.getElementById('imagePreview')?.querySelector('img')?.src ||
                  ('https://via.placeholder.com/300x200/ff6b6b/white?text=' + encodeURIComponent(name));

    const btn = document.querySelector('.menu-form button');
    if (btn) { btn.disabled = true; btn.textContent = 'Adding...'; }

    try {
        const url = SCRIPT_URL + '?action=addProduct&' +
            'name=' + encodeURIComponent(name) +
            '&price=' + encodeURIComponent(price) +
            '&category=' + encodeURIComponent(category) +
            '&type=' + encodeURIComponent(type) +
            '&description=' + encodeURIComponent(description) +
            '&image=' + encodeURIComponent(image);

        const res = await jsonpRequest(url);
        if (res && res.status === 'success') {
            showAlert('✅ Product added successfully!', 'success');
            document.querySelector('.menu-form')?.reset();
            resetImagePreview();
            loadDashboardData();
        } else {
            showAlert('❌ ' + (res?.error || 'Failed to add product'), 'error');
        }
    } catch (err) {
        showAlert('❌ ' + (err.message || err.toString()), 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '➕ Add Item'; }
    }
}

function editProduct(productName) {
    const product = allProducts.find(p => p.name === productName);
    if (!product) { showAlert('Product not found', 'error'); return; }

    document.getElementById('editItemOldName').value = product.name;
    document.getElementById('editItemName').value = product.name;
    document.getElementById('editItemPrice').value = product.price;
    document.getElementById('editItemCategory').value = product.category;
    document.getElementById('editItemType').value = product.type;
    document.getElementById('editItemDescription').value = product.description || '';

    const preview = document.getElementById('editImagePreview');
    if (preview) preview.innerHTML = `<img src="${product.image}" alt="Preview">`;

    // ensure dropdowns include this category
    if (!savedCategories.includes(product.category)) {
        savedCategories.push(product.category);
        localStorage.setItem('gd_categories', JSON.stringify(savedCategories));
    }
    populateCategoryDropdowns();

    showModal('editProductModal');
}

async function updateProduct(e) {
    if (e) e.preventDefault();

    const oldName = document.getElementById('editItemOldName').value;
    const name = document.getElementById('editItemName').value?.trim();
    const price = document.getElementById('editItemPrice').value;
    let category = document.getElementById('editItemCategory').value;
    const type = document.getElementById('editItemType').value;
    const description = document.getElementById('editItemDescription').value || '';

    if (category === 'add_new') {
        const newCat = prompt('Enter new category name:');
        if (newCat && newCat.trim()) {
            addCategory(newCat.trim());
            category = newCat.trim();
            populateCategoryDropdowns(category);
        } else {
            showAlert('Category not added', 'error'); return;
        }
    }

    if (!oldName || !name || !price || !category || !type) {
        showAlert('Please fill all required fields', 'error'); return;
    }

    const image = document.getElementById('editImagePreview')?.querySelector('img')?.src ||
                  ('https://via.placeholder.com/300x200/ff6b6b/white?text=' + encodeURIComponent(name));

    try {
        const url = SCRIPT_URL + '?action=updateProduct&' +
            'oldName=' + encodeURIComponent(oldName) +
            '&name=' + encodeURIComponent(name) +
            '&price=' + encodeURIComponent(price) +
            '&category=' + encodeURIComponent(category) +
            '&type=' + encodeURIComponent(type) +
            '&description=' + encodeURIComponent(description) +
            '&image=' + encodeURIComponent(image);

        const res = await jsonpRequest(url);
        if (res && res.status === 'success') {
            showAlert('✅ Product updated successfully!', 'success');
            closeModal('editProductModal');
            loadDashboardData();
        } else {
            showAlert('❌ ' + (res?.error || 'Failed to update product'), 'error');
        }
    } catch (err) {
        showAlert('❌ ' + (err.message || err.toString()), 'error');
    }
}

async function deleteProduct(productName) {
    if (!confirm(`Delete "${productName}"?`)) return;
    try {
        const res = await jsonpRequest(SCRIPT_URL + '?action=deleteProduct&name=' + encodeURIComponent(productName));
        if (res && res.status === 'success') {
            showAlert('✅ Product deleted successfully!', 'success');
            closeModal('editProductModal');
            loadDashboardData();
        } else {
            showAlert('❌ ' + (res?.error || 'Failed to delete product'), 'error');
        }
    } catch (err) {
        showAlert('❌ ' + (err.message || err.toString()), 'error');
    }
}

// =============================================
// ORDER OPERATIONS
// =============================================
async function updateOrderStatus(orderId, status) {
    try {
        const res = await jsonpRequest(SCRIPT_URL + '?action=updateOrderStatus&orderId=' + encodeURIComponent(orderId) + '&status=' + encodeURIComponent(status));
        if (res && res.status === 'success') {
            showAlert(`✅ Order marked as ${status}!`, 'success');
            loadDashboardData();
        } else {
            showAlert('❌ ' + (res?.error || 'Failed to update order'), 'error');
        }
    } catch (err) {
        showAlert('❌ ' + (err.message || err.toString()), 'error');
    }
}

async function generateBill(orderId) {
    try {
        const res = await jsonpRequest(SCRIPT_URL + '?action=generateBill&orderId=' + encodeURIComponent(orderId));
        if (res && res.status === 'success') {
            renderBill(res.bill);
            showModal('billModal');
        } else {
            showAlert('❌ ' + (res?.error || 'Failed to generate bill'), 'error');
        }
    } catch (err) {
        showAlert('❌ ' + (err.message || err.toString()), 'error');
    }
}

function renderBill(bill) {
    const content = document.getElementById('billContent');
    if (!content) return;
    const items = bill.items || [];
    const total = bill.totalAmount || calculateOrderTotal(items);
    let html = `
        <div class="bill-header">
            <h2>🍦 Yadava's Ice Cream</h2>
            <p>Delicious & Fresh</p>
        </div>
        <div class="bill-info">
            <div class="bill-info-item"><strong>Order ID:</strong> <span>${bill.orderId || 'N/A'}</span></div>
            <div class="bill-info-item"><strong>Date & Time:</strong> <span>${bill.timestamp ? new Date(bill.timestamp).toLocaleString('en-IN') : 'N/A'}</span></div>
            <div class="bill-info-item"><strong>Customer Name:</strong> <span>${bill.customerName || 'N/A'}</span></div>
            <div class="bill-info-item"><strong>Phone:</strong> <span>${bill.customerPhone || 'N/A'}</span></div>
            <div class="bill-info-item"><strong>Table No:</strong> <span>${bill.tableNumber || 'N/A'}</span></div>
        </div>
        <div class="bill-items">
            <h4>Order Items:</h4>
            ${items.map(it => `
                <div class="bill-item">
                    <span class="item-name">${it.name}</span>
                    <span class="item-quantity">${it.quantity} x ₹${it.price}</span>
                    <span class="item-price">₹${(it.price * it.quantity).toFixed(2)}</span>
                </div>
            `).join('')}
        </div>
        <div class="bill-total">
            <h3>TOTAL AMOUNT</h3>
            <div class="amount">₹${parseFloat(total).toFixed(2)}</div>
        </div>
        ${bill.review && bill.review !== 'No note' ? `<div class="bill-info-item" style="margin-top:15px;"><strong>Special Instructions:</strong> <span>${bill.review}</span></div>` : ''}
        <div class="bill-actions">
            <button class="print-btn" onclick="printBill()">🖨️ Print Bill</button>
        </div>
    `;
    content.innerHTML = html;
}
function printBill() { window.print(); }
function closeBillModal() { closeModal('billModal'); }

// =============================================
// IMAGE PREVIEW HANDLERS
// =============================================
function previewImage(input) {
    const preview = document.getElementById('imagePreview');
    if (!preview) return;
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) { preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`; };
        reader.readAsDataURL(input.files[0]);
    } else resetImagePreview();
}
function previewEditImage(input) {
    const preview = document.getElementById('editImagePreview');
    if (!preview) return;
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) { preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`; };
        reader.readAsDataURL(input.files[0]);
    }
}
function resetImagePreview() { const p = document.getElementById('imagePreview'); if (p) p.innerHTML = '<span>Image Preview</span>'; }

// =============================================
// CATEGORIES: sourced from products and localStorage
// =============================================
function extractCategoriesFromProducts() {
    const cats = new Set(savedCategories || []);
    (allProducts || []).forEach(p => {
        if (p.category) cats.add(p.category);
    });
    return Array.from(cats).filter(Boolean).sort();
}
function addCategory(newCat) {
    if (!newCat) return;
    savedCategories = Array.from(new Set([...(savedCategories || []), newCat]));
    localStorage.setItem('gd_categories', JSON.stringify(savedCategories));
}
function populateCategoryDropdowns(selectValue = '') {
    const categorySelect = document.getElementById('itemCategory');
    const editCategorySelect = document.getElementById('editItemCategory');

    const cats = extractCategoriesFromProducts();
    // ensure we always have at least 'General'
    if (!cats.includes('General')) cats.unshift('General');

    [categorySelect, editCategorySelect].forEach(sel => {
        if (!sel) return;
        sel.innerHTML = '';
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = '-- Select Category --';
        sel.appendChild(placeholder);

        cats.forEach(c => {
            const o = document.createElement('option'); o.value = c; o.textContent = c; sel.appendChild(o);
        });

        const addNew = document.createElement('option'); addNew.value = 'add_new'; addNew.textContent = '➕ Add New Category';
        sel.appendChild(addNew);

        // set requested value
        if (selectValue) sel.value = selectValue;
    });
}

// intercept selection change to handle 'add_new' option
function watchCategorySelects() {
    const itemCat = document.getElementById('itemCategory');
    const editCat = document.getElementById('editItemCategory');
    [itemCat, editCat].forEach(sel => {
        if (!sel) return;
        sel.addEventListener('change', function() {
            if (this.value === 'add_new') {
                const newCat = prompt('Enter new category name:');
                if (newCat && newCat.trim()) {
                    addCategory(newCat.trim());
                    populateCategoryDropdowns(newCat.trim());
                    showAlert(`✅ Category "${newCat.trim()}" added`, 'success');
                } else {
                    populateCategoryDropdowns(); // reset
                }
            }
        });
    });
}

// =============================================
// INIT & BINDING
// =============================================
function setupEventListeners() {
    const addForm = document.querySelector('.menu-form');
    const editForm = document.getElementById('editProductForm');
    if (addForm) addForm.addEventListener('submit', addMenuItem);
    if (editForm) editForm.addEventListener('submit', updateProduct);

    // image inputs
    const imgIn = document.getElementById('itemImage');
    if (imgIn) imgIn.addEventListener('change', (ev) => previewImage(ev.target));

    const editImgIn = document.getElementById('editItemImage');
    if (editImgIn) editImgIn.addEventListener('change', (ev) => previewEditImage(ev.target));

    // category selects watch
    watchCategorySelects();
}

function initializeAdminPanel() {
    console.log('🚀 Admin Panel starting...');
    document.getElementById('dashboardSection') && (document.getElementById('dashboardSection').style.display = 'block');
    setupEventListeners();
    updateCurrentTime();
    setInterval(updateCurrentTime, 60000);
    // initial load
    loadDashboardData();
}

// helper shortcuts
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

// run
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAdminPanel);
} else {
    initializeAdminPanel();
}
