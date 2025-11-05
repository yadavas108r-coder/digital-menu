const scriptURL = "https://script.google.com/macros/s/AKfycbyYXyDhUbqdhau8XeDdKbKzvsyNJEJ0gL7h2ucTgjZ_cJrxdG6ZkAp-f0ecL7yWDdw/exec";

let salesChart, productsChart;

// ✅ Load Dashboard Data
async function loadDashboard() {
  try {
    showLoading('ordersLoading', 'Loading orders...');
    showLoading('menuLoading', 'Loading menu...');
    
    console.log("🔄 Loading dashboard data...");
    
    // Load all data simultaneously
    const [statsResponse, salesResponse, productsResponse, ordersResponse, menuResponse] = await Promise.all([
      fetch(`${scriptURL}?action=getDashboardStats`).catch(handleFetchError),
      fetch(`${scriptURL}?action=getSalesData`).catch(handleFetchError),
      fetch(`${scriptURL}?action=getTopProducts`).catch(handleFetchError),
      fetch(`${scriptURL}?action=getOrders`).catch(handleFetchError),
      fetch(`${scriptURL}?action=getMenu`).catch(handleFetchError)
    ]);
    
    // Check if responses are valid
    if (!statsResponse || !salesResponse || !productsResponse || !ordersResponse || !menuResponse) {
      throw new Error('Some API requests failed');
    }
    
    const stats = await statsResponse.json().catch(handleJsonError);
    const salesData = await salesResponse.json().catch(handleJsonError);
    const topProducts = await productsResponse.json().catch(handleJsonError);
    const ordersData = await ordersResponse.json().catch(handleJsonError);
    const menuData = await menuResponse.json().catch(handleJsonError);
    
    console.log("📊 API Responses:", { stats, salesData, topProducts, ordersData, menuData });
    
    // Update dashboard with proper error handling
    if (stats && stats.status === 'success') {
      updateAnalytics(stats);
    } else {
      console.error('Stats data error:', stats);
    }
    
    if (salesData && salesData.status === 'success' && Array.isArray(salesData)) {
      updateSalesChart(salesData);
    } else {
      console.error('Sales data error or not array:', salesData);
      updateSalesChart([]); // Pass empty array
    }
    
    if (topProducts && topProducts.status === 'success' && Array.isArray(topProducts)) {
      updateProductsChart(topProducts);
    } else {
      console.error('Products data error or not array:', topProducts);
      updateProductsChart([]); // Pass empty array
    }
    
    if (ordersData && ordersData.status === 'success') {
      updateOrdersTable(ordersData.orders);
    } else {
      showError('ordersLoading', 'Failed to load orders');
    }
    
    if (menuData && menuData.status === 'success') {
      updateMenuTable(menuData.menu);
    } else {
      showError('menuLoading', 'Failed to load menu');
    }
    
  } catch (err) {
    console.error("❌ Load Error:", err);
    showError('ordersLoading', 'Network error loading data: ' + err.message);
    showError('menuLoading', 'Network error loading data: ' + err.message);
    
    // Initialize charts with empty data
    updateSalesChart([]);
    updateProductsChart([]);
  }
}

// ✅ Update Analytics Cards
function updateAnalytics(stats) {
  if (!stats) return;
  
  document.getElementById("totalOrders").textContent = stats.totalOrders || 0;
  document.getElementById("totalSales").textContent = `₹${stats.totalSales || 0}`;
  document.getElementById("todayOrders").textContent = stats.todayOrders || 0;
  document.getElementById("pendingOrders").textContent = stats.pendingOrders || 0;
}

// ✅ Update Sales Chart with proper error handling
function updateSalesChart(salesData) {
  const ctx = document.getElementById('salesChart');
  if (!ctx) return;
  
  // Ensure salesData is an array
  if (!Array.isArray(salesData)) {
    console.error('Sales data is not an array:', salesData);
    salesData = [];
  }
  
  if (salesChart) {
    salesChart.destroy();
  }
  
  const labels = salesData.map(item => {
    try {
      const date = new Date(item.date);
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } catch (e) {
      return 'Invalid Date';
    }
  });
  
  const data = salesData.map(item => item.sales || 0);
  
  // If no data, show placeholder
  if (salesData.length === 0) {
    labels.push('No Data');
    data.push(0);
  }
  
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

// ✅ Update Products Chart with proper error handling
function updateProductsChart(productsData) {
  const ctx = document.getElementById('productsChart');
  if (!ctx) return;
  
  // Ensure productsData is an array
  if (!Array.isArray(productsData)) {
    console.error('Products data is not an array:', productsData);
    productsData = [];
  }
  
  if (productsChart) {
    productsChart.destroy();
  }
  
  const labels = productsData.map(item => {
    const name = item.name || 'Unknown';
    return name.length > 15 ? name.substring(0, 15) + '...' : name;
  });
  
  const data = productsData.map(item => item.count || 0);
  
  // If no data, show placeholder
  if (productsData.length === 0) {
    labels.push('No Products');
    data.push(0);
  }
  
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
  
  if (!orders || !Array.isArray(orders) || orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#666;">No orders found</td></tr>';
    if (table) table.style.display = 'table';
    hideLoading('ordersLoading');
    return;
  }
  
  tbody.innerHTML = '';
  
  orders.forEach(order => {
    const tr = document.createElement("tr");
    
    // Format items for display
    let itemsText = 'N/A';
    try {
      const items = order.Items ? JSON.parse(order.Items) : [];
      itemsText = items.map(item => 
        `${item.name} (${item.quantity}x)`
      ).join(', ');
    } catch (e) {
      itemsText = order.Items || 'N/A';
    }
    
    // Format timestamp
    const timestamp = order.Timestamp ? 
      new Date(order.Timestamp).toLocaleString() : 'N/A';
    
    const status = order.Status || 'pending';
    
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
        <button class="complete-btn" onclick="completeOrder('${order.Timestamp}')">
          ✅ Complete
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  if (table) table.style.display = 'table';
  hideLoading('ordersLoading');
}

// ✅ Update Menu Table
function updateMenuTable(menu) {
  const tbody = document.getElementById("menuTableBody");
  const table = document.getElementById("menuTable");
  
  if (!menu || !Array.isArray(menu) || menu.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#666;">No menu items found</td></tr>';
    if (table) table.style.display = 'table';
    hideLoading('menuLoading');
    return;
  }
  
  tbody.innerHTML = '';
  
  menu.forEach(item => {
    const tr = document.createElement("tr");
    const imageUrl = item.Image || item.image || 'https://via.placeholder.com/50x50?text=No+Image';
    
    tr.innerHTML = `
      <td><strong>${item.Name || item.name}</strong></td>
      <td>₹${parseFloat(item.Price || item.price).toFixed(2)}</td>
      <td>${item.Category || item.category}</td>
      <td>${(item.Type || item.type) === 'non-veg' ? '🔴' : '🟢'}</td>
      <td>
        <img src="${imageUrl}" alt="${item.Name || item.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px;">
      </td>
      <td>
        <button class="delete-btn" onclick="deleteMenuItem('${item.Name || item.name}')">
          🗑️ Delete
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  if (table) table.style.display = 'table';
  hideLoading('menuLoading');
}

// ✅ Error handling functions
function handleFetchError(error) {
  console.error('Fetch error:', error);
  return null;
}

function handleJsonError(error) {
  console.error('JSON parse error:', error);
  return null;
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
    
    const response = await fetch(`${scriptURL}?action=addProduct&name=${encodeURIComponent(name)}&price=${price}&category=${encodeURIComponent(category)}&description=${encodeURIComponent(description)}&type=${type}&image=${encodeURIComponent(imageUrl)}`);
    
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

// ✅ Complete Order
async function completeOrder(orderId) {
  if (confirm('Mark this order as completed?')) {
    alert('Order marked as completed!');
    loadDashboard();
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

// ✅ Run on page load
document.addEventListener("DOMContentLoaded", loadDashboard);

// ✅ Auto-refresh every 30 seconds
setInterval(loadDashboard, 30000);
