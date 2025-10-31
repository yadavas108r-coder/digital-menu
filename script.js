const SHEET_URL = "https://script.google.com/macros/s/AKfycbxplBq_TfqUM3M-JRFBGS3KKvf80H5B_HSdEwidSQW2TxWV4p1fwLPgW-cEefEcCSp8/exec";

const menuContainer = document.getElementById("menu");
const categoryFilter = document.getElementById("categoryFilter");
const searchInput = document.getElementById("searchInput");
const cartPanel = document.getElementById("cart");
const cartBtn = document.getElementById("cartIconBtn");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const cartCount = document.getElementById("cartCount");

let menuData = [];
let cart = [];

async function loadMenu() {
  try {
    const res = await fetch(SHEET_URL);
    const data = await res.json();
    menuData = data.menu || [];
    displayMenu(menuData);
    populateCategories(menuData);
  } catch (err) {
    console.error("Error loading menu:", err);
  }
}

function displayMenu(items) {
  menuContainer.innerHTML = "";
  items.forEach(item => {
    const card = document.createElement("div");
    card.classList.add("menu-item");
    const vegIcon = item.Type?.toLowerCase() === "veg" ? "🟢" : "🔴";
    const ratingStars = "⭐".repeat(Math.floor(item.Rating || 4));

    card.innerHTML = `
      <img src="${item.Image}" alt="${item.Name}">
      <div class="menu-details">
        <div class="menu-top">
          <h3>${item.Name}</h3>
          <span class="veg-icon">${vegIcon}</span>
        </div>
        <div class="rating">${ratingStars}</div>
        <p>${item.Description}</p>
        <p class="price">₹${item.Price}</p>
        <button class="add-btn" onclick="addToCart('${item.Name}', ${item.Price})">Add to Cart</button>
      </div>`;
    menuContainer.appendChild(card);
  });
}

function populateCategories(data) {
  const categories = [...new Set(data.map(i => i.Category))];
  categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    categoryFilter.appendChild(opt);
  });
}

categoryFilter.addEventListener("change", filterMenu);
searchInput.addEventListener("input", filterMenu);

function filterMenu() {
  const cat = categoryFilter.value;
  const searchTerm = searchInput.value.toLowerCase();
  const filtered = menuData.filter(
    item =>
      (cat === "All" || item.Category === cat) &&
      item.Name.toLowerCase().includes(searchTerm)
  );
  displayMenu(filtered);
}

function addToCart(name, price) {
  cart.push({ name, price });
  updateCart();
}

function updateCart() {
  cartItems.innerHTML = "";
  let total = 0;
  cart.forEach((item) => {
    total += item.price;
    const li = document.createElement("li");
    li.textContent = `${item.name} - ₹${item.price}`;
    cartItems.appendChild(li);
  });
  cartTotal.textContent = total;
  cartCount.textContent = cart.length;
}

cartBtn.addEventListener("click", () => {
  cartPanel.classList.toggle("active");
});

loadMenu();

