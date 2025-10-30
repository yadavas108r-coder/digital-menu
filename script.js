const scriptURL = "https://script.google.com/macros/s/AKfycbz0dLqVJnC_XJl4sE1otepwWXZOT9WAyH6NdlIx1-F8XiHxfwMT4ECHDFhIOWCPRG4M/exec";

async function loadMenu() {
  try {
    const response = await fetch(scriptURL, { mode: "cors" });
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
        <p class="cat">${item.cat}</p>
        <p class="desc">${item.desc}</p>
        <button onclick="addToCart('${item.name}', ${item.price})">Add to Cart</button>
      `;
      menuContainer.appendChild(card);
    });
  } catch (err) {
    console.error("Error loading menu:", err);
  }
}

window.onload = loadMenu;
