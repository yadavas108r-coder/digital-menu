
const GAS_EXEC_URL = "https://script.google.com/macros/s/AKfycbxtk3CnXTyfsvFBnKOoU6l_UbBxBV32z0EHZEXjbXv1xUcLZ1dcaGQmt0CSPjIYTFj7/exec"; // <-- replace with your exec URL

// Use AllOrigins proxy for GET
const MENU_PROXY = "https://api.allorigins.win/raw?url=" + encodeURIComponent(GAS_EXEC_URL);

const menuEl = document.getElementById("menu");
const categoryBar = document.getElementById("category-bar");
const cartItemsEl = document.getElementById("cart-items");
const cartTotalEl = document.getElementById("cart-total");
const successEl = document.getElementById("success-message");
const customerNameEl = document.getElementById("customerName");
const tableNoEl = document.getElementById("tableNo");
const reviewBtn = document.getElementById("reviewBtn");
const checkoutBtn = document.getElementById("checkoutBtn");

let menuData = [];
let cart = [];

// UTIL
function escapeId(s){ return String(s).replace(/[^a-z0-9]/gi,'_'); }
function formatMoney(n){ return "₹" + Number(n||0).toLocaleString('en-IN'); }

// Load menu
async function loadMenu(){
  try{
    const res = await fetch(MENU_PROXY);
    if(!res.ok) throw new Error("Menu fetch failed: " + res.status);
    const data = await res.json();
    menuData = Array.isArray(data) ? data : [];
    renderCategories();
    renderMenu(menuData);
  }catch(err){
    console.error("Failed to load menu:", err);
    menuEl.innerHTML = `<p style="color:red">Failed to load menu. Check GAS URL & deployment.</p>`;
  }
}

// Render categories dynamically
function renderCategories(){
  const cats = ["All", ...new Set(menuData.map(i => i.category || "Other"))];
  categoryBar.innerHTML = cats.map((c,i)=>`<button class="${i===0? 'active':''}" onclick="filterBy('${c}')">${c}</button>`).join("");
}

function filterBy(cat){
  document.querySelectorAll("#category-bar button").forEach(b=>b.classList.remove("active"));
  event.currentTarget?.classList.add("active");
  if(cat === "All") renderMenu(menuData);
  else renderMenu(menuData.filter(i => (i.category||"").toLowerCase() === cat.toLowerCase()));
}

// Render cards
function renderMenu(list){
  menuEl.innerHTML = "";
  if(!list.length){ menuEl.innerHTML = "<p>No items available.</p>"; return; }
  list.forEach(item=>{
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <div class="imgwrap"><img src="${item.image||'https://via.placeholder.com/300x300'}" alt="${item.name}" loading="lazy"></div>
      <h4>${item.name}</h4>
      <p class="desc">${item.description||""}</p>
      <div class="price">₹${item.price}</div>
      <div class="controls">
        <input type="number" min="1" value="1" id="qty-${escapeId(item.name)}">
        <button onclick="addToCartFromUI('${item.name.replace(/'/g,"\\'")}', ${Number(item.price)||0})">Add</button>
      </div>
    `;
    menuEl.appendChild(div);
  });
}

// Cart functions
function addToCartFromUI(name, price){
  const el = document.getElementById("qty-" + escapeId(name));
  const qty = el ? Math.max(1, Number(el.value)||1) : 1;
  const existing = cart.find(c=>c.name === name);
  if(existing) existing.quantity += qty;
  else cart.push({name, price: Number(price)||0, quantity: qty});
  renderCart();
  alert(`${name} x${qty} added`);
}

function renderCart(){
  if(cart.length === 0){
    cartItemsEl.innerHTML = "<div style='opacity:.7'>No items yet</div>";
    cartTotalEl.textContent = formatMoney(0);
    return;
  }
  cartItemsEl.innerHTML = "";
  cart.forEach((c, idx)=>{
    const row = document.createElement("div");
    row.className = "cart-row";
    row.innerHTML = `
      <div class="meta">
        <div style="font-weight:700">${c.name}</div>
        <div style="font-size:13px;color:#666">Qty: <input type="number" min="1" value="${c.quantity}" style="width:60px" onchange="updateQty(${idx}, this.value)"></div>
      </div>
      <div style="text-align:right">
        <div>₹${(c.price * c.quantity).toLocaleString('en-IN')}</div>
        <div style="margin-top:6px"><button onclick="removeFromCart(${idx})" style="background:none;border:none;color:#d00;cursor:pointer">Remove</button></div>
      </div>
    `;
    cartItemsEl.appendChild(row);
  });
  const total = cart.reduce((s,i)=> s + (i.price||0) * (i.quantity||1), 0);
  cartTotalEl.textContent = formatMoney(total);
}

function updateQty(idx, v){
  cart[idx].quantity = Math.max(1, Number(v)||1);
  renderCart();
}
function removeFromCart(idx){
  cart.splice(idx,1); renderCart();
}

// Review / Checkout
reviewBtn.addEventListener("click", ()=> {
  if(cart.length === 0) return alert("Add items first");
  window.scrollTo({top:0,behavior:'smooth'});
  alert("Review your cart on the right. Click Checkout to place order.");
});

checkoutBtn.addEventListener("click", ()=> {
  const name = (customerNameEl.value || "").trim();
  if(!name) return alert("Please enter name/table in the cart panel.");
  if(cart.length === 0) return alert("Cart is empty.");
  submitOrder(name, tableNoEl.value || "");
});

// Submit order via hidden form (avoids CORS for POST)
function submitOrder(name, table){
  const totalQuantity = cart.reduce((s,i)=> s + (i.quantity||1), 0);
  const totalPrice = cart.reduce((s,i)=> s + (Number(i.price)||0) * (i.quantity||1), 0);
  const payload = {
    name: name,
    table: table,
    items: cart,
    totalQuantity,
    totalPrice
  };

  // create hidden form targeted to hidden_iframe
  const form = document.createElement("form");
  form.method = "POST";
  form.action = GAS_EXEC_URL;
  form.target = "hidden_iframe";
  form.style.display = "none";

  const input = document.createElement("input");
  input.name = "payload";
  input.value = encodeURIComponent(JSON.stringify(payload));
  form.appendChild(input);

  document.body.appendChild(form);
  form.submit();

  // show success (we cannot reliably read iframe response across origins)
  successEl.hidden = false;
  setTimeout(()=> successEl.hidden = true, 5000);
  cart = []; renderCart();
  customerNameEl.value = ""; tableNoEl.value = "";
  document.body.removeChild(form);
}

// Init
loadMenu();
renderCart();
