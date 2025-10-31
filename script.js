const SHEET_URL =
  "https://script.google.com/macros/s/AKfycbyGu5yn_ViSyvy4E3aQYJdSa4XzBN44cj_T-wGvclWXCJ9F9GU6SZTUGl17QD5amO7x/exec";

const menuContainer = document.getElementById("menu");
const categoryFilter = document.getElementById("categoryFilter");
const searchInput = document.getElementById("searchInput");
const cartPanel = document.getElementById("cart");
const cartBtn = document.getElementById("cartIconBtn");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const cartCount = document.getElementById("cartCount");
const placeOrderBtn = document.getElementById("placeOrderBtn");

let menuData = [];
let cart = [];

// ✅ Main function to load menu with multiple fallback methods
async function loadMenu() {
  console.log("🔄 Loading menu...");
  
  try {
    // Method 1: Try direct fetch first
    const data = await fetchMenuDirect();
    menuData = data.menu || data;
    console.log("✅ Menu loaded via direct fetch:", menuData);
    displayMenu(menuData);
    populateCategories(menuData);
    return;
  } catch (error) {
    console.log("❌ Direct fetch failed, trying JSONP...", error);
  }

  try {
    // Method 2: Try JSONP fallback
    const data = await fetchMenuJSONP();
    menuData = data.menu || data;
    console.log("✅ Menu loaded via JSONP:", menuData);
    displayMenu(menuData);
    populateCategories(menuData);
    return;
  } catch (error) {
    console.log("❌ JSONP also failed:", error);
  }

  // Method 3: Show error message
  showMenuError();
}

// ✅ Method 1: Direct fetch with proper CORS handling
async function fetchMenuDirect() {
  const response = await fetch(`${SHEET_URL}?nocache=${Date.now()}`, {
    method: "GET",
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

// ✅ Method 2: JSONP fallback
function fetchMenuJSONP() {
  return new Promise((resolve, reject) => {
    const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
    const script = document.createElement('script');
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('JSONP timeout'));
    }, 10000); // 10 second timeout

    function cleanup() {
      clearTimeout(timeoutId);
      delete window[callbackName];
      if (script.parentNode) {
        document.body.removeChild(script);
      }
    }

    window[callbackName] = function(data) {
      cleanup();
      resolve(data);
    };

    script.src = `${SHEET_URL}?callback=${callbackName}&nocache=${Date.now()}`;
    script.onerror = function() {
      cleanup();
      reject(new Error('JSONP script failed to load'));
    };

    document.body.appendChild(script);
  });
}

// ✅ Method 3: Show error message
function showMenuError() {
  menuContainer.innerHTML = `
    <div style="text-align:center; color:red; padding: 2rem;">
      <p>⚠️ Failed to load menu.</p>
      <p>Please check your internet connection and try again.</p>
      <button onclick="loadMenu()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Retry
      </button>
    </div>
  `;
}

// ✅ Display Menu Items
function displayMenu(items) {
  if (!items || items.length === 0) {
    menuContainer.innerHTML = "<p style='text-align:center;'>No menu items found.</p>";
    return;
  }

  menuContainer.innerHTML = "";
  items.forEach((item) => {
    const card = document.createElement("div");
    card.classList.add("menu-item");

    // Safe property access with fallbacks
    const itemName = item.Name || item.name || "Unnamed Item";
    const itemPrice = item.Price || item.price || 0;
    const itemDescription = item.Description || item.description || "No description available";
    const itemImage = item.Image || item.image || "https://via.placeholder.com/200x150?text=No+Image";
    const itemType = item.Type || item.type || "veg";
    const itemRating = item.Rating || item.rating || 4;

    const vegIcon = itemType.toLowerCase() === "veg" ? "🟢" : "🔴";
    const ratingStars = "⭐".repeat(Math.floor(itemRating));

    card.innerHTML = `
      <img src="${itemImage}" alt="${itemName}" onerror="this.src='https://via.placeholder.com/200x150?text=No+Image'">
      <div class="menu-details">
        <div class="menu-top">
          <h3>${itemName}</h3>
          <span class="veg-icon">${vegIcon}</span>
        </div>
        <div class="rating">${ratingStars}</div>
        <p>${itemDescription}</p>
        <p class="price">₹${itemPrice}</p>
        <button class="add-btn" onclick="addToCart('${itemName.replace(/'/g, "\\'")}', ${itemPrice})">
          Add to Cart
        </button>
      </div>`;
    menuContainer.appendChild(card);
  });
}

// ✅ Category Dropdown
function populateCategories(data) {
  if (!data || data.length === 0) return;

  // Clear existing options except "All"
  categoryFilter.innerHTML = '<option value="All">All Categories</option>';

  const categories = [...new Set(data.map(item => {
    return item.Category || item.category || "Uncategorized";
  }))];

  categories.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    categoryFilter.appendChild(opt);
  });
}

// ✅ Event Listeners for filtering
categoryFilter.addEventListener("change", filterMenu);
searchInput.addEventListener("input", filterMenu);

function filterMenu() {
  const cat = categoryFilter.value;
  const searchTerm = searchInput.value.toLowerCase();
  
  const filtered = menuData.filter((item) => {
    const itemName = item.Name || item.name || "";
    const itemCategory = item.Category || item.category || "";
    
    const categoryMatch = cat === "All" || itemCategory === cat;
    const searchMatch = itemName.toLowerCase().includes(searchTerm);
    
    return categoryMatch && searchMatch;
  });
  
  displayMenu(filtered);
}

// ✅ Cart Management
function addToCart(name, price) {
  // Check if item already exists in cart
  const existingItemIndex = cart.findIndex(item => item.name === name);
  
  if (existingItemIndex > -1) {
    // Update quantity if item exists
    cart[existingItemIndex].quantity = (cart[existingItemIndex].quantity || 1) + 1;
  } else {
    // Add new item
    cart.push({ 
      name, 
      price, 
      quantity: 1 
    });
  }
  
  updateCart();
  showAddToCartAnimation(name);
}

function removeFromCart(index) {
  if (index >= 0 && index < cart.length) {
    cart.splice(index, 1);
    updateCart();
  }
}

function updateCartQuantity(index, change) {
  if (cart[index]) {
    cart[index].quantity = (cart[index].quantity || 1) + change;
    
    if (cart[index].quantity <= 0) {
      cart.splice(index, 1);
    }
    
    updateCart();
  }
}

function updateCart() {
  cartItems.innerHTML = "";
  let total = 0;
  let itemCount = 0;

  cart.forEach((item, index) => {
    const itemTotal = item.price * (item.quantity || 1);
    total += itemTotal;
    itemCount += (item.quantity || 1);

    const li = document.createElement("li");
    li.innerHTML = `
      <div class="cart-item">
        <span class="cart-item-name">${item.name}</span>
        <div class="cart-item-controls">
          <button onclick="updateCartQuantity(${index}, -1)">-</button>
          <span class="cart-item-quantity">${item.quantity || 1}</span>
          <button onclick="updateCartQuantity(${index}, 1)">+</button>
          <span class="cart-item-price">₹${itemTotal}</span>
          <button class="remove-btn" onclick="removeFromCart(${index})">❌</button>
        </div>
      </div>
    `;
    cartItems.appendChild(li);
  });

  cartTotal.textContent = total.toFixed(2);
  cartCount.textContent = itemCount;

  // Show/hide empty cart message
  if (cart.length === 0) {
    cartItems.innerHTML = '<li style="text-align:center; padding: 1rem;">Your cart is empty</li>';
  }
}

function showAddToCartAnimation(itemName) {
  // Create a temporary notification
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #28a745;
    color: white;
    padding: 10px 20px;
    border-radius: 4px;
    z-index: 1000;
    animation: slideIn 0.3s ease-out;
  `;
  notification.textContent = `✅ ${itemName} added to cart!`;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 2000);
}

// ✅ Cart Panel Toggle
cartBtn.addEventListener("click", () => {
  cartPanel.classList.toggle("active");
});

// Close cart when clicking outside
document.addEventListener('click', (event) => {
  if (!cartPanel.contains(event.target) && !cartBtn.contains(event.target)) {
    cartPanel.classList.remove('active');
  }
});

// ✅ Place Order
placeOrderBtn.addEventListener("click", async () => {
  const name = document.getElementById("userName")?.value.trim();
  const email = document.getElementById("userEmail")?.value.trim();
  const table = document.getElementById("userTable")?.value.trim() || "N/A";
  const note = document.getElementById("userNote")?.value.trim() || "No note";

  if (!name) {
    alert("⚠️ Please enter your name.");
    return;
  }

  if (cart.length === 0) {
    alert("⚠️ Please add at least one item to your cart.");
    return;
  }

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

  const orderData = {
    name,
    email: email || "N/A",
    table: table || "N/A",
    note,
    cart,
    totalAmount,
    timestamp: new Date().toISOString()
  };

  try {
    // Show loading state
    placeOrderBtn.disabled = true;
    placeOrderBtn.textContent = "Placing Order...";

    const response = await fetch(SHEET_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(orderData),
    });

    const result = await response.json();
    
    if (result.success) {
      alert("✅ Order placed successfully!");
      // Reset cart and form
      cart = [];
      updateCart();
      document.getElementById("userName").value = "";
      document.getElementById("userEmail").value = "";
      document.getElementById("userTable").value = "";
      document.getElementById("userNote").value = "";
      cartPanel.classList.remove("active");
    } else {
      throw new Error(result.error || "Failed to place order");
    }

  } catch (error) {
    console.error("Error placing order:", error);
    alert("❌ Failed to place order. Please check your connection and try again.");
  } finally {
    // Reset button state
    placeOrderBtn.disabled = false;
    placeOrderBtn.textContent = "Place Order";
  }
});

// ✅ Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log("🚀 Initializing Digital Menu...");
  loadMenu();
  
  // Add some basic styles for new elements
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    .cart-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
      padding: 0.5rem;
      border-bottom: 1px solid #eee;
    }
    .cart-item-controls {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .cart-item-controls button {
      padding: 0.2rem 0.5rem;
      border: 1px solid #ddd;
      background: white;
      cursor: pointer;
      border-radius: 3px;
    }
    .cart-item-quantity {
      min-width: 20px;
      text-align: center;
    }
    .remove-btn {
      background: #ff4444 !important;
      color: white;
      border: none !important;
    }
  `;
  document.head.appendChild(style);
});
