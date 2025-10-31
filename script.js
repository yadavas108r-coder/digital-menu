const SHEET_URL = "https://script.google.com/macros/s/AKfycbzsMZPrf8pVzsfFeuOQOB7wAvnzTweXYO8bjX8HTTnQ4HagWSC5hJCm5wLZMenff3AX/exec";

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
    console.log("🔄 Loading menu...");
    
    return new Promise((resolve, reject) => {
        const callbackName = 'menuCallback_' + Math.random().toString(36).substring(7);
        const script = document.createElement('script');
        
        // Define the callback function
        window[callbackName] = function(response) {
            console.log("📦 Raw response:", response);
            
            // Clean up
            delete window[callbackName];
            if (script.parentNode) {
                document.body.removeChild(script);
            }
            
            if (response && response.status === 'success' && response.menu) {
                console.log("✅ Menu loaded successfully!");
                menuData = response.menu;
                displayMenu(menuData);
                populateCategories(menuData);
                resolve(response);
            } else {
                console.error("❌ Invalid menu data:", response);
                showMenuError();
                reject(new Error('Invalid menu data received'));
            }
        };
        
        // Set up error handling
        script.onerror = function() {
            console.error("❌ Script loading failed");
            delete window[callbackName];
            if (script.parentNode) {
                document.body.removeChild(script);
            }
            showMenuError();
            reject(new Error('Failed to load menu script'));
        };
        
        // Create the script URL with callback
        const url = `${SHEET_URL}?callback=${callbackName}`;
        console.log("🔗 Loading from:", url);
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
                showMenuError();
                reject(new Error('Menu loading timeout'));
            }
        }, 15000);
    });
}

// ✅ Display menu items
function displayMenu(items) {
    if (!items || items.length === 0) {
        menuContainer.innerHTML = "<p style='text-align:center; color:#666;'>No menu items available.</p>";
        return;
    }

    console.log("🎨 Displaying", items.length, "menu items");
    menuContainer.innerHTML = "";
    
    items.forEach((item, index) => {
        const card = document.createElement("div");
        card.className = "menu-item";
        
        // Safe property access
        const name = item.Name || item.name || `Item ${index + 1}`;
        const price = item.Price || item.price || 0;
        const description = item.Description || item.description || "Delicious item";
        const image = item.Image || item.image || "https://via.placeholder.com/200x150/4CAF50/white?text=Yadava%27s";
        const type = (item.Type || item.type || "veg").toLowerCase();
        const category = item.Category || item.category || "General";
        
        const vegIcon = type === "veg" ? "🟢" : "🔴";
        const rating = item.Rating || item.rating || 4;
        const ratingStars = "⭐".repeat(Math.min(5, Math.max(1, Math.floor(rating))));

        card.innerHTML = `
            <img src="${image}" alt="${name}" 
                 onerror="this.src='https://via.placeholder.com/200x150/4CAF50/white?text=Yadava%27s'">
            <div class="menu-details">
                <div class="menu-top">
                    <h3>${name}</h3>
                    <span class="veg-icon">${vegIcon}</span>
                </div>
                <div class="category-tag">${category}</div>
                <div class="rating">${ratingStars}</div>
                <p class="description">${description}</p>
                <p class="price">₹${price}</p>
                <button class="add-btn" onclick="addToCart('${name.replace(/'/g, "\\'")}', ${price}, '${image.replace(/'/g, "\\'")}')">
                    Add to Cart
                </button>
            </div>
        `;
        
        menuContainer.appendChild(card);
    });
}

// ✅ Populate categories
function populateCategories(data) {
    if (!data || !categoryFilter) return;
    
    categoryFilter.innerHTML = '<option value="All">All Categories</option>';
    
    const categories = [...new Set(data.map(item => 
        item.Category || item.category || "General"
    ))];
    
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
        const itemCategory = item.Category || item.category || "General";
        const itemName = item.Name || item.name || "";
        
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
    showToast(`${name} added to cart!`);
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCart();
}

function updateCartQuantity(index, change) {
    const item = cart[index];
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            cart.splice(index, 1);
        }
        updateCart();
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
                    <button onclick="updateCartQuantity(${index}, -1)">-</button>
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

function showMenuError() {
    if (!menuContainer) return;
    
    menuContainer.innerHTML = `
        <div class="error-message">
            <h3>😕 Menu Not Available</h3>
            <p>We're having trouble loading the menu right now.</p>
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

// ✅ Place order function
async function placeOrder() {
    const name = document.getElementById("userName")?.value.trim();
    const email = document.getElementById("userEmail")?.value.trim();
    const table = document.getElementById("userTable")?.value.trim() || "N/A";
    const note = document.getElementById("userNote")?.value.trim() || "No note";

    if (!name) {
        alert("Please enter your name");
        return;
    }

    if (cart.length === 0) {
        alert("Please add items to your cart");
        return;
    }

    const orderData = {
        name,
        email: email || "N/A",
        table,
        note,
        cart,
        totalAmount: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    };

    try {
        placeOrderBtn.disabled = true;
        placeOrderBtn.textContent = "Placing Order...";

        const response = await fetch(SHEET_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(orderData)
        });

        const result = await response.json();
        
        if (result.success) {
            alert("Order placed successfully!");
            cart = [];
            updateCart();
            // Clear form fields
            document.getElementById("userName").value = "";
            document.getElementById("userEmail").value = "";
            document.getElementById("userTable").value = "";
            document.getElementById("userNote").value = "";
            cartPanel.classList.remove("active");
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error("Order error:", error);
        alert("Failed to place order. Please try again.");
    } finally {
        placeOrderBtn.disabled = false;
        placeOrderBtn.textContent = "Place Order";
    }
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
            .category-tag {
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
        </style>
    `;
    document.head.insertAdjacentHTML('beforeend', styles);
    
    // Load the menu
    loadMenu().catch(error => {
        console.error("Initialization error:", error);
    });
});
