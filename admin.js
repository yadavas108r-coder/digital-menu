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
    
    const statsData = await statsResponse.json().catch(handleJsonError);
    const salesResponseData = await salesResponse.json().catch(handleJsonError);
    const productsResponseData = await productsResponse.json().catch(handleJsonError);
    const ordersData = await ordersResponse.json().catch(handleJsonError);
    const menuData = await menuResponse.json().catch(handleJsonError);
    
    console.log("📊 Raw API Responses:", { 
      statsData, 
      salesResponseData, 
      productsResponseData, 
      ordersData, 
      menuData 
    });
    
    // ✅ FIX: Properly extract data from nested objects
    const stats = (statsData && statsData.status === 'success') ? statsData : {};
    
    // Fix for salesData - it's coming as object with numeric keys
    let salesData = [];
    if (salesResponseData && salesResponseData.status === 'success') {
      if (Array.isArray(salesResponseData)) {
        salesData = salesResponseData;
      } else if (salesResponseData.salesData) {
        salesData = salesResponseData.salesData;
      } else {
        // Convert object with numeric keys to array
        salesData = Object.keys(salesResponseData)
          .filter(key => !isNaN(key))
          .map(key => salesResponseData[key])
          .filter(item => item && typeof item === 'object');
      }
    }
    
    // Fix for topProducts
    let topProducts = [];
    if (productsResponseData && productsResponseData.status === 'success') {
      if (Array.isArray(productsResponseData)) {
        topProducts = productsResponseData;
      } else if (productsResponseData.topProducts) {
        topProducts = productsResponseData.topProducts;
      } else {
        // Convert object with numeric keys to array
        topProducts = Object.keys(productsResponseData)
          .filter(key => !isNaN(key))
          .map(key => productsResponseData[key])
          .filter(item => item && typeof item === 'object');
      }
    }
    
    const orders = (ordersData && ordersData.status === 'success') ? (ordersData.orders || []) : [];
    const menu = (menuData && menuData.status === 'success') ? (menuData.menu || []) : [];
    
    console.log("📈 Extracted Data:", {
      stats, salesData, topProducts, orders, menu
    });
    
    // Update dashboard with extracted data
    updateAnalytics(stats);
    updateSalesChart(Array.isArray(salesData) ? salesData : []);
    updateProductsChart(Array.isArray(topProducts) ? topProducts : []);
    updateOrdersTable(Array.isArray(orders) ? orders : []);
    updateMenuTable(Array.isArray(menu) ? menu : []);
    
  } catch (err) {
    console.error("❌ Load Error:", err);
    showError('ordersLoading', 'Network error loading data');
    showError('menuLoading', 'Network error loading data');
    
    // Initialize charts with empty data
    updateSalesChart([]);
    updateProductsChart([]);
  }
}

// ✅ Update Menu Table with proper data mapping
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
    
    // ✅ FIX: Use proper field mapping for your sheet structure
    const name = item.Name || item.name || 'Unknown';
    const price = item.Price || item.price || 0;
    const category = item.Category || item.category || 'General';
    const type = item.Type || item.type || 'veg';
    
    // ✅ FIX: Get image from correct field and provide fallback
    let imageUrl = item.Image || item.image;
    if (!imageUrl || imageUrl === '' || imageUrl.includes('undefined')) {
      imageUrl = 'https://via.placeholder.com/50x50/ff6b6b/white?text=' + encodeURIComponent(name.substring(0, 2));
    }
    
    tr.innerHTML = `
      <td><strong>${name}</strong></td>
      <td>₹${parseFloat(price).toFixed(2)}</td>
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
}

// ✅ Add Menu Item with proper field mapping
async function addMenuItem(event) {
  event.preventDefault();
  
  const name = document.getElementById("itemName").value.trim();
  const price = document.getElementById("itemPrice").value;
  const category = document.getElementById("itemCategory").value.trim();
  const description = document.getElementById("itemDescription").value.trim();
  const type = document.getElementById("itemType").value;
  const imageFile = document.getElementById("itemImage").files[0];
  
  if (!name || !price || !category) {
    alert("Please fill all required fields");
    return false;
  }
  
  try {
    // For now, use placeholder image
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

// ✅ Utility function to handle object-to-array conversion
function convertObjectToArray(obj) {
  if (Array.isArray(obj)) return obj;
  if (obj && typeof obj === 'object') {
    return Object.keys(obj)
      .filter(key => !isNaN(key))
      .map(key => obj[key])
      .filter(item => item && typeof item === 'object');
  }
  return [];
}
