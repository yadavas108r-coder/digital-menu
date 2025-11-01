// ✅ Use your Google Apps Script URL
const SHEET_URL = "https://script.google.com/macros/s/AKfycbx6CEh41tmxXvt5OUuw4Pva9IualI5eR0rNjwKyzPe35iNLZlNcRZTFUN7ZfhOfAflH/exec";

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

// ✅ Load menu with JSONP
function loadMenu() {
    console.log("🔄 Loading menu from:", SHEET_URL);
    
    return new Promise((resolve, reject) => {
        const callbackName = 'menuCallback_' + Date.now();
        const script = document.createElement('script');
        
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
        
        script.onerror = function() {
            console.error("❌ Script loading failed");
            delete window[callbackName];
            if (script.parentNode) {
                document.body.removeChild(script);
            }
            showMenuError('Network error - cannot load menu');
            reject(new Error('Failed to load menu script'));
        };
        
        const url = `${SHEET_URL}?callback=${callbackName}&t=${Date.now()}`;
        console.log("🔗 Loading URL:", url);
        script.src = url;
        
        document.body.appendChild(script);
        
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
        
        const name = item.Name || item.name || item.Item || `Item ${index + 1}`;
        const price = item.Price || item.price || item.Cost || 0;
        const description = item.Description || item.description || item.Desc || "Delicious item from Yadava's";
        const image = item.Image || item.image || item.Img || "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjNENBRjUwIi8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIwLjNlbSI+WWFkYXZhJ3MgTWVudTwvdGV4dD4KPC9zdmc+";
        const type = (item.Type || item.type || item.VegNonVeg || "veg").toLowerCase();
        const category = item.Category || item.category || item.Cat || "General";
        
        const vegIcon = type === "veg" || type === "vegetarian" ? "🟢" : "🔴";
        const rating = item.Rating || item.rating || item.Stars || 4;
        const ratingStars = "⭐".repeat(Math.min(5, Math.max(1, Math.floor(rating))));

        card.innerHTML = `
            <div class="menu-card">
                <img src="${image}" alt="${name}" 
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjNENBRjUwIi8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIwLjNlbSI+WWFkYXZhJ3MgTWVudTwvdGV4dD4KPC9zdmc+'">
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
        z-index: 1000;
        animation: slideInRight 0.3s ease-out;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function showMenuError(errorMessage = 'Failed to load menu') {
    if (!menuContainer) return;
    
    menuContainer.innerHTML = `
        <div class="error-message">
            <h3>😕 Menu Not Available</h3>
            <p>${errorMessage}</p>
            <button onclick="loadMenu()" class="retry-btn">Try Again</button>
        </div>
    `;
}

// ✅ Event listeners
if (categoryFilter) {
    categoryFilter.addEventListener("change", filterMenu);
}

if (searchInput) {
    searchInput.addEventListener("input", filterMenu);
}

if (cartBtn) {
    cartBtn.addEventListener("click", () => {
        cartPanel.classList.toggle("active");
    });
}

if (placeOrderBtn) {
    placeOrderBtn.addEventListener("click", placeOrder);
}

// ✅ SIMPLIFIED: Place order function
function placeOrder() {
    const name = document.getElementById("userName")?.value.trim();
    const email = document.getElementById("userEmail")?.value.trim();
    const table = document.getElementById("userTable")?.value.trim() || "N/A";
    const note = document.getElementById("userNote")?.value.trim() || "No note";

    if (!name) {
        alert("❌ Please enter your name");
        return;
    }

    if (cart.length === 0) {
        alert("❌ Please add items to your cart");
        return;
    }

    const orderData = {
        name: name,
        email: email || "N/A",
        table: table,
        note: note,
        cart: cart,
        totalAmount: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    };

    console.log("🛒 Placing order:", orderData);
    
    // Show loading state
    placeOrderBtn.disabled = true;
    placeOrderBtn.textContent = "Placing Order...";

    // Create script for JSONP
    const callbackName = 'orderCallback_' + Date.now();
    const script = document.createElement('script');
    
    window[callbackName] = function(response) {
        console.log("📦 Order response:", response);
        
        // Clean up
        delete window[callbackName];
        document.body.removeChild(script);
        
        // Reset button
        placeOrderBtn.disabled = false;
        placeOrderBtn.textContent = "Place Order";
        
        if (response && response.success) {
            alert("✅ Order placed successfully!");
            // Clear cart and form
            cart = [];
            updateCart();
            document.getElementById("userName").value = "";
            document.getElementById("userEmail").value = "";
            document.getElementById("userTable").value = "";
            document.getElementById("userNote").value = "";
            cartPanel.classList.remove("active");
        } else {
            alert("❌ " + (response?.error || "Failed to place order"));
        }
    };
    
    script.onerror = function() {
        delete window[callbackName];
        document.body.removeChild(script);
        placeOrderBtn.disabled = false;
        placeOrderBtn.textContent = "Place Order";
        alert("❌ Network error - please try again");
    };
    
    const encodedData = encodeURIComponent(JSON.stringify(orderData));
    script.src = `${SHEET_URL}?action=submitOrder&orderData=${encodedData}&callback=${callbackName}`;
    document.body.appendChild(script);
}
// ✅ FIXED: JSONP method for placing orders
function placeOrderWithJSONP(orderData) {
    return new Promise((resolve, reject) => {
        const callbackName = 'orderCallback_' + Date.now();
        const script = document.createElement('script');
        
        // Show loading state
        placeOrderBtn.disabled = true;
        placeOrderBtn.textContent = "Placing Order...";

        // Define the callback function
        window[callbackName] = function(response) {
            console.log("📦 Order response received:", response);
            
            // Clean up
            delete window[callbackName];
            if (script.parentNode) {
                document.body.removeChild(script);
            }
            
            // Reset button state
            placeOrderBtn.disabled = false;
            placeOrderBtn.textContent = "Place Order";
            
            if (response && response.success) {
                console.log("✅ Order successful:", response);
                alert("✅ " + (response.message || "Order placed successfully!"));
                
                // Clear cart and form
                cart = [];
                updateCart();
                document.getElementById("userName").value = "";
                document.getElementById("userEmail").value = "";
                document.getElementById("userTable").value = "";
                document.getElementById("userNote").value = "";
                cartPanel.classList.remove("active");
                
                resolve(response);
            } else {
                const errorMsg = response?.error || 'Failed to place order';
                console.error("❌ Order failed:", errorMsg);
                alert("❌ " + errorMsg);
                reject(new Error(errorMsg));
            }
        };
        
        // Set up error handling
        script.onerror = function() {
            console.error("❌ Order script loading failed");
            delete window[callbackName];
            if (script.parentNode) {
                document.body.removeChild(script);
            }
            
            // Reset button state
            placeOrderBtn.disabled = false;
            placeOrderBtn.textContent = "Place Order";
            
            alert("❌ Network error - cannot place order. Please check your connection.");
            reject(new Error('Failed to place order'));
        };
        
        // Create the script URL with order data as parameter
        const encodedOrderData = encodeURIComponent(JSON.stringify(orderData));
        const url = `${SHEET_URL}?action=submitOrder&orderData=${encodedOrderData}&callback=${callbackName}&t=${Date.now()}`;
        
        console.log("🔗 Placing order via URL:", url);
        script.src = url;
        
        document.body.appendChild(script);
        
        // Timeout after 30 seconds
        setTimeout(() => {
            if (window[callbackName]) {
                console.error("⏰ Order placement timeout");
                delete window[callbackName];
                if (script.parentNode) {
                    document.body.removeChild(script);
                }
                
                // Reset button state
                placeOrderBtn.disabled = false;
                placeOrderBtn.textContent = "Place Order";
                
                alert("❌ Order timeout - please try again");
                reject(new Error('Order placement timeout'));
            }
        }, 30000);
    });
}

// ✅ Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 Yadava's Menu Initializing...");
    
    // Add custom styles
    const styles = `
        <style>
            .error-message {
                text-align: center;
                padding: 3rem 1rem;
                color: #666;
            }
            .error-message h3 {
                margin-bottom: 1rem;
                color: #ff4444;
            }
            .retry-btn {
                background: #007bff;
                color: white;
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 1rem;
            }
            .retry-btn:hover {
                background: #0056b3;
            }
            .category {
                background: #e9ecef;
                color: #495057;
                padding: 0.25rem 0.5rem;
                border-radius: 12px;
                font-size: 0.8rem;
                display: inline-block;
                margin: 0.25rem 0;
            }
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            .empty-cart {
                text-align: center;
                color: #666;
                padding: 2rem;
            }
            .empty-state {
                text-align: center;
                padding: 3rem 1rem;
                color: #666;
            }
            .cart-item-content {
                display: flex;
                justify-content: space-between;
                align-items: center;
                width: 100%;
            }
            .cart-item-controls {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            .cart-item-controls button {
                padding: 0.2rem 0.5rem;
                border: 1px solid #ddd;
                background: white;
                cursor: pointer;
                border-radius: 3px;
            }
            .remove-btn {
                background: #ff4444 !important;
                color: white;
                border: none !important;
            }
            .quantity {
                min-width: 20px;
                text-align: center;
            }
        </style>
    `;
    document.head.insertAdjacentHTML('beforeend', styles);
    
    // Load the menu
    loadMenu().catch(error => {
        console.error("Initialization error:", error);
    });
});

