const SHEET_URL = "https://script.google.com/macros/s/AKfycbyJhNtesxLueBswZHEDmfkpv9EIjR2pPBqOgCvD3Cj9vz_I1Q4IJvJ5m1ZhutiNnEbs/exec";
const MENU_CACHE_KEY = "gd_menu_cache_v1";
const CART_CACHE_KEY = "gd_cart_cache_v1";
const MENU_CACHE_TS = "gd_menu_cache_ts";
const MIN_SPLASH_MS = 700;
const JSONP_TIMEOUT = 15000;

// ---------- DOM refs ----------
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

// ---------- Utils ----------
function safeParse(json) { try { return JSON.parse(json); } catch(e){ return null; } }
function escapeHtml(s) { if (!s) return ""; return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// ---------- Splash ----------
function createSplash() {
  if (document.getElementById("gd-splash")) return;
  const s = document.createElement("div");
  s.id = "gd-splash";
  s.style.cssText = `
    position:fixed;left:0;top:0;width:100%;height:100%;z-index:9999;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    background:white;
  `;
  s.innerHTML = `
    <img src="https://cdn-icons-png.flaticon.com/512/857/857681.png" width="110" height="110" style="animation:gdPulse 1.8s infinite;">
    <h2 style="margin-top:12px;">Welcome to Barf Malai</h2>
    <p>Smart QR Menu by Go Digital</p>
    <style>
      @keyframes gdPulse {
        0%{transform:scale(1);opacity:.9}
        50%{transform:scale(1.08);opacity:1}
        100%{transform:scale(1);opacity:.9}
      }
    </style>`;
  document.body.appendChild(s);
}
function hideSplash() {
  const s = document.getElementById("gd-splash");
  if (!s) return;
  s.style.transition = "opacity .4s";
  s.style.opacity = "0";
  setTimeout(()=> s.remove(), 450);
}

// ---------- Toast ----------
function showToast(msg, duration=2200) {
  const t = document.createElement("div");
  t.className = "gd-toast";
  t.style.cssText = `
    position:fixed;right:18px;top:18px;background:#222;color:#fff;
    padding:10px 14px;border-radius:8px;z-index:10001;box-shadow:0 6px 20px rgba(0,0,0,0.15);font-weight:600;
  `;
  t.innerText = msg;
  document.body.appendChild(t);
  setTimeout(()=> t.remove(), duration);
}

// ---------- JSONP fetch ----------
function jsonpFetch(url, timeout = JSONP_TIMEOUT) {
  return new Promise((resolve, reject) => {
    const cb = "gd_cb_" + Date.now();
    const s = document.createElement("script");
    window[cb] = data => {
      resolve(data);
      delete window[cb];
      s.remove();
    };
    s.onerror = () => { reject(new Error("Network error")); s.remove(); };
    s.src = url + (url.includes("?") ? "&" : "?") + "callback=" + cb;
    document.body.appendChild(s);
    setTimeout(()=>{ reject(new Error("Timeout")); s.remove(); }, timeout);
  });
}

// ---------- Load menu + category ----------
async function loadMenu() {
  createSplash();
  const start = Date.now();

  try {
    const cached = localStorage.getItem(MENU_CACHE_KEY);
    if (cached) {
      const parsed = safeParse(cached);
      if (Array.isArray(parsed)) {
        menuData = parsed;
        displayMenu(menuData);
      }
    }
  } catch {}

  try {
    const res = await jsonpFetch(SHEET_URL + "?action=getMenu");
    if (res && res.menu) {
      menuData = res.menu;
      localStorage.setItem(MENU_CACHE_KEY, JSON.stringify(menuData));
      displayMenu(menuData);
      setupCategories(menuData);
    }
  } catch (err) {
    console.error("Fetch menu error:", err);
  } finally {
    const elapsed = Date.now() - start;
    setTimeout(hideSplash, Math.max(0, MIN_SPLASH_MS - elapsed));
  }
}

// ---------- Display menu ----------
function displayMenu(items) {
  if (!menuContainer) return;
  if (!items || !items.length) {
    menuContainer.innerHTML = `<p style="text-align:center;color:#888">No items available</p>`;
    return;
  }

  const activeCat = document.querySelector(".category-item.active")?.dataset.category || "All";
  const filtered = activeCat === "All" ? items : items.filter(i => i.Category === activeCat);
  
  const frag = document.createDocumentFragment();
  filtered.forEach((item, idx) => {
    const name = escapeHtml(item.Name || "Unnamed");
    const price = parseFloat(item.Price || 0);
    const desc = escapeHtml(item.Description || "");
    const img = item.Image || "";
    const inCart = cart.find(c => c.name === name);

    const card = document.createElement("div");
    card.className = "menu-item";
    card.innerHTML = `
      <div class="menu-card">
        <div class="image-container">
          <img src="${img}" alt="${name}" loading="lazy" onerror="this.src='https://via.placeholder.com/200x150?text=No+Image'">
        </div>
        <div class="menu-details">
          <h3>${name}</h3>
          <p class="desc">${desc}</p>
          <div class="price-row">
            <span class="price">₹${price}</span>
            ${
              inCart ? `
              <div class="qty-ctrl">
                <button onclick="updateItemQty('${name}', -1)">−</button>
                <span>${inCart.quantity}</span>
                <button onclick="updateItemQty('${name}', 1)">+</button>
              </div>` :
              `<button class="add-btn" onclick="addToCart('${name}', ${price}, '${img}')">Add</button>`
            }
          </div>
        </div>
      </div>
    `;
    frag.appendChild(card);
  });
  menuContainer.innerHTML = "";
  menuContainer.appendChild(frag);
}

// ---------- Category setup ----------
function setupCategories(data) {
  if (!categoryGrid) return;
  categoryGrid.innerHTML = "";
  const allCats = [...new Set(data.map(i => i.Category))].filter(Boolean);
  const catWithImages = {};

  data.forEach(i => {
    if (!catWithImages[i.Category] && i.CategoryImage) {
      catWithImages[i.Category] = i.CategoryImage;
    }
  });

  const frag = document.createDocumentFragment();

  const all = document.createElement("div");
  all.className = "category-item active";
  all.dataset.category = "All";
  all.innerHTML = `
    <div class="cat-img"><img src="https://cdn-icons-png.flaticon.com/512/857/857681.png"></div>
    <span>All</span>
  `;
  all.addEventListener("click", () => selectCategory("All"));
  frag.appendChild(all);

  allCats.forEach(cat => {
    const div = document.createElement("div");
    div.className = "category-item";
    div.dataset.category = cat;
    const img = catWithImages[cat] || "https://via.placeholder.com/80x80?text=🍽️";
    div.innerHTML = `
      <div class="cat-img"><img src="${img}" alt="${cat}" loading="lazy"></div>
      <span>${escapeHtml(cat)}</span>
    `;
    div.addEventListener("click", () => selectCategory(cat));
    frag.appendChild(div);
  });

  categoryGrid.appendChild(frag);
}

function selectCategory(cat) {
  document.querySelectorAll(".category-item").forEach(x => x.classList.remove("active"));
  const sel = [...document.querySelectorAll(".category-item")].find(x => x.dataset.category === cat);
  if (sel) sel.classList.add("active");
  displayMenu(menuData);
}

// ---------- Cart ----------
function loadCartFromCache() {
  const saved = safeParse(localStorage.getItem(CART_CACHE_KEY));
  if (Array.isArray(saved)) cart = saved;
}
function saveCartToCache() {
  localStorage.setItem(CART_CACHE_KEY, JSON.stringify(cart));
}

function addToCart(name, price, image="") {
  const ex = cart.find(c => c.name === name);
  if (ex) ex.quantity++;
  else cart.push({name, price, image, quantity: 1});
  saveCartToCache();
  updateCart();
  displayMenu(menuData);
}

function updateItemQty(name, ch) {
  const it = cart.find(c => c.name === name);
  if (!it) return;
  it.quantity += ch;
  if (it.quantity <= 0) cart = cart.filter(c => c.name !== name);
  saveCartToCache();
  updateCart();
  displayMenu(menuData);
}

function updateCart() {
  let total = 0;
  let count = 0;
  cartItems.innerHTML = "";
  if (!cart.length) {
    cartItems.innerHTML = `<li class="empty">Cart is empty</li>`;
  } else {
    cart.forEach(it => {
      total += it.price * it.quantity;
      count += it.quantity;
      const li = document.createElement("li");
      li.innerHTML = `
        <span>${escapeHtml(it.name)} (x${it.quantity})</span>
        <span>₹${(it.price * it.quantity).toFixed(2)}</span>
      `;
      cartItems.appendChild(li);
    });
  }
  cartTotal.textContent = total.toFixed(2);
  cartCount.textContent = count;
}

// ---------- Order ----------
function placeOrder() {
  const name = document.getElementById("userName")?.value.trim();
  const phone = document.getElementById("phone")?.value.trim();
  const email = document.getElementById("userEmail")?.value.trim();
  const table = document.getElementById("userTable")?.value.trim();
  const note = document.getElementById("userNote")?.value.trim();

  if (!name || !phone || !table) {
    alert("Please fill required fields");
    return;
  }

  const order = {
    name, phone, email, table, review: note,
    cart, totalAmount: cart.reduce((a,b)=>a+b.price*b.quantity,0)
  };

  const cb = "cb_" + Date.now();
  const s = document.createElement("script");
  window[cb] = res => {
    showToast("Order placed ✅");
    cart = [];
    saveCartToCache();
    updateCart();
    s.remove();
  };
  s.src = `${SHEET_URL}?action=submitOrder&orderData=${encodeURIComponent(JSON.stringify(order))}&callback=${cb}`;
  document.body.appendChild(s);
}

// ---------- Events ----------
cartBtn.addEventListener("click", ()=> cartPanel.classList.toggle("active"));
placeOrderBtn.addEventListener("click", placeOrder);
searchInput.addEventListener("input", ()=> displayMenu(menuData));

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", ()=>{
  createSplash();
  loadCartFromCache();
  updateCart();
  loadMenu();
});

