let menuData = [];
let cart = [];

async function loadMenu() {
  const res = await fetch(SCRIPT_URL);
  menuData = await res.json();

  // Load category filter
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
  data.forEach(item => {
    const typeIcon = item.Type.toLowerCase() === "veg"
      ? '<span class="veg-icon"></span>'
      : '<span class="nonveg-icon"></span>';

    const card = document.createElement("div");
    card.classList.add("card");
    card.innerHTML = `
      <img src="${item.Image}" alt="${item.Name}" />
      <div class="card-content">
        <h3>${typeIcon}${item.Name}</h3>
        <p class="price">₹${item.Price}</p>
        <p>${item.Description}</p>
        <button onclick="addToCart('${item.Name}', ${item.Price})">Add</button>
      </div>
    `;
    container.appendChild(card);
  });
}

document.getElementById("categoryFilter").addEventListener("change", e => {
  const val = e.target.value;
  if (val === "all") renderMenu(menuData);
  else renderMenu(menuData.filter(i => i.Category === val));
});

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
