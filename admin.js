const scriptURL = "https://script.google.com/macros/s/AKfycbyYXyDhUbqdhau8XeDdKbKzvsyNJEJ0gL7h2ucTgjZ_cJrxdG6ZkAp-f0ecL7yWDdw/exec";

let salesChart, productsChart;

// ✅ Test individual API calls
async function testAPIs() {
  console.log("🧪 Testing APIs...");
  
  const actions = ['getMenu', 'getOrders', 'getDashboardStats', 'getSalesData', 'getTopProducts'];
  
  for (let action of actions) {
    try {
      console.log(`🔍 Testing ${action}...`);
      const url = `${scriptURL}?action=${action}`;
      console.log(`📡 URL: ${url}`);
      
      const response = await fetch(url);
      console.log(`📊 ${action} Response status:`, response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ${action} Success:`, data);
      } else {
        console.log(`❌ ${action} Failed:`, response.status);
      }
    } catch (error) {
      console.log(`💥 ${action} Error:`, error.message);
    }
    console.log('---');
  }
}

// ✅ Simple Load Dashboard
async function loadDashboard() {
  console.log("🚀 Starting dashboard load...");
  
  showLoading('ordersLoading', 'Loading orders...');
  showLoading('menuLoading', 'Loading menu...');
  
  try {
    // Test APIs first
    await testAPIs();
    
    // Then load actual data
    console.log("📥 Loading actual data...");
    
    const menuResponse = await fetch(`${scriptURL}?action=getMenu`);
    console.log("📋 Menu response:", menuResponse);
    
    if (menuResponse.ok) {
      const menuData = await menuResponse.json();
      console.log("📋 Menu data:", menuData);
      updateMenuTable(menuData.menu || []);
    } else {
      console.log("❌ Menu failed:", menuResponse.status);
      showError('menuLoading', 'Menu loading failed');
    }
    
    const ordersResponse = await fetch(`${scriptURL}?action=getOrders`);
    console.log("📦 Orders response:", ordersResponse);
    
    if (ordersResponse.ok) {
      const ordersData = await ordersResponse.json();
      console.log("📦 Orders data:", ordersData);
      updateOrdersTable(ordersData.orders || []);
    } else {
      console.log("❌ Orders failed:", ordersResponse.status);
      showError('ordersLoading', 'Orders loading failed');
    }
    
    // Load other data
    try {
      const statsResponse = await fetch(`${scriptURL}?action=getDashboardStats`);
      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        updateAnalytics(stats);
      }
    } catch (e) { console.log("Stats error:", e); }
    
    try {
      const salesResponse = await fetch(`${scriptURL}?action=getSalesData`);
      if (salesResponse.ok) {
        const salesData = await salesResponse.json();
        updateSalesChart(Array.isArray(salesData) ? salesData : []);
      }
    } catch (e) { console.log("Sales error:", e); }
    
    try {
      const productsResponse = await fetch(`${scriptURL}?action=getTopProducts`);
      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        updateProductsChart(Array.isArray(productsData) ? productsData : []);
      }
    } catch (e) { console.log("Products error:", e); }
    
  } catch (error) {
    console.error("💥 Main load error:", error);
    showError('ordersLoading', 'Failed to load: ' + error.message);
    showError('menuLoading', 'Failed to load: ' + error.message);
  }
}

// ✅ Update Analytics Cards
function updateAnalytics(stats) {
  console.log("📊 Updating analytics:", stats);
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
  
  console.log("📈 Updating sales chart:", salesData);
  
  if (salesChart) salesChart.destroy();
  
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const data = [0, 0, 0, 0, 0, 0, 0];
  
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
      plugins: { legend: { display: true } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: value => '₹' + value }
        }
      }
    }
  });
}

// ✅ Update Products Chart
function updateProductsChart(productsData) {
  const ctx = document.getElementById('productsChart');
  if (!ctx) return;
  
  console.log("🏆 Updating products chart:", productsData);
  
  if (productsChart) productsChart.destroy();
  
  const labels = ['No Data'];
  const data = [0];
  
  productsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Quantity Sold',
        data: data,
        backgroundColor: ['#ff6b6b'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

// ✅ Update Orders Table
function updateOrdersTable(orders) {
  const tbody = document.getElementById("ordersTableBody");
  const table = document.getElementById("ordersTable");
  
  console.log("📦 Updating orders table with:", orders);
  
  if (!Array.isArray(orders) || orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#666; padding: 20px;">No orders found</td></tr>';
    if (table) table.style.display = 'table';
    hideLoading('ordersLoading');
    console.log("📦 No orders to display");
    return;
  }
  
  tbody.innerHTML = '';
  
  orders.forEach(order => {
    const tr = document.createElement("tr");
    
    let itemsText = 'N/A';
    try {
      const items = order.Items ? JSON.parse(order.Items) : [];
      itemsText = items.map(item => `${item.name} (${item.quantity}x)`).join(', ');
    } catch (e) {
      itemsText = order.Items || 'N/A';
    }
    
    const timestamp = order.Timestamp ? new Date(order.Timestamp).toLocaleString() : 'N/A';
    const status = order.Status || 'pending';
    const orderId = order.Timestamp || Math.random().toString(36).substr(2, 9);
    
    tr.innerHTML = `
      <td>${timestamp}</td>
      <td><strong>${order.Name || 'N/A'}</strong></td>
      <td>${order.Phone || 'N/A'}</td>
      <td>${order.Table || 'N/A'}</td>
      <td title="${itemsText}">${itemsText.substring(0, 30)}${itemsText.length > 30 ? '...' : ''}</td>
      <td><strong>₹${parseFloat(order.Total || 0).toFixed(2)}</strong></td>
      <td><span class="status-badge status-${status}">${status}</span></td>
      <td>
        <button class="invoice-btn" onclick="generateBill('${orderId}')">🧾 Bill</button>
        <button class="complete-btn" onclick="completeOrder('${orderId}')">✅ Complete</button>
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
  
  console.log("📋 Updating menu table with:", menu);
  
  if (!Array.isArray(menu) || menu.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#666; padding: 20px;">No menu items found</td></tr>';
    if (table) table.style.display = 'table';
    hideLoading('menuLoading');
    console.log("📋 No menu items to display");
    return;
  }
  
  tbody.innerHTML = '';
  
  menu.forEach(item => {
    const tr = document.createElement("tr");
    
    const name = item.name || item.Name || 'Unknown Item';
    const price = parseFloat(item.price || item.Price || 0);
    const category = item.category || item.Category || 'General';
    const type = (item.type || item.Type || 'veg').toLowerCase();
    let imageUrl = item.image || item.Image;
    
    if (!imageUrl || imageUrl === '' || imageUrl.includes('undefined')) {
      imageUrl = 'https://via.placeholder.com/50x50/ff6b6b/white?text=' + encodeURIComponent(name.substring(0, 2).toUpperCase());
    }
    
    tr.innerHTML = `
      <td><strong>${name}</strong></td>
      <td>₹${price.toFixed(2)}</td>
      <td>${category}</td>
      <td>${type === 'non-veg' ? '🔴' : '🟢'}</td>
      <td><img src="${imageUrl}" alt="${name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px;" onerror="this.src='https://via.placeholder.com/50x50/ff6b6b/white?text=IMG'"></td>
      <td><button class="delete-btn" onclick="deleteMenuItem('${name.replace(/'/g, "\\'")}')">🗑️ Delete</button></td>
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
    
    if (!response.ok) throw new Error('Network response was not ok');
    
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
  if (!confirm(`Are you sure you want to delete "${itemName}"?`)) return;
  
  try {
    const response = await fetch(`${scriptURL}?action=deleteProduct&name=${encodeURIComponent(itemName)}`);
    if (!response.ok) throw new Error('Network response was not ok');
    
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
    
    if (!response.ok) throw new Error('Network response was not ok');
    
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
  
  document.getElementById('billOrderId').textContent = billData.orderId || 'N/A';
  document.getElementById('billTimestamp').textContent = billData.timestamp ? new Date(billData.timestamp).toLocaleString() : 'N/A';
  document.getElementById('billCustomerName').textContent = billData.customerName || 'N/A';
  document.getElementById('billCustomerPhone').textContent = billData.customerPhone || 'N/A';
  document.getElementById('billTableNumber').textContent = billData.tableNumber || 'N/A';
  document.getElementById('billStatus').textContent = billData.status || 'pending';
  document.getElementById('billTotalAmount').textContent = `₹${parseFloat(billData.totalAmount || 0).toFixed(2)}`;
  
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
      if (!response.ok) throw new Error('Network response was not ok');
      
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
