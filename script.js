// ---------- script.js ----------
const GAS_EXEC_URL = "https://script.google.com/macros/s/AKfycbxtk3CnXTyfsvFBnKOoU6l_UbBxBV32z0EHZEXjbXv1xUcLZ1dcaGQmt0CSPjIYTFj7/exec"; // replace
const MENU_PROXY = "https://api.allorigins.win/raw?url=" + encodeURIComponent(GAS_EXEC_URL);

// Load menu using proxy to avoid CORS
async function loadMenu() {
  try {
    const res = await fetch(MENU_PROXY);
    const data = await res.json(); // array of menu items
    renderMenu(data);
  } catch (err) {
    console.error("Failed to load menu:", err);
    document.getElementById("menu").innerHTML = "<p style='color:red'>Menu load failed. Try again later.</p>";
  }
}

function renderMenu(items) {
  const menu = document.getElementById("menu");
  menu.innerHTML = "";
  items.forEach(i => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <img src="${i.image || 'https://via.placeholder.com/300x180'}" alt="${i.name}">
      <h3>${i.name}</h3>
      <p class="desc">${i.description || ""}</p>
      <p class="price">₹${i.price}</p>
      <div class="controls">
        <input type="number" min="1" value="1" id="qty-${escapeId(i.name)}" style="width:60px;">
        <button onclick="addToCartFromUI('${escapeQuotes(i.name)}', ${Number(i.price) || 0})">Add</button>
      </div>
    `;
    menu.appendChild(div);
  });
}

function escapeId(s){ return s.replace(/[^a-z0-9]/gi,'_'); }
function escapeQuotes(s){ return s.replace(/'/g,"\\'").replace(/"/g,'\\"'); }

// Simple cart
let cart = [];
function addToCartFromUI(name, price){
  const qtyEl = document.getElementById("qty-" + escapeId(name));
  const qty = Number(qtyEl ? qtyEl.value : 1) || 1;
  cart.push({ name, price, quantity: qty });
  alert(`${name} x${qty} added`);
  console.log("Cart:", cart);
}

// POST order using hidden FORM (works across origins)
function placeOrderFormSubmit() {
  const customer = (document.getElementById("customerName") || {}).value || "Guest";
  const table = (document.getElementById("tableNo") || {}).value || "";
  if (cart.length === 0) return alert("Please add items to cart");
  // Compute totals
  const totalQuantity = cart.reduce((s,i)=> s + (i.quantity||1), 0);
  const totalPrice = cart.reduce((s,i)=> s + (Number(i.price)||0) * (i.quantity||1), 0);

  const payload = {
    name: customer,
    table: table,
    items: cart,
    totalQuantity: totalQuantity,
    totalPrice: totalPrice
  };

  // Create and submit a hidden form (application/x-www-form-urlencoded) to Apps Script URL
  const form = document.createElement("form");
  form.method = "POST";
  form.action = GAS_EXEC_URL; // direct Apps Script URL
  form.style.display = "none";

  const input = document.createElement("input");
  input.name = "payload";
  input.value = encodeURIComponent(JSON.stringify(payload));
  form.appendChild(input);

  document.body.appendChild(form);
  form.submit(); // this will POST to Apps Script and navigate away (default). To avoid navigation, set target to invisible iframe (see below)
}
