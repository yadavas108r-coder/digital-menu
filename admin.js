// =============================================
// ✅ SCRIPT_URL - YEH UPDATE KARO APNE NEW URL SE
// =============================================
// Tumhara naya URL yahan paste karo
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxIMrO5EA7bHI65V7dFWk1kurvPyg17FONldTnWNc25KdrVo2GdSdMh78u0sC4YL-QG/exec';

// =============================================
// GLOBAL STATE
// =============================================
let allProducts = [];
let allOrders = [];
let salesChart = null;
let productsChart = null;

// =============================================
// ✅ IMPROVED JSONP HELPER
// =============================================
function jsonpRequest(url) {
    return new Promise((resolve, reject) => {
        const callbackName = 'cb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        
        console.log('🔄 Making request to:', url);
        
        const script = document.createElement('script');
        script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + callbackName;
        
        window[callbackName] = function(data) {
            console.log('✅ Response received:', data);
            cleanup();
            resolve(data);
        };
        
        function cleanup() {
            delete window[callbackName];
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
        }
        
        script.onerror = function() {
            console.error('❌ Script load failed');
            cleanup();
            reject(new Error('Connection failed. Please check: 1) Script URL 2) Deployment 3) Internet connection'));
        };
        
        setTimeout(() => {
            if (window[callbackName]) {
                console.error('⏰ Request timeout');
                cleanup();
                reject(new Error('Request timeout. Server is not responding.'));
            }
        }, 15000);
        
        document.head.appendChild(script);
    });
}

// =============================================
// ✅ TEST CONNECTION FUNCTION
// =============================================
async function testConnection() {
    try {
        showAlert('Testing connection to server...', 'info');
        console.log('🔧 Testing connection...');
        
        const result = await jsonpRequest(SCRIPT_URL + '?action=testConnection');
        
        if (result.status === 'success') {
            console.log('✅ Connection successful:', result);
            showAlert('✅ ' + result.message, 'success');
            return true;
        } else {
            throw new Error(result.error || 'Connection failed');
        }
    } catch (error) {
        console.error('❌ Connection test failed:', error);
        showAlert('❌ ' + error.message, 'error');
        return false;
    }
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
    // Remove existing alerts
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
    
    // Test connection first
    testConnection().then(success => {
        if (success) {
            loadDashboardData();
        }
    });
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
                    <img src="${product.image || 'https://via.placeholder.com/50x50?text=No+Image'}" 
                         style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;">
                    <div>
                        <strong>${product.name}</strong>
                        ${product.description ? `<div style="font-size: 12px; color: #666;">${product.description}</div>` : ''}
                    </div>
                </div>
            </td>
            <td><strong>₹${product.price}</strong></td>
            <td>
                <img src="${product.image || 'https://via.placeholder.com/50x50?text=No+Image'}" 
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
        
        const [stats, ordersData, productsData] = await Promise.all([
            jsonpRequest(SCRIPT_URL + '?action=getDashboardStats'),
            jsonpRequest(SCRIPT_URL + '?action=getOrders'),
            jsonpRequest(SCRIPT_URL + '?action=getAllProducts')
        ]);

        console.log('✅ Data loaded:', {
            stats: stats,
            orders: ordersData.orders?.length,
            products: productsData.products?.length
        });

        // Update UI with REAL data
        updateDashboardStats(stats);
        allOrders = ordersData.orders || [];
        allProducts = productsData.products || [];
        
        renderOrdersTable(allOrders);
        renderProductsTable(allProducts);
        updateChartsWithRealData(allOrders); // ✅ REAL DATA CHARTS
        
        hideLoading('dashboard');
        
        const orderCount = allOrders.length;
        const productCount = allProducts.length;
        showAlert(`✅ Dashboard loaded! ${orderCount} orders, ${productCount} products`, 'success');
        
    } catch (error) {
        console.error('❌ Dashboard load error:', error);
        showAlert('❌ ' + error.message, 'error');
        
        // Show empty state
        updateDashboardStats({ totalOrders: 0, totalSales: 0, todayOrders: 0, pendingOrders: 0 });
        renderOrdersTable([]);
        renderProductsTable([]);
        
        hideLoading('dashboard');
    }
}

// =============================================
// ✅ REAL-TIME CHARTS WITH REAL DATA
// =============================================
function initializeCharts() {
    const salesCanvas = document.getElementById('salesChart');
    const productsCanvas = document.getElementById('productsChart');
    
    if (salesCanvas) {
        const ctx = salesCanvas.getContext('2d');
        salesChart = new Chart(ctx, {
            type: 'line',
            data: { labels: [], datasets: [{
                label: 'Sales (₹)',
                data: [],
                borderColor: '#ff6b6b',
                backgroundColor: 'rgba(255, 107, 107, 0.1)',
                tension: 0.4,
                fill: true
            }]},
            options: {
                responsive: true,
                plugins: { legend: { display: false } }
            }
        });
    }

    if (productsCanvas) {
        const ctx = productsCanvas.getContext('2d');
        productsChart = new Chart(ctx, {
            type: 'bar',
            data: { labels: [], datasets: [{
                label: 'Orders',
                data: [],
                backgroundColor: '#ff8e8e'
            }]},
            options: {
                responsive: true,
                plugins: { legend: { display: false } }
            }
        });
    }
}

function updateChartsWithRealData(orders) {
    if (!orders || orders.length === 0) {
        // Show demo data if no real data
        updateChartsWithDemoData();
        return;
    }

    // Sales chart - last 7 days
    const last7Days = getLast7Days();
    const salesByDay = {};
    
    orders.forEach(order => {
        try {
            const orderDate = new Date(order.Timestamp || order.Date || order.timestamp);
            const dateStr = orderDate.toISOString().split('T')[0];
            const total = parseFloat(order.Total || order.totalAmount) || 0;
            
            if (last7Days.includes(dateStr)) {
                salesByDay[dateStr] = (salesByDay[dateStr] || 0) + total;
            }
        } catch (e) {}
    });

    const salesData = last7Days.map(date => salesByDay[date] || 0);
    const dayLabels = last7Days.map(date => {
        const d = new Date(date);
        return d.toLocaleDateString('en-IN', { weekday: 'short' });
    });

    if (salesChart) {
        salesChart.data.labels = dayLabels;
        salesChart.data.datasets[0].data = salesData;
        salesChart.update();
    }

    // Products chart - top products
    const productCounts = {};
    orders.forEach(order => {
        const items = parseOrderItems(order.Items || order.items);
        items.forEach(item => {
            if (item.name) {
                productCounts[item.name] = (productCounts[item.name] || 0) + (item.quantity || 1);
            }
        });
    });

    const topProducts = Object.entries(productCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    if (productsChart) {
        productsChart.data.labels = topProducts.map(p => p[0]);
        productsChart.data.datasets[0].data = topProducts.map(p => p[1]);
        productsChart.update();
    }
}

function updateChartsWithDemoData() {
    if (salesChart) {
        salesChart.data.labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        salesChart.data.datasets[0].data = [0, 0, 0, 0, 0, 0, 0];
        salesChart.update();
    }
    
    if (productsChart) {
        productsChart.data.labels = ['No Data'];
        productsChart.data.datasets[0].data = [0];
        productsChart.update();
    }
}

function getLast7Days() {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
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
        image: document.getElementById('imagePreview')?.querySelector('img')?.src || ''
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

        if (result.success) {
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
    if (preview && product.image) {
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
    const type = document.getElementById('editItemType').value;
    
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
        image: document.getElementById('editImagePreview')?.querySelector('img')?.src || ''
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

        if (result.success) {
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

        if (result.success) {
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

        if (result.success) {
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

        if (result.success) {
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
    const forms = [
        document.querySelector('.menu-form'),
        document.getElementById('editProductForm')
    ];
    
    forms.forEach(form => {
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                if (form.classList.contains('menu-form')) {
                    addMenuItem(e);
                } else {
                    updateProduct(e);
                }
            });
        }
    });
}

function initializeAdminPanel() {
    console.log('🚀 Starting Admin Panel...');
    showDashboard();
    initializeCharts();
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
window.testConnection = testConnection;

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAdminPanel);
} else {
    initializeAdminPanel();
}
