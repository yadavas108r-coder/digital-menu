const scriptURL = "https://script.google.com/macros/s/AKfycbwjAcJY1hxffDWnT1g8CtKZPjxMvJXb3gTs8R4-nqaXH5CM2FvvKrRleXpyVzGZtpNY/exec"; // <-- replace with your deployed URL

async function loadMenu() {
  try {
    const response = await fetch(scriptURL);
    if (!response.ok) throw new Error("Network error: " + response.status);

    const text = await response.text();
    const data = JSON.parse(text);
    const menuContainer = document.getElementById("menu");
    menuContainer.innerHTML = "";

    data.forEach(item => {
      const card = document.createElement("div");
      card.classList.add("product-card");
      card.innerHTML = `
        <img src="${item.img}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/150'">
        <h3>${item.name}</h3>
        <p>₹${item.price}</p>
        <p class="cat">${item.cat}</p>
        <p class="desc">${item.desc}</p>
        <button onclick="addToCart('${item.name}', ${item.price})">Add to Cart</button>
      `;
      menuContainer.appendChild(card);
    });
  } catch (err) {
    console.error("Error loading menu:", err);
    document.getElementById("menu").innerHTML = `<p style="color:red;">⚠️ ${err.message}</p>`;
  }
}

let cart = [];

function addToCart(name, price) {
  cart.push({ name, price });
  alert(`${name} added to cart`);
}

document.getElementById("placeOrder").addEventListener("click", async () => {
  const name = document.getElementById("customerName").value.trim();
  if (!name || cart.length === 0) return alert("Please enter name and select items!");

  const orderData = { name, items: cart };

  try {
    const response = await fetch(scriptURL, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData)
    });

    const result = await response.json();
    if (result.status === "success") {
      document.getElementById("success-message").style.display = "block";
      cart = [];
    } else {
      alert("Failed: " + result.message);
    }
  } catch (err) {
    alert("Order Error: " + err.message);
  }
});

window.onload = loadMenu;
