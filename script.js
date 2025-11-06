const SHEET_URL = "https://script.google.com/macros/s/AKfycbzaO83oUTNGZVdZT4dri5nFTIrWvWjbvZtALsK45pQXDCgeHNSm20mgGFXJ-h-WVNW0/exec";
const MENU_CACHE_KEY = "gd_menu_cache_v1";
const CART_CACHE_KEY = "gd_cart_cache_v1";
const MENU_CACHE_TS = "gd_menu_cache_ts";
const MIN_SPLASH_MS = 700;
const JSONP_TIMEOUT = 15000;

// ---------- DOM refs (safe queries) ----------
const menuContainer = document.getElementById("menu");
const categoryFilter = document.getElementById("categoryFilter");
const searchInput = document.getElementById("searchInput");
const cartPanel = document.getElementById("cart");
const cartBtn = document.getElementById("cartIconBtn");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const cartCount = document.getElementById("cartCount");
const placeOrderBtn = document.getElementById("placeOrderBtn");
const categoryGrid = document.getElementById("categoryGrid");

// ---------- STATE ----------
let menuData = [];
let cart = [];
let categories = [];

// ---------- Utilities ----------
function safeParse(json) {
  try { return JSON.parse(json); } catch(e){ return null; }
}
function escapeHtml(s) { if (s === null || s === undefined) return ""; return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeJs(s) { if (!s) return ""; return String(s).replace(/'/g, "\\'").replace(/"/g, '\\"'); }

// ---------- Splash UI ----------
function createSplash() {
  if (document.getElementById("gd-splash")) return;
  const s = document.createElement("div");
  s.id = "gd-splash";
  s.style.cssText = `
    position:fixed;left:0;top:0;width:100%;height:100%;z-index:9999;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    background:linear-gradient(180deg,#fff 0%, #fff 100%);
  `;
  s.innerHTML = `
    <img src="https://cdn-icons-png.flaticon.com/512/857/857681.png" alt="logo" style="width:110px;height:110px;animation:gdPulse 1800ms infinite;">
    <h2 style="margin-top:12px;color:#222;font-family:inherit">Welcome to Barf Malai</h2>
    <p style="color:#666;margin-top:6px">Smart QR Menu by Go Digital</p>
    <style>
      @keyframes gdPulse { 0%{transform:scale(1);opacity:.9}50%{transform:scale(1.08);opacity:1}100%{transform:scale(1);opacity:.9} }
    </style>
  `;
  document.body.appendChild(s);
}
function hideSplash() {
  const s = document.getElementById("gd-splash");
  if (!s) return;
  s.style.transition = "opacity .45s ease";
  s.style.opacity = "0";
  setTimeout(()=> s.remove(), 480);
}

// ---------- Toast ----------
function showToast(msg, duration=2200) {
  const t = document.createElement("div");
  t.className = "gd-toast";
  t.style.cssText = "position:fixed;right:18px;top:18px;background:linear-gradient(135deg,#ff6b6b,#ff8e8e);color:#fff;padding:10px 14px;border-radius:8px;z-index:10001;box-shadow:0 6px 20px rgba(0,0,0,0.12);font-weight:600";
  t.innerText = msg;
  document.body.appendChild(t);
  setTimeout(()=> t.style.opacity = "0.01", duration-300);
  setTimeout(()=> t.remove(), duration);
}

// ---------- JSONP helper (Promise) ----------
function jsonpFetch(url, timeout = JSONP_TIMEOUT) {
  return new Promise((resolve, reject) => {
    const cb = "gd_cb_" + Date.now() + "_" + Math.floor(Math.random()*9999);
    const s = document.createElement("script");
    window[cb] = function(data) {
      try { resolve(data); } finally {
        delete window[cb];
        if (s.parentNode) s.parentNode.removeChild(s);
      }
    };
    s.onerror = function() {
      delete window[cb];
      if (s.parentNode) s.parentNode.removeChild(s);
      reject(new Error("Network/script load error"));
    };
    const connector = url.includes("?") ? "&" : "?";
    s.src = url + connector + "callback=" + cb + "&t=" + Date.now();
    document.body.appendChild(s);
    setTimeout(() => {
      if (window[cb]) {
        delete window[cb];
        if (s.parentNode) s.parentNode.removeChild(s);
        reject(new Error("Request timeout"));
      }
    }, timeout);
  });
}

// ---------- Menu load (cached then network) ----------
async function loadMenu() {
  createSplash();
  const start = Date.now();

  // 1) Try load cached menu quickly
  try {
    const cached = localStorage.getItem(MENU_CACHE_KEY);
    if (cached) {
      const parsed = safeParse(cached);
      if (Array.isArray(parsed) && parsed.length) {
        menuData = parsed;
        displayMenu(menuData);
        setupCategories(menuData);
      }
    }
  } catch(e) { console.warn("Cache read failed", e); }

  // 2) Always try to fetch fresh
  try {
    const resp = await jsonpFetch(SHEET_URL + "?action=getMenu");
    let fresh = [];
    if (!resp) throw new Error("Empty response");
    if (Array.isArray(resp)) fresh = resp;
    else if (resp.menu && Array.isArray(resp.menu)) fresh = resp.menu;
    else if (resp.status === "success" && Array.isArray(resp.menu)) fresh = resp.menu;
    
    if (fresh && fresh.length) {
      const freshStr = JSON.stringify(fresh);
      const oldStr = localStorage.getItem(MENU_CACHE_KEY);
      if (oldStr !== freshStr) {
        localStorage.setItem(MENU_CACHE_KEY, freshStr);
        localStorage.setItem(MENU_CACHE_TS, new Date().toISOString());
        menuData = fresh;
        displayMenu(menuData);
        setupCategories(menuData);
        if (oldStr) showToast("Menu updated ✅");
      }
    } else {
      if (!menuData || menuData.length === 0) showMenuError("Menu empty.");
    }
  } catch (err) {
    console.error("loadMenu error:", err);
    if (!menuData || menuData.length === 0) showMenuError("Network error — try again.");
  } finally {
    const elapsed = Date.now() - start;
    const wait = Math.max(0, MIN_SPLASH_MS - elapsed);
    setTimeout(hideSplash, wait);
  }
}

// ---------- Display (fast) ----------
function displayMenu(items) {
  if (!menuContainer) return;
  if (!items || items.length === 0) {
    menuContainer.innerHTML = `<div class="empty-state"><p>No menu items available.</p><button onclick="loadMenu()" class="retry-btn">Try Again</button></div>`;
    return;
  }

  const frag = document.createDocumentFragment();

  items.forEach((item, idx) => {
    const name = item.Name || item.name || `Item ${idx+1}`;
    const price = parseFloat(item.Price || item.price || 0);
    const desc = item.Description || item.description || "";
    const image = item.Image || item.image || item.Img || "";
    const category = item.Category || item.category || "General";
    const type = (item.Type || item.type || "veg").toLowerCase();
    const vegIcon = type.includes("veg") ? "🟢" : "🔴";

    const div = document.createElement("div");
    div.className = "menu-item";
    div.dataset.name = name;
    div.dataset.price = price;

    const inCart = cart.find(c => c.name === name);

    div.innerHTML = `
      <div class="menu-card">
        <div class="image-container">
          <img src="${escapeHtml(image)}" alt="${escapeHtml(name)}" loading="lazy" onerror="handleImageError(this)">
        </div>
        <div class="menu-details">
          <div class="menu-header">
            <h3>${escapeHtml(name)}</h3>
            <span class="veg-icon">${vegIcon}</span>
          </div>
          <div class="category">${escapeHtml(category)}</div>
          <p class="description">${escapeHtml(desc)}</p>
          <div class="price-section">
            <span class="price">₹${price}</span>
            <div class="cart-action" id="btn-${idx}">
              ${ inCart ? `
                <div class="quantity-control">
                  <button class="minus" onclick="updateItemQty('${escapeJs(name)}', -1)">−</button>
                  <span class="qty">${inCart.quantity}</span>
                  <button class="plus" onclick="updateItemQty('${escapeJs(name)}', 1)">+</button>
                </div>` :
                `<button class="add-btn" onclick="toggleAdd('${escapeJs(name)}', ${price}, ${idx})">Add to Cart</button>`
              }
            </div>
          </div>
        </div>
      </div>
    `;
    frag.appendChild(div);
  });

  menuContainer.innerHTML = "";
  menuContainer.appendChild(frag);
}

// ---------- Categories ----------
function setupCategories(data) {
  if (!categoryGrid) return;
  categories = [...new Set((data || []).map(i => (i.Category || i.category || "General")))];
  categories = categories.filter(Boolean);
  categories.unshift("All");
  categoryGrid.innerHTML = "";
  const f = document.createDocumentFragment();
  categories.forEach(cat => {
    const n = document.createElement("div");
    n.className = "category-item";
    n.setAttribute("data-category", cat);
    n.innerHTML = `<div class="category-icon">${getCategoryIcon(cat)}</div><span class="category-name">${escapeHtml(cat)}</span>`;
    n.addEventListener("click", () => {
      document.querySelectorAll(".category-item").forEach(x => x.classList.remove("active"));
      n.classList.add("active");
      filterByCategory(cat);
    });
    f.appendChild(n);
  });
  categoryGrid.appendChild(f);
  const first = categoryGrid.querySelector(".category-item");
  if (first) first.classList.add("active");
  populateCategories(data);
}
function getCategoryIcon(cat) {
  const m = {"All":"🍽️","Ice Cream":"🍨","Shakes":"🥤","Burgers":"🍔","Drinks":"🥤","Desserts":"🍰","Snacks":"🍟","General":"🍽️"};
  return m[cat] || cat.charAt(0).toUpperCase();
}

// ---------- Filters ----------
function populateCategories(data) {
  if (!categoryFilter) return;
  categoryFilter.innerHTML = `<option value="All">All Categories</option>`;
  const cats = [...new Set((data || []).map(i => (i.Category || i.category || "General")))];
  cats.forEach(c => {
    const o = document.createElement("option");
    o.value = c;
    o.textContent = c;
    categoryFilter.appendChild(o);
  });
}

function filterByCategory(category) {
  const term = (searchInput && searchInput.value || "").toLowerCase();
  let filtered = menuData.slice();
  if (category && category !== "All") filtered = filtered.filter(i => (i.Category || i.category || "General") === category);
  if (term) filtered = filtered.filter(i => ((i.Name || i.name || "").toLowerCase().includes(term)));
  displayMenu(filtered);
  if (categoryFilter) categoryFilter.value = category;
}

function getFilteredMenu() {
  const active = document.querySelector(".category-item.active")?.getAttribute("data-category") || (categoryFilter ? categoryFilter.value : "All");
  const term = (searchInput && searchInput.value || "").toLowerCase();
  let filtered = menuData.slice();
  if (active && active !== "All") filtered = filtered.filter(i => (i.Category || i.category || "General") === active);
  if (term) filtered = filtered.filter(i => ((i.Name || i.name || "").toLowerCase().includes(term)));
  return filtered;
}

// ---------- Cart (persistence + UI) ----------
function loadCartFromCache() {
  try {
    const raw = localStorage.getItem(CART_CACHE_KEY);
    const parsed = safeParse(raw);
    if (Array.isArray(parsed)) cart = parsed;
  } catch(e) { console.warn("cart load failed", e); }
}
function saveCartToCache() { try { localStorage.setItem(CART_CACHE_KEY, JSON.stringify(cart)); } catch(e){} }

function toggleAdd(name, price, idx) {
  addToCart(name, price);
  const btnDiv = document.getElementById(`btn-${idx}`);
  if (btnDiv) {
    btnDiv.innerHTML = `<div class="quantity-control">
      <button class="minus" onclick="updateItemQty('${escapeJs(name)}', -1)">−</button>
      <span class="qty">1</span>
      <button class="plus" onclick="updateItemQty('${escapeJs(name)}', 1)">+</button>
    </div>`;
  }
}

function addToCart(name, price, image="") {
  const ex = cart.find(c => c.name === name);
  if (ex) ex.quantity++;
  else cart.push({name, price: Number(price), image, quantity: 1});
  updateCart();
  saveCartToCache();
  showToast(`${name} added`);
}

function updateItemQty(name, change) {
  const it = cart.find(c => c.name === name);
  if (!it) return;
  it.quantity += change;
  if (it.quantity <= 0) cart = cart.filter(c => c.name !== name);
  updateCart();
  saveCartToCache();
  displayMenu(getFilteredMenu());
}

function removeFromCart(name) {
  cart = cart.filter(c => c.name !== name);
  updateCart();
  saveCartToCache();
  displayMenu(getFilteredMenu());
}

function updateCart() {
  if (!cartItems) return;
  cartItems.innerHTML = "";
  const frag = document.createDocumentFragment();
  let total = 0, count = 0;
  if (cart.length === 0) {
    const li = document.createElement("li");
    li.className = "empty-cart";
    li.textContent = "Your cart is empty";
    frag.appendChild(li);
  } else {
    cart.forEach(it => {
      total += it.price * it.quantity;
      count += it.quantity;
      const li = document.createElement("li");
      li.className = "cart-item";
      li.innerHTML = `<div class="cart-item-content">
        <span class="cart-item-name">${escapeHtml(it.name)}</span>
        <div class="cart-item-controls">
          <button onclick="updateItemQty('${escapeJs(it.name)}', -1)">−</button>
          <span class="quantity">${it.quantity}</span>
          <button onclick="updateItemQty('${escapeJs(it.name)}', 1)">+</button>
          <span class="price">₹${(it.price*it.quantity).toFixed(2)}</span>
          <button class="remove-btn" onclick="removeFromCart('${escapeJs(it.name)}')">×</button>
        </div></div>`;
      frag.appendChild(li);
    });
  }
  cartItems.appendChild(frag);
  if (cartTotal) cartTotal.textContent = total.toFixed(2);
  if (cartCount) cartCount.textContent = count;
}

// ---------- FIXED: Place order with proper mobile number ----------
function placeOrder() {
  const name = document.getElementById("userName")?.value.trim();
  const phone = document.getElementById("phone")?.value.trim();
  const email = document.getElementById("userEmail")?.value.trim();
  const table = document.getElementById("userTable")?.value.trim() || "N/A";
  const note = document.getElementById("userNote")?.value.trim() || "No note";

  if (!name) { alert("❌ Please enter your name"); return; }
  if (!phone) { alert("❌ Please enter your phone number"); return; }
  if (cart.length === 0) { alert("❌ Please add items to your cart"); return; }

  const orderData = {
    name: name,
    email: email,
    phone: phone,
    table: table,
    review: note,
    cart: cart.map(item => ({ 
      name: item.name, 
      price: item.price, 
      quantity: item.quantity 
    })),
    totalAmount: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  };

  console.log("📦 Sending order data:", orderData);

  placeOrderBtn.disabled = true;
  placeOrderBtn.innerText = "Placing...";

  const cb = "gd_order_cb_" + Date.now();
  const s = document.createElement("script");
  window[cb] = function(resp) {
    delete window[cb];
    if (s.parentNode) s.parentNode.removeChild(s);
    placeOrderBtn.disabled = false;
    placeOrderBtn.innerText = "Place Order";
    
    if (resp && resp.success) {
      showToast("Order placed ✅");
      cart = []; 
      saveCartToCache(); 
      updateCart();
      displayMenu(getFilteredMenu());
      
      // Clear form
      const fEls = ["userName","phone","userEmail","userTable","userNote"];
      fEls.forEach(id => { 
        const el = document.getElementById(id); 
        if (el) el.value = ""; 
      });
      
      if (cartPanel) cartPanel.classList.remove("active");
    } else {
      alert("❌ " + (resp?.error || "Failed to place order"));
    }
  };
  
  s.onerror = function() {
    delete window[cb];
    if (s.parentNode) s.parentNode.removeChild(s);
    placeOrderBtn.disabled = false;
    placeOrderBtn.innerText = "Place Order";
    alert("Network error – please try again");
  };

  const enc = encodeURIComponent(JSON.stringify(orderData));
  s.src = `${SHEET_URL}?action=submitOrder&orderData=${enc}&callback=${cb}&t=${Date.now()}`;
  document.body.appendChild(s);
}

// ---------- Helpers ----------
function handleImageError(img) { img.src = "https://via.placeholder.com/200x150?text=No+Image"; }
function closeCart() { if (cartPanel) cartPanel.classList.remove("active"); }
function showMenuError(msg) { if (menuContainer) menuContainer.innerHTML = `<div class="error-message"><h3>⚠️ Error Loading Menu</h3><p>${escapeHtml(msg)}</p><button onclick="loadMenu()" class="retry-btn">Retry</button></div>`; }

// ---------- Events binding ----------
if (categoryFilter) categoryFilter.addEventListener("change", () => filterByCategory(categoryFilter.value));
if (searchInput) searchInput.addEventListener("input", () => displayMenu(getFilteredMenu()));
if (cartBtn) cartBtn.addEventListener("click", () => { if (cartPanel) cartPanel.classList.toggle("active"); });
if (placeOrderBtn) placeOrderBtn.addEventListener("click", placeOrder);

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", () => {
  createSplash();
  loadCartFromCache();
  updateCart();
  
  // Try to show cached menu quickly
  try {
    const c = localStorage.getItem(MENU_CACHE_KEY);
    if (c) {
      const parsed = safeParse(c);
      if (Array.isArray(parsed)) {
        menuData = parsed;
        displayMenu(menuData);
        setupCategories(menuData);
      }
    }
  } catch(e){ /* ignore */ }
  
  loadMenu().catch(err => console.error("Menu load failed", err));
});


