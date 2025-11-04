const scriptURL = "https://script.google.com/macros/s/AKfycbyii5UZmz-aVDjb-FXYCPIW_7d4-GBReGRH2dOeX2lYYl4Si2wmbQU3RrGOqVvqEoiV/exec"; // 👈 Replace with your deployed script URL

function showSection(id) {
  document.querySelectorAll("section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll("nav button").forEach(b => b.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  document.querySelector(`nav button[onclick="showSection('${id}')"]`).classList.add("active");
}

async function fetchData(action) {
  const res = await fetch(`${scriptURL}?action=${action}`);
  return res.json();
}

// ✅ Dashboard Data
async function loadDashboard() {
  const orders = await fetchData("getOrders");
  const menu = await fetchData("getMenu");
  let totalSales = orders.reduce((sum, o) => sum + Number(o.Total || 0), 0);
  document.getElementById("totalOrders").innerText = orders.length;
  document.getElementById("totalSales").innerText = "₹" + totalSales;
 document.getElementById("totalProducts").innerText = data.count;
}

// ✅ Load Menu
async function loadMenu() {
  const data = await fetchData("getMenu");
  const tbody = document.querySelector("#menuTable tbody");
  tbody.innerHTML = "";
  data.forEach((item, i) => {
    const row = `<tr>
      <td>${item.Name}</td><td>${item.Category}</td><td>₹${item.Price}</td>
      <td><button onclick="deleteProduct('${item.Name}')">❌</button></td>
    </tr>`;
    tbody.innerHTML += row;
  });
}

// ✅ Add Product
document.getElementById("addProductForm").onsubmit = async (e) => {
  e.preventDefault();
  const form = e.target;
  const product = {
    name: form.pName.value,
    category: form.pCategory.value,
    price: form.pPrice.value,
    image: form.pImage.value,
    desc: form.pDesc.value,
  };
  await fetch(`${scriptURL}?action=addProduct&data=${encodeURIComponent(JSON.stringify(product))}`);
  alert("✅ Product Added!");
  form.reset();
  loadMenu();
};

// ✅ Load Orders
async function loadOrders() {
  const data = await fetchData("getOrders");
  const tbody = document.querySelector("#orderTable tbody");
  tbody.innerHTML = "";
  data.forEach(o => {
    tbody.innerHTML += `<tr>
      <td>${o.Name}</td>
      <td>${o.Items}</td>
      <td>₹${o.Total}</td>
      <td>${o.Email}</td>
      <td>${o.Timestamp}</td>
    </tr>`;
  });
}

window.onload = () => {
  loadDashboard();
  loadMenu();
  loadOrders();
};
