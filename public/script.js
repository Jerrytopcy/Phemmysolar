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
// Add event listener for Forgot Password Form
const forgotPasswordForm = document.getElementById("forgotPasswordForm");
if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener("submit", handleForgotPasswordSubmit);
}

function formatDate(dateString) {
    try {
        return new Date(dateString).toLocaleDateString('en-NG', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    } catch (error) {
        console.error("Error formatting date:", error);
        return dateString; // Fallback to original string if parsing fails
    }
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
// Handle login or signup form submission
// Handle login or signup form submission
async function handleAuthSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const username = form.username.value.trim();
    const password = form.password.value; // Get the raw password

    // Add explicit check for password length
    if (!username || !password || password.length === 0) {
        document.getElementById("authError").textContent = "Username and password are required.";
        return;
    }

    const isLogin = form.dataset.mode === "login";

    // Prepare data based on whether it's login or signup
    let requestData = {
        username: username,
        password: password, // 👈 Send plain password (This is correct for bcrypt.compare)
        action: isLogin ? "login" : "signup"
    };

    if (!isLogin) {
        // For signup: collect extra fields
        const email = document.getElementById("email").value.trim();
        const phone = document.getElementById("phone").value.trim();
        const street = document.getElementById("street").value.trim();
        const city = document.getElementById("city").value.trim();
        const state = document.getElementById("state").value.trim();
        const postalCode = document.getElementById("postalCode").value.trim();

        // Validate required fields for signup
        if (!email || !phone || !street || !city || !state) {
            document.getElementById("authError").textContent = "Please fill in all required fields.";
            return;
        }

        requestData.email = email;
        requestData.phone = phone;
        requestData.address = {
            street: street,
            city: city,
            state: state,
            postalCode: postalCode,
            country: "Nigeria"
        };
    }

    try {
        const response = await fetch('/api/auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });

        const result = await response.json();

        if (!response.ok) {
            document.getElementById("authError").textContent = result.error || "An unexpected error occurred.";
            return;
        }

        if (result.success) {
            const userData = result.user;
            sessionStorage.setItem('currentUser', JSON.stringify(userData));
            localStorage.setItem('currentUserId', userData.id);
            updateUIBasedOnUser(userData);
            closeAuthModal();
            if (isLogin) {
                showCustomAlert(`Welcome back, ${userData.username}!`, "Logged In");
            } else {
                showCustomAlert(`Welcome, ${userData.username}! Your account has been created.`, "Account Created");
            }
        } else {
            document.getElementById("authError").textContent = result.error || "Authentication failed.";
        }
    } catch (error) {
        console.error("Network error during authentication:", error);
        document.getElementById("authError").textContent = "Network error. Please try again.";
    }
}
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
// Simulate user logout with confirmation
function handleLogout() {
    showCustomConfirm(
        "Are you sure you want to log out? You will need to log in again to access your account and cart.",
        "Confirm Logout",
        () => {
            // This function runs if the user clicks "Yes"
            sessionStorage.removeItem('currentUser');
            localStorage.removeItem('currentUserId'); // Clear persistent ID
            updateUIBasedOnUser(null);
            showCustomAlert("You have been logged out.", "Logged Out");
        }
    );
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
async function addToCart(productId) {
  let user = JSON.parse(sessionStorage.getItem('currentUser'));
  if (!user) {
    // Prompt for login/signup if not logged in
    showAuthModal(); // Show the modal instead of prompt
    return;
  }
  try {
    // Fetch the specific product from the API
    const response = await fetch(`/api/products/${productId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const product = await response.json();
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
  } catch (error) {
    console.error("Error fetching product for cart:", error);
    showCustomAlert("Failed to add product to cart. Please try again.", "Error");
  }
}
// View Cart (you can implement this in a modal or a dedicated page)
// View Cart
async function viewCart() {
  const user = JSON.parse(sessionStorage.getItem('currentUser'));
  if (!user || !user.cart || user.cart.length === 0) {
    showCustomAlert("Your cart is empty.", "Cart Empty");
    return;
  }
  // Create an array to hold all product data fetched from the API
  const cartItemsWithDetails = [];
  try {
    // Loop through each item in the user's cart and fetch its details
    for (const cartItem of user.cart) {
      const response = await fetch(`/api/products/${cartItem.productId}`);
      if (!response.ok) {
        console.error(`Failed to fetch product ${cartItem.productId}:`, response.statusText);
        continue; // Skip this item if fetching fails
      }
      const product = await response.json();
      if (product) {
        // Combine the cart item quantity with the product details
        cartItemsWithDetails.push({
          ...product,
          cartQuantity: cartItem.quantity // Add the quantity from the cart
        });
      }
    }
    // Sort cart items in reverse order (last added first) if needed
    // const reversedCart = [...cartItemsWithDetails].reverse(); // Uncomment if desired
    let cartHTML = '<h3>Your Cart</h3><ul>';
    let total = 0;
    // Iterate through the fetched cart items
    cartItemsWithDetails.forEach(item => { // Use reversedCart here if sorting was applied
        const price = parseInt(item.price.replace(/\D/g, '')); // Extract numeric price
        const itemTotal = price * item.cartQuantity;
        total += itemTotal;
        cartHTML += `
            <div class="cart-item-card">
                <div class="cart-item-image-wrapper">
                    <img src="${item.images?.[0] || '/placeholder.svg'}" alt="${item.name}" onerror="this.src='/placeholder.svg'; this.alt='Image not available';">
                </div>
                <div class="cart-item-info">
                    <h4 class="cart-item-title">${item.name}</h4>
                    <p class="cart-item-price">${formatNaira(itemTotal)}</p>
                    <div class="cart-item-quantity-controls">
                        <button class="qty-btn" onclick="updateCartItemQuantity(${item.id}, ${item.cartQuantity - 1})" ${item.cartQuantity <= 1 ? 'disabled' : ''}>−</button>
                        <span class="qty-display">${item.cartQuantity}</span>
                        <button class="qty-btn" onclick="updateCartItemQuantity(${item.id}, ${item.cartQuantity + 1})">+</button>
                    </div>
                </div>
                <button class="remove-btn" onclick="removeFromCart(${item.id})">×</button>
            </div>`;
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
  } catch (error) {
    console.error("Error loading cart items:", error);
    showCustomAlert("Failed to load cart items. Please try again.", "Error");
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
async function proceedToCheckout() {
  const user = JSON.parse(sessionStorage.getItem('currentUser'));
  if (!user || !user.cart || user.cart.length === 0) {
    showCustomAlert("Your cart is empty.", "Cart Empty");
    return;
  }
  const orderItems = [];
  let total = 0;
  try {
    // Loop through each item in the user's cart and fetch its details
    for (const cartItem of user.cart) {
      const response = await fetch(`/api/products/${cartItem.productId}`);
      if (!response.ok) {
        console.error(`Failed to fetch product ${cartItem.productId}:`, response.statusText);
        continue; // Skip this item if fetching fails
      }
      const product = await response.json();
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
    }
    // --- NEW: Get the current address from the user object ---
    const currentAddress = user.address || {
      street: "",
      city: "",
      state: "",
      postalCode: "",
      country: "Nigeria"
    };
    // Create the order object with the calculated items and address
    const order = {
      id: Date.now(), // Consider using a UUID for production
      date: new Date().toLocaleString(),
      items: orderItems,
      total: total,
      status: 'Pending',
      paymentStatus: 'pending',
      // --- NEW: Add the address to the order ---
      deliveryAddress: currentAddress
    };
    // Save order to user's history (this part still updates local storage)
    user.orders.push(order);
    // Clear cart
    user.cart = [];
    // Update user data in session and localStorage (this is temporary until you implement backend order saving)
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
  } catch (error) {
    console.error("Error preparing checkout:", error);
    showCustomAlert("Failed to prepare checkout. Please try again.", "Error");
  }
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
async function loadOrderHistory() {
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
for (const order of sortedOrders) {
    // --- NEW: Format the delivery address for display ---
    const address = order.deliveryAddress || { street: "", city: "", state: "", postalCode: "", country: "Nigeria" };
    const fullAddress = `${address.street}, ${address.city}, ${address.state} ${address.postalCode}, ${address.country}`;

    let itemsHTML = '';

    // Process each item in the order
    for (const item of order.items) {
        try {
            const productResponse = await fetch(`/api/products/${item.productId}`);
            if (!productResponse.ok) throw new Error(`Failed to fetch product ${item.productId}`);

            const product = await productResponse.json();
            const imageUrl = product.images?.[0] || '/placeholder.svg';

            itemsHTML += `
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
        } catch (error) {
            console.error('Error loading product image for item:', item.productId, error);
            // Fallback to placeholder
            itemsHTML += `
                <div class="order-history-item">
                    <div class="order-item-image-wrapper">
                        <img src="/placeholder.svg" alt="Image not available" onerror="this.src='/placeholder.svg';">
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
        }
    }

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
                ${itemsHTML}
            </div>
        </div>
    `;
}
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
await fetch('/api/orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    items: user.cart,
    total,
    deliveryAddress: currentAddress
  })
})


app.get('/api/orders', authMiddleware, async (req, res) => {
  const userId = req.user.id

  const orders = await pool.query(`
    SELECT o.*, json_agg(oi.*) AS items
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    WHERE o.user_id = $1
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `, [userId])

  res.json(orders.rows)
})

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
// Initialize data (now handled by the database)
function initializeData() {
    // Data is loaded from the database via API calls
    // No need to populate localStorage here
}
// Global variables for search and sort
let allProducts = []; // Will be populated from API
let filteredProducts = []; // Will be populated from API
let currentProductInModal = null;
let currentImageIndex = 0;
// Load and display featured products
async function loadFeaturedProducts() {
  const featuredContainer = document.getElementById("featuredProducts");
  if (!featuredContainer) return;
  try {
    const response = await fetch('/api/products');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const products = await response.json();
    // Get the first 4 products for featured display
    const featuredProducts = products.slice(0, 4);
    if (featuredProducts.length === 0) {
      featuredContainer.innerHTML = '<p class="empty-state">No products available</p>';
      return;
    }
    featuredContainer.innerHTML = featuredProducts
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
  } catch (error) {
    console.error("Error loading featured products:", error);
    featuredContainer.innerHTML = '<p class="error-message">Failed to load featured products.</p>';
  }
}
// Load and display testimonials
async function loadTestimonials() {
  const testimonialContainer = document.getElementById("testimonialsGrid");
  if (!testimonialContainer) return;
  try {
    const response = await fetch('/api/testimonials');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const testimonials = await response.json();
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
  } catch (error) {
    console.error("Error loading testimonials:", error);
    testimonialContainer.innerHTML = '<p class="error-message">Failed to load testimonials.</p>';
  }
}
// Load and display latest news
async function loadLatestNews() {
  const newsContainer = document.getElementById("latestNews");
  if (!newsContainer) return;
  try {
    const response = await fetch('/api/news');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const news = await response.json();
    // Get the first 4 news articles
    const latestNews = news.slice(0, 4);
    if (latestNews.length === 0) {
      newsContainer.innerHTML = '<p class="empty-state">No news available</p>';
      return;
    }
    newsContainer.innerHTML = latestNews
      .map(
        (article) => `
          <div class="news-card">
            <img src="${article.image}" alt="${article.title}" class="news-image">
            <div class="news-content">
              <p class="news-date">${formatDate(article.date)}</p>
              <h3 class="news-title">${article.title}</h3>
              <p class="news-description">${article.description}</p>
              <a href="news.html" class="news-link" onclick="viewFullArticle(${article.id});">Read More →</a>
            </div>
          </div>
        `,
      )
      .join("");
  } catch (error) {
    console.error("Error loading latest news:", error);
    newsContainer.innerHTML = '<p class="error-message">Failed to load news.</p>';
  }
}
// Search functionality
function handleSearch(e) {
  const searchTerm = e.target.value.toLowerCase();
  // This needs to filter the globally fetched 'allProducts'
  // If allProducts is fetched from API, the filtering logic remains similar
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
  // Fetch the specific product from the API
   fetch(`/api/products/${productId}`) 
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(product => {
      if (!product) {
        showCustomAlert("Product not found.", "Error");
        return;
      }
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
    })
    .catch(error => {
      console.error("Error fetching product:", error);
      showCustomAlert("Failed to load product details.", "Error");
    });
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
  // Fetch the specific news article from the API
  fetch(`/api/news/${articleId}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(article => {
      if (!article) {
        console.error("Article not found.");
        return;
      }
      const modal = document.getElementById("articleModal");
      if (!modal) return;
      document.getElementById("articleTitle").textContent = article.title;
      document.getElementById("articleDate").textContent = article.date;
      document.getElementById("articleImage").src = article.image || "/placeholder.svg";
      document.getElementById("articleBody").innerHTML = `<p>${(article.fullContent || article.body || article.description).replace(/ /g, "</p><p>")}</p>`;
      modal.classList.add("active");
      document.body.style.overflow = "hidden";
    })
    .catch(error => {
      console.error("Error fetching article:", error);
      // Optionally show an alert or handle the error differently
    });
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
async function handleForgotPasswordSubmit(e) {
    e.preventDefault();
    const username = document.getElementById("forgotPasswordUsername").value.trim();
    const email = document.getElementById("forgotPasswordEmail").value.trim();
    if (!username || !email) {
        document.getElementById("forgotPasswordError").textContent = "Username and email are required.";
        return;
    }

    try {
        const response = await fetch('/api/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email })
        });

        const result = await response.json();

        if (!response.ok) {
            document.getElementById("forgotPasswordError").textContent = result.error || "An unexpected error occurred.";
            return;
        }

        if (result.success) {
            showCustomAlert(
                `A password reset link has been sent to ${email}.`,
                "Password Reset Requested",
                "success"
            );
            closeForgotPasswordModal();
        } else {
            document.getElementById("forgotPasswordError").textContent = result.error || "Password reset failed.";
        }

    } catch (error) {
        console.error("Network error during password reset:", error);
        document.getElementById("forgotPasswordError").textContent = "Network error. Please try again.";
    }
}