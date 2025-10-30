const API_URL = "https://script.google.com/macros/s/AKfycbxRwRvPdVD9WO9MyLI8Oz6NuHTMHKTXE8kJsB3Q7Z7rI3oAVRMIEttcwHDqucwDeEVK/exec"; // 👈 apna URL daalna

let cart = [];

async function loadMenu() {
  const res = await fetch(API_URL);
  const data = await res.json();
  const menu = document.getElementById("menu");

  menu.innerHTML = data.map(item => `
    <div class="item">
      <img src="${item.Image}" alt="${item.Name}">
      <h3>${item.Name}</h3>
      <p>${item.Description || ''}</p>
      <p class="price">${item.Price}</p>
      <button onclick="addToCart('${item.Name}', '${item.Price}')">Add</button>
    </div>
  `).join('');
}

function addToCart(name, price) {
  cart.push({ item: name, price, quantity: 1 });
  displayCart();
}

function displayCart() {
  const list = document.getElementById("cartItems");
  list.innerHTML = cart.map(c => `<li>${c.item} - ${c.price}</li>`).join('');
}

document.getElementById("placeOrderBtn").addEventListener("click", async () => {
  if (cart.length === 0) return alert("Please add items first!");
  const table = prompt("Enter Table Number:");
  for (const c of cart) {
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table,
        item: c.item,
        quantity: c.quantity,
        price: c.price
      })
    });
  }
  showPopup();
  cart = [];
  displayCart();
});

function showPopup() {
  const popup = document.getElementById("popup");
  popup.classList.add("show");
  setTimeout(() => popup.classList.remove("show"), 3000);
}

loadMenu();
