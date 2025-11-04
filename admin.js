const scriptURL = "https://script.google.com/macros/s/AKfycbyii5UZmz-aVDjb-FXYCPIW_7d4-GBReGRH2dOeX2lYYl4Si2wmbQU3RrGOqVvqEoiV/exec"; // 👈 Replace with your deployed script URL

// ✅ Load Orders + Analytics
async function loadDashboard() {
  try {
    const res = await fetch(`${scriptURL}?action=getOrders`);
    const data = await res.json();

    console.log("📊 Loaded Data:", data);

    if (!data || !data.orders) return;

    // Analytics Summary
    const orders = data.orders;
    document.getElementById("totalOrders").textContent = orders.length;
    const totalSales = orders.reduce((sum, o) => sum + Number(o.Total || 0), 0);
    document.getElementById("totalSales").textContent = `₹${totalSales}`;

    const today = new Date().toLocaleDateString();
    const todayOrders = orders.filter(o => new Date(o.Timestamp).toLocaleDateString() === today).length;
    document.getElementById("todayOrders").textContent = todayOrders;

    // Orders Table
    const tbody = document.getElementById("ordersTableBody");
    tbody.innerHTML = "";
    orders.forEach(order => {
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
    console.error("❌ Load Error:", err);
  }
}

// ✅ Run on page load
document.addEventListener("DOMContentLoaded", loadDashboard);
