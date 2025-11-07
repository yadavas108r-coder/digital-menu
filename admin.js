// =============================================
// ✅ SCRIPT_URL - YEH UPDATE KARO APNE NEW URL SE
// =============================================
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbytm_qmrzbJljoueecFK8_F-yBiU3evpeU4NWVl6_tCkvtiG_jCoHSE4xlS1RxDoCpe/exec';

// =============================================
// GLOBAL STATE
// =============================================
let allProducts = [];
let allOrders = [];

// =============================================
// ✅ SIMPLE JSONP HELPER
// =============================================
function jsonpRequest(url) {
    return new Promise((resolve, reject) => {
        const callbackName = 'jsonp_' + Date.now();
        
        window[callbackName] = function(data) {
            delete window[callbackName];
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
            resolve(data);
        };
        
        const script = document.createElement('script');
        script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + callbackName;
        
        script.onerror = function() {
            delete window[callbackName];
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
            reject(new Error('Failed to load script'));
        };
        
        document.head.appendChild(script);
        
        setTimeout(() => {
            if (window[callbackName]) {
                delete window[callbackName];
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                reject(new Error('Request timeout'));
            }
        }, 10000);
    });
}

// =============================================
// UTILITY FUNCTIONS
// =============================================
function showLoading(section) {
    const element = document.getElementById(section + 'Loading');
    if (element) {
        element.style.display = 'block';
        element.innerHTML = '<div class="loading">Loading ' + section + '...</div>';
    }
}

function hideLoading(section) {
    const element = document.getElementById(section + 'Loading');
    if (element) element.style.display = 'none';
}

function showAlert(message, type = 'info') {
    document.querySelectorAll('.alert').forEach(alert => alert.remove());
    
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
    
    setTimeout(() => {
        if (alertDiv.parentNode) alertDiv.parentNode.removeChild(alertDiv);
    }, 5000);
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'block';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

function updateCurrentTime() {
    const element = document.getElementById('currentTime');
    if (element) {
        element.textContent = new Date().toLocaleString('en-IN');
    }
}

// =============================================
// ✅ DASHBOARD FUNCTIONS
// =============================================
function showDashboard() {
    const dashboardSection = document.getElementById('dashboardSection');
    if (dashboardSection) dashboardSection.style.display = 'block';
    
    loadDashboardData();
}

function updateDashboardStats(stats) {
    const elements = {
        'totalOrders': stats.totalOrders || 0,
        'totalSales': '₹' + (stats.totalSales || 0),
        'todayOrders': stats.todayOrders || 0,
        'pendingOrders': stats.pendingOrders || 0
    };

    Object.keys(elements).forEach(id => {
        const element = document.getElementById(id);
        if (element) element.textContent = elements[id];
    });
}

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
    } catch (e) {
        return [];
    }
}

function calculateOrderTotal(items) {
    return items.reduce((total, item) => total + (parseFloat(item.price) * parseInt(item.quantity)), 0);
}

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

    const html = orders.map(order => {
        const orderDate = new Date(order.Timestamp || order.Date || order.timestamp).toLocaleString('en-IN');
        const items = parseOrderItems(order.Items || order.items);
        const total = order.Total || order.totalAmount || calculateOrderTotal(items);
        const status = order.Status || order.status || 'pending';
        const orderId = order.Timestamp || order.timestamp || order.Date;
        
        return `
            <tr>
                <td>${orderDate}</td>
                <td><strong>${order.Name || order.name || 'N/A'}</strong></td>
                <td>${order.Phone || order.phone || 'N/A'}</td>
                <td>${order.Table || order.table || 'N/A'}</td>
                <td>
                    <div style="max-width: 200px;">
                        ${items.map(item => `
                            <div style="font-size: 12px; color: #666;">
                                ${item.quantity}x ${item.name} - ₹${(item.price * item.quantity).toFixed(2)}
                            </div>
                        `).join('')}
                    </div>
                </td>
                <td><strong>₹${parseFloat(total).toFixed(2)}</strong></td>
                <td>
                    <span class="status-badge status-${status}">${status}</span>
                </td>
                <td>
                    <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                        <button class="invoice-btn" onclick="generateBill('${orderId}')">🧾 Bill</button>
                        ${status !== 'completed' ? `
                            <button class="complete-btn" onclick="updateOrderStatus('${orderId}', 'completed')">
                                ✅ Complete
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = html;
    loading.style.display = 'none';
    table.style.display = 'table';
}

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

    const html = products.map(product => `
        <tr>
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${product.image}" 
                         style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;">
                    <div>
                        <strong>${product.name}</strong>
                        ${product.description ? `<div style="font-size: 12px; color: #666;">${product.description}</div>` : ''}
                    </div>
                </div>
            </td>
            <td><strong>₹${product.price}</strong></td>
            <td>
                <img src="${product.image}" 
                     style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;">
            </td>
            <td>${product.category}</td>
            <td>
                <span style="color: ${product.type === 'veg' ? 'green' : 'red'};">
                    ${product.type === 'veg' ? '🟢 Veg' : '🔴 Non-Veg'}
                </span>
            </td>
            <td>
                <div style="display: flex; gap: 5px;">
                    <button class="complete-btn" onclick="editProduct('${product.name}')">✏️ Edit</button>
                    <button class="delete-btn" onclick="deleteProduct('${product.name}')">🗑️ Delete</button>
                </div>
            </td>
        </tr>
    `).join('');

    tbody.innerHTML = html;
    loading.style.display = 'none';
    table.style.display = 'table';
}

async function loadDashboardData() {
    try {
        showLoading('dashboard');
        
        console.log('📊 Loading dashboard data...');
        
        // Load data one by one
        const stats = await jsonpRequest(SCRIPT_URL + '?action=getDashboardStats');
        const ordersData = await jsonpRequest(SCRIPT_URL + '?action=getOrders');
        const productsData = await jsonpRequest(SCRIPT_URL + '?action=getAllProducts');

        console.log('✅ Data loaded successfully');

        if (stats.status === 'success') {
            updateDashboardStats(stats);
        }
        
        if (ordersData.status === 'success') {
            allOrders = ordersData.orders || [];
            renderOrdersTable(allOrders);
        }
        
        if (productsData.status === 'success') {
            allProducts = productsData.products || [];
            renderProductsTable(allProducts);
        }
        
        hideLoading('dashboard');
        showAlert(`✅ Dashboard loaded successfully!`, 'success');
        
    } catch (error) {
        console.error('❌ Dashboard load error:', error);
        showAlert('❌ Failed to load data: ' + error.message, 'error');
        
        // Show empty state
        updateDashboardStats({ totalOrders: 0, totalSales: 0, todayOrders: 0, pendingOrders: 0 });
        renderOrdersTable([]);
        renderProductsTable([]);
        
        hideLoading('dashboard');
    }
}

// =============================================
// PRODUCT OPERATIONS
// =============================================
async function addMenuItem(e) {
    if (e) e.preventDefault();
    
    const name = document.getElementById('itemName')?.value;
    const price = document.getElementById('itemPrice')?.value;
    const category = document.getElementById('itemCategory')?.value;
    const type = document.getElementById('itemType')?.value;
    
    if (!name || !price || !category || !type) {
        showAlert('Please fill all required fields', 'error');
        return;
    }

    const productData = {
        name: name,
        price: parseFloat(price),
        category: category,
        type: type,
        description: document.getElementById('itemDescription')?.value || '',
        image: document.getElementById('imagePreview')?.querySelector('img')?.src || 'https://via.placeholder.com/300x200/ff6b6b/white?text=' + encodeURIComponent(name)
    };

    const btn = document.querySelector('.menu-form button');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Adding...';
    }

    try {
        const url = SCRIPT_URL + '?action=addProduct&' + 
            'name=' + encodeURIComponent(productData.name) +
            '&price=' + productData.price +
            '&category=' + encodeURIComponent(productData.category) +
            '&type=' + encodeURIComponent(productData.type) +
            '&description=' + encodeURIComponent(productData.description) +
            '&image=' + encodeURIComponent(productData.image);

        const result = await jsonpRequest(url);

        if (result.status === 'success') {
            showAlert('✅ Product added successfully!', 'success');
            document.querySelector('.menu-form').reset();
            resetImagePreview();
            loadDashboardData();
        } else {
            showAlert('❌ ' + (result.error || 'Failed to add product'), 'error');
        }
    } catch (error) {
        showAlert('❌ ' + error.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '➕ Add Item';
        }
    }
}

function editProduct(productName) {
    const product = allProducts.find(p => p.name === productName);
    if (!product) {
        showAlert('Product not found', 'error');
        return;
    }

    document.getElementById('editItemName').value = product.name;
    document.getElementById('editItemPrice').value = product.price;
    document.getElementById('editItemCategory').value = product.category;
    document.getElementById('editItemType').value = product.type;
    document.getElementById('editItemDescription').value = product.description || '';
    document.getElementById('editItemOldName').value = product.name;
    
    const preview = document.getElementById('editImagePreview');
    if (preview) {
        preview.innerHTML = `<img src="${product.image}" alt="Preview">`;
    }
    
    showModal('editProductModal');
}

async function updateProduct(e) {
    if (e) e.preventDefault();
    
    const oldName = document.getElementById('editItemOldName').value;
    const name = document.getElementById('editItemName').value;
    const price = document.getElementById('editItemPrice').value;
    const category = document.getElementById('editItemCategory').value;
    const type = document.getElementById('editItemType')?.value;
    
    if (!oldName || !name || !price || !category || !type) {
        showAlert('Please fill all required fields', 'error');
        return;
    }

    const productData = {
        oldName: oldName,
        name: name,
        price: parseFloat(price),
        category: category,
        type: type,
        description: document.getElementById('editItemDescription')?.value || '',
        image: document.getElementById('editImagePreview')?.querySelector('img')?.src || 'https://via.placeholder.com/300x200/ff6b6b/white?text=' + encodeURIComponent(name)
    };

    try {
        const url = SCRIPT_URL + '?action=updateProduct&' +
            'oldName=' + encodeURIComponent(productData.oldName) +
            '&name=' + encodeURIComponent(productData.name) +
            '&price=' + productData.price +
            '&category=' + encodeURIComponent(productData.category) +
            '&type=' + encodeURIComponent(productData.type) +
            '&description=' + encodeURIComponent(productData.description) +
            '&image=' + encodeURIComponent(productData.image);

        const result = await jsonpRequest(url);

        if (result.status === 'success') {
            showAlert('✅ Product updated successfully!', 'success');
            closeModal('editProductModal');
            loadDashboardData();
        } else {
            showAlert('❌ ' + (result.error || 'Failed to update product'), 'error');
        }
    } catch (error) {
        showAlert('❌ ' + error.message, 'error');
    }
}

async function deleteProduct(productName) {
    if (!confirm(`Delete "${productName}"?`)) return;

    try {
        const result = await jsonpRequest(SCRIPT_URL + '?action=deleteProduct&name=' + encodeURIComponent(productName));

        if (result.status === 'success') {
            showAlert('✅ Product deleted successfully!', 'success');
            closeModal('editProductModal');
            loadDashboardData();
        } else {
            showAlert('❌ ' + (result.error || 'Failed to delete product'), 'error');
        }
    } catch (error) {
        showAlert('❌ ' + error.message, 'error');
    }
}

// =============================================
// ORDER OPERATIONS
// =============================================
async function updateOrderStatus(orderId, status) {
    try {
        const result = await jsonpRequest(
            SCRIPT_URL + '?action=updateOrderStatus&orderId=' + 
            encodeURIComponent(orderId) + '&status=' + status
        );

        if (result.status === 'success') {
            showAlert(`✅ Order marked as ${status}!`, 'success');
            loadDashboardData();
        } else {
            showAlert('❌ ' + (result.error || 'Failed to update order'), 'error');
        }
    } catch (error) {
        showAlert('❌ ' + error.message, 'error');
    }
}

async function generateBill(orderId) {
    try {
        const result = await jsonpRequest(
            SCRIPT_URL + '?action=generateBill&orderId=' + encodeURIComponent(orderId)
        );

        if (result.status === 'success') {
            renderBill(result.bill);
            showModal('billModal');
        } else {
            showAlert('❌ ' + (result.error || 'Failed to generate bill'), 'error');
        }
    } catch (error) {
        showAlert('❌ ' + error.message, 'error');
    }
}

function renderBill(bill) {
    const content = document.getElementById('billContent');
    if (!content) return;
    
    const items = bill.items || [];
    const total = bill.totalAmount || calculateOrderTotal(items);
    
    const html = `
        <div class="bill-header">
            <h2>🍦 Yadava's Ice Cream</h2>
            <p>Delicious & Fresh</p>
        </div>
        
        <div class="bill-info">
            <div class="bill-info-item">
                <strong>Order ID:</strong> <span>${bill.orderId || 'N/A'}</span>
            </div>
            <div class="bill-info-item">
                <strong>Date & Time:</strong> <span>${new Date(bill.timestamp).toLocaleString('en-IN')}</span>
            </div>
            <div class="bill-info-item">
                <strong>Customer Name:</strong> <span>${bill.customerName || 'N/A'}</span>
            </div>
            <div class="bill-info-item">
                <strong>Phone:</strong> <span>${bill.customerPhone || 'N/A'}</span>
            </div>
            <div class="bill-info-item">
                <strong>Table No:</strong> <span>${bill.tableNumber || 'N/A'}</span>
            </div>
        </div>

        <div class="bill-items">
            <h4>Order Items:</h4>
            ${items.map(item => `
                <div class="bill-item">
                    <span class="item-name">${item.name}</span>
                    <span class="item-quantity">${item.quantity} x ₹${item.price}</span>
                    <span class="item-price">₹${(item.price * item.quantity).toFixed(2)}</span>
                </div>
            `).join('')}
        </div>

        <div class="bill-total">
            <h3>TOTAL AMOUNT</h3>
            <div class="amount">₹${parseFloat(total).toFixed(2)}</div>
        </div>

        ${bill.review && bill.review !== 'No note' ? `
            <div class="bill-info-item" style="margin-top: 15px;">
                <strong>Special Instructions:</strong> <span>${bill.review}</span>
            </div>
        ` : ''}

        <div class="bill-actions">
            <button class="print-btn" onclick="printBill()">🖨️ Print Bill</button>
        </div>
    `;

    content.innerHTML = html;
}

function printBill() {
    window.print();
}

function closeBillModal() {
    closeModal('billModal');
}

// =============================================
// IMAGE FUNCTIONS
// =============================================
function previewImage(input) {
    const preview = document.getElementById('imagePreview');
    if (!preview) return;
    
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        };
        reader.readAsDataURL(input.files[0]);
    } else {
        resetImagePreview();
    }
}

function previewEditImage(input) {
    const preview = document.getElementById('editImagePreview');
    if (!preview) return;
    
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function resetImagePreview() {
    const preview = document.getElementById('imagePreview');
    if (preview) preview.innerHTML = '<span>Image Preview</span>';
}

// =============================================
// INITIALIZATION
// =============================================
function setupEventListeners() {
    const addForm = document.querySelector('.menu-form');
    const editForm = document.getElementById('editProductForm');
    
    if (addForm) {
        addForm.addEventListener('submit', addMenuItem);
    }
    if (editForm) {
        editForm.addEventListener('submit', updateProduct);
    }
}

function initializeAdminPanel() {
    console.log('🚀 Starting Admin Panel...');
    showDashboard();
    setupEventListeners();
    updateCurrentTime();
    setInterval(updateCurrentTime, 60000);
}

// =============================================
// GLOBAL FUNCTIONS
// =============================================
function loadDashboard() {
    loadDashboardData();
}

function logout() {
    if (confirm('Logout?')) window.location.reload();
}

// =============================================
// GLOBAL EXPORTS
// =============================================
window.addMenuItem = addMenuItem;
window.updateProduct = updateProduct;
window.deleteProduct = deleteProduct;
window.updateOrderStatus = updateOrderStatus;
window.generateBill = generateBill;
window.printBill = printBill;
window.closeBillModal = closeBillModal;
window.previewImage = previewImage;
window.previewEditImage = previewEditImage;
window.loadDashboard = loadDashboard;
window.editProduct = editProduct;
window.closeModal = closeModal;
window.logout = logout;

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAdminPanel);
} else {
    initializeAdminPanel();
}
