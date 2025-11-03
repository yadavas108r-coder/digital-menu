// ✅ Use your Google Apps Script URL
const SHEET_URL = "https://script.google.com/macros/s/AKfycbye8ULLSIjFT_PwZ9DhcPM5LkiAYkUgSIn5EPrSXuScyltAd1f0GmsFpFO3t_XAa4ST/exec";

// DOM Elements
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

// ✅ Load menu from Google Sheet
function loadMenu() {
  console.log("🔄 Loading menu from:", SHEET_URL);

  return new Promise((resolve, reject) => {
    const callbackName = "menuCallback_" + Date.now();
    const script = document.createElement("script");

    window[callbackName] = function (response) {
      delete window[callbackName];
      if (script.parentNode) document.body.removeChild(script);

      if (response && response.status === "success" && response.menu) {
        menuData = response.menu;
        displayMenu(menuData);
        populateCategories(menuData);
        resolve(response);
      } else {
        showMenuError(response?.error || "Failed to load menu");
        reject(new Error(response?.error || "Failed to load menu"));
      }
    };

    script.onerror = function () {
      delete window[callbackName];
      if (script.parentNode) document.body.removeChild(script);
      showMenuError("Network error - cannot load menu");
      reject(new Error("Failed to load menu script"));
    };

    script.src = `${SHEET_URL}?callback=${callbackName}&t=${Date.now()}`;
    document.body.appendChild(script);

    setTimeout(() => {
      if (window[callbackName]) {
        delete window[callbackName];
        if (script.parentNode) document.body.removeChild(script);
        showMenuError("Menu loading timeout");
        reject(new Error("Menu loading timeout"));
      }
    }, 15000);
  });
}

// ✅ Display menu with live cart sync
function displayMenu(items) {
  if (!menuContainer) return;

  if (!items || items.length === 0) {
    menuContainer.innerHTML = `
      <div class="empty-state">
        <p>No menu items available.</p>
        <button onclick="loadMenu()" class="retry-btn">Try Again</button>
      </div>`;
    return;
  }

  menuContainer.innerHTML = "";

  items.forEach((item, index) => {
    const name = item.Name || item.name || `Item ${index + 1}`;
    const price = parseFloat(item.Price || item.price || 0);
    const description = item.Description || item.description || "Delicious item";
    const image =
      item.Image ||
      item.image ||
      item.Img ||
      "https://via.placeholder.com/200x150?text=No+Image";
    const category = item.Category || "General";
    const type = (item.Type || "veg").toLowerCase();
    const vegIcon = type.includes("veg") ? "🟢" : "🔴";

    // Check if this item in cart
    const cartItem = cart.find(c => c.name === name);

    const card = document.createElement("div");
    card.className = "menu-item";
    card.dataset.name = name;
    card.dataset.price = price;

    card.innerHTML = `
      <div class="menu-card">
        <div class="image-container">
          <img src="${image}" alt="${name}" onerror="handleImageError(this)">
        </div>
        <div class="menu-details">
          <div class="menu-header">
            <h3>${name}</h3>
            <span class="veg-icon">${vegIcon}</span>
          </div>
          <div class="category">${category}</div>
          <p class="description">${description}</p>
          <div class="price-section">
            <span class="price">₹${price}</span>
            <div class="cart-action" id="btn-${index}">
              ${
                cartItem
                  ? `
                <div class="quantity-control">
                  <button class="minus" onclick="updateItemQty('${name}', -1)">−</button>
                  <span class="qty">${cartItem.quantity}</span>
                  <button class="plus" onclick="updateItemQty('${name}', 1)">+</button>
                </div>`
                  : `<button class="add-btn" onclick="toggleAdd('${name}', ${price}, ${index})">Add to Cart</button>`
              }
            </div>
          </div>
        </div>
      </div>
    `;

    menuContainer.appendChild(card);
  });
}

// ✅ Add button → Quantity control
function toggleAdd(name, price, index) {
  addToCart(name, price);
  const btnDiv = document.getElementById(`btn-${index}`);
  if (btnDiv) {
    btnDiv.innerHTML = `
      <div class="quantity-control">
        <button class="minus" onclick="updateItemQty('${name}', -1)">−</button>
        <span class="qty">1</span>
        <button class="plus" onclick="updateItemQty('${name}', 1)">+</button>
      </div>`;
  }
}

// ✅ Update quantity (card + cart panel)
function updateItemQty(name, change) {
  const item = cart.find(c => c.name === name);
  if (!item) return;
  item.quantity += change;
  if (item.quantity <= 0) {
    cart = cart.filter(c => c.name !== name);
  }
  updateCart();
  displayMenu(menuData);
}

// ✅ Add to cart if new
function addToCart(name, price, image = "") {
  const existing = cart.find(i => i.name === name);
  if (existing) {
    existing.quantity++;
  } else {
    cart.push({ name, price, image, quantity: 1 });
  }
  updateCart();
}

// ✅ Handle broken images
function handleImageError(img) {
  img.src = "https://via.placeholder.com/200x150?text=No+Image";
}

// ✅ Update cart panel (items, quantity and remove)
function updateCart() {
  if (!cartItems) return;
  cartItems.innerHTML = "";
  let total = 0;
  let count = 0;

  cart.forEach(item => {
    total += item.price * item.quantity;
    count += item.quantity;

    const li = document.createElement("li");
    li.className = "cart-item";
    li.innerHTML = `
      <div class="cart-item-content">
        <span class="cart-item-name">${item.name}</span>
        <div class="cart-item-controls">
          <button onclick="updateItemQty('${item.name}', -1)">−</button>
          <span class="quantity">${item.quantity}</span>
          <button onclick="updateItemQty('${item.name}', 1)">+</button>
          <span class="price">₹${(item.price * item.quantity).toFixed(2)}</span>
          <button class="remove-btn" onclick="removeFromCart('${item.name}')">×</button>
        </div>
      </div>`;
    cartItems.appendChild(li);
  });

  cartTotal.textContent = `₹${total.toFixed(2)}`;
  cartCount.textContent = count;

  if (cart.length === 0) {
    cartItems.innerHTML = `<li class="empty-cart">Your cart is empty</li>`;
  }
}

// ✅ Remove item completely from cart
function removeFromCart(name) {
  cart = cart.filter(item => item.name !== name);
  updateCart();
  displayMenu(menuData);
}

// ✅ Category & Search
function populateCategories(data) {
  if (!categoryFilter) return;
  categoryFilter.innerHTML = `<option value="All">All Categories</option>`;
  const cats = [...new Set(data.map(i => i.Category || i.category || "General"))];
  cats.forEach(cat => {
    const o = document.createElement("option");
    o.value = cat;
    o.textContent = cat;
    categoryFilter.appendChild(o);
  });
}

function filterMenu() {
  const category = categoryFilter.value;
  const searchTerm = searchInput.value.toLowerCase();
  const filtered = menuData.filter(item => {
    const cat = item.Category || item.category || "General";
    const nm = item.Name || item.name || "";
    return (category === "All" || cat === category) && nm.toLowerCase().includes(searchTerm);
  });
  displayMenu(filtered);
}

// ✅ Handle Place Order (send data to Google Apps Script)
function placeOrder() {
  const name = document.getElementById("userName")?.value.trim();
  const email = document.getElementById("userEmail")?.value.trim();
  const table = document.getElementById("userTable")?.value.trim() || "N/A";
  const note = document.getElementById("userNote")?.value.trim() || "No note";

  if (!name) {
    alert("❌ Please enter your name");
    return;
  }
  if (cart.length === 0) {
    alert("❌ Please add items to your cart");
    return;
  }

  const orderData = {
    name: name,
    email: email || "N/A",
    table: table,
    review: note,
    cart: cart.map(item => ({ name: item.name, price: item.price, quantity: item.quantity })),
    totalAmount: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  };

  console.log("🛒 Placing order:", orderData);

  // disable button while processing
  placeOrderBtn.disabled = true;
  placeOrderBtn.innerText = "Placing...";

  const callbackName = "orderCallback_" + Date.now();
  const script = document.createElement("script");

  window[callbackName] = function(response) {
    delete window[callbackName];
    if (script.parentNode) document.body.removeChild(script);

    placeOrderBtn.disabled = false;
    placeOrderBtn.innerText = "Place Order";

    if (response && response.success) {
      alert("✅ " + (response.message || "Order placed successfully!"));
      // clear cart and form
      cart = [];
      updateCart();
      displayMenu(menuData);
      document.getElementById("userName").value = "";
      document.getElementById("userEmail").value = "";
      document.getElementById("userTable").value = "";
      document.getElementById("userNote").value = "";
      cartPanel.classList.remove("active");
    } else {
      alert("❌ " + (response.error || "Failed to place order"));
    }
  };

  script.onerror = function() {
    delete window[callbackName];
    if (script.parentNode) document.body.removeChild(script);

    placeOrderBtn.disabled = false;
    placeOrderBtn.innerText = "Place Order";
    alert("❌ Network error – please try again");
  };

  const encoded = encodeURIComponent(JSON.stringify(orderData));
  script.src = `${SHEET_URL}?action=submitOrder&orderData=${encoded}&callback=${callbackName}&t=${Date.now()}`;
  document.body.appendChild(script);
}

// ✅ Event Listeners
if (categoryFilter) categoryFilter.addEventListener("change", filterMenu);
if (searchInput) searchInput.addEventListener("input", filterMenu);
if (cartBtn) cartBtn.addEventListener("click", () => cartPanel.classList.toggle("active"));
if (placeOrderBtn) placeOrderBtn.addEventListener("click", placeOrder);

// ✅ Initialize
document.addEventListener("DOMContentLoaded", loadMenu);
