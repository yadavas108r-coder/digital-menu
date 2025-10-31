// ✅ Backend endpoint (replace with your deployed Apps Script Web App URL)
const SHEET_URL = "https://script.google.com/macros/s/AKfycbwvSjW8gxqe3OdsSDaJPyZdfQwq_qnh8Qpj_REno1ncQRt0UJAJ76SqeAyp3WSsbVZF/exec";

// ✅ Use public proxy to bypass CORS if needed (fallback)
const PROXY_URL = "https://corsproxy.io/?";

// ✅ Elements
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

// ✅ Load Menu from Google Sheet
async function loadMenu() {
  try {
    const res = await fetch(SHEET_URL);
    if (!res.ok) throw new Error("Direct fetch blocked, using proxy...");
    const data = await res.json();
    menuData = data.menu || data;
    displayMenu(menuData);
    populateCategories(menuData);
  } catch (err) {
    console.warn("Retrying via proxy...");
    try {
      const proxyRes = await fetch(PROXY_URL + SHEET_URL);
      const data = await proxyRes.json();
      menuData = data.menu || data;
      displayMenu(menuData);
      populateCategories(menuData);
    } catch (e) {
      console.error("❌ Error loading menu:", e);
      menuContainer.innerHTML = `<p style="color:red;text-align:center;">Error loading menu. Please try again later.</p>`;
    }
  }
}

// ✅ Display Menu Cards
function displayMenu(items) {
  menuContainer.innerHTML = "";
  if (!items.length) {
    menuContainer.innerHTML = `<p class="no-results">No dishes found 😢</p>`;
    return;
  }

  items.forEach(item => {
    const card = document.createElement("div");
    card.classList.add("menu-item");
    const vegIcon = item.Type?.toLowerCase() === "veg" ? "🟢" : "🔴";
    const ratingStars = "⭐".repeat(Math.round(item.Rating || 4));

    card.innerHTML = `
      <img src="${item.Image || 'https://via.placeholder.com/150'}" alt="${item.Name}">
      <div class="menu-details">
        <div class="menu-top">
          <h3>${item.Name}</h3>
          <span class="veg-icon">${vegIcon}</span>
        </div>
        <div class="rating">${ratingStars}</div>
        <p class="desc">${item.Description || ''}</p>
        <p class="price">₹${item.Price}</p>
        <button class="add-btn" onclick="addToCart('${item.Name}', ${item.Price})">+ Add</button>
      </div>`;
    menuContainer.appendChild(card);
  });
}

// ✅ Populate Category Dropdown
function populateCategories(data) {
  const categories = [...new Set(data.map(i => i.Category).filter(Boolean))];
  categoryFilter.innerHTML = `<option value="All">All Categories</option>`;
  categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    categoryFilter.appendChild(opt);
  });
}

// ✅ Filters
categoryFilter.addEventListener("change", filterMenu);
searchInput.addEventListener("input", filterMenu);

function filterMenu() {
  const cat = categoryFilter.value;
  const term = searchInput.value.toLowerCase();
  const filtered = menuData.filter(
    i =>
      (cat === "All" || i.Category === cat) &&
      i.Name.toLowerCase().includes(term)
  );
  displayMenu(filtered);
}

// ✅ Cart System
function addToCart(name, price) {
  cart.push({ name, price });
  updateCart();
}

function updateCart() {
  cartItems.innerHTML = "";
  let total = 0;
  cart.forEach((item, index) => {
    total += item.price;
    const li = document.createElement("li");
    li.innerHTML = `${item.name} - ₹${item.price} <span class="remove" onclick="removeItem(${index})">✖</span>`;
    cartItems.appendChild(li);
  });
  cartTotal.textContent = total;
  cartCount.textContent = cart.length;
}

function removeItem(index) {
  cart.splice(index, 1);
  updateCart();
}

cartBtn.addEventListener("click", () => {
  cartPanel.classList.toggle("active");
});

// ✅ Place Order
placeOrderBtn.addEventListener("click", async () => {
  const name = document.getElementById("userName").value.trim();
  const email = document.getElementById("userEmail").value.trim();
  const note = document.getElementById("userNote").value.trim();
  const total = cart.reduce((sum, i) => sum + i.price, 0);

  if (!name || cart.length === 0) {
    alert("Please enter your name and add at least one item!");
    return;
  }

  const order = { name, email, note, cart, totalAmount: total };

  try {
    await fetch(SHEET_URL, {
      method: "POST",
      body: JSON.stringify(order),
      headers: { "Content-Type": "application/json" },
    });
    alert("✅ Order placed successfully!");
    cart = [];
    updateCart();
    cartPanel.classList.remove("active");
  } catch (err) {
    alert("⚠️ Order failed, try again later!");
    console.error(err);
  }
});

loadMenu();
