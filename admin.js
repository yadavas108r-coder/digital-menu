const scriptURL = "https://script.google.com/macros/s/AKfycbyYXyDhUbqdhau8XeDdKbKzvsyNJEJ0gL7h2ucTgjZ_cJrxdG6ZkAp-f0ecL7yWDdw/exec";

let salesChart, productsChart;

// ✅ Load Dashboard Data - FIXED VERSION
async function loadDashboard() {
  try {
    showLoading('ordersLoading', 'Loading orders...');
    showLoading('menuLoading', 'Loading menu...');
    
    console.log("🔄 Loading dashboard data...");
    
    // Load all data with timeout protection
    const loadPromises = [
      loadData('getDashboardStats'),
      loadData('getSalesData'), 
      loadData('getTopProducts'),
      loadData('getOrders'),
      loadData('getMenu')
    ];
    
    const results = await Promise.allSettled(loadPromises);
    
    console.log("📦 All data loaded:", results);
    
    // Process results
    const [statsResult, salesResult, productsResult, ordersResult, menuResult] = results;
    
    // Extract data with proper error handling
    const stats = extractData(statsResult);
    const salesData = extractData(salesResult, true);
    const topProducts = extractData(productsResult, true);
    const orders = extractData(ordersResult)?.orders || [];
    const menu = extractData(menuResult)?.menu || [];
    
    console.log("📊 Extracted data:", {
      stats: !!stats,
      salesData: salesData.length,
      topProducts: topProducts.length,
      orders: orders.length,
      menu: menu.length
    });
    
    // Update UI
    updateAnalytics(stats);
    updateSalesChart(salesData);
    updateProductsChart(topProducts);
    updateOrdersTable(orders);
    updateMenuTable(menu);
    
  } catch (err) {
    console.error("❌ Load Error:", err);
    showError('ordersLoading', 'Failed to load data. Please refresh.');
    showError('menuLoading', 'Failed to load data. Please refresh.');
    
    // Show empty states
    updateSalesChart([]);
    updateProductsChart([]);
  }
}

// ✅ Helper function to load data with timeout
async function loadData(action) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(`${scriptURL}?action=${action}`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`❌ Error loading ${action}:`, error);
    return null;
  }
}

// ✅ Helper function to extract data from response
function extractData(result, isArray = false) {
  if (result.status === 'fulfilled' && result.value) {
    const data = result.value;
    if (data.status === 'success') {
      return isArray ? (Array.isArray(data) ? data : []) : data;
    }
  }
  return isArray ? [] : {};
}

// ✅ Update Analytics Cards
function updateAnalytics(stats) {
  if (!stats) return;
  
  document.getElementById("totalOrders").textContent = stats.totalOrders || 0;
  document.getElementById("totalSales").textContent = `₹${stats.totalSales || 0}`;
  document.getElementById("todayOrders").textContent = stats.todayOrders || 0;
  document.getElementById("pendingOrders").textContent = stats.pendingOrders || 0;
}

// ✅ Update Sales Chart
function updateSalesChart(salesData) {
  const ctx = document.getElementById('salesChart');
  if (!ctx) return;
  
  if (!Array.isArray(salesData)) {
    salesData = [];
  }
  
  if (salesChart) {
    salesChart.destroy();
  }
  
  const labels = salesData.length > 0 ? 
    salesData.map(item => {
      try {
        const date = new Date(item.date);
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      } catch (e) {
        return 'Date';
      }
    }) : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  const data = salesData.length > 0 ? 
    salesData.map(item => item.sales || 0) : [0, 0, 0, 0, 0, 0, 0];
  
  salesChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Daily Sales (₹)',
        data: data,
        borderColor: '#ff6b6b',
        backgroundColor: 'rgba(255, 107, 107, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: true
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '₹' + value;
            }
          }
        }
      }
    }
  });
}

// ✅ Update Products Chart
function updateProductsChart(productsData) {
  const ctx = document.getElementById('productsChart');
  if (!ctx) return;
  
  if (!Array.isArray(productsData)) {
    productsData = [];
  }
  
  if (productsChart) {
    productsChart.destroy();
  }
  
  const labels = productsData.length > 0 ? 
    productsData.map(item => {
      const name = item.name || 'Unknown';
      return name.length > 15 ? name.substring(0, 15) + '...' : name;
    }) : ['No Data'];
  
  const data = productsData.length > 0 ? 
    productsData.map(item => item.count || 0) : [0];
  
  productsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Quantity Sold',
        data: data,
        backgroundColor: [
          '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57',
          '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43'
        ],
        borderWidth: 0
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
          beginAtZero: true
        }
      }
    }
  });
}

// ✅ Update Orders Table
function updateOrdersTable(orders) {
  const tbody = document.getElementById("ordersTableBody");
  const table = document.getElementById("ordersTable");
  
  if (!Array.isArray(orders) || orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#666; padding: 20px;">No orders found</td></tr>';
    if (table) table.style.display = 'table';
    hideLoading('ordersLoading');
    return;
  }
  
  tbody.innerHTML = '';
  
  orders.forEach(order => {
    const tr = document.createElement("tr");
    
    // Format items
    let itemsText = 'N/A';
    let itemsArray = [];
    try {
      itemsArray = order.Items ? JSON.parse(order.Items) : [];
      itemsText = itemsArray.map(item => 
        `${item.name} (${item.quantity}x)`
      ).join(', ');
    } catch (e) {
      itemsText = order.Items || 'N/A';
    }
    
    // Format timestamp
    const timestamp = order.Timestamp ? 
      new Date(order.Timestamp).toLocaleString() : 'N/A';
    
    const status = order.Status || 'pending';
    const orderId = order.Timestamp || Math.random().toString(36).substr(2, 9);
    
    tr.innerHTML = `
      <td>${timestamp}</td>
      <td><strong>${order.Name || 'N/A'}</strong></td>
      <td>${order.Phone || 'N/A'}</td>
      <td>${order.Table || 'N/A'}</td>
      <td title="${itemsText}">${itemsText.substring(0, 30)}${itemsText.length > 30 ? '...' : ''}</td>
      <td><strong>₹${parseFloat(order.Total || 0).toFixed(2)}</strong></td>
      <td>
        <span class="status-badge status-${status}">${status}</span>
      </td>
      <td>
        <button class="invoice-btn" onclick="generateBill('${orderId}')">
          🧾 Bill
        </button>
        <button class="complete-btn" onclick="completeOrder('${orderId}')">
          ✅ Complete
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  if (table) table.style.display = 'table';
  hideLoading('ordersLoading');
  console.log("✅ Orders table updated with", orders.length, "orders");
}

// ✅ Update Menu Table
function updateMenuTable(menu) {
  const tbody = document.getElementById("menuTableBody");
  const table = document.getElementById("menuTable");
  
  console.log("🔄 Updating menu table with data:", menu);
  
  if (!Array.isArray(menu) || menu.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#666; padding: 20px;">No menu items found</td></tr>';
    if (table) table.style.display = 'table';
    hideLoading('menuLoading');
    return;
  }
  
  tbody.innerHTML = '';
  
  menu.forEach(item => {
    const tr = document.createElement("tr");
    
    // Extract data with fallbacks
    const name = item.name || item.Name || 'Unknown Item';
    const price = parseFloat(item.price || item.Price || 0);
    const category = item.category || item.Category || 'General';
    const type = (item.type || item.Type || 'veg').toLowerCase();
    
    // Handle image URL
    let imageUrl = item.image || item.Image;
    if (!imageUrl || imageUrl === '' || imageUrl.includes('undefined')) {
      imageUrl = 'https://via.placeholder.com/50x50/ff6b6b/white?text=' + encodeURIComponent(name.substring(0, 2).toUpperCase());
    }
    
    tr.innerHTML = `
      <td><strong>${name}</strong></td>
      <td>₹${price.toFixed(2)}</td>
      <td>${category}</td>
      <td>${type === 'non-veg' ? '🔴' : '🟢'}</td>
      <td>
        <img src="${imageUrl}" 
             alt="${name}" 
             style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px;"
             onerror="this.src='https://via.placeholder.com/50x50/ff6b6b/white?text=IMG'">
      </td>
      <td>
        <button class="delete-btn" onclick="deleteMenuItem('${name.replace(/'/g, "\\'")}')">
          🗑️ Delete
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  if (table) table.style.display = 'table';
  hideLoading('menuLoading');
  console.log("✅ Menu table updated with", menu.length, "items");
}

// ✅ Add Menu Item
async function addMenuItem(event) {
  event.preventDefault();
  
  const name = document.getElementById("itemName").value.trim();
  const price = document.getElementById("itemPrice").value;
  const category = document.getElementById("itemCategory").value.trim();
  const description = document.getElementById("itemDescription").value.trim();
  const type = document.getElementById("itemType").value;
  
  if (!name || !price || !category) {
    alert("Please fill all required fields");
    return false;
  }
  
  try {
    const imageUrl = "https://via.placeholder.com/300x200/ff6b6b/white?text=" + encodeURIComponent(name);
    
    const url = `${scriptURL}?action=addProduct&name=${encodeURIComponent(name)}&price=${price}&category=${encodeURIComponent(category)}&description=${encodeURIComponent(description)}&type=${type}&image=${encodeURIComponent(imageUrl)}`;
    
    console.log("📤 Adding item:", url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    
    const result = await response.json();
    
    if (result.status === 'success') {
      alert('✅ Item added successfully!');
      event.target.reset();
      document.getElementById('imagePreview').innerHTML = '<span>Image Preview</span>';
      loadDashboard();
    } else {
      alert('❌ Failed to add item: ' + (result.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Add item error:', error);
    alert('❌ Network error adding item: ' + error.message);
  }
  
  return false;
}

// ✅ Delete Menu Item
async function deleteMenuItem(itemName) {
  if (!confirm(`Are you sure you want to delete "${itemName}"?`)) {
    return;
  }
  
  try {
    const response = await fetch(`${scriptURL}?action=deleteProduct&name=${encodeURIComponent(itemName)}`);
    
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    
    const result = await response.json();
    
    if (result.status === 'success') {
      alert('✅ Item deleted successfully!');
      loadDashboard();
    } else {
      alert('❌ Failed to delete item: ' + (result.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Delete item error:', error);
    alert('❌ Network error deleting item: ' + error.message);
  }
}

// ✅ Generate Bill
async function generateBill(orderId) {
  try {
    console.log("🧾 Generating bill for order:", orderId);
    
    const response = await fetch(`${scriptURL}?action=generateBill&orderId=${encodeURIComponent(orderId)}`);
    
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    
    const result = await response.json();
    
    if (result.status === 'success') {
      displayBill(result.bill);
    } else {
      alert('❌ Failed to generate bill: ' + (result.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Generate bill error:', error);
    alert('❌ Error generating bill: ' + error.message);
  }
}

// ✅ Display Bill
function displayBill(billData) {
  console.log("📄 Displaying bill:", billData);
  
  // Populate bill data
  document.getElementById('billOrderId').textContent = billData.orderId || 'N/A';
  document.getElementById('billTimestamp').textContent = billData.timestamp ? 
    new Date(billData.timestamp).toLocaleString() : 'N/A';
  document.getElementById('billCustomerName').textContent = billData.customerName || 'N/A';
  document.getElementById('billCustomerPhone').textContent = billData.customerPhone || 'N/A';
  document.getElementById('billTableNumber').textContent = billData.tableNumber || 'N/A';
  document.getElementById('billStatus').textContent = billData.status || 'pending';
  document.getElementById('billTotalAmount').textContent = `₹${parseFloat(billData.totalAmount || 0).toFixed(2)}`;
  
  // Populate items
  const itemsList = document.getElementById('billItemsList');
  itemsList.innerHTML = '';
  
  if (billData.items && Array.isArray(billData.items)) {
    billData.items.forEach(item => {
      const itemElement = document.createElement('div');
      itemElement.className = 'bill-item';
      itemElement.innerHTML = `
        <div class="item-name">${item.name || 'Unknown Item'}</div>
        <div class="item-quantity">${item.quantity || 1}x</div>
        <div class="item-price">₹${parseFloat(item.price || 0).toFixed(2)}</div>
      `;
      itemsList.appendChild(itemElement);
    });
  } else {
    itemsList.innerHTML = '<div class="bill-item"><div class="item-name">No items found</div></div>';
  }
  
  // Show modal
  document.getElementById('billModal').style.display = 'block';
}

// ✅ Close Bill Modal
function closeBillModal() {
  document.getElementById('billModal').style.display = 'none';
}

// ✅ Print Bill
function printBill() {
  window.print();
}

// ✅ Complete Order
async function completeOrder(orderId) {
  if (confirm('Mark this order as completed?')) {
    try {
      const response = await fetch(`${scriptURL}?action=updateOrderStatus&orderId=${encodeURIComponent(orderId)}&status=completed`);
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const result = await response.json();
      
      if (result.status === 'success') {
        alert('✅ Order marked as completed!');
        loadDashboard();
      } else {
        alert('❌ Failed to update order status: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Complete order error:', error);
      alert('❌ Error completing order: ' + error.message);
    }
  }
}

// ✅ Image Preview
function previewImage(input) {
  const preview = document.getElementById('imagePreview');
  
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
      preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
    };
    
    reader.readAsDataURL(input.files[0]);
  } else {
    preview.innerHTML = '<span>Image Preview</span>';
  }
}

// ✅ Utility Functions
function showLoading(elementId, message = 'Loading...') {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = message;
    element.style.display = 'block';
  }
}

function hideLoading(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.style.display = 'none';
  }
}

function showError(elementId, message) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = `<div class="error">${message}</div>`;
    element.style.display = 'block';
  }
}

// ✅ Close modal when clicking outside
window.onclick = function(event) {
  const modal = document.getElementById('billModal');
  if (event.target === modal) {
    closeBillModal();
  }
}

// ✅ Run on page load
document.addEventListener("DOMContentLoaded", function() {
  console.log("🚀 Admin dashboard initialized");
  loadDashboard();
});

// ✅ Auto-refresh every 30 seconds
setInterval(loadDashboard, 30000);
