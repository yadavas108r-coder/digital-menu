const scriptURL = "https://script.google.com/macros/s/AKfycbz0dLqVJnC_XJl4sE1otepwWXZOT9WAyH6NdlIx1-F8XiHxfwMT4ECHDFhIOWCPRG4M/exec";
let menuData = [];
let cart = [];

// Load Menu from Google Sheet
fetch(scriptURL)
  .then(res => res.json())
  .then(data => {
    menuData = data;
    displayCategories();
    displayMenu(data);
  })
  .catch(err => console.error("Error loading menu:", err));

// Display categories dynamically
function displayCategories() {
  const categories = [...new Set(menuData.map(i => i.cat))];
  const container = document.getElementById("category-buttons");
  container.innerHTML = categories.map(c => `<button onclick="filterMenu('${c}')">${c}</button>`).join(" ");
}

function filterMenu(category) {
  const filtered = menuData.filter(i => i.cat === category);
  displayMenu(filtered);
}

// Display menu items
function displayMenu(data) {
  const menu = document.getElementById("menu");
  menu.innerHTML = data.map(i => `
    <div class="card">
      <img src="${i.img}">
      <h3>${i.name}</h3>
      <p>₹${i.price}</p>
      <button onclick='addToCart(${JSON.stringify(i)})'>Add</button>
    </div>
  `).join("");
}

// Add to cart
function addToCart(item) {
  cart.push(item);
  alert(`${item.name} added to cart!`);
}

// Place Order
document.getElementById("placeOrder").addEventListener("click", () => {
  const name = document.getElementById("customerName").value;
  if (!name || cart.length === 0) return alert("Enter name and select items!");

  fetch(scriptURL, {
    method: "POST",
    body: JSON.stringify({ name, items: cart }),
    headers: { "Content-Type": "application/json" }
  })
  .then(r => r.json())
  .then(res => {
    document.getElementById("success-message").style.display = "block";
    cart = [];
  })
  .catch(err => console.error("Error placing order:", err));
});

document.getElementById("cancelOrder").addEventListener("click", () => {
  cart = [];
  document.getElementById("customerName").value = "";
});

