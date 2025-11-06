// =============================================
// ✅ SCRIPT_URL - YEH USE KARO
// =============================================
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx_sJ3kh3o6xJSxHDl4dCsG8TrNmuTnjgtl9ttG3QEKp1fJuehqeI_cf4YnCHJcXIdC/exec';

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
        const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
        
        const script = document.createElement('script');
        script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + callbackName;
        
        window[callbackName] = function(data) {
            delete window[callbackName];
            document.head.removeChild(script);
            
            if (data && data.status === 'error') {
                reject(new Error(data.error || 'Server error'));
            } else {
                resolve(data);
            }
        };
        
        script.onerror = function() {
            delete window[callbackName];
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
            reject(new Error('Network error - Check script URL'));
        };
        
        // Timeout after 10 seconds
        setTimeout(() => {
            if (window[callbackName]) {
                delete window[callbackName];
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                reject(new Error('Request timeout'));
            }
        }, 10000);
        
        document.head.appendChild(script);
    });
}

// =============================================
// UTILITY FUNCTIONS
// =============================================
function showLoading(section) {
    const loadingElement = document.getElementById(section + 'Loading');
    if (loadingElement) {
        loadingElement.style.display = 'block';
        loadingElement.innerHTML = '<div class="loading">Loading ' + section + '...</div>';
    }
}

function hideLoading(section) {
    const loadingElement = document.getElementById(section + 'Loading');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
}

function showAlert(message, type = 'info') {
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
    
    document.body.appendChild(alertDiv);
    
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
// ✅ DASHBOARD FUNCTIONS
// =============================================
function showDashboard() {
    const loginSection = document.getElementById('loginSection');
    const dashboardSection = document.getElementById('dashboardSection');
    
    if (loginSection) loginSection.style.display = 'none';
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

// ✅ FIX: Better items parsing
function parseOrderItems(itemsJson) {
    try {
        if (!itemsJson) return [];
        
        if (typeof itemsJson === 'string') {
            // Try to parse JSON
            try {
                const parsed = JSON.parse(itemsJson);
                if (Array.isArray(parsed)) {
                    return parsed.map(item => ({
                        name: item.name || 'Item',
                        price: parseFloat(item.price) || 0,
                        quantity: parseInt(item.quantity) || 1
                    }));
                }
            } catch (e) {
                // If JSON parsing fails, check if it's a number
                const numericValue = parseFloat(itemsJson);
                if (!isNaN(numericValue)) {
                    return [{
                        name: 'Order Total',
                        price: numericValue,
                        quantity: 1
                    }];
                }
                // Return as single item
                return [{
                    name: itemsJson,
                    price: 0,
                    quantity: 1
                }];
            }
        }
        
        if (Array.isArray(itemsJson)) {
            return itemsJson.map(item => ({
                name: item.name || 'Item',
                price: parseFloat(item.price) || 0,
                quantity: parseInt(item.quantity) || 1
            }));
        }
        
        return [];
    } catch (e) {
        console.error('Parse items error:', e);
        return [];
    }
}

function calculateOrderTotal(items) {
    return items.reduce((total, item) => total + (parseFloat(item.price) * parseInt(item.quantity)), 0);
}

// ✅ FIX: Better orders rendering
function renderOrdersTable(orders) {
    const tbody = document.getElementById('ordersTableBody');
    const ordersTable = document.getElementById('ordersTable');
    const ordersLoading = document.getElementById('ordersLoading');
    
    if (!tbody || !ordersTable || !ordersLoading) return;
    
    if (!orders || orders.length === 0) {
        ordersTable.style.display = 'none';
        ordersLoading.innerHTML = '<div class="loading">No orders found</div>';
        ordersLoading.style.display = 'block';
        return;
    }

    const ordersHtml = orders.map(order => {
        // ✅ FIX: Better timestamp handling
        let orderDate;
        try {
            orderDate = new Date(order.Timestamp || order.Date || order.timestamp).toLocaleString('en-IN');
        } catch (e) {
            orderDate = 'Invalid Date';
        }
        
        // ✅ FIX: Better items parsing
        const items = parseOrderItems(order.Items || order.items);
        const totalAmount = order.Total || order.totalAmount || calculateOrderTotal(items);
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
                <td><strong>₹${parseFloat(totalAmount).toFixed(2)}</strong></td>
                <td>
                    <span class="status-badge status-${status}">
                        ${status}
                    </span>
                </td>
                <td>
                    <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                        <button class="invoice-btn" onclick="generateBill('${orderId}')">
                            🧾 Bill
                        </button>
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
        menuLoading.innerHTML = '<div class="loading">No products found</div>';
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
        
        console.log('🚀 Loading dashboard data...');
        
        // Load all data in parallel
        const [stats, ordersData, productsData] = await Promise.all([
            jsonpRequest(SCRIPT_URL + '?action=getDashboardStats'),
            jsonpRequest(SCRIPT_URL + '?action=getOrders'),
            jsonpRequest(SCRIPT_URL + '?action=getAllProducts')
        ]);

        console.log('✅ Data loaded:', {
            stats: stats,
            orders: ordersData.orders?.length || 0,
            products: productsData.products?.length || 0
        });

        // Update UI
        updateDashboardStats(stats);
        allOrders = ordersData.orders || [];
        allProducts = productsData.products || [];
        
        renderOrdersTable(allOrders);
        renderProductsTable(allProducts);
        
        hideLoading('dashboard');
        
        // Show success message
        if (allOrders.length > 0 || allProducts.length > 0) {
            showAlert(`Dashboard loaded successfully! Orders: ${allOrders.length}, Products: ${allProducts.length}`, 'success');
        } else {
            showAlert('Dashboard loaded but no data found. Add some orders and products!', 'info');
        }
        
    } catch (error) {
        console.error('❌ Dashboard load error:', error);
        
        let errorMessage = 'Failed to load data: ' + error.message;
        if (error.message.includes('Network error')) {
            errorMessage = 'Cannot connect to server. Please check your internet connection and try again.';
        } else if (error.message.includes('timeout')) {
            errorMessage = 'Server is taking too long to respond. Please try again.';
        }
        
        showAlert(errorMessage, 'error');
        
        // Show empty state
        updateDashboardStats({ totalOrders: 0, totalSales: 0, todayOrders: 0, pendingOrders: 0 });
        renderOrdersTable([]);
        renderProductsTable([]);
        
        hideLoading('dashboard');
    }
}

// =============================================
// CHART FUNCTIONS
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
                    data: [1200, 1900, 1500, 2000, 1800, 2500, 2200],
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
                labels: ['Vanilla', 'Chocolate', 'Strawberry', 'Butterscotch'],
                datasets: [{
                    label: 'Orders',
                    data: [45, 38, 32, 28],
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
        console.log('Adding product:', productData);
        
        const result = await jsonpRequest(
            SCRIPT_URL + '?action=addProduct&' + 
            'name=' + encodeURIComponent(productData.name) +
            '&price=' + productData.price +
            '&category=' + encodeURIComponent(productData.category) +
            '&type=' + encodeURIComponent(productData.type) +
            '&description=' + encodeURIComponent(productData.description) +
            '&image=' + encodeURIComponent(productData.image)
        );

        console.log('Add product result:', result);

        if (result.success) {
            showAlert('✅ Product added successfully!', 'success');
            document.querySelector('.menu-form').reset();
            resetImagePreview();
            // Reload products
            setTimeout(() => loadDashboardData(), 1000);
        } else {
            showAlert(`❌ Failed to add product: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Add product error:', error);
        showAlert(`❌ Error: ${error.message}`, 'error');
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
        const result = await jsonpRequest(
            SCRIPT_URL + '?action=updateProduct&' +
            'oldName=' + encodeURIComponent(productData.oldName) +
            '&name=' + encodeURIComponent(productData.name) +
            '&price=' + productData.price +
            '&category=' + encodeURIComponent(productData.category) +
            '&type=' + encodeURIComponent(productData.type) +
            '&description=' + encodeURIComponent(productData.description) +
            '&image=' + encodeURIComponent(productData.image)
        );

        if (result.success) {
            showAlert('✅ Product updated successfully!', 'success');
            closeModal('editProductModal');
            loadDashboardData();
        } else {
            showAlert(`❌ Failed to update product: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Update product error:', error);
        showAlert(`❌ Error: ${error.message}`, 'error');
    }
}

async function deleteProduct(productName) {
    if (!confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
        return;
    }

    try {
        const result = await jsonpRequest(SCRIPT_URL + '?action=deleteProduct&name=' + encodeURIComponent(productName));

        if (result.success) {
            showAlert('✅ Product deleted successfully!', 'success');
            closeModal('editProductModal');
            loadDashboardData();
        } else {
            showAlert(`❌ Failed to delete product: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Delete product error:', error);
        showAlert(`❌ Error: ${error.message}`, 'error');
    }
}

// =============================================
// ORDER OPERATIONS
// =============================================
// ✅ FIX: Better order status update with logging
async function updateOrderStatus(orderId, status) {
    try {
        console.log('Updating order status:', { orderId, status });
        
        const result = await jsonpRequest(
            SCRIPT_URL + '?action=updateOrderStatus&orderId=' + 
            encodeURIComponent(orderId) + '&status=' + status
        );

        console.log('Status update result:', result);

        if (result.success) {
            showAlert(`✅ Order marked as ${status}!`, 'success');
            // Reload data to reflect changes
            setTimeout(() => loadDashboardData(), 1000);
        } else {
            showAlert(`❌ Failed to update order: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Order status update error:', error);
        showAlert(`❌ Error: ${error.message}`, 'error');
    }
}

// ✅ FIX: Better bill generation with logging
async function generateBill(orderId) {
    try {
        console.log('Generating bill for:', orderId);
        
        const result = await jsonpRequest(
            SCRIPT_URL + '?action=generateBill&orderId=' + encodeURIComponent(orderId)
        );

        console.log('Bill generation result:', result);

        if (result.success) {
            renderBill(result.bill);
            showModal('billModal');
        } else {
            showAlert(`❌ Failed to generate bill: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Bill generation error:', error);
        showAlert(`❌ Error: ${error.message}`, 'error');
    }
}

function renderBill(bill) {
    const billContent = document.getElementById('billContent');
    if (!billContent) return;
    
    const items = bill.items || [];
    const total = bill.totalAmount || calculateOrderTotal(items);
    
    const billHtml = `
        <div class="bill-header">
            <h2>🍦 Yadava's Ice Cream</h2>
            <p>Delicious & Fresh</p>
        </div>
        
        <div class="bill-info">
            <div class="bill-info-item">
                <strong>Order ID:</strong>
                <span>${bill.orderId || 'N/A'}</span>
            </div>
            <div class="bill-info-item">
                <strong>Date & Time:</strong>
                <span>${new Date(bill.timestamp).toLocaleString('en-IN')}</span>
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

// ✅ FIX: ADDED MISSING printBill FUNCTION
function printBill() {
    console.log('Printing bill...');
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
    // Form submissions
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
    console.log('🚀 Admin Panel Starting...');
    
    // Direct access to dashboard
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
    showAlert('Dashboard refreshed!', 'success');
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        window.location.reload();
    }
}

// =============================================
// ✅ GLOBAL FUNCTION EXPORTS - COMPLETE LIST
// =============================================
window.addMenuItem = addMenuItem;
window.updateProduct = updateProduct;
window.deleteProduct = deleteProduct;
window.updateOrderStatus = updateOrderStatus;
window.generateBill = generateBill;
window.printBill = printBill; // ✅ ADDED THIS
window.closeBillModal = closeBillModal;
window.previewImage = previewImage;
window.previewEditImage = previewEditImage;
window.loadDashboard = loadDashboard;
window.editProduct = editProduct;
window.closeModal = closeModal;
window.logout = logout;

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAdminPanel);
} else {
    initializeAdminPanel();
}
