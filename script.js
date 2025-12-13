// script.js
// --- NEW: Cart and User Management Functions ---
// Initialize user session (simulates login state)
function initializeUserSession() {
    let user = JSON.parse(sessionStorage.getItem('currentUser')) || null;
    if (!user) {
        // Check if a user ID exists in localStorage (for persistence across sessions)
        // Note: Since users are managed via API now, persistence needs re-evaluation if needed server-side
        // For now, only session storage holds the current user context
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
async function handleAuthSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const username = form.username.value.trim();
    const password = form.password.value;
    const isLogin = form.dataset.mode === "login";

    if (!username || !password) {
        document.getElementById("authError").textContent = "Username and password are required.";
        return;
    }

    try {
        const response = await fetch('/.netlify/functions/auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: isLogin ? 'login' : 'signup',
                username: username,
                password: password,
                ...(isLogin ? {} : {
                    email: document.getElementById("email").value.trim(),
                    phone: document.getElementById("phone").value.trim(),
                    street: document.getElementById("street").value.trim(),
                    city: document.getElementById("city").value.trim(),
                    state: document.getElementById("state").value.trim(),
                    postalCode: document.getElementById("postalCode").value.trim()
                })
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Authentication failed');
        }

        if (result.success) {
            // Store the returned user data in sessionStorage
            sessionStorage.setItem('currentUser', JSON.stringify(result.user));
            // For demo, we don't store currentUserId persistently anymore as users are server-side
            // localStorage.setItem('currentUserId', result.user.id); // Removed per instructions
            updateUIBasedOnUser(result.user);
            closeAuthModal();
            showCustomAlert(
                `Welcome ${isLogin ? 'back' : ''}, ${username}! ${isLogin ? '' : 'Your account has been created.'}`,
                isLogin ? "Logged In" : "Account Created"
            );
        } else {
            document.getElementById("authError").textContent = result.message || "Authentication failed.";
        }
    } catch (error) {
        console.error('Authentication error:', error);
        document.getElementById("authError").textContent = error.message || "An unexpected error occurred during authentication.";
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
// Simulate user logout with confirmation
function handleLogout() {
    showCustomConfirm(
        "Are you sure you want to log out? You will need to log in again to access your account and cart.",
        "Confirm Logout",
        () => {
            // This function runs if the user clicks "Yes"
            sessionStorage.removeItem('currentUser');
            // localStorage.removeItem('currentUserId'); // Removed per instructions
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
        // Fetch product data from API
        const response = await fetch(`/.netlify/functions/products?id=${productId}`);
        if (!response.ok) {
            throw new Error('Product not found.');
        }
        const product = await response.json();

        // Check if item already exists in cart
        const existingItemIndex = user.cart.findIndex(item => item.productId === productId);
        if (existingItemIndex > -1) {
            user.cart[existingItemIndex].quantity += 1;
        } else {
            user.cart.push({ productId: productId, quantity: 1 });
        }

        // Update user data in session storage
        sessionStorage.setItem('currentUser', JSON.stringify(user));

        // Update UI
        updateUIBasedOnUser(user);
        showCustomAlert(`${product.name} added to cart!`, "Added to Cart");
    } catch (error) {
        console.error('Error adding to cart:', error);
        showCustomAlert(error.message || "Failed to add item to cart.", "Error");
    }
}

// View Cart
async function viewCart() {
    const user = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!user || !user.cart || user.cart.length === 0) {
        showCustomAlert("Your cart is empty.", "Cart Empty");
        return;
    }

    try {
        let cartHTML = '<h3>Your Cart</h3><ul>';
        let total = 0;

        // Reverse the cart array so the last added item appears first
        const reversedCart = [...user.cart].reverse();

        for (const cartItem of reversedCart) {
            const response = await fetch(`/.netlify/functions/products?id=${cartItem.productId}`);
            if (!response.ok) {
                console.warn(`Product ${cartItem.productId} not found.`);
                continue; // Skip this item if not found
            }
            const product = await response.json();

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
        console.error('Error loading cart:', error);
        showCustomAlert("Failed to load cart contents.", "Error");
    }
}

// Update item quantity in cart
async function updateCartItemQuantity(productId, newQuantity) {
    if (newQuantity < 1) {
        removeFromCart(productId);
        return;
    }

    const user = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!user) return;

    const itemIndex = user.cart.findIndex(item => item.productId === productId);
    if (itemIndex > -1) {
        user.cart[itemIndex].quantity = newQuantity;

        // Update user data in session storage
        sessionStorage.setItem('currentUser', JSON.stringify(user));

        // Update UI
        updateUIBasedOnUser(user);
        viewCart(); // Refresh cart view
    }
}

// Remove item from cart
async function removeFromCart(productId) {
    const user = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!user) return;

    // Filter out the item
    user.cart = user.cart.filter(item => item.productId !== productId);

    // Update user data in session storage
    sessionStorage.setItem('currentUser', JSON.stringify(user));

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

    try {
        const orderItems = [];
        let total = 0;

        for (const cartItem of user.cart) {
            const response = await fetch(`/.netlify/functions/products?id=${cartItem.productId}`);
            if (!response.ok) {
                console.warn(`Product ${cartItem.productId} not found.`);
                continue; // Skip this item if not found
            }
            const product = await response.json();

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
            id: Date.now(), // Consider using a server-generated ID
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

        // Update user data in session storage
        sessionStorage.setItem('currentUser', JSON.stringify(user));

        // Update UI to reflect empty cart (this updates the cart count)
        updateUIBasedOnUser(user);

        // Close the cart modal first
        closeCartModal();

        // Then show payment simulation modal
        showPaymentSimulationModal(order);
    } catch (error) {
        console.error('Error during checkout:', error);
        showCustomAlert("Failed to process checkout.", "Error");
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
            // Save the initialized address to sessionStorage
            sessionStorage.setItem('currentUser', JSON.stringify(user));
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
                        // We could fetch here too, but since the item already contains the name and image is cached from checkout...
                        // For consistency with how the rest of the app works, we'll assume the item has the necessary details
                        // However, for image, we'll rely on the fact that it was fetched during checkout or cart view
                        // If image isn't present, we fall back to placeholder
                        // Since we don't have product images cached separately here, we'll use a placeholder or the one saved in the order item
                        // For simplicity in this refactor, we'll assume the image was part of the order item at checkout time
                        // In a real scenario, you might want to fetch the product again for the latest image URL
                        const imageUrl = item.imageUrl || '/placeholder.svg'; // Placeholder if not saved
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

    // Save the updated user data in session storage
    sessionStorage.setItem('currentUser', JSON.stringify(user));

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

async function reorderOrder(orderId) {
    const user = JSON.parse(sessionStorage.getItem('currentUser'));
    const order = user.orders.find(o => o.id === orderId);
    if (!order) return;

    // Add all items from this order back to cart
    for (const item of order.items) {
        await addToCart(item.productId); // Reuses your existing addToCart function (now async)
    }
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

        // Update user data in session storage
        sessionStorage.setItem('currentUser', JSON.stringify(user));

        // Show final alert with correct icon based on status
        if (status === 'success') {
            showCustomAlert("Payment successful! Your order is confirmed.", "Payment Success", "success");
        } else {
            showCustomAlert("Payment failed. Please try again or contact support.", "Payment Failed", "error");
        }
    }
}

// Initialize products from localStorage or use default products
// --- REFACTORED: No-op function as per requirements ---
function initializeData() {
    // This function is intentionally left empty.
    // All data fetching is done via API calls now.
}

// Global variables for search and sort
// These will be populated by API calls later
let allProducts = [];
let filteredProducts = [];
let currentProductInModal = null;
let currentImageIndex = 0;

// Load and display featured products
async function loadFeaturedProducts() {
    const featuredContainer = document.getElementById("featuredProducts");
    if (!featuredContainer) return;

    try {
        const response = await fetch('/.netlify/functions/products');
        if (!response.ok) {
            throw new Error('Failed to load products');
        }
        const products = await response.json();
        const featuredProducts = products.slice(0, 4); // Changed from 3 to 4

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
        console.error('Error loading featured products:', error);
        featuredContainer.innerHTML = '<p class="empty-state">Error loading products</p>';
    }
}

// Load and display testimonials
async function loadTestimonials() {
    const testimonialContainer = document.getElementById("testimonialsGrid");
    if (!testimonialContainer) return;

    try {
        const response = await fetch('/.netlify/functions/testimonials');
        if (!response.ok) {
            throw new Error('Failed to load testimonials');
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
        console.error('Error loading testimonials:', error);
        testimonialContainer.innerHTML = '<p class="empty-state">Error loading testimonials</p>';
    }
}

// Load and display latest news
async function loadLatestNews() {
    const newsContainer = document.getElementById("latestNews");
    if (!newsContainer) return;

    try {
        const response = await fetch('/.netlify/functions/news');
        if (!response.ok) {
            throw new Error('Failed to load news');
        }
        const news = await response.json();
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
                <p class="news-date">${article.date}</p>
                <h3 class="news-title">${article.title}</h3>
                <p class="news-description">${article.description}</p>
                <a href="news.html" class="news-link" onclick="viewFullArticle(${article.id});">Read More →</a>
              </div>
            </div>
          `,
            )
            .join("");
    } catch (error) {
        console.error('Error loading latest news:', error);
        newsContainer.innerHTML = '<p class="empty-state">Error loading news</p>';
    }
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
async function viewProduct(productId) {
    try {
        const response = await fetch(`/.netlify/functions/products?id=${productId}`);
        if (!response.ok) {
            throw new Error('Product not found.');
        }
        const product = await response.json();

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
    } catch (error) {
        console.error('Error viewing product:', error);
        showCustomAlert(error.message || "Failed to load product details.", "Error");
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
document.addEventListener("DOMContentLoaded", async () => {
    initializeData(); // No-op now
    initializeUserSession(); // Add this line - NEW

    // Load data asynchronously
    await Promise.allSettled([
        loadFeaturedProducts(),
        loadTestimonials(),
        loadLatestNews()
    ]);

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
            if (e.key === "Escape") {
                document.getElementById('accountModal').classList.remove('active');
                document.body.style.overflow = '';
            }
        }
    });
});

async function viewFullArticle(articleId) {
    try {
        const response = await fetch(`/.netlify/functions/news?id=${articleId}`);
        if (!response.ok) {
            throw new Error('Article not found.');
        }
        const article = await response.json();

        const modal = document.getElementById("articleModal");
        if (!modal) return;

        document.getElementById("articleTitle").textContent = article.title;
        document.getElementById("articleDate").textContent = article.date;
        document.getElementById("articleImage").src = article.image || "/placeholder.svg";
        document.getElementById("articleBody").innerHTML = `<p>${(article.fullContent || article.body || article.description).replace(/\n/g, "</p><p>")}</p>`;

        modal.classList.add("active");
        document.body.style.overflow = "hidden";
    } catch (error) {
        console.error('Error viewing article:', error);
        showCustomAlert(error.message || "Failed to load article.", "Error");
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

    // Get all users - This is no longer possible with API, so we'll call the API endpoint
    // In a real implementation, this would likely be a separate endpoint like /auth/forgot-password
    // For now, we'll simulate calling an API endpoint
    showCustomAlert("This feature requires backend implementation for sending reset emails securely.", "Feature Unavailable");
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

async function handleForgotPasswordSubmit(e) {
    e.preventDefault();
    const username = document.getElementById("forgotPasswordUsername").value.trim();
    const email = document.getElementById("forgotPasswordEmail").value.trim();

    if (!username || !email) {
        document.getElementById("forgotPasswordError").textContent = "Username and email are required.";
        return;
    }

    // Call API for password reset
    try {
        const response = await fetch('/.netlify/functions/auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'forgot_password', // Hypothetical action
                username: username,
                email: email
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Password reset request failed');
        }

        if (result.success) {
            showCustomAlert(
                `A password reset link has been sent to ${email}.`,
                "Password Reset Requested",
                "success"
            );
            closeForgotPasswordModal();
        } else {
            document.getElementById("forgotPasswordError").textContent = result.message;
        }
    } catch (error) {
        console.error('Forgot password error:', error);
        document.getElementById("forgotPasswordError").textContent = error.message || "An unexpected error occurred.";
    }
}