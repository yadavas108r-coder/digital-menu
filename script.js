// ✅ Replace with your Apps Script Web App URL
const SHEET_URL =
  "https://script.google.com/macros/s/AKfycbzZvOt-FviBzc0JTJuOxgMUMeWL6PEWZVl0ZxD0-oVLsOQcDGOTE06Sqg8D04lbIaSK/exec";

// ✅ Fetch menu data with CORS fix
async function loadMenu() {
  try {
    const res = await fetch(`${SHEET_URL}?nocache=${Date.now()}`, {
      method: "GET",
      mode: "no-cors",
    });

    // 👇 Use JSON workaround since mode:no-cors blocks reading response
    const realData = await fetch(SHEET_URL);
    const data = await realData.json();

    menuData = data;
    displayMenu(menuData);
    populateCategories(menuData);
  } catch (err) {
    console.error("❌ Error loading menu:", err);
    document.getElementById("menu").innerHTML =
      "<p style='text-align:center;color:red;'>⚠️ Failed to load menu. Please try again later.</p>";
  }
}

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

// ✅ Display Menu Items
function displayMenu(items) {
  menuContainer.innerHTML = "";
  items.forEach((item) => {
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

// ✅ Category Dropdown
function populateCategories(data) {
  const categories = [...new Set(data.map((i) => i.Category))];
  categories.forEach((cat) => {
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
    (item) =>
      (cat === "All" || item.Category === cat) &&
      item.Name.toLowerCase().includes(searchTerm)
  );
  displayMenu(filtered);
}

// ✅ Cart Management
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
    li.innerHTML = `${item.name} - ₹${item.price} <button onclick="removeFromCart(${index})">❌</button>`;
    cartItems.appendChild(li);
  });
  cartTotal.textContent = total;
  cartCount.textContent = cart.length;
}

function removeFromCart(index) {
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

  if (!name || cart.length === 0) {
    alert("⚠️ Please enter your name and add at least one item.");
    return;
  }

  const totalAmount = cart.reduce((sum, item) => sum + item.price, 0);

  const orderData = {
    name,
    email,
    note,
    cart,
    totalAmount,
  };

  try {
    const res = await fetch(SHEET_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    });

    const text = await res.text();
    alert("✅ Order placed successfully!");
    cart = [];
    updateCart();
  } catch (err) {
    console.error("Error placing order:", err);
    alert("❌ Failed to place order. Please try again.");
  }
});

// ✅ Initialize
loadMenu();

