// script.js

// --- NEW: Cart and User Management Functions ---

// Initialize user session (simulates login state)
function initializeUserSession() {
    let user = JSON.parse(sessionStorage.getItem('currentUser')) || null;
    if (!user) {
        // Check if a user ID exists in localStorage (for persistence across sessions)
        const storedUserId = localStorage.getItem('currentUserId');
        if (storedUserId) {
            // Retrieve user data from localStorage
            const allUsers = JSON.parse(localStorage.getItem('users') || '{}');
            user = allUsers[storedUserId] || null;
            if (user) {
                sessionStorage.setItem('currentUser', JSON.stringify(user));
            }
        }
    }
    updateUIBasedOnUser(user);
}

// --- NEW: Custom Modal Functions for Login/Signup ---

// Show the login/signup modal
function showAuthModal() {
    const modal = document.getElementById("authModal");
    if (modal) {
        document.getElementById("authForm").reset(); // Clear previous entries
        document.getElementById("authError").textContent = ""; // Clear previous errors
        modal.classList.add("active");
        document.body.style.overflow = "hidden";
    }
}

// Close the login/signup modal
function closeAuthModal() {
    const modal = document.getElementById("authModal");
    if (modal) {
        modal.classList.remove("active");
        document.body.style.overflow = "";
    }
}

// Handle login or signup form submission
function handleAuthSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const username = form.username.value.trim();
    const password = form.password.value;
    const isLogin = form.dataset.mode === "login";

    if (!username || !password) {
        document.getElementById("authError").textContent = "Username and password are required.";
        return;
    }

    const allUsers = JSON.parse(localStorage.getItem('users') || '{}');

    if (isLogin) {
        // ------------------ LOGIN ------------------
        const storedUser = Object.values(allUsers).find(u => u.username === username);

        if (storedUser && storedUser.passwordHash === hashPassword(password)) {
            sessionStorage.setItem('currentUser', JSON.stringify(storedUser));
            localStorage.setItem('currentUserId', storedUser.id);
            updateUIBasedOnUser(storedUser);
            closeAuthModal();
            showCustomAlert(`Welcome back, ${username}!`, "Logged In");
        } else {
            document.getElementById("authError").textContent = "Invalid username or password.";
        }

    } else {
        // ------------------ SIGNUP ------------------

        // Check duplicate username
        if (Object.values(allUsers).some(u => u.username === username)) {
            document.getElementById("authError").textContent = "Username already exists. Please choose another.";
            return;
        }

        // Collect extra signup fields
        const email = document.getElementById("email").value.trim();
        const phone = document.getElementById("phone").value.trim();
        const street = document.getElementById("street").value.trim();
        const city = document.getElementById("city").value.trim();
        const state = document.getElementById("state").value.trim();
        const postalCode = document.getElementById("postalCode").value.trim();

        // Validate required fields
        if (!email || !phone || !street || !city || !state) {
            document.getElementById("authError").textContent = "Please fill in all required fields.";
            return;
        }

        // Create new user
        const userId = Date.now().toString();
        const newUser = {
            id: userId,
            username: username,
            passwordHash: hashPassword(password),
            orders: [],
            cart: [],
            email: email,
            phone: phone,
            address: {
                street: street,
                city: city,
                state: state,
                postalCode: postalCode,
                country: "Nigeria"
            }
        };

        // Save new user
        allUsers[userId] = newUser;
        localStorage.setItem('users', JSON.stringify(allUsers));
        localStorage.setItem('currentUserId', userId);

        // Auto-login
        sessionStorage.setItem('currentUser', JSON.stringify(newUser));

        updateUIBasedOnUser(newUser);
        closeAuthModal();
        showCustomAlert(`Welcome, ${username}! Your account has been created.`, "Account Created");
    }
}


// Simple password hashing simulation (NOT secure for real applications)
// In a real app, use a proper library like bcrypt on the server side.
function hashPassword(password) {
    // A basic hash using Array reduce - very weak, just for client-side simulation
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
}

// --- END NEW: Custom Modal Functions for Login/Signup ---

// Simulate user logout
function handleLogout() {
    sessionStorage.removeItem('currentUser');
    localStorage.removeItem('currentUserId'); // Clear persistent ID
    updateUIBasedOnUser(null);
    showCustomAlert("You have been logged out.", "Logged Out");
}

// Update UI elements based on user status
function updateUIBasedOnUser(user) {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const accountLink = document.getElementById('accountLink');
    const cartCountElement = document.getElementById('cartCount');

    if (user) {
        // User is logged in
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) {
            logoutBtn.style.display = 'inline-block';
            logoutBtn.onclick = handleLogout; // Ensure event handler is attached
        }
        if (accountLink) accountLink.style.display = 'inline-block';
        // Update cart count based on user's cart data
        const cartCount = user.cart ? user.cart.reduce((sum, item) => sum + item.quantity, 0) : 0;
        if (cartCountElement) cartCountElement.textContent = cartCount;
    } else {
        // User is not logged in
        if (loginBtn) loginBtn.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (accountLink) accountLink.style.display = 'none';
        if (cartCountElement) cartCountElement.textContent = '0';
    }
}

// Add item to cart
function addToCart(productId) {
    let user = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!user) {
        // Prompt for login/signup if not logged in
        showAuthModal(); // Show the modal instead of prompt
        return;
    }

    const products = JSON.parse(localStorage.getItem("solarProducts") || "[]");
    const product = products.find(p => p.id === productId);

    if (!product) {
        showCustomAlert("Product not found.", "Error");
        return;
    }

    // Check if item already exists in cart
    const existingItemIndex = user.cart.findIndex(item => item.productId === productId);
    if (existingItemIndex > -1) {
        user.cart[existingItemIndex].quantity += 1;
    } else {
        user.cart.push({ productId: productId, quantity: 1 });
    }

    // Update user data in session and localStorage
    sessionStorage.setItem('currentUser', JSON.stringify(user));
    const allUsers = JSON.parse(localStorage.getItem('users') || '{}');
    allUsers[user.id] = user;
    localStorage.setItem('users', JSON.stringify(allUsers));

    // Update UI
    updateUIBasedOnUser(user);
    showCustomAlert(`${product.name} added to cart!`, "Added to Cart");
}

// View Cart (you can implement this in a modal or a dedicated page)

// View Cart
function viewCart() {
    const user = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!user || !user.cart || user.cart.length === 0) {
        showCustomAlert("Your cart is empty.", "Cart Empty");
        return;
    }
    const products = JSON.parse(localStorage.getItem("solarProducts") || "[]");
    let cartHTML = '<h3>Your Cart</h3><ul>';
    let total = 0;
    
    // Reverse the cart array so the last added item appears first
    const reversedCart = [...user.cart].reverse();
    
    reversedCart.forEach(cartItem => {
        const product = products.find(p => p.id === cartItem.productId);
        if (product) {
            const price = parseInt(product.price.replace(/\D/g, '')); // Extract numeric price
            const itemTotal = price * cartItem.quantity;
            total += itemTotal;
            cartHTML += `
                <div class="cart-item-card">
                    <div class="cart-item-image-wrapper">
                        <img src="${product.images?.[0] || '/placeholder.svg'}" alt="${product.name}" onerror="this.src='/placeholder.svg'; this.alt='Image not available';">
                    </div>
                    <div class="cart-item-info">
                        <h4 class="cart-item-title">${product.name}</h4>
                        <p class="cart-item-price">${formatNaira(itemTotal)}</p>
                        <div class="cart-item-quantity-controls">
                            <button class="qty-btn" onclick="updateCartItemQuantity(${product.id}, ${cartItem.quantity - 1})" ${cartItem.quantity <= 1 ? 'disabled' : ''}>−</button>
                            <span class="qty-display">${cartItem.quantity}</span>
                            <button class="qty-btn" onclick="updateCartItemQuantity(${product.id}, ${cartItem.quantity + 1})">+</button>
                        </div>
                    </div>
                    <button class="remove-btn" onclick="removeFromCart(${product.id})">×</button>
                </div>`;
        }
    });
    cartHTML += `</ul><p><strong>Total: ${formatNaira(total)}</strong></p>`;
    cartHTML += `<button class="btn btn-checkout" onclick="proceedToCheckout()">Checkout</button>`;
    
    // Display cart in the modal
    const modal = document.getElementById("cartModal");
    if (modal) {
        document.getElementById("cartContent").innerHTML = cartHTML;
        modal.classList.add("active");
        document.body.style.overflow = "hidden";
    } else {
        // Fallback: Show in an alert or console
        console.log(cartHTML);
        alert(cartHTML.replace(/<[^>]*>/g, '')); // Simple text version
    }
}
// Update item quantity in cart
function updateCartItemQuantity(productId, newQuantity) {
    if (newQuantity < 1) {
        removeFromCart(productId);
        return;
    }

    const user = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!user) return;

    const itemIndex = user.cart.findIndex(item => item.productId === productId);
    if (itemIndex > -1) {
        user.cart[itemIndex].quantity = newQuantity;

        // Update user data in session and localStorage
        sessionStorage.setItem('currentUser', JSON.stringify(user));
        const allUsers = JSON.parse(localStorage.getItem('users') || '{}');
        allUsers[user.id] = user;
        localStorage.setItem('users', JSON.stringify(allUsers));

        // Update UI
        updateUIBasedOnUser(user);
        viewCart(); // Refresh cart view
    }
}

// Remove item from cart
// Remove item from cart
// Remove item from cart
function removeFromCart(productId) {
    const user = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!user) return;

    // Filter out the item
    user.cart = user.cart.filter(item => item.productId !== productId);

    // Update user data in session and localStorage
    sessionStorage.setItem('currentUser', JSON.stringify(user));
    const allUsers = JSON.parse(localStorage.getItem('users') || '{}');
    allUsers[user.id] = user;
    localStorage.setItem('users', JSON.stringify(allUsers));

    // Update UI
    updateUIBasedOnUser(user);

    // Check if cart is now empty
    if (user.cart.length === 0) {
        // Close the cart modal
        closeCartModal();
        // Show a friendly message
        showCustomAlert("Your cart is now empty.", "Cart Updated");
    } else {
        // Refresh cart view if items still remain
        viewCart();
    }
}

// Proceed to checkout

function proceedToCheckout() {
    const user = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!user || !user.cart || user.cart.length === 0) {
        showCustomAlert("Your cart is empty.", "Cart Empty");
        return;
    }

    // Create order object
    const products = JSON.parse(localStorage.getItem("solarProducts") || "[]");
    const orderItems = [];
    let total = 0;
    user.cart.forEach(cartItem => {
        const product = products.find(p => p.id === cartItem.productId);
        if (product) {
            const price = parseInt(product.price.replace(/\D/g, ''));
            const itemTotal = price * cartItem.quantity;
            total += itemTotal;
            orderItems.push({
                productId: product.id,
                name: product.name,
                price: product.price,
                quantity: cartItem.quantity,
                itemTotal: itemTotal
            });
        }
    });

    // --- NEW: Get the current address from the user object ---
    const currentAddress = user.address || {
        street: "",
        city: "",
        state: "",
        postalCode: "",
        country: "Nigeria"
    };

    // Create the order object with the address
    const order = {
        id: Date.now(),
        date: new Date().toLocaleString(),
        items: orderItems,
        total: total,
        status: 'Pending',
        paymentStatus: 'pending',
        // --- NEW: Add the address to the order ---
        deliveryAddress: currentAddress
    };

    // Save order to user's history
    user.orders.push(order);
    // Clear cart
    user.cart = [];

    // Update user data
    sessionStorage.setItem('currentUser', JSON.stringify(user));
    const allUsers = JSON.parse(localStorage.getItem('users') || '{}');
    allUsers[user.id] = user;
    localStorage.setItem('users', JSON.stringify(allUsers));

    // Update UI to reflect empty cart (this updates the cart count)
    updateUIBasedOnUser(user);

    // Close the cart modal first
    closeCartModal();

    // Then show payment simulation modal
    showPaymentSimulationModal(order);
}

// Close Cart Modal (Assuming you add this button)
function closeCartModal() {
    const modal = document.getElementById("cartModal");
    if (modal) {
        modal.classList.remove("active");
        document.body.style.overflow = "";
    }
}

// Load user's order history (for account page)

// Load user's order history (for account page)
function loadOrderHistory() {
    const user = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!user) {
        document.getElementById('orderHistory').innerHTML = '<p>Please log in to view your order history.</p>';
        return;
    }

    // --- NEW: Populate Contact Info ---
    const userEmailElement = document.getElementById("userEmail");
    const userPhoneElement = document.getElementById("userPhone");
    if (userEmailElement && userPhoneElement) {
        userEmailElement.textContent = user.email || "Not set";
        userPhoneElement.textContent = user.phone || "Not set";
    }

    // --- NEW: Load and populate the Edit Address Form ---
    const editAddressForm = document.getElementById("editAddressForm");
    if (editAddressForm) {
        // Pre-fill the form with the user's current address
        const streetInput = document.getElementById("editStreet");
        const cityInput = document.getElementById("editCity");
        const stateInput = document.getElementById("editState");
        const postalCodeInput = document.getElementById("editPostalCode");

        // Check if user has an address object
        if (user.address) {
            streetInput.value = user.address.street || "";
            cityInput.value = user.address.city || "";
            stateInput.value = user.address.state || "";
            postalCodeInput.value = user.address.postalCode || "";
        } else {
            // Initialize empty address if none exists
            user.address = {
                street: "",
                city: "",
                state: "",
                postalCode: "",
                country: "Nigeria"
            };
            // Save the initialized address to localStorage
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            const allUsers = JSON.parse(localStorage.getItem('users') || '{}');
            allUsers[user.id] = user;
            localStorage.setItem('users', JSON.stringify(allUsers));
        }
    }

    const container = document.getElementById('orderHistory');
    if (!container) return;
    if (user.orders.length === 0) {
        container.innerHTML = '<p>No orders found.</p>';
        return;
    }
    // Sort orders by date (newest first)
    const sortedOrders = [...user.orders].sort((a, b) => {
        // Convert string dates to Date objects for comparison
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA; // Newest first (descending order)
    });
    let historyHTML = '<h3>Your Order History</h3><div class="orders-list">';
  // Inside the loadOrderHistory function, find the sortedOrders.forEach block
sortedOrders.forEach(order => {
    // --- NEW: Format the delivery address for display ---
    const address = order.deliveryAddress || { street: "", city: "", state: "", postalCode: "", country: "Nigeria" };
    const fullAddress = `${address.street}, ${address.city}, ${address.state} ${address.postalCode}, ${address.country}`;

    historyHTML += `
        <div class="order-item">
            <p><strong>Order ID:</strong> ${order.id}</p>
            <p><strong>Date:</strong> ${order.date}</p>
            <!-- --- NEW: Add the delivery address --- -->
            <p><strong>Delivery Address:</strong> ${fullAddress}</p>
            <div class="order-status-actions">
                <p><strong>Status:</strong> <span class="status-badge ${order.status.toLowerCase()}">${order.status}</span></p>
                <button class="btn-check-payment" onclick="checkOrderPaymentStatus(${order.id})">Check Payment 🔍</button>
                <button class="btn-reorder" onclick="reorderOrder(${order.id})">Reorder ➕</button>
            </div>
            <p><strong>Total:</strong> <span class="order-total ${order.status.toLowerCase()}">${formatNaira(order.total)}</span></p>
            <div class="order-items-list">
                ${order.items.map(item => {
                    // Fetch the full product data to get its image
                    const products = JSON.parse(localStorage.getItem("solarProducts") || "[]");
                    const product = products.find(p => p.id === item.productId);
                    const imageUrl = product?.images?.[0] || '/placeholder.svg';
                    return `
                        <div class="order-history-item">
                            <div class="order-item-image-wrapper">
                                <img src="${imageUrl}" alt="${item.name}" onerror="this.src='/placeholder.svg'; this.alt='Image not available';">
                            </div>
                            <div class="order-item-details">
                                <div class="order-item-name">${item.name}</div>
                                <div class="order-item-meta">
                                    <span class="order-item-qty">Qty: ${item.quantity}</span>
                                    <span class="order-item-price">${formatNaira(item.itemTotal)}</span>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
});
    historyHTML += '</div>';
    container.innerHTML = historyHTML;
}

// Add this function to your script.js
function handleUpdateAddress(e) {
    e.preventDefault();

    const user = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!user) return;

    // Get the new address values
    const street = document.getElementById("editStreet").value.trim();
    const city = document.getElementById("editCity").value.trim();
    const state = document.getElementById("editState").value.trim();
    const postalCode = document.getElementById("editPostalCode").value.trim();

    // Validate required fields
    if (!street || !city || !state) {
        showCustomAlert("Please fill in all required address fields.", "Address Required", "error");
        return;
    }

    // Update the user's address
    user.address = {
        street: street,
        city: city,
        state: state,
        postalCode: postalCode,
        country: "Nigeria"
    };

    // Save the updated user data in both session and local storage
    sessionStorage.setItem('currentUser', JSON.stringify(user));

    const allUsers = JSON.parse(localStorage.getItem('users') || '{}');
    allUsers[user.id] = user;
    localStorage.setItem('users', JSON.stringify(allUsers));

    // Success message
    showCustomAlert("Your delivery address has been updated successfully.", "Address Updated", "success");
}

// Add this to your DOMContentLoaded event listener (around line 750)

function checkOrderPaymentStatus(orderId) {
    const user = JSON.parse(sessionStorage.getItem('currentUser'));
    const order = user.orders.find(o => o.id === orderId);
    if (!order) {
        showCustomAlert("Order not found.", "Error");
        return;
    }

    let message = "Payment status: ";
    let type = "info";

    // Determine status based on paymentStatus field (if you added it)
    const paymentStatus = order.paymentStatus || 'unknown';

    if (paymentStatus === 'success') {
        message += "✅ Paid";
        type = "success";
    } else if (paymentStatus === 'failed') {
        message += "❌ Failed";
        type = "error";
    } else {
        message += "⏳ Pending";
        type = "info";
    }

    showCustomAlert(message, "Payment Status", type);
}


function reorderOrder(orderId) {
    const user = JSON.parse(sessionStorage.getItem('currentUser'));
    const order = user.orders.find(o => o.id === orderId);
    if (!order) return;

    // Add all items from this order back to cart
    order.items.forEach(item => {
        addToCart(item.productId); // Reuses your existing addToCart function
    });

    showCustomAlert(`Added ${order.items.length} items from Order #${orderId} to your cart.`, "Reordered");
}
// --- END NEW: Cart and User Management Functions ---

let currentSimulatedOrder = null;

function showPaymentSimulationModal(order) {
    currentSimulatedOrder = order;
    document.getElementById("simOrderID").textContent = order.id;
    document.getElementById("simOrderTotal").textContent = formatNaira(order.total);

    const statusDisplay = document.getElementById("paymentStatusDisplay");
    statusDisplay.textContent = "Payment status: Pending...";
    statusDisplay.className = "payment-status pending";

    document.getElementById("simulatePaymentBtn").disabled = false;
    document.getElementById("checkStatusBtn").disabled = true;

    const modal = document.getElementById("paymentModal");
    if (modal) {
        modal.classList.add("active");
        document.body.style.overflow = "hidden";
    }
}

function closePaymentModal() {
    const modal = document.getElementById("paymentModal");
    if (modal) {
        modal.classList.remove("active");
        document.body.style.overflow = "";
    }
}

function simulatePayment() {
    const statusDisplay = document.getElementById("paymentStatusDisplay");
    const simulateBtn = document.getElementById("simulatePaymentBtn");
    const checkStatusBtn = document.getElementById("checkStatusBtn");

    // Simulate payment processing delay
    simulateBtn.disabled = true;
    statusDisplay.textContent = "Processing payment...";
    statusDisplay.className = "payment-status pending";

    setTimeout(() => {
        // Randomly simulate success or failure (for demo purposes)
        const isSuccess = Math.random() > 0.3; // 70% chance of success

        if (isSuccess) {
            statusDisplay.textContent = "✅ Payment Successful!";
            statusDisplay.className = "payment-status success";
            // Update order status
            updateOrderPaymentStatus(currentSimulatedOrder.id, 'success');
        } else {
            statusDisplay.textContent = "❌ Payment Failed. Please try again.";
            statusDisplay.className = "payment-status failed";
            // Update order status
            updateOrderPaymentStatus(currentSimulatedOrder.id, 'failed');
        }

        simulateBtn.disabled = true;
        checkStatusBtn.disabled = false;
    }, 2000); // 2-second delay
}

function checkPaymentStatus() {
    const statusDisplay = document.getElementById("paymentStatusDisplay");
    const checkStatusBtn = document.getElementById("checkStatusBtn");

    checkStatusBtn.disabled = true;
    statusDisplay.textContent = "Checking payment status...";
    statusDisplay.className = "payment-status pending";

    setTimeout(() => {
        // Get the current order status
        const user = JSON.parse(sessionStorage.getItem('currentUser'));
        const order = user.orders.find(o => o.id === currentSimulatedOrder.id);
        const status = order?.paymentStatus || 'unknown';

        if (status === 'success') {
            statusDisplay.textContent = "✅ Payment Confirmed!";
            statusDisplay.className = "payment-status success";
        } else if (status === 'failed') {
            statusDisplay.textContent = "❌ Payment Failed.";
            statusDisplay.className = "payment-status failed";
        } else {
            statusDisplay.textContent = "⏳ Payment Still Pending.";
            statusDisplay.className = "payment-status pending";
        }

        checkStatusBtn.disabled = false;
    }, 1500);
}

function updateOrderPaymentStatus(orderId, status) {
    const user = JSON.parse(sessionStorage.getItem('currentUser'));
    const orderIndex = user.orders.findIndex(o => o.id === orderId);
    if (orderIndex !== -1) {
        user.orders[orderIndex].paymentStatus = status;
        user.orders[orderIndex].status = status === 'success' ? 'Paid' : 'Failed';
        // Update user data
        sessionStorage.setItem('currentUser', JSON.stringify(user));
        const allUsers = JSON.parse(localStorage.getItem('users') || '{}');
        allUsers[user.id] = user;
        localStorage.setItem('users', JSON.stringify(allUsers));
        
        // Show final alert with correct icon based on status
        if (status === 'success') {
            showCustomAlert("Payment successful! Your order is confirmed.", "Payment Success", "success");
        } else {
            showCustomAlert("Payment failed. Please try again or contact support.", "Payment Failed", "error");
        }
    }
}
// Initialize products from localStorage or use default products
function initializeData() {
  const existingProducts = localStorage.getItem("solarProducts");
  const existingTestimonials = localStorage.getItem("testimonials");
  const existingNews = localStorage.getItem("news");

  if (!existingProducts) {
    const defaultProducts = [
      {
        id: 1,
        name: "220Ah Tubular Battery",
        price: "₦85,000",
        category: "batteries",
        description:
          "High-capacity deep cycle battery perfect for solar systems. Long-lasting and reliable with excellent performance in various weather conditions.",
        images: ["images/sample-product1.jpg", "/solar-charge-controller-device.jpg", "/solar-panel-on-roof.png"],
      },
      {
        id: 2,
        name: "5KVA Solar Inverter",
        price: "₦320,000",
        category: "inverters",
        description:
          "Pure sine wave inverter with MPPT charge controller. Efficient and durable with advanced protection features.",
        images: ["images/sample-product2.jpg", "/solar-panel-on-roof.png", "/solar-charge-controller-device.jpg"],
      },
      {
        id: 3,
        name: "250W Solar Panel",
        price: "₦45,000",
        category: "panels",
        description:
          "Monocrystalline solar panel with high efficiency rating. Weather-resistant design for long-term outdoor use.",
        images: ["/solar-panel-on-roof.png", "images/sample-product1.jpg"],
      },
      {
        id: 4,
        name: "Solar Charge Controller 60A",
        price: "₦28,000",
        category: "controllers",
        description:
          "MPPT charge controller for optimal battery charging. LCD display included with multiple protection features.",
        images: ["/solar-charge-controller-device.jpg", "images/sample-product2.jpg"],
      },
    ];
    localStorage.setItem("solarProducts", JSON.stringify(defaultProducts));
  }

  if (!existingTestimonials) {
    const defaultTestimonials = [
      {
        id: 1,
        name: "Aisha Johnson",
        role: "Homeowner, Lagos",
        text: "PhemmySolar transformed our energy bills. The installation was professional and the system has been running flawlessly.",
        rating: 5,
        image: "images/aisha-johnson.jpg",
      },
      {
        id: 2,
        name: "Emeka Okafor",
        role: "Business Owner, Ibadan",
        text: "Best investment for my business. Their support team is always available and the system efficiency is outstanding.",
        rating: 5,
        image: "images/emeka-okafor.jpg",
      },
      {
        id: 3,
        name: "Zainab Hassan",
        role: "School Principal, Kano",
        text: "Reliable energy solution for our institution. PhemmySolar's professionalism and quality are unmatched.",
        rating: 5,
        image: "images/zainab-hassan.jpg",
      },
      {
        id: 4,
        name: "Chisom Nwankwo",
        role: "Factory Manager, Onitsha",
        text: "Reduced our operational costs significantly. The solar system pays for itself through energy savings.",
        rating: 5,
        image: "images/chisom-nwankwo.jpg",
      },
    ];
    localStorage.setItem("testimonials", JSON.stringify(defaultTestimonials));
  }

  if (!existingNews) {
    const defaultNews = [
      {
        id: 1,
        title: "Solar Energy Adoption Surges in Nigeria",
        description:
          "Recent reports show a 40% increase in solar energy adoption across Nigerian homes and businesses in 2024.",
        image: "/solar-energy-statistics.jpg",
        date: "Dec 15, 2024",
      },
      {
        id: 2,
        title: "New Solar Technology Breaks Efficiency Records",
        description:
          "Latest monocrystalline panels achieve 23% efficiency, offering better performance and faster ROI for customers.",
        image: "/advanced-solar-panel-technology.jpg",
        date: "Dec 10, 2024",
      },
      {
        id: 3,
        title: "Government Incentives for Solar Installation",
        description:
          "Federal government announces tax breaks and subsidies to encourage more Nigerian businesses to go solar.",
        image: "/government-solar-incentives.jpg",
        date: "Dec 5, 2024",
      },
      {
        id: 4,
        title: "Energy Independence Becomes Reality",
        description:
          "More Nigerian families achieve complete energy independence with advanced solar battery storage solutions.",
        image: "/solar-energy-independence-home.jpg",
        date: "Nov 28, 2024",
      },
    ];
    localStorage.setItem("news", JSON.stringify(defaultNews));
  }
}

// Global variables for search and sort
let allProducts = [];
let filteredProducts = [];
let currentProductInModal = null;
let currentImageIndex = 0;

// Load and display featured products
function loadFeaturedProducts() {
  const featuredContainer = document.getElementById("featuredProducts");
  if (!featuredContainer) return;

  const products = JSON.parse(localStorage.getItem("solarProducts") || "[]").slice(0, 4); // Changed from 3 to 4
  if (products.length === 0) {
    featuredContainer.innerHTML = '<p class="empty-state">No products available</p>';
    return;
  }

  featuredContainer.innerHTML = products
    .map(
      (product) => `
        <div class="product-card">
          <img src="${product.images?.[0] || product.image}" alt="${product.name}" class="product-image">
          <div class="product-info">
            <h3 class="product-name">${product.name}</h3>
            <p class="product-price">${formatNaira(product.price)}</p>
            <p class="product-description">${product.description.substring(0, 80)}...</p>
            <div class="view-details">
                                <button class="btn product-btn" onclick="viewProduct(${product.id})">View Details</button>
                                <!-- NEW: Add to Cart Button in Product Card -->
                                <button class="btn btn-contact" onclick="addToCart(${product.id})">Add to Cart</button>
                                </div>
          </div>
        </div>
      `,
    )
    .join("");
}

// Load and display testimonials
function loadTestimonials() {
  const testimonialContainer = document.getElementById("testimonialsGrid");
  if (!testimonialContainer) return;

  const testimonials = JSON.parse(localStorage.getItem("testimonials") || "[]");
  if (testimonials.length === 0) {
    testimonialContainer.innerHTML = '<p class="empty-state">No testimonials available</p>';
    return;
  }

  testimonialContainer.innerHTML = testimonials
    .map(
      (testimonial) => `
        <div class="testimonial-card">
          <div class="testimonial-header">
            ${testimonial.image ? `<img src="${testimonial.image}" alt="${testimonial.name}" class="testimonial-avatar">` : '<div class="testimonial-avatar-placeholder">👤</div>'}
            <div class="testimonial-author-info">
              <p class="testimonial-author">${testimonial.name}</p>
              <p class="testimonial-role">${testimonial.role}</p>
            </div>
          </div>
          <div class="testimonial-stars">${"⭐".repeat(testimonial.rating)}</div>
          <p class="testimonial-text">"${testimonial.text}"</p>
        </div>
      `,
    )
    .join("");
}

// Load and display latest news
function loadLatestNews() {
  const newsContainer = document.getElementById("latestNews");
  if (!newsContainer) return;

  const news = JSON.parse(localStorage.getItem("news") || "[]").slice(0, 4);
  if (news.length === 0) {
    newsContainer.innerHTML = '<p class="empty-state">No news available</p>';
    return;
  }

  newsContainer.innerHTML = news
    .map(
      (article) => `
        <div class="news-card">
          <img src="${article.image}" alt="${article.title}" class="news-image">
          <div class="news-content">
            <p class="news-date">${article.date}</p>
            <h3 class="news-title">${article.title}</h3>
            <p class="news-description">${article.description}</p>
            <a href="news.html" class="news-link" onclick="viewFullArticle(${article.id});">Read More →</a>
          </div>
        </div>
      `,
    )
    .join("");
}

// Search functionality
function handleSearch(e) {
  const searchTerm = e.target.value.toLowerCase();
  filteredProducts = allProducts.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm) || product.description.toLowerCase().includes(searchTerm),
  );
  applySorting();
  displayProducts(filteredProducts);
}

// Sort functionality
function handleSort(e) {
  applySorting();
  displayProducts(filteredProducts);
}

// Format a number as Nigerian Naira with commas
function formatNaira(price) {
    if (typeof price !== 'number') {
        // If it's not a number, try to parse it
        price = parseFloat(price.replace(/[^\d.-]/g, '')) || 0;
    }
    return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        minimumFractionDigits: 0,
    }).format(price);
}

function applySorting() {
  const sortValue = document.getElementById("sortSelect").value;
  switch (sortValue) {
    case "name-asc":
      filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "name-desc":
      filteredProducts.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case "price-asc":
      filteredProducts.sort((a, b) => {
        const priceA = Number.parseInt(a.price.replace(/[^0-9]/g, ""));
        const priceB = Number.parseInt(b.price.replace(/[^0-9]/g, ""));
        return priceA - priceB;
      });
      break;
    case "price-desc":
      filteredProducts.sort((a, b) => {
        const priceA = Number.parseInt(a.price.replace(/[^0-9]/g, ""));
        const priceB = Number.parseInt(b.price.replace(/[^0-9]/g, ""));
        return priceB - priceA;
      });
      break;
    default:
      // Default order (by ID)
      filteredProducts.sort((a, b) => a.id - b.id);
  }
}

// Custom modal functions
function showCustomAlert(message, title = "Success", type = "success") {
  const modal = document.getElementById("alertModal");
  const alertIcon = document.getElementById("alertIcon");
  const alertTitle = document.getElementById("alertTitle");
  const alertMessage = document.getElementById("alertMessage");

  alertTitle.textContent = title;
  alertMessage.textContent = message;
  alertIcon.textContent = type === "success" ? "✓" : "✕";
  alertIcon.className = `alert-icon ${type}`;

  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function showCustomConfirm(message, title = "Confirm Action", onConfirm) {
  const modal = document.getElementById("confirmModal");
  const confirmTitle = document.getElementById("confirmTitle");
  const confirmMessage = document.getElementById("confirmMessage");
  const confirmYes = document.getElementById("confirmYes");
  const confirmNo = document.getElementById("confirmNo");

  confirmTitle.textContent = title;
  confirmMessage.textContent = message;

  modal.classList.add("active");
  document.body.style.overflow = "hidden";

  // Remove old listeners
  const newYes = confirmYes.cloneNode(true);
  const newNo = confirmNo.cloneNode(true);
  confirmYes.parentNode.replaceChild(newYes, confirmYes);
  confirmNo.parentNode.replaceChild(newNo, confirmNo);

  // Add new listeners
  newYes.addEventListener("click", () => {
    modal.classList.remove("active");
    document.body.style.overflow = "";
    if (onConfirm) onConfirm();
  });
  newNo.addEventListener("click", () => {
    modal.classList.remove("active");
    document.body.style.overflow = "";
  });
}

// View product details in modal
function viewProduct(productId) {
  const products = JSON.parse(localStorage.getItem("solarProducts") || "[]");
  const product = products.find((p) => p.id === productId);

  if (product) {
    currentProductInModal = product;
    currentImageIndex = 0;
    if (!product.images) {
      product.images = [product.image];
    }

    const modal = document.getElementById("productModal");
    const mainImage = document.getElementById("modalMainImage");
    const productName = document.getElementById("modalProductName");
    const productPrice = document.getElementById("modalProductPrice");
    const productDescription = document.getElementById("modalProductDescription");
    const thumbnailContainer = document.getElementById("thumbnailContainer");
    const addToCartButton = document.getElementById("modalAddToCart"); // NEW: Get the button

    productName.textContent = product.name;
    productPrice.textContent = formatNaira(product.price);
    productDescription.textContent = product.description;
    mainImage.src = product.images[0];
    mainImage.alt = product.name;

    thumbnailContainer.innerHTML = product.images
      .map(
        (img, index) => `
      <div class="thumbnail ${index === 0 ? "active" : ""}" onclick="changeImage(${index})">
        <img src="${img}" alt="${product.name} ${index + 1}">
      </div>
    `,
      )
      .join("");

    updateGalleryNav();

    // NEW: Set the onclick for the Add to Cart button in the modal
    if (addToCartButton) {
        addToCartButton.onclick = () => addToCart(product.id);
    }

    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }
}

function changeImage(index) {
  if (!currentProductInModal) return;
  if (index < 0 || index >= currentProductInModal.images.length) {
    return;
  }
  currentImageIndex = index;
  const mainImage = document.getElementById("modalMainImage");
  mainImage.src = currentProductInModal.images[index];
  document.querySelectorAll(".thumbnail").forEach((thumb, i) => {
    thumb.classList.toggle("active", i === index);
  });
  updateGalleryNav();
}

function updateGalleryNav() {
  if (!currentProductInModal) return;
  const prevBtn = document.getElementById("prevImage");
  const nextBtn = document.getElementById("nextImage");
  prevBtn.disabled = currentImageIndex === 0;
  nextBtn.disabled = currentImageIndex === currentProductInModal.images.length - 1;
}

function navigateGallery(direction) {
  if (!currentProductInModal) return;
  const newIndex = currentImageIndex + direction;
  if (newIndex >= 0 && newIndex < currentProductInModal.images.length) {
    currentImageIndex = newIndex;
    const mainImage = document.getElementById("modalMainImage");
    mainImage.src = currentProductInModal.images[newIndex];
    document.querySelectorAll(".thumbnail").forEach((thumb, i) => {
      thumb.classList.toggle("active", i === newIndex);
    });
    updateGalleryNav();
  }
}

function closeProductModal() {
  const modal = document.getElementById("productModal");
  modal.classList.remove("active");
  document.body.style.overflow = "";
  currentProductInModal = null;
  currentImageIndex = 0;
}

// Mobile menu initialization
// Mobile menu initialization

// Mobile menu initialization
function initMobileMenu() {
  const mobileMenuBtn = document.getElementById("mobileMenuBtn");
  const nav = document.getElementById("navMenu");
  const navOverlay = document.getElementById("navOverlay");
  let isMenuOpen = false;

  function toggleMobileMenu() {
    isMenuOpen = !isMenuOpen;
    mobileMenuBtn.classList.toggle("active", isMenuOpen);
    nav.classList.toggle("active", isMenuOpen);
    navOverlay.classList.toggle("active", isMenuOpen);
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
  }

  window.closeMobileMenu = () => {
    if (isMenuOpen) {
      isMenuOpen = false;
      mobileMenuBtn.classList.remove("active");
      nav.classList.remove("active");
      navOverlay.classList.remove("active");
      document.body.style.overflow = "";
    }
  };

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener("click", toggleMobileMenu);
  }
  if (navOverlay) {
    navOverlay.addEventListener("click", window.closeMobileMenu);
  }

  // --- NEW: Mobile Dropdown Menu Logic ---
  // Add event listeners for mobile dropdown toggles
  const dropdownToggles = document.querySelectorAll(".nav-dropdown .dropdown-toggle");
  dropdownToggles.forEach((toggle) => {
    toggle.addEventListener("click", (e) => {
      e.preventDefault(); // Prevent default button behavior
      
      // Only handle dropdowns in mobile view (when nav is active)
      if (nav.classList.contains("active")) {
        // Close all other dropdowns first
        document.querySelectorAll(".nav-dropdown").forEach((dropdown) => {
          if (dropdown !== toggle.closest(".nav-dropdown")) {
            dropdown.classList.remove("active");
          }
        });
        // Toggle the clicked dropdown
        const dropdownContainer = toggle.closest(".nav-dropdown");
        dropdownContainer.classList.toggle("active");
      }
    });
  });

  // Close dropdowns when clicking outside or resizing
  document.addEventListener("click", (e) => {
    if (nav.classList.contains("active")) {
      // Check if click is outside any dropdown container
      const isClickInsideDropdown = e.target.closest(".nav-dropdown");
      if (!isClickInsideDropdown) {
        document.querySelectorAll(".nav-dropdown").forEach((dropdown) => {
          dropdown.classList.remove("active");
        });
      }
    }
  });

  // Handle window resize
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (isMenuOpen && window.innerWidth > 768) {
        window.closeMobileMenu();
      }
      // Also close any open dropdowns when switching to desktop
      if (window.innerWidth > 768) {
        document.querySelectorAll(".nav-dropdown").forEach((dropdown) => {
          dropdown.classList.remove("active");
        });
      }
    }, 250);
  });

  // Handle Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (isMenuOpen) {
        window.closeMobileMenu();
      }
      // Also close any open dropdowns
      document.querySelectorAll(".nav-dropdown").forEach((dropdown) => {
        dropdown.classList.remove("active");
      });
    }
  });
}
// Initialize everything when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  initializeData();
  initializeUserSession(); // Add this line - NEW
  loadFeaturedProducts();
  loadTestimonials();
  loadLatestNews();
  initMobileMenu();
    
  // --- NEW: Add event listener for Edit Address Form ---
   const editAddressForm = document.getElementById("editAddressForm");
    if (editAddressForm) {
        editAddressForm.addEventListener("submit", handleUpdateAddress);
    }
    
  // Modal event listeners
  const closeModal = document.getElementById("closeModal");
  if (closeModal) {
    closeModal.addEventListener("click", closeProductModal);
  }
  const prevImage = document.getElementById("prevImage");
  if (prevImage) {
    prevImage.addEventListener("click", () => navigateGallery(-1));
  }
  const nextImage = document.getElementById("nextImage");
  if (nextImage) {
    nextImage.addEventListener("click", () => navigateGallery(1));
  }
  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.classList.remove("active");
        document.body.style.overflow = "";
      }
    });
  });
  const alertOk = document.getElementById("alertOk");
  if (alertOk) {
    alertOk.addEventListener("click", () => {
      document.getElementById("alertModal").classList.remove("active");
      document.body.style.overflow = "";
    });
  }
// Add event listener for Forgot Password link
const forgotPasswordLink = document.getElementById("forgotPasswordLink");
// Replace the previous forgot password link event listener with:
if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener("click", (e) => {
        e.preventDefault();
        showForgotPasswordModal();
    });
}
  // NEW: Add event listeners for Cart View, Login, Logout, Account Link
  const viewCartBtn = document.getElementById('viewCartBtn');
  if (viewCartBtn) {
      viewCartBtn.addEventListener('click', viewCart);
  }

  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
      loginBtn.addEventListener('click', (e) => {
          e.preventDefault(); // Prevent default link behavior
          showAuthModal(); // Show the modal instead of prompt
      });
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
          e.preventDefault(); // Prevent default link behavior
          handleLogout();
      });
  }

  const accountLink = document.getElementById('accountLink');
  if (accountLink) {
      accountLink.addEventListener('click', (e) => {
          e.preventDefault(); // Prevent default link behavior
          // Navigate to account page or load order history in a modal
          loadOrderHistory(); // Example: Load history in a modal
           const accountModal = document.getElementById("accountModal"); // You need to create this modal in your HTML
           if (accountModal) {
               accountModal.classList.add("active");
               document.body.style.overflow = "hidden";
           }
      });
  }
 // NEW: Add event listener for Account Modal Close Button
  const accountModalCloseBtn = document.getElementById("accountModal"); // Get the modal itself
  if (accountModalCloseBtn) {
      // Use event delegation on the modal container to catch clicks on the close button
      accountModalCloseBtn.addEventListener('click', (e) => {
          // Check if the clicked element has the class 'modal-close' (the X button)
          if (e.target && e.target.classList.contains('modal-close')) {
              accountModalCloseBtn.classList.remove("active");
              document.body.style.overflow = "";
          }
      });
  }

  // NEW: Add event listeners for Auth Modal
  const authForm = document.getElementById("authForm");
  if (authForm) {
      authForm.addEventListener("submit", handleAuthSubmit);
  }
  const authCloseBtn = document.getElementById("authClose");
  if (authCloseBtn) {
      authCloseBtn.addEventListener("click", closeAuthModal);
  }
  const authModal = document.getElementById("authModal");
  if (authModal) {
      authModal.addEventListener("click", (e) => {
          if (e.target === authModal) {
              closeAuthModal();
          }
      });
  }
  document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && authModal?.classList.contains("active")) {
          closeAuthModal();
      }
  });

  // Switch between Login and Signup forms
  const loginFormSwitch = document.getElementById("loginFormSwitch");
  const signupFormSwitch = document.getElementById("signupFormSwitch");
  if (loginFormSwitch) {
      loginFormSwitch.addEventListener("click", (e) => {
          e.preventDefault();
          document.getElementById("authFormTitle").textContent = "Login";
          document.getElementById("authForm").dataset.mode = "login";
          document.getElementById("authSubmitBtn").textContent = "Login";
          document.getElementById("authToggleText").innerHTML = "Don't have an account? <a href='#' id='signupFormSwitch'>Sign Up</a>";
          // Reattach event listener for the new signup link
          document.getElementById("signupFormSwitch").addEventListener("click", switchToSignup);
      });
  }

 // Inside the DOMContentLoaded event listener, find or add these functions

function switchToSignup(e) {
    e.preventDefault();
    document.getElementById("authFormTitle").textContent = "Sign Up";
    document.getElementById("authForm").dataset.mode = "signup";
    document.getElementById("authSubmitBtn").textContent = "Sign Up";
    document.getElementById("authToggleText").innerHTML = "Already have an account? <a href='#' id='loginFormSwitch'>Login</a>";

    // Show the extra signup fields
    document.getElementById("signupExtraFields").style.display = "block";

    // Reattach event listener for the new login link
    document.getElementById("loginFormSwitch").addEventListener("click", switchToLogin);
}

function switchToLogin(e) {
    e.preventDefault();
    document.getElementById("authFormTitle").textContent = "Login";
    document.getElementById("authForm").dataset.mode = "login";
    document.getElementById("authSubmitBtn").textContent = "Login";
    document.getElementById("authToggleText").innerHTML = "Don't have an account? <a href='#' id='signupFormSwitch'>Sign Up</a>";

    // Hide the extra signup fields for login
    document.getElementById("signupExtraFields").style.display = "none";

    // Reattach event listener for the new signup link
    document.getElementById("signupFormSwitch").addEventListener("click", switchToSignup);
}

  // Attach initial event listeners for switching
  if (signupFormSwitch) {
      signupFormSwitch.addEventListener("click", switchToSignup);
  }


  document.addEventListener("keydown", (e) => {
    if (document.getElementById("productModal")?.classList.contains("active")) {
      if (e.key === "ArrowLeft") navigateGallery(-1);
      if (e.key === "ArrowRight") navigateGallery(1);
      if (e.key === "Escape") closeProductModal();
    }
    // Add key listener for cart modal close - NEW
    if (document.getElementById("cartModal")?.classList.contains("active")) {
      if (e.key === "Escape") closeCartModal();
    }
    // Add key listener for account modal close - NEW
    if (document.getElementById("accountModal")?.classList.contains("active")) {
      if (e.key === "Escape") { document.getElementById('accountModal').classList.remove('active'); document.body.style.overflow=''; }
    }
  });
});

function viewFullArticle(articleId) {
  const newsList = JSON.parse(localStorage.getItem("news") || "[]");
  const article = newsList.find((n) => n.id === articleId);
  if (article) {
    const modal = document.getElementById("articleModal");
    if (!modal) return;

    document.getElementById("articleTitle").textContent = article.title;
    document.getElementById("articleDate").textContent = article.date;
    document.getElementById("articleImage").src = article.image || "/placeholder.svg";
    document.getElementById("articleBody").innerHTML = `<p>${(article.fullContent || article.body || article.description).replace(/\n/g, "</p><p>")}</p>`;

    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }
}

function closeArticleModal() {
  const modal = document.getElementById("articleModal");
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "";
  }
}



// Add event listeners for payment simulation buttons
const simulatePaymentBtn = document.getElementById("simulatePaymentBtn");
if (simulatePaymentBtn) {
    simulatePaymentBtn.addEventListener("click", simulatePayment);
}

const checkStatusBtn = document.getElementById("checkStatusBtn");
if (checkStatusBtn) {
    checkStatusBtn.addEventListener("click", checkPaymentStatus);
}



// Function to handle forgot password
function handleForgotPassword() {
    const username = document.getElementById("username").value.trim();
    
    if (!username) {
        showCustomAlert("Please enter your username.", "Error");
        return;
    }
    
    // Get all users
    const allUsers = JSON.parse(localStorage.getItem('users') || '{}');
    
    // Find user by username
    const user = Object.values(allUsers).find(u => u.username === username);
    
    if (!user) {
        showCustomAlert("Username not found. Please check and try again.", "User Not Found");
        return;
    }
    
    // For demo purposes, we'll generate a new random password
    // In a real application, you would send an email with a reset link
    const newPassword = generateRandomPassword(8);
    const hashedPassword = hashPassword(newPassword);
    
    // Update user's password
    user.passwordHash = hashedPassword;
    allUsers[user.id] = user;
    localStorage.setItem('users', JSON.stringify(allUsers));
    
    // Show success message with the new password
    showCustomAlert(
        `Your password has been reset successfully!\n\nNew Password: ${newPassword}\n\nPlease change this password immediately after logging in.`,
        "Password Reset",
        "success"
    );
    
    // Clear the password field
    document.getElementById("password").value = "";
}

// Helper function to generate random password
function generateRandomPassword(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return password;
}


// Add this function to your script.js
function showForgotPasswordModal() {
    const modal = document.getElementById("forgotPasswordModal");
    if (modal) {
        document.getElementById("forgotPasswordForm").reset();
        document.getElementById("forgotPasswordError").textContent = "";
        modal.classList.add("active");
        document.body.style.overflow = "hidden";
    }
}

function closeForgotPasswordModal() {
    const modal = document.getElementById("forgotPasswordModal");
    if (modal) {
        modal.classList.remove("active");
        document.body.style.overflow = "";
    }
}

function handleForgotPasswordSubmit(e) {
    e.preventDefault();
    const username = document.getElementById("forgotPasswordUsername").value.trim();
    const email = document.getElementById("forgotPasswordEmail").value.trim();
    
    if (!username || !email) {
        document.getElementById("forgotPasswordError").textContent = "Username and email are required.";
        return;
    }
    
    const allUsers = JSON.parse(localStorage.getItem('users') || '{}');
    const user = Object.values(allUsers).find(u => u.username === username && u.email === email);
    
    if (!user) {
        document.getElementById("forgotPasswordError").textContent = "Username or email not found.";
        return;
    }
    
    // Generate reset token (for demo purposes)
    const resetToken = Math.random().toString(36).substr(2, 15);
    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 300000; // 5 minutes expiry
    
    allUsers[user.id] = user;
    localStorage.setItem('users', JSON.stringify(allUsers));
    
    // In a real app, you would send an email with the reset link
    showCustomAlert(
        `A password reset link has been sent to ${email}.\n\nFor demo purposes, use this token: ${resetToken}`,
        "Password Reset Requested",
        "success"
    );
    
    closeForgotPasswordModal();
}

