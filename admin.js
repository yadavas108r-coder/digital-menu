const scriptURL = "https://script.google.com/macros/s/AKfycbyYXyDhUbqdhau8XeDdKbKzvsyNJEJ0gL7h2ucTgjZ_cJrxdG6ZkAp-f0ecL7yWDdw/exec";

// Global State
let currentUser = null;
let allProducts = [];
let allOrders = [];
let salesChart = null;
let productsChart = null;

// DOM Elements
const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const loginForm = document.getElementById('loginForm');
const loginAlert = document.getElementById('loginAlert');

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    initializeCharts();
    setupEventListeners();
    updateCurrentTime();
    setInterval(updateCurrentTime, 60000);
});

// Authentication Functions
function checkAuthentication() {
    const savedUser = localStorage.getItem('adminUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showDashboard();
    } else {
        showLogin();
    }
}

function showLogin() {
    loginSection.style.display = 'flex';
    dashboardSection.style.display = 'none';
}

function showDashboard() {
    loginSection.style.display = 'none';
    dashboardSection.style.display = 'block';
    loadDashboardData();
}

function logout() {
    localStorage.removeItem('adminUser');
    currentUser = null;
    showLogin();
    showAlert('Logged out successfully', 'success');
}

// Login Handler
async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(loginForm);
    const credentials = {
        username: formData.get('username'),
        password: formData.get('password')
    };

    const loginBtn = loginForm.querySelector('button');
    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'adminLogin',
                ...credentials
            })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem('adminUser', JSON.stringify(data.user));
            currentUser = data.user;
            showDashboard();
            showAlert('Login successful! Welcome back!', 'success');
        } else {
            showAlert(data.error || 'Invalid username or password', 'error', loginAlert);
        }
    } catch (error) {
        showAlert('Network error: ' + error.message, 'error', loginAlert);
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Login';
    }
}

// Dashboard Data Loading
async function loadDashboardData() {
    try {
        showLoading('dashboard');
        
        // Load all data in parallel
        const [statsResponse, ordersResponse, productsResponse, salesResponse, topProductsResponse] = await Promise.all([
            fetch(SCRIPT_URL + '?action=getDashboardStats'),
            fetch(SCRIPT_URL + '?action=getOrders'),
            fetch(SCRIPT_URL + '?action=getAllProducts'),
            fetch(SCRIPT_URL + '?action=getSalesData'),
            fetch(SCRIPT_URL + '?action=getTopProducts')
        ]);

        const stats = await statsResponse.json();
        const ordersData = await ordersResponse.json();
        const productsData = await productsResponse.json();
        const salesData = await salesResponse.json();
        const topProducts = await topProductsResponse.json();

        // Update dashboard stats
        updateDashboardStats(stats);
        
        // Update global state
        allOrders = ordersData.orders || [];
        allProducts = productsData.products || [];
        
        // Render data
        renderOrdersTable(allOrders);
        renderProductsTable(allProducts);
        updateCharts(salesData, topProducts);
        
        hideLoading('dashboard');
        
    } catch (error) {
        console.error('Dashboard load error:', error);
        showAlert('Failed to load dashboard data', 'error');
        hideLoading('dashboard');
    }
}

function updateDashboardStats(stats) {
    document.getElementById('totalOrders').textContent = stats.totalOrders || 0;
    document.getElementById('totalSales').textContent = '₹' + (stats.totalSales || 0);
    document.getElementById('todayOrders').textContent = stats.todayOrders || 0;
    document.getElementById('pendingOrders').textContent = stats.pendingOrders || 0;
}

// Orders Management
function renderOrdersTable(orders) {
    const tbody = document.getElementById('ordersTableBody');
    
    if (!orders || orders.length === 0) {
        document.getElementById('ordersTable').style.display = 'none';
        document.getElementById('ordersLoading').innerHTML = '<p>No orders found</p>';
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
    document.getElementById('ordersLoading').style.display = 'none';
    document.getElementById('ordersTable').style.display = 'table';
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

// Products Management
function renderProductsTable(products) {
    const tbody = document.getElementById('menuTableBody');
    
    if (!products || products.length === 0) {
        document.getElementById('menuTable').style.display = 'none';
        document.getElementById('menuLoading').innerHTML = '<p>No products found</p>';
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
    document.getElementById('menuLoading').style.display = 'none';
    document.getElementById('menuTable').style.display = 'table';
}

// Add Product Function
async function addMenuItem(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    
    const productData = {
        name: formData.get('itemName'),
        price: parseFloat(formData.get('itemPrice')),
        category: formData.get('itemCategory'),
        type: formData.get('itemType'),
        description: formData.get('itemDescription'),
        image: document.getElementById('imagePreview').querySelector('img')?.src || ''
    };

    const submitBtn = form.querySelector('button');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding...';

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'addProduct',
                ...productData
            })
        });

        const data = await response.json();

        if (data.success) {
            showAlert('Product added successfully!', 'success');
            form.reset();
            resetImagePreview();
            loadDashboardData(); // Reload to show new product
        } else {
            showAlert(data.error || 'Failed to add product', 'error');
        }
    } catch (error) {
        showAlert('Network error: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '➕ Add Item';
    }
}

// Edit Product Function
function editProduct(productName) {
    const product = allProducts.find(p => p.name === productName);
    if (!product) {
        showAlert('Product not found', 'error');
        return;
    }

    // Populate edit form (you'll need to create an edit modal)
    document.getElementById('editItemName').value = product.name;
    document.getElementById('editItemPrice').value = product.price;
    document.getElementById('editItemCategory').value = product.category;
    document.getElementById('editItemType').value = product.type;
    document.getElementById('editItemDescription').value = product.description || '';
    
    const editImagePreview = document.getElementById('editImagePreview');
    if (product.image) {
        editImagePreview.innerHTML = `<img src="${product.image}" alt="Preview">`;
    }
    
    // Show edit modal
    showModal('editProductModal');
}

async function updateProduct(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const productData = {
        oldName: document.getElementById('editItemName').value,
        name: formData.get('itemName'),
        price: parseFloat(formData.get('itemPrice')),
        category: formData.get('itemCategory'),
        type: formData.get('itemType'),
        description: formData.get('itemDescription'),
        image: document.getElementById('editImagePreview').querySelector('img')?.src || ''
    };

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'updateProduct',
                ...productData
            })
        });

        const data = await response.json();

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

// Delete Product Function
async function deleteProduct(productName) {
    if (!confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
        return;
    }

    try {
        const response = await fetch(SCRIPT_URL + '?action=deleteProduct&name=' + encodeURIComponent(productName));
        const data = await response.json();

        if (data.success) {
            showAlert('Product deleted successfully!', 'success');
            loadDashboardData();
        } else {
            showAlert(data.error || 'Failed to delete product', 'error');
        }
    } catch (error) {
        showAlert('Network error: ' + error.message, 'error');
    }
}

// Order Status Management
async function updateOrderStatus(orderId, status) {
    try {
        const response = await fetch(SCRIPT_URL + `?action=updateOrderStatus&orderId=${encodeURIComponent(orderId)}&status=${status}`);
        const data = await response.json();

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

// Bill Generation
async function generateBill(orderId) {
    try {
        const response = await fetch(SCRIPT_URL + `?action=generateBill&orderId=${encodeURIComponent(orderId)}`);
        const data = await response.json();

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

// Image Preview Function
function previewImage(input) {
    const preview = document.getElementById('imagePreview');
    
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        }
        
        reader.readAsDataURL(input.files[0]);
    } else {
        resetImagePreview();
    }
}

function resetImagePreview() {
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = '<span>Image Preview</span>';
}

// Chart Functions
function initializeCharts() {
    const salesCtx = document.getElementById('salesChart').getContext('2d');
    const productsCtx = document.getElementById('productsChart').getContext('2d');
    
    salesChart = new Chart(salesCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Daily Sales (₹)',
                data: [],
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
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });

    productsChart = new Chart(productsCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Orders',
                data: [],
                backgroundColor: '#ff8e8e',
                borderColor: '#ff6b6b',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function updateCharts(salesData, topProducts) {
    // Update sales chart
    if (salesChart && salesData && salesData.length > 0) {
        salesChart.data.labels = salesData.map(item => {
            const date = new Date(item.date);
            return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        });
        salesChart.data.datasets[0].data = salesData.map(item => item.sales);
        salesChart.update();
    }

    // Update products chart
    if (productsChart && topProducts && topProducts.length > 0) {
        const top5 = topProducts.slice(0, 5);
        productsChart.data.labels = top5.map(item => {
            // Shorten long product names
            return item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name;
        });
        productsChart.data.datasets[0].data = top5.map(item => item.count);
        productsChart.update();
    }
}

// Utility Functions
function setupEventListeners() {
    // Login form
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Add product form
    const addProductForm = document.querySelector('.menu-form');
    if (addProductForm) {
        addProductForm.addEventListener('submit', addMenuItem);
    }
    
    // Edit product form
    const editProductForm = document.getElementById('editProductForm');
    if (editProductForm) {
        editProductForm.addEventListener('submit', updateProduct);
    }
}

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
        alertDiv.remove();
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
            minute: '2-digit',
            second: '2-digit'
        });
    }
}

// Global refresh function
function loadDashboard() {
    loadDashboardData();
    showAlert('Dashboard refreshed!', 'success');
}

// Make functions globally available
window.handleLogin = handleLogin;
window.addMenuItem = addMenuItem;
window.updateProduct = updateProduct;
window.deleteProduct = deleteProduct;
window.updateOrderStatus = updateOrderStatus;
window.generateBill = generateBill;
window.printBill = printBill;
window.closeBillModal = closeBillModal;
window.previewImage = previewImage;
window.loadDashboard = loadDashboard;
window.logout = logout;
window.editProduct = editProduct;
