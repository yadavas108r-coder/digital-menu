const scriptURL = "https://script.google.com/macros/s/AKfycbwUAAH-m_pflrO0wcd60xpRtQajmQINUXo62ts0qMSVlLdgA1PvhnWVWsZhEVjdznEF/exec";

let cart = [];

// ✅ Load menu from Google Sheet
async function loadMenu() {
  try {
    const res = await fetch(scriptURL, { mode: "cors" });
    const data = await res.json();
    console.log("Menu loaded:", data);

    const menuContainer = document.getElementById("menu");
    menuContainer.innerHTML = "";

    // Fix for wrapped array
    const menuItems = Array.isArray(data) ? data : (data.data || []);

    menuItems.forEach(item => {
      const imageURL = item.Image || item.img || "https://via.placeholder.com/150?text=No+Image";

      const card = document.createElement("div");
      card.classList.add("product-card");
      card.innerHTML = `
        <img src="${imageURL}" alt="${item.Name || item.name}">
        <h3>${item.Name || item.name}</h3>
        <p>₹${item.Price || item.price}</p>
        <p class="desc">${item.Description || ""}</p>
        <button onclick="addToCart('${item.Name || item.name}', ${item.Price || item.price})">Add to Cart</button>
      `;
      menuContainer.appendChild(card);
    });

  } catch (err) {
    console.error("Error loading menu:", err);
  }
}

// ✅ Add item to cart
function addToCart(name, price) {
  cart.push({ name, price });
  updateCart();
}

// ✅ Update cart view
function updateCart() {
  const total = cart.reduce((sum, item) => sum + item.price, 0);
  const cartList = document.getElementById("cartList");
  const cartTotal = document.getElementById("cartTotal");

  if (cartList) {
    cartList.innerHTML = "";
    cart.forEach(item => {
      const li = document.createElement("li");
      li.textContent = `${item.name} — ₹${item.price}`;
      cartList.appendChild(li);
    });
  }

  if (cartTotal) {
    cartTotal.textContent = `Total: ₹${total}`;
  }
}

// ✅ Place order → Google Sheet + Gmail
async function placeOrder() {
  const name = document.getElementById("customerName").value.trim();
  if (!name) return alert("Please enter your name!");

  if (cart.length === 0) return alert("Your cart is empty!");

  const order = { name, items: cart };

  try {
    const res = await fetch(scriptURL, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order)
    });

    const result = await res.json();
    console.log(result);

    if (result.status === "success") {
      document.getElementById("success-message").style.display = "block";
      cart = [];
      updateCart();
      document.getElementById("customerName").value = "";
    }
  } catch (err) {
    console.error("Error sending order:", err);
  }
}

window.onload = loadMenu;

