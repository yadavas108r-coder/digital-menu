// ✅ Make sure this is the FIRST line
const SHEET_URL = "https://script.google.com/macros/s/AKfycbx21b7H-r6glb03p11Z9TBTYKif9RhoCsoy-EerVOCTyzgWn3RROvSGiQQ4lb9uTQc/exec";

const menuContainer = document.getElementById("menu");
const cartCount = document.getElementById("cart-count");

let cart = [];

// ✅ Load products from Google Sheet
async function loadMenu() {
  try {
    const response = await fetch(SHEET_URL);
    const data = await response.json();

    menuContainer.innerHTML = "";

    data.forEach((item) => {
      const card = document.createElement("div");
      card.classList.add("product-card");

      card.innerHTML = `
        <img src="${item.Image}" alt="${item.Name}">
        <div class="product-info">
          <h3>${item.Name}</h3>
          <p class="category">${item.Category || ""}</p>
          <p>${item.Description || ""}</p>
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
  updateCart();
}

function updateCart() {
  cartCount.textContent = cart.length;
}

window.onload = loadMenu;
