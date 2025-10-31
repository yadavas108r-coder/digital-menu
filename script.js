const SHEET_URL = "https://script.google.com/macros/s/AKfycbyk7EK2uxJ7UnI7i3wKoNDWa7HIoITGOvlQpC8ZbnwusH-2P9vIytkVKhfagIooJVQ1/exec";

// DOM Elements
const menuContainer = document.getElementById("menu");
const categoryFilter = document.getElementById("categoryFilter");
const searchInput = document.getElementById("searchInput");
const cartPanel = document.getElementById("cart");
const cartBtn = document.getElementById("cartIconBtn");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const cartCount = document.getElementById("cartCount");
const placeOrderBtn = document.getElementById("placeOrderBtn");

let menuData = [];
let cart = [];

// ✅ Simple and reliable menu loading
function loadMenu() {
    console.log("🔄 Loading menu from:", SHEET_URL);
    
    return new Promise((resolve, reject) => {
        const callbackName = 'menuCallback_' + Date.now();
        const script = document.createElement('script');
        
        // Define the callback function
        window[callbackName] = function(response) {
            console.log("📦 Menu response received:", response);
            
            // Clean up
            delete window[callbackName];
            if (script.parentNode) {
                document.body.removeChild(script);
            }
            
            if (response && response.status === 'success' && response.menu) {
                console.log("✅ Menu loaded successfully! Items:", response.menu.length);
                menuData = response.menu;
                displayMenu(menuData);
                populateCategories(menuData);
                resolve(response);
            } else {
                console.error("❌ Menu loading failed:", response?.error);
                showMenuError(response?.error || 'Failed to load menu');
                reject(new Error(response?.error || 'Failed to load menu'));
            }
        };
        
        // Set up error handling
        script.onerror = function() {
            console.error("❌ Script loading failed");
            delete window[callbackName];
            if (script.parentNode) {
                document.body.removeChild(script);
            }
            showMenuError('Network error - cannot load menu');
            reject(new Error('Failed to load menu script'));
        };
        
        // Create the script URL with callback and cache busting
        const url = `${SHEET_URL}?callback=${callbackName}&t=${Date.now()}`;
        console.log("🔗 Loading URL:", url);
        script.src = url;
        
        document.body.appendChild(script);
        
        // Timeout after 15 seconds
        setTimeout(() => {
            if (window[callbackName]) {
                console.error("⏰ Menu loading timeout");
                delete window[callbackName];
                if (script.parentNode) {
                    document.body.removeChild(script);
                }
                showMenuError('Menu loading timeout');
                reject(new Error('Menu loading timeout'));
            }
        }, 15000);
    });
}

// ✅ Display menu items
function displayMenu(items) {
    if (!menuContainer) {
        console.error("❌ Menu container not found");
        return;
    }
    
    if (!items || items.length === 0) {
        menuContainer.innerHTML = `
            <div class="empty-state">
                <p>No menu items available at the moment.</p>
                <button onclick="loadMenu()" class="retry-btn">Try Again</button>
            </div>
        `;
        return;
    }

    console.log("🎨 Displaying", items.length, "menu items");
    menuContainer.innerHTML = "";
    
    items.forEach((item, index) => {
        const card = document.createElement("div");
        card.className = "menu-item";
        
        // Safe property access with multiple fallbacks
        const name = item.Name || item.name || item.Item || `Item ${index + 1}`;
        const price = item.Price || item.price || item.Cost || 0;
        const description = item.Description || item.description || item.Desc || "Delicious item from Yadava's";
        const image = item.Image || item.image || item.Img || "https://via.placeholder.com/200x150/4CAF50/white?text=Yadava%27s";
        const type = (item.Type || item.type || item.VegNonVeg || "veg").toLowerCase();
        const category = item.Category || item.category || item.Cat || "General";
        
        const vegIcon = type === "veg" || type === "vegetarian" ? "🟢" : "🔴";
        const rating = item.Rating || item.rating || item.Stars || 4;
        const ratingStars = "⭐".repeat(Math.min(5, Math.max(1, Math.floor(rating))));

        card.innerHTML = `
            <div class="menu-card">
                <img src="${image}" alt="${name}" 
                     onerror="this.src='https://via.placeholder.com/200x150/4CAF50/white?text=Yadava%27s'">
                <div class="menu-details">
                    <div class="menu-header">
                        <h3>${name}</h3>
                        <span class="veg-icon">${vegIcon}</span>
                    </div>
                    <div class="category">${category}</div>
                    <div class="rating">${ratingStars}</div>
                    <p class="description">${description}</p>
                    <div class="price-section">
                        <span class="price">₹${price}</span>
                        <button class="add-btn" onclick="addToCart('${name.replace(/'/g, "\\'")}', ${price})">
                            Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        menuContainer.appendChild(card);
    });
}

// ✅ Populate categories
function populateCategories(data) {
    if (!categoryFilter || !data || data.length === 0) return;
    
    categoryFilter.innerHTML = '<option value="All">All Categories</option>';
    
    const categories = [...new Set(data.map(item => 
        item.Category || item.category || item.Cat || "General"
    ).filter(Boolean))];
    
    categories.forEach(cat => {
        const option = document.createElement("option");
        option.value = cat;
        option.textContent = cat;
        categoryFilter.appendChild(option);
    });
}

// ✅ Filter menu
function filterMenu() {
    const category = categoryFilter.value;
    const searchTerm = searchInput.value.toLowerCase();
    
    const filtered = menuData.filter(item => {
        const itemCategory = item.Category || item.category || item.Cat || "General";
        const itemName = item.Name || item.name || item.Item || "";
        
        const categoryMatch = category === "All" || itemCategory === category;
        const searchMatch = itemName.toLowerCase().includes(searchTerm);
        
        return categoryMatch && searchMatch;
    });
    
    displayMenu(filtered);
}

// ✅ Cart functions
function addToCart(name, price, image = "") {
    const existingItem = cart.find(item => item.name === name);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            name,
            price,
            image,
            quantity: 1
        });
    }
    
    updateCart();
    showToast(`✅ ${name} added to cart!`);
}

function removeFromCart(index) {
    if (index >= 0 && index < cart.length) {
        const itemName = cart[index].name;
        cart.splice(index, 1);
        updateCart();
        showToast(`🗑️ ${itemName} removed from cart`);
    }
}

function updateCartQuantity(index, change) {
    if (index >= 0 && index < cart.length) {
        const item = cart[index];
        item.quantity += change;
        
        if (item.quantity <= 0) {
            removeFromCart(index);
        } else {
            updateCart();
        }
    }
}

function updateCart() {
    if (!cartItems) return;
    
    cartItems.innerHTML = "";
    let total = 0;
    let itemCount = 0;
    
    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        itemCount += item.quantity;
        
        const li = document.createElement("li");
        li.className = "cart-item";
        li.innerHTML = `
            <div class="cart-item-content">
                <span class="cart-item-name">${item.name}</span>
                <div class="cart-item-controls">
                    <button onclick="updateCartQuantity(${index}, -1)">−</button>
                    <span class="quantity">${item.quantity}</span>
                    <button onclick="updateCartQuantity(${index}, 1)">+</button>
                    <span class="price">₹${itemTotal}</span>
                    <button class="remove-btn" onclick="removeFromCart(${index})">×</button>
                </div>
            </div>
        `;
        cartItems.appendChild(li);
    });
    
    if (cartTotal) cartTotal.textContent = total.toFixed(2);
    if (cartCount) cartCount.textContent = itemCount;
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<li class="empty-cart">Your cart is empty</li>';
    }
}

function showToast(message) {
    const toast = document.createElement("div");
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
