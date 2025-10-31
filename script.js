let menuData = [];
let cart = [];

async function loadMenu() {
  const res = await fetch(SCRIPT_URL);
  menuData = await res.json();

  // Add fake random ratings if not present
  menuData.forEach(item => {
    item.Rating = item.Rating ? Number(item.Rating) : Math.floor(Math.random() * 2) + 4; // 4–5 stars
  });

  // Load categories
  const categories = [...new Set(menuData.map(i => i.Category))];
  const select = document.getElementById("categoryFilter");
  categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });

  renderMenu(menuData);
}

function renderMenu(data) {
  const container = document.getElementById("menuContainer");
  container.innerHTML = "";

  if (data.length === 0) {
    container.innerHTML = "<p style='text-align:center;'>No dishes found 😔</p>";
    return;
  }

  data.forEach(item => {
    const typeIcon =
      item.Type.toLowerCase() === "veg"
        ? '<span class="veg-icon"></span>'
        : '<span class="nonveg-icon"></span>';

    const stars = Array(5)
      .fill(0)
      .map((_, i) =>
        i < item.Rating ? '<span class="star">★</span>' : '<span class="star off">★</span>'
      )
      .join("");

    const card = document.createElement("div");
    card.classList.add("card");
    card.innerHTML = `
      <img src="${item.Image}" alt="${item.Name}" />
      <div class="card-content">
        <h3>${typeIcon}${item.Name}</h3>
        <div class="card-rating">${stars} <small>(${item.Rating}.0)</small></div>
        <p class="price">₹${item.Price}</p>
        <p>${item.Description}</p>
        <button onclick="addToCart('${item.Name}', ${item.Price})">Add</button>
      </div>
    `;
    container.appendChild(card);
  });
}

// 🔸 Category Filter
document.getElementById("categoryFilter").addEventListener("change", e => {
  const val = e.target.value;
  const searchValue = document.getElementById("searchBar").value.toLowerCase();

  const filtered = menuData.filter(i => {
    const matchCategory = val === "all" || i.Category === val;
    const matchSearch = i.Name.toLowerCase().includes(searchValue);
    return matchCategory && matchSearch;
  });

  renderMenu(filtered);
});

// 🔸 Search Functionality
document.getElementById("searchBar").addEventListener("input", e => {
  const searchValue = e.target.value.toLowerCase();
  const categoryVal = document.getElementById("categoryFilter").value;

  const filtered = menuData.filter(i => {
    const matchCategory = categoryVal === "all" || i.Category === categoryVal;
    const matchSearch =
      i.Name.toLowerCase().includes(searchValue) ||
      (i.Description && i.Description.toLowerCase().includes(searchValue));
    return matchCategory && matchSearch;
  });

  renderMenu(filtered);
});

// 🛒 Add to Cart
function addToCart(name, price) {
  const existing = cart.find(i => i.name === name);
  if (existing) existing.qty++;
  else cart.push({ name, price, qty: 1 });
  updateCart();
}

function updateCart() {
  const cartDiv = document.getElementById("cartItems");
  cartDiv.innerHTML = "";
  let total = 0;

  cart.forEach(item => {
    total += item.price * item.qty;
    const div = document.createElement("div");
    div.classList.add("cart-item");
    div.innerHTML = `
      <span>${item.name} x${item.qty}</span>
      <span>₹${item.price * item.qty}</span>
    `;
    cartDiv.appendChild(div);
  });

  document.getElementById("totalAmount").textContent = total;
}

// ✅ Place Order (POST to Apps Script)
document.getElementById("placeOrder").addEventListener("click", async () => {
  const name = document.getElementById("customerName").value.trim();
  const email = document.getElementById("customerEmail").value.trim();
  const review = document.getElementById("customerReview").value.trim();
  const total = document.getElementById("totalAmount").textContent;

  if (!name || cart.length === 0) {
    alert("Please enter your name and add at least one item!");
    return;
  }

  const orderData = {
    name,
    email,
    cart,
    totalAmount: total,
    review
  };

  const res = await fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify(orderData),
    headers: { "Content-Type": "application/json" }
  });

  const text = await res.text();
  alert(text);
  cart = [];
  updateCart();
  document.getElementById("customerName").value = "";
  document.getElementById("customerEmail").value = "";
  document.getElementById("customerReview").value = "";
});

loadMenu();
