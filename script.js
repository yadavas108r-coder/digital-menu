const scriptURL = "https://script.google.com/macros/s/AKfycbxtk3CnXTyfsvFBnKOoU6l_UbBxBV32z0EHZEXjbXv1xUcLZ1dcaGQmt0CSPjIYTFj7/exec";

let cart = [];
let menuData = [];

async function loadMenu() {
  try {
    const res = await fetch(scriptURL);
    const data = await res.json();
    console.log("Menu JSON:", data); // 👀 Debug line

    // Fix: handle both array or object wrapper
    menuData = Array.isArray(data) ? data : (data.data || []);

    const menuContainer = document.getElementById("menu");
    menuContainer.innerHTML = "";

    menuData.forEach(item => {
      const card = document.createElement("div");
      card.classList.add("product-card");
      card.innerHTML = `
        <img src="${item.Image}" alt="${item.Name}">
        <h3>${item.Name}</h3>
        <p class="desc">${item.Description || ""}</p>
        <p class="price">₹${item.Price}</p>
        <button onclick="addToCart('${item.Name}', ${item.Price})">Add to Cart</button>
      `;
      menuContainer.appendChild(card);
    });
  } catch (err) {
    console.error("Error loading menu:", err);
  }
}

function addToCart(name, price) {
  const existing = cart.find(i => i.name === name);
  if (existing) existing.qty++;
  else cart.push({ name, price, qty: 1 });
  updateCart();
}

function updateCart() {
  const cartList = document.getElementById("cart-items");
  const totalPrice = document.getElementById("total-price");
  cartList.innerHTML = "";

  let total = 0;
  cart.forEach(i => {
    total += i.price * i.qty;
    const li = document.createElement("li");
    li.textContent = `${i.name} x${i.qty} - ₹${i.price * i.qty}`;
    cartList.appendChild(li);
  });
  totalPrice.textContent = `Total: ₹${total}`;
}

async function placeOrder() {
  const name = document.getElementById("customerName").value.trim();
  const table = document.getElementById("tableNumber").value.trim();

  if (!name || !cart.length) {
    alert("Please enter your name and add items to cart!");
    return;
  }

  try {
    const res = await fetch(scriptURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, table, items: cart })
    });

    const result = await res.json();
    if (result.success) {
      alert("✅ Order placed successfully!");
      cart = [];
      updateCart();
    } else alert("Something went wrong.");
  } catch (err) {
    console.error("Order Error:", err);
  }
}

window.onload = loadMenu;
