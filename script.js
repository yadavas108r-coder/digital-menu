const SHEET_URL =
  "https://script.google.com/macros/s/AKfycbwSuIalYZM29yG7_TQYeaXG_mxWKl5I5C3hSHNIN3h8BUgjdxe38zvcH-Gp6cRxmFhz/exec";

const menuContainer = document.getElementById("menu");
const cartCount = document.getElementById("cart-count");
const cartModal = document.getElementById("cart-modal");
const cartItems = document.getElementById("cart-items");
const totalElement = document.getElementById("total");
const closeCartBtn = document.getElementById("closeCart");
const placeOrderBtn = document.getElementById("placeOrder");

let cart = [];

async function loadMenu() {
  try {
    const res = await fetch(SHEET_URL);
    const data = await res.json();

    menuContainer.innerHTML = "";
    data.forEach((item) => {
      const card = document.createElement("div");
      card.classList.add("product-card");
      card.innerHTML = `
        <img src="${item.Image}" alt="${item.Name}">
        <div class="product-info">
          <h3>${item.Name}</h3>
          <p>${item.Category}</p>
          <p>${item.Description}</p>
          <p class="price">₹${item.Price}</p>
          <button onclick="addToCart('${item.Name}', ${item.Price})">Add to Cart</button>
        </div>
      `;
      menuContainer.appendChild(card);
    });
  } catch (err) {
    console.error("Error loading menu:", err);
  }
}

function addToCart(name, price) {
  cart.push({ name, price });
  updateCartCount();
}

function updateCartCount() {
  cartCount.textContent = cart.length;
}

document.getElementById("cart-icon").addEventListener("click", () => {
  showCart();
});

function showCart() {
  cartModal.classList.remove("hidden");
  cartItems.innerHTML = "";

  let total = 0;
  cart.forEach((item, i) => {
    total += Number(item.price);
    const li = document.createElement("li");
    li.textContent = `${item.name} - ₹${item.price}`;
    cartItems.appendChild(li);
  });

  totalElement.textContent = `Total: ₹${total}`;
}

closeCartBtn.addEventListener("click", () => {
  cartModal.classList.add("hidden");
});

placeOrderBtn.addEventListener("click", async () => {
  const name = document.getElementById("customerName").value.trim();
  const table = document.getElementById("tableNo").value.trim();
  const review = document.getElementById("review").value.trim();

  if (!name) {
    alert("Please enter your name.");
    return;
  }
  if (cart.length === 0) {
    alert("Your cart is empty!");
    return;
  }

  const totalAmount = cart.reduce((sum, i) => sum + i.price, 0);

  const orderData = {
    name,
    table,
    review,
    cart,
    totalAmount,
    timestamp: new Date().toISOString(),
  };

  try {
    await fetch(SHEET_URL, {
      method: "POST",
      body: JSON.stringify(orderData),
    });
    alert("✅ Order placed successfully!");
    cart = [];
    updateCartCount();
    cartModal.classList.add("hidden");
  } catch (err) {
    console.error("Error placing order:", err);
    alert("❌ Error placing order!");
  }
});

window.onload = loadMenu;
