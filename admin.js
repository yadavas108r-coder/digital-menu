// =============================================
// ✅ FIXED: SCRIPT_URL DEFINED AT THE VERY TOP
// =============================================
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby9O_HhQ58nb7Gb-4XyWx12nU4tCeKFUw16EHVKO5FiCg2A47JGfuXiblhnmkTOqSoc/exec';

// =============================================
// GLOBAL STATE
// =============================================
let currentUser = null;
let allProducts = [];
let allOrders = [];
let salesChart = null;
let productsChart = null;

// =============================================
// ✅ FIXED JSONP HELPER FUNCTION
// =============================================
function jsonpRequest(url) {
    return new Promise((resolve, reject) => {
        const callbackName = 'jsonp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        // Clean URL - remove existing callback if any
        let cleanUrl = url.split('&callback=')[0].split('?callback=')[0];
        cleanUrl += (cleanUrl.includes('?') ? '&' : '?') + 'callback=' + callbackName;
        
        console.log('📡 JSONP Request:', cleanUrl);
        
        const script = document.createElement('script');
        script.src = cleanUrl;
        
        window[callbackName] = function(data) {
            console.log('✅ JSONP Response received:', data);
            delete window[callbackName];
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
            resolve(data);
        };
        
        script.onerror = function() {
            console.error('❌ JSONP Request failed for URL:', cleanUrl);
            delete window[callbackName];
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
            reject(new Error('JSONP request failed - Check if Apps Script is deployed correctly'));
        };
        
        // Add timeout
        setTimeout(() => {
            if (window[callbackName]) {
                delete window[callbackName];
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                reject(new Error('JSONP timeout - No response from server'));
            }
        }, 10000);
        
        document.head.appendChild(script);
    });
}

// =============================================
// ✅ SIMPLE TEST FUNCTION
// =============================================
async function testConnection() {
    try {
        console.log('🔗 Testing connection to:', SCRIPT_URL);
        const testData = await jsonpRequest(SCRIPT_URL + '?action=getDashboardStats');
        console.log('✅ Connection test successful:', testData);
        return true;
    } catch (error) {
        console.error('❌ Connection test failed:', error);
        return false;
    }
}

// =============================================
// UTILITY FUNCTIONS
// =============================================
function showLoading(section) {
    const loadingElement = document.getElementById(section + 'Loading');
    if (loadingElement) {
        loadingElement.style.display = 'block';
        loadingElement.innerHTML = '<div class="loading">Loading...</div>';
    }
}

function hideLoading(section) {
    const loadingElement = document.getElementById(section + 'Loading');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
}

function showAlert(message, type = 'info', container = null) {
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
    
    const targetContainer = container || document.body;
    targetContainer.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
        }
    }, 5000);
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

function updateCurrentTime() {
    const timeElement = document.getElementById('currentTime');
    if (timeElement) {
        timeElement.textContent = new Date().toLocaleString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// =============================================
// AUTHENTICATION FUNCTIONS
// =============================================
function checkAuthentication() {
    const savedUser = localStorage.getItem('adminUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            showDashboard();
        } catch (e) {
            console.error('❌ Error parsing saved user:', e);
            localStorage.removeItem('adminUser');
            showLogin();
        }
    } else {
        showLogin();
    }
}

function showLogin() {
    const loginSection = document.getElementById('loginSection');
    const dashboardSection = document.getElementById('dashboardSection');
    
    if (loginSection) loginSection.style.display = 'flex';
    if (dashboardSection) dashboardSection.style.display = 'none';
}

function showDashboard() {
    const loginSection = document.getElementById('loginSection');
    const dashboardSection = document.getElementById('dashboardSection');
    
    if (loginSection) loginSection.style.display = 'none';
    if (dashboardSection) dashboardSection.style.display = 'block';
    
    // Test connection first
    testConnection().then(success => {
        if (success) {
            loadDashboardData();
        } else {
            showAlert('Cannot connect to server. Please check your Apps Script deployment.', 'error');
        }
    });
}

function logout() {
    localStorage.removeItem('adminUser');
    currentUser = null;
    showLogin();
    showAlert('Logged out successfully', 'success');
}

// =============================================
// ✅ FIXED LOGIN HANDLER
// =============================================
async function handleLogin(e) {
    if (e) e.preventDefault();
    
    console.log('🔐 Login initiated...');
    
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) {
        console.error('❌ Login form not found');
        return;
    }
    
    const username = document.getElementById('username')?.value;
    const password = document.getElementById('password')?.value;
    
    if (!username || !password) {
        showAlert('Please enter both username and password', 'error', document.getElementById('loginAlert'));
        return;
    }

    console.log('🔐 Attempting login with:', { username });

    const loginBtn = loginForm.querySelector('button');
    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';
    }

    try {
        // ✅ Simple URL construction for login
        const loginUrl = `${SCRIPT_URL}?action=adminLogin&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
        console.log('📡 Login URL:', loginUrl);
        
        const data = await jsonpRequest(loginUrl);
        console.log('📨 Login response received:', data);

        if (data && data.success) {
            localStorage.setItem('adminUser', JSON.stringify(data.user));
            currentUser = data.user;
            showDashboard();
            showAlert('Login successful! Welcome back!', 'success');
        } else {
            const errorMsg = data?.error || 'Invalid username or password';
            showAlert(errorMsg, 'error', document.getElementById('loginAlert'));
        }
    } catch (error) {
        console.error('❌ Login error:', error);
        showAlert('Login failed: ' + error.message, 'error', document.getElementById('loginAlert'));
    } finally {
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login to Dashboard';
        }
    }
}

// =============================================
// DASHBOARD DATA LOADING
// =============================================
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
        if (typeof itemsJson === 'string') {
            return JSON.parse(itemsJson);
        }
        return itemsJson || [];
    } catch (e) {
        console.error('Error parsing order items:', e);
        return [];
    }
}

function calculateOrderTotal(items) {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
}

function renderOrdersTable(orders) {
    const tbody = document.getElementById('ordersTableBody');
    const ordersTable = document.getElementById('ordersTable');
    const ordersLoading = document.getElementById('ordersLoading');
    
    if (!tbody || !ordersTable || !ordersLoading) return;
    
    if (!orders || orders.length === 0) {
        ordersTable.style.display = 'none';
        ordersLoading.innerHTML = '<p>No orders found</p>';
        ordersLoading.style.display = 'block';
        return;
    }

    const ordersHtml = orders.map(order => {
        const orderDate = new Date(order.Timestamp || order.Date).toLocaleString();
        const items = parseOrderItems(order.Items);
        const totalAmount = order.Total || calculateOrderTotal(items);
        
        return `
            <tr>
                <td>${orderDate}</td>
                <td><strong>${order.Name || 'N/A'}</strong></td>
                <td>${order.Phone || 'N/A'}</td>
                <td>${order.Table || 'N/A'}</td>
                <td>
                    <div style="max-width: 200px;">
                        ${items.map(item => `
                            <div style="font-size: 12px; color: #666;">
                                ${item.quantity}x ${item.name} - ₹${item.price * item.quantity}
                            </div>
                        `).join('')}
                    </div>
                </td>
                <td><strong>₹${totalAmount}</strong></td>
                <td>
                    <span class="status-badge status-${order.Status || 'pending'}">
                        ${order.Status || 'pending'}
                    </span>
                </td>
                <td>
                    <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                        <button class="invoice-btn" onclick="generateBill('${order.Timestamp || order.Date}')">
                            🧾 Bill
                        </button>
                        ${order.Status !== 'completed' ? `
                            <button class="complete-btn" onclick="updateOrderStatus('${order.Timestamp || order.Date}', 'completed')">
                                ✅ Complete
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = ordersHtml;
    ordersLoading.style.display = 'none';
    ordersTable.style.display = 'table';
}

function renderProductsTable(products) {
    const tbody = document.getElementById('menuTableBody');
    const menuTable = document.getElementById('menuTable');
    const menuLoading = document.getElementById('menuLoading');
    
    if (!tbody || !menuTable || !menuLoading) return;
    
    if (!products || products.length === 0) {
        menuTable.style.display = 'none';
        menuLoading.innerHTML = '<p>No products found</p>';
        menuLoading.style.display = 'block';
        return;
    }

    const productsHtml = products.map(product => `
        <tr>
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${product.image || 'https://via.placeholder.com/50x50?text=No+Image'}" 
                         alt="${product.name}" 
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
                     alt="${product.name}" 
                     style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;">
            </td>
            <td>${product.category}</td>
            <td>
                <span style="color: ${product.type === 'veg' ? 'green' : 'red'}; font-weight: bold;">
                    ${product.type === 'veg' ? '🟢 Veg' : '🔴 Non-Veg'}
                </span>
            </td>
            <td>
                <div style="display: flex; gap: 5px;">
                    <button class="complete-btn" onclick="editProduct('${product.name}')">
                        ✏️ Edit
                    </button>
                    <button class="delete-btn" onclick="deleteProduct('${product.name}')">
                        🗑️ Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    tbody.innerHTML = productsHtml;
    menuLoading.style.display = 'none';
    menuTable.style.display = 'table';
}

async function loadDashboardData() {
    try {
        showLoading('dashboard');
        
        console.log('📊 Loading dashboard data...');
        
        // Load basic data first
        const stats = await jsonpRequest(SCRIPT_URL + '?action=getDashboardStats');
        const ordersData = await jsonpRequest(SCRIPT_URL + '?action=getOrders');
        const productsData = await jsonpRequest(SCRIPT_URL + '?action=getAllProducts');

        console.log('📈 Basic data loaded successfully');

        updateDashboardStats(stats);
        allOrders = ordersData.orders || [];
        allProducts = productsData.products || [];
        
        renderOrdersTable(allOrders);
        renderProductsTable(allProducts);
        
        // Try to load chart data (optional)
        try {
            const salesData = await jsonpRequest(SCRIPT_URL + '?action=getSalesData');
            const topProducts = await jsonpRequest(SCRIPT_URL + '?action=getTopProducts');
            updateCharts(salesData, topProducts);
        } catch (chartError) {
            console.log('📊 Charts data not available:', chartError);
        }
        
        hideLoading('dashboard');
        
    } catch (error) {
        console.error('❌ Dashboard load error:', error);
        showAlert('Failed to load dashboard data: ' + error.message, 'error');
        hideLoading('dashboard');
    }
}

// =============================================
// CHART FUNCTIONS (SIMPLIFIED)
// =============================================
function initializeCharts() {
    const salesCanvas = document.getElementById('salesChart');
    const productsCanvas = document.getElementById('productsChart');
    
    if (salesCanvas) {
        const salesCtx = salesCanvas.getContext('2d');
        salesChart = new Chart(salesCtx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Daily Sales (₹)',
                    data: [0, 0, 0, 0, 0, 0, 0],
                    borderColor: '#ff6b6b',
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    if (productsCanvas) {
        const productsCtx = productsCanvas.getContext('2d');
        productsChart = new Chart(productsCtx, {
            type: 'bar',
            data: {
                labels: ['Product 1', 'Product 2', 'Product 3'],
                datasets: [{
                    label: 'Orders',
                    data: [0, 0, 0],
                    backgroundColor: '#ff8e8e'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
}

function updateCharts(salesData, topProducts) {
    // Simplified chart updates
    console.log('📊 Updating charts with data:', { salesData, topProducts });
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

    const submitBtn = document.querySelector('.menu-form button');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Adding...';
    }

    try {
        const params = new URLSearchParams();
        params.append('action', 'addProduct');
        Object.keys(productData).forEach(key => {
            if (productData[key] !== undefined && productData[key] !== null) {
                params.append(key, productData[key]);
            }
        });
        
        const data = await jsonpRequest(SCRIPT_URL + '?' + params.toString());

        if (data.success) {
            showAlert('Product added successfully!', 'success');
            document.querySelector('.menu-form').reset();
            resetImagePreview();
            loadDashboardData();
        } else {
            showAlert(data.error || 'Failed to add product', 'error');
        }
    } catch (error) {
        showAlert('Network error: ' + error.message, 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '➕ Add Item';
        }
    }
}

function editProduct(productName) {
    const product = allProducts.find(p => p.name === productName);
    if (!product) {
        showAlert('Product not found', 'error');
        return;
    }

    // Populate edit form
    document.getElementById('editItemName').value = product.name;
    document.getElementById('editItemPrice').value = product.price;
    document.getElementById('editItemCategory').value = product.category;
    document.getElementById('editItemType').value = product.type;
    document.getElementById('editItemDescription').value = product.description || '';
    document.getElementById('editItemOldName').value = product.name;
    
    const editImagePreview = document.getElementById('editImagePreview');
    if (editImagePreview && product.image) {
        editImagePreview.innerHTML = `<img src="${product.image}" alt="Preview">`;
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
        const params = new URLSearchParams();
        params.append('action', 'updateProduct');
        Object.keys(productData).forEach(key => {
            if (productData[key] !== undefined && productData[key] !== null) {
                params.append(key, productData[key]);
            }
        });
        
        const data = await jsonpRequest(SCRIPT_URL + '?' + params.toString());

        if (data.success) {
            showAlert('Product updated successfully!', 'success');
            closeModal('editProductModal');
            loadDashboardData();
        } else {
            showAlert(data.error || 'Failed to update product', 'error');
        }
    } catch (error) {
        showAlert('Network error: ' + error.message, 'error');
    }
}

async function deleteProduct(productName) {
    if (!confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
        return;
    }

    try {
        const data = await jsonpRequest(SCRIPT_URL + '?action=deleteProduct&name=' + encodeURIComponent(productName));

        if (data.success) {
            showAlert('Product deleted successfully!', 'success');
            closeModal('editProductModal');
            loadDashboardData();
        } else {
            showAlert(data.error || 'Failed to delete product', 'error');
        }
    } catch (error) {
        showAlert('Network error: ' + error.message, 'error');
    }
}

// =============================================
// ORDER OPERATIONS
// =============================================
async function updateOrderStatus(orderId, status) {
    try {
        const data = await jsonpRequest(SCRIPT_URL + `?action=updateOrderStatus&orderId=${encodeURIComponent(orderId)}&status=${status}`);

        if (data.success) {
            showAlert(`Order marked as ${status}!`, 'success');
            loadDashboardData();
        } else {
            showAlert(data.error || 'Failed to update order status', 'error');
        }
    } catch (error) {
        showAlert('Network error: ' + error.message, 'error');
    }
}

async function generateBill(orderId) {
    try {
        const data = await jsonpRequest(SCRIPT_URL + `?action=generateBill&orderId=${encodeURIComponent(orderId)}`);

        if (data.success) {
            renderBill(data.bill);
            showModal('billModal');
        } else {
            showAlert(data.error || 'Failed to generate bill', 'error');
        }
    } catch (error) {
        showAlert('Network error: ' + error.message, 'error');
    }
}

function renderBill(bill) {
    const billContent = document.getElementById('billContent');
    if (!billContent) return;
    
    const items = bill.items || [];
    const total = bill.totalAmount || calculateOrderTotal(items);
    
    const billHtml = `
        <div class="bill-header">
            <h2>Yadava's Ice Cream</h2>
            <p>Delicious & Fresh</p>
        </div>
        
        <div class="bill-info">
            <div class="bill-info-item">
                <strong>Order ID:</strong>
                <span>${bill.orderId || 'N/A'}</span>
            </div>
            <div class="bill-info-item">
                <strong>Date & Time:</strong>
                <span>${new Date(bill.timestamp).toLocaleString()}</span>
            </div>
            <div class="bill-info-item">
                <strong>Customer Name:</strong>
                <span>${bill.customerName || 'N/A'}</span>
            </div>
            <div class="bill-info-item">
                <strong>Phone:</strong>
                <span>${bill.customerPhone || 'N/A'}</span>
            </div>
            <div class="bill-info-item">
                <strong>Table No:</strong>
                <span>${bill.tableNumber || 'N/A'}</span>
            </div>
        </div>

        <div class="bill-items">
            <h4>Order Items:</h4>
            ${items.map(item => `
                <div class="bill-item">
                    <span class="item-name">${item.name}</span>
                    <span class="item-quantity">${item.quantity} x ₹${item.price}</span>
                    <span class="item-price">₹${item.price * item.quantity}</span>
                </div>
            `).join('')}
        </div>

        <div class="bill-total">
            <h3>TOTAL AMOUNT</h3>
            <div class="amount">₹${total}</div>
        </div>

        ${bill.review && bill.review !== 'No note' ? `
            <div class="bill-info-item" style="margin-top: 15px;">
                <strong>Special Instructions:</strong>
                <span>${bill.review}</span>
            </div>
        ` : ''}

        <div class="bill-actions">
            <button class="print-btn" onclick="printBill()">🖨️ Print Bill</button>
        </div>
    `;

    billContent.innerHTML = billHtml;
}

function printBill() {
    window.print();
}

function closeBillModal() {
    closeModal('billModal');
}

// =============================================
// IMAGE PREVIEW FUNCTIONS
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
    if (preview) {
        preview.innerHTML = '<span>Image Preview</span>';
    }
}

// =============================================
// EVENT LISTENERS & INITIALIZATION
// =============================================
function setupEventListeners() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    const addProductForm = document.querySelector('.menu-form');
    if (addProductForm) {
        addProductForm.addEventListener('submit', addMenuItem);
    }
    
    const editProductForm = document.getElementById('editProductForm');
    if (editProductForm) {
        editProductForm.addEventListener('submit', updateProduct);
    }
}

function initializeAdminPanel() {
    console.log('🚀 Admin Panel Initializing...');
    console.log('✅ SCRIPT_URL:', SCRIPT_URL);
    
    checkAuthentication();
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
    showAlert('Dashboard refreshed!', 'success');
}

// =============================================
// GLOBAL FUNCTION EXPORTS & INITIALIZATION
// =============================================
window.handleLogin = handleLogin;
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
window.logout = logout;
window.editProduct = editProduct;
window.closeModal = closeModal;

// Wait for DOM to be fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAdminPanel);
} else {
    initializeAdminPanel();
}
