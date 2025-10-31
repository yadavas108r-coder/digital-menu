const scriptURL = "https://script.google.com/macros/s/AKfycbz2td1i9H1IRB9D4rzxxE6s7o9Rw-QP8gG7CkugtIzUBWxsrDjkds5Bb8QmjoYzMJAb/exec";
const menuContainer = document.getElementById("menu");
const cartCount = document.getElementById("cart-count");

let cart = [];

async function loadMenu() {
  try {
    const response = await fetch(SHEET_URL);
    const data = await response.json();

    menuContainer.innerHTML = "";

    data.forEach((item) => {
      // Skip empty rows
      if (!item.Name || !item.Image) return;

      const card = document.createElement("div");
      card.classList.add("product-card");

      card.innerHTML = `
        <img src="${item.Image}" alt="${item.Name}">
        <div class="product-info">
          <h3>${item.Name}</h3>
          <p class="category">${item.Category || "Other"}</p>
          <p class="desc">${item.Description || ""}</p>
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
  if (cartCount) {
    cartCount.textContent = cart.length;
  }
}

window.onload = loadMenu;
