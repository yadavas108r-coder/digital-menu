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
// JSONP HELPER FUNCTION (NO CORS ISSUES)
// =============================================
function jsonpRequest(url, callback) {
    return new Promise((resolve, reject) => {
        const callbackName = 'jsonp_callback_' + Date.now() + '_' + Math.random().toString(36).substr(2);
        
        const script = document.createElement('script');
        script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + callbackName;
        
        window[callbackName] = function(data) {
            delete window[callbackName];
            document.head.removeChild(script);
            resolve(data);
        };
        
        script.onerror = function() {
            delete window[callbackName];
            document.head.removeChild(script);
            reject(new Error('JSONP request failed'));
        };
        
        document.head.appendChild(script);
    });
}

// =============================================
// INITIALIZATION
// =============================================
function initializeAdminPanel() {
    console.log('🚀 Admin Panel Initializing...');
    console.log('✅ SCRIPT_URL is defined:', typeof SCRIPT_URL !== 'undefined');
    
    checkAuthentication();
    initializeCharts();
    setupEventListeners();
    updateCurrentTime();
    setInterval(updateCurrentTime, 60000);
}

// Wait for DOM to be fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAdminPanel);
} else {
    initializeAdminPanel();
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
    loadDashboardData();
}

function logout() {
    localStorage.removeItem('adminUser');
    currentUser = null;
    showLogin();
    showAlert('Logged out successfully', 'success');
}

// =============================================
// LOGIN HANDLER - JSONP VERSION (NO CORS)
// =============================================
async function handleLogin(e) {
    e.preventDefault();
    
    console.log('🔐 Login button clicked');
    
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) {
        console.error('❌ Login form not found');
        return;
    }
    
    const formData = new FormData(loginForm);
    const credentials = {
        username: formData.get('username'),
        password: formData.get('password')
    };

    console.log('🔐 Attempting login with:', credentials);

    const loginBtn = loginForm.querySelector('button');
    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';
    }

    try {
        // ✅ Use JSONP instead of fetch to avoid CORS
        const url = `${SCRIPT_URL}?action=adminLogin&username=${encodeURIComponent(credentials.username)}&password=${encodeURIComponent(credentials.password)}`;
        const data = await jsonpRequest(url);
        
        console.log('📨 Login response:', data);

        if (data.success) {
            localStorage.setItem('adminUser', JSON.stringify(data.user));
            currentUser = data.user;
            showDashboard();
            showAlert('Login successful! Welcome back!', 'success');
        } else {
            showAlert(data.error || 'Invalid username or password', 'error', document.getElementById('loginAlert'));
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
// DASHBOARD DATA LOADING - JSONP VERSION
// =============================================
async function loadDashboardData() {
    try {
        showLoading('dashboard');
        
        console.log('📊 Loading dashboard data via JSONP');
        
        // Load all data using JSONP
        const [stats, ordersData, productsData, salesData, topProducts] = await Promise.all([
            jsonpRequest(SCRIPT_URL + '?action=getDashboardStats'),
            jsonpRequest(SCRIPT_URL + '?action=getOrders'),
            jsonpRequest(SCRIPT_URL + '?action=getAllProducts'),
            jsonpRequest(SCRIPT_URL + '?action=getSalesData'),
            jsonpRequest(SCRIPT_URL + '?action=getTopProducts')
        ]);

        console.log('📈 Data loaded successfully');

        updateDashboardStats(stats);
        allOrders = ordersData.orders || [];
        allProducts = productsData.products || [];
        
        renderOrdersTable(allOrders);
        renderProductsTable(allProducts);
        updateCharts(salesData, topProducts);
        
        hideLoading('dashboard');
        
    } catch (error) {
        console.error('❌ Dashboard load error:', error);
        showAlert('Failed to load dashboard data: ' + error.message, 'error');
        hideLoading('dashboard');
    }
}

// ... (keep all other functions the same as previous admin.js)

// =============================================
// GLOBAL FUNCTION EXPORTS
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
