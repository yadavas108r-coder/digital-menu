// ✅ Google Apps Script URL (replace if you create a new one)
const GAS_URL = "https://script.google.com/macros/s/AKfycbwjAcJY1hxffDWnT1g8CtKZPjxMvJXb3gTs8R4-nqaXH5CM2FvvKrRleXpyVzGZtpNY/exec";

// ✅ CORS-Bypass Proxy
const scriptURL = "https://api.allorigins.win/raw?url=" + encodeURIComponent(GAS_URL);

async function loadMenu() {
  try {
    const response = await fetch(scriptURL);
    const data = await response.json();

    const menuContainer = document.getElementById("menu");
    menuContainer.innerHTML = "";

    data.forEach(item => {
      const card = document.createElement("div");
      card.classList.add("product-card");
      card.innerHTML = `
        <img src="${item.img}" alt="${item.name}">
        <h3>${item.name}</h3>
        <p>₹${item.price}</p>
        <p class="cat">${item.cat || ""}</p>
        <p class="desc">${item.desc || ""}</p>
        <button onclick="addToCart('${item.name}', ${item.price})">Add to Cart</button>
      `;
      menuContainer.appendChild(card);
    });
  } catch (err) {
    console.error("Error loading menu:", err);
    alert("❌ Failed to load menu. Please try again later.");
  }
}

// ✅ Example cart function (you can replace with your logic)
let cart = [];

function addToCart(name, price) {
  cart.push({ name, price });
  console.log("🛒 Cart:", cart);
  alert(`${name} added to cart!`);
}

window.onload = loadMenu;
