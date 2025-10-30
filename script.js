const menuContainer = document.getElementById("menu");
const modal = document.getElementById("orderModal");
const orderDetails = document.getElementById("orderDetails");
const msgBox = document.getElementById("msgBox");

let currentItem = null;

// Load menu from Google Sheet
fetch(scriptURL)
  .then(res => res.json())
  .then(data => showMenu(data))
  .catch(err => console.error("Error loading menu:", err));

function showMenu(items) {
  const grouped = items.reduce((acc, item) => {
    if (!acc[item.cat]) acc[item.cat] = [];
    acc[item.cat].push(item);
    return acc;
  }, {});

  menuContainer.innerHTML = Object.keys(grouped)
    .map(cat => `
      <h2 class="catTitle">${cat}</h2>
      <div class="menuGrid">
        ${grouped[cat].map(i => `
          <div class="card">
            <img src="${i.img}" alt="${i.name}">
            <h3>${i.name}</h3>
            <p>₹${i.price}</p>
            <button onclick='openOrder(${JSON.stringify(i)})'>Order</button>
          </div>
        `).join('')}
      </div>
    `).join('');
}

function openOrder(item) {
  currentItem = item;
  modal.style.display = "flex";
  orderDetails.innerHTML = `${item.name} - ₹${item.price}`;
}

document.getElementById("confirmOrder").addEventListener("click", () => {
  const name = document.getElementById("custName").value.trim();
  if (!name) return alert("Please enter your name");
  
  const body = {
    name,
    item: currentItem.name,
    price: currentItem.price,
    qty: 1,
    total: currentItem.price
  };

  fetch(scriptURL, {
    method: "POST",
    body: JSON.stringify(body)
  })
  .then(res => res.text())
  .then(msg => {
    modal.style.display = "none";
    showMessage("✅ Order placed successfully!");
  })
  .catch(err => showMessage("❌ Order failed!"));
});

document.getElementById("cancelOrder").addEventListener("click", () => {
  modal.style.display = "none";
});

function showMessage(text) {
  msgBox.innerText = text;
  msgBox.style.display = "block";
  setTimeout(() => msgBox.style.display = "none", 3000);
}
