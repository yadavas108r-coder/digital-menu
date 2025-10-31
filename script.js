// ======== Config ========
const API_URL = typeof SCRIPT_URL !== "undefined" ? SCRIPT_URL : ""; // from index.html
if (!API_URL) console.warn("SCRIPT_URL not set — replace YOUR_WEB_APP_URL_HERE in index.html");

// ======== UI elements ========
const menuSection = document.getElementById("menuSection");
const searchBar = document.getElementById("searchBar");
const categoryFilter = document.getElementById("categoryFilter");
const categoryButtons = document.getElementById("categoryButtons");

const cartIcon = document.getElementById("cartIcon");
const cartCount = document.getElementById("cartCount");
const cartDrawer = document.getElementById("cartDrawer");
const cartItemsEl = document.getElementById("cartItems");
const cartTotalEl = document.getElementById("cartTotal");
const placeOrderBtn = document.getElementById("placeOrderBtn");
const closeCartBtn = document.getElementById("closeCartBtn");
const customerNameInput = document.getElementById("customerName");
const customerEmailInput = document.getElementById("customerEmail");
const customerNoteInput = document.getElementById("customerNote");

// ======== App state ========
let MENU = [];   // all menu items from sheet
let FILTERED = []; // filtered items for rendering
let CART = [];   // { name, price, qty }

// ======== Helpers ========
function formatCurrency(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

function calcTotal() {
  return CART.reduce((s, it) => s + (Number(it.price) * Number(it.qty || 1)), 0);
}

function updateCartCountUI() {
  cartCount.textContent = CART.reduce((s, i) => s + i.qty, 0);
  cartCount.style.display = CART.length ? "flex" : "none";
}

// ======== Drawer open/close ========
function openCart() {
  cartDrawer.classList.add("open");
  cartDrawer.setAttribute("aria-hidden", "false");
  renderCart();
}
function closeCart() {
  cartDrawer.classList.remove("open");
  cartDrawer.setAttribute("aria-hidden", "true");
}
cartIcon.addEventListener("click", openCart);
closeCartBtn.addEventListener("click", closeCart);

// ======== Render menu ========
function renderMenu(list) {
  menuSection.innerHTML = "";
  if (!list || list.length === 0) {
    menuSection.innerHTML = `<p style="padding:20px">No items found.</p>`;
    return;
  }

  list.forEach(item => {
    // safe fields with fallbacks
    const name = item.Name || item.name || "Untitled";
    const price = item.Price || item.price || 0;
    const image = item.Image || item.image || "https://via.placeholder.com/400x250?text=No+Image";
    const category = item.Category || item.category || "";
    const description = item.Description || item.description || "";
    const type = (item.Type || item.type || "Veg").toString();

    // rating (use field if present or random 4-5)
    let rating = Number(item.Rating || item.rating || 0);
    if (!rating) rating = 4 + Math.floor(Math.random() * 2); // 4 or 5

    const card = document.createElement("article");
    card.className = "card";

    const typeIcon = (type.toLowerCase() === "non-veg" || type.toLowerCase() === "nonveg")
      ? '<span class="nonveg-icon" title="Non-Veg"></span>'
      : '<span class="veg-icon" title="Veg"></span>';

    // build stars
    const stars = Array.from({ length: 5 }, (_, i) =>
      i < rating ? '<span class="star">★</span>' : '<span class="star off">★</span>'
    ).join("");

    card.innerHTML = `
      <img src="${image}" alt="${name}" onerror="this.src='https://via.placeholder.com/400x250?text=No+Image'"/>
      <div class="card-content">
        <h3>${typeIcon} <span style="margin-left:6px">${name}</span></h3>
        <div class="rating">${stars} <small style="color:#666; margin-left:6px">(${rating}.0)</small></div>
        <p class="price">${formatCurrency(price)}</p>
        <p style="min-height:36px; color:#555">${description}</p>
        <div style="display:flex; gap:10px; margin-top:8px; align-items:center;">
          <button class="add-btn" data-name="${escapeHtml(name)}" data-price="${price}">Add</button>
          <button class="add-btn" style="background:transparent;color:#e23744;border:1px solid #f4c6c9;padding:6px 10px;border-radius:8px;" onclick="showOnlyCategory('${escapeQuotes(category)}')">${category || "Other"}</button>
        </div>
      </div>
    `;

    menuSection.appendChild(card);
  });

  // attach listeners to add buttons
  menuSection.querySelectorAll(".add-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const name = btn.getAttribute("data-name");
      const price = parseFloat(btn.getAttribute("data-price")) || 0;
      addToCart(name, price);
      openCart();
    });
  });
}

// small helpers to avoid breaking quotes
function escapeQuotes(s) { return (s||"").replace(/'/g,"\\'").replace(/"/g,"&quot;"); }
function escapeHtml(s) { return (s||"").replace(/"/g,"&quot;"); }

// ======== Category UI ========
function buildCategories(items) {
  const cats = Array.from(new Set(items.map(i => (i.Category || "Other"))));
  // fill select
  categoryFilter.innerHTML = `<option value="all">All Categories</option>`;
  categoryButtons.innerHTML = "";
  cats.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    categoryFilter.appendChild(opt);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = cat;
    btn.addEventListener("click", () => {
      // toggle active
      [...categoryButtons.children].forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      categoryFilter.value = cat;
      applyFilters();
    });
    categoryButtons.appendChild(btn);
  });
}

// ======== Filtering & Search ========
function applyFilters() {
  const q = (searchBar.value || "").trim().toLowerCase();
  const selected = categoryFilter.value || "all";

  FILTERED = MENU.filter(it => {
    const name = (it.Name || "").toLowerCase();
    const desc = (it.Description || "").toLowerCase();
    const cat = (it.Category || "");
    const matchCategory = selected === "all" ? true : (cat === selected);
    const matchSearch = q === "" ? true : (name.includes(q) || desc.includes(q));
    return matchCategory && matchSearch;
  });

  renderMenu(FILTERED);
}

categoryFilter.addEventListener("change", applyFilters);
searchBar.addEventListener("input", () => { applyFilters(); });

// helper to show only a category when clicking category button in card
function showOnlyCategory(cat) {
  categoryFilter.value = cat;
  [...categoryButtons.children].forEach(b => b.classList.remove("active"));
  // highlight the matching button
  Array.from(categoryButtons.children).find(b => b.textContent === cat)?.classList.add("active");
  applyFilters();
}

// ======== Cart logic ========
function findCartIndex(name) {
  return CART.findIndex(i => i.name === name);
}

function addToCart(name, price) {
  const idx = findCartIndex(name);
  if (idx >= 0) CART[idx].qty++;
  else CART.push({ name, price: Number(price), qty: 1 });
  updateCartUI();
}

function removeFromCart(name) {
  const idx = findCartIndex(name);
  if (idx >= 0) {
    CART.splice(idx, 1);
    updateCartUI();
  }
}

function changeQty(name, delta) {
  const idx = findCartIndex(name);
  if (idx >= 0) {
    CART[idx].qty = Math.max(1, CART[idx].qty + delta);
    updateCartUI();
  }
}

function renderCart() {
  cartItemsEl.innerHTML = "";
  if (!CART.length) {
    cartItemsEl.innerHTML = `<p style="color:#666">Your cart is empty.</p>`;
    cartTotalEl.textContent = "Total: ₹0";
    updateCartCountUI();
    return;
  }

  CART.forEach(item => {
    const row = document.createElement("div");
    row.className = "cart-item";
    row.innerHTML = `
      <div style="flex:1">
        <div style="font-weight:600">${item.name}</div>
        <div style="font-size:0.85rem;color:#666">₹${item.price} × ${item.qty} = ₹${(item.price * item.qty)}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;margin-left:10px">
        <div style="display:flex;gap:6px">
          <button style="padding:6px;border-radius:6px;border:1px solid #ddd;background:#fff;cursor:pointer" data-action="minus" data-name="${escapeHtml(item.name)}">−</button>
          <button style="padding:6px;border-radius:6px;border:1px solid #ddd;background:#fff;cursor:pointer" data-action="plus" data-name="${escapeHtml(item.name)}">+</button>
        </div>
        <button style="background:transparent;border:none;color:#e23744;cursor:pointer;font-weight:600" data-action="remove" data-name="${escapeHtml(item.name)}">Remove</button>
      </div>
    `;
    cartItemsEl.appendChild(row);
  });

  // listeners for plus/minus/remove
  cartItemsEl.querySelectorAll("button[data-action]").forEach(btn => {
    const action = btn.getAttribute("data-action");
    const name = btn.getAttribute("data-name");
    btn.addEventListener("click", () => {
      if (action === "minus") changeQty(name, -1);
      if (action === "plus") changeQty(name, +1);
      if (action === "remove") removeFromCart(name);
    });
  });

  const total = calcTotal();
  cartTotalEl.textContent = `Total: ${formatCurrency(total)}`;
  updateCartCountUI();
}

function updateCartUI() {
  renderCart();
}

// ======== Place order ========
placeOrderBtn.addEventListener("click", async () => {
  const name = customerNameInput.value.trim();
  const email = customerEmailInput.value.trim();
  const note = customerNoteInput.value.trim();

  if (!name) {
    alert("Please enter your name.");
    return;
  }
  if (!CART.length) {
    alert("Your cart is empty.");
    return;
  }

  const total = calcTotal();

  const orderPayload = {
    name,
    email: email || "",
    note: note || "",
    cart: CART,
    totalAmount: total,
    timestamp: new Date().toISOString()
  };

  try {
    placeOrderBtn.disabled = true;
    placeOrderBtn.textContent = "Placing order...";
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload)
    });

    const text = await resp.text();
    alert(typeof text === "string" && text ? text : "Order placed successfully!");

    // reset
    CART = [];
    updateCartUI();
    customerNameInput.value = "";
    customerEmailInput.value = "";
    customerNoteInput.value = "";
    closeCart();
  } catch (err) {
    console.error("Order error:", err);
    alert("Failed to place order. Please try again.");
  } finally {
    placeOrderBtn.disabled = false;
    placeOrderBtn.textContent = "Place Order";
  }
});

// ======== Initial load from Google Sheet API ========
async function init() {
  try {
    const res = await fetch(API_URL, {cache: "no-store"});
    if (!res.ok) throw new Error("Network response not ok: " + res.status);
    MENU = await res.json();
    // normalize fields to consistent keys (Name, Price, Image, Category, Description, Type)
    MENU = MENU.map(it => ({
      Name: it.Name || it.name || "",
      Price: it.Price || it.price || it.Price || 0,
      Image: it.Image || it.image || it.Img || "",
      Category: it.Category || it.category || "Other",
      Description: it.Description || it.description || "",
      Type: it.Type || it.type || "Veg",
      Rating: it.Rating || it.rating || null
    }));

    buildCategories(MENU);
    FILTERED = MENU.slice();
    renderMenu(FILTERED);
  } catch (err) {
    console.error("Failed to load menu:", err);
    menuSection.innerHTML = `<p style="padding: 20px; color:#666">Unable to load menu. Check your Apps Script URL and CORS settings.</p>`;
  }
}

init();
