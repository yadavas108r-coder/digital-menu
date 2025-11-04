const scriptURL = "https://script.google.com/macros/s/AKfycbyii5UZmz-aVDjb-FXYCPIW_7d4-GBReGRH2dOeX2lYYl4Si2wmbQU3RrGOqVvqEoiV/exec"; // 👈 Replace with your deployed script URL

// ✅ Fetch Orders & Dashboard Data
async function loadDashboard() {
  try {
    const res = await fetch(`${scriptURL}?action=getOrders`);
    const data = await res.json();

    console.log("📊 Loaded Data:", data);

    if (!data || !data.orders) {
      console.error("No data received!");
      return;
    }

    // Total Orders
    document.getElementById("totalOrders").textContent = data.orders.length;

    // Total Sales
    const totalSales = data.orders.reduce((sum, order) => sum + Number(order.Total || 0), 0);
    document.getElementById("totalSales").textContent = `₹${totalSales}`;

    // Today’s Orders
    const today = new Date().toLocaleDateString();
    const todaysOrders = data.orders.filter(o => {
      const orderDate = new Date(o.Timestamp).toLocaleDateString();
      return orderDate === today;
    }).length;
    document.getElementById("todayOrders").textContent = todaysOrders;

    // Orders Table
    const tbody = document.getElementById("ordersTableBody");
    tbody.innerHTML = "";

    data.orders.forEach(order => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${order.Timestamp || ""}</td>
        <td>${order.Name || ""}</td>
        <td>${order.Table || ""}</td>
        <td>${order.Items || ""}</td>
        <td>₹${order.Total || 0}</td>
        <td>${order.Review || ""}</td>
        <td>${order["Customer Email"] || ""}</td>
      `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error("❌ Dashboard Load Error:", err);
  }
}

// ✅ Run on page load
document.addEventListener("DOMContentLoaded", loadDashboard);
