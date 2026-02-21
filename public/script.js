// script.js

// --- NEW: Cart Management Functions ---
// Initialize cart from sessionStorage (no user object storage)
let cart = JSON.parse(sessionStorage.getItem('cart')) || [];

// ===== Global Loader Helpers =====
function showLoader(text = "Loading, please wait...") {
    const loader = document.getElementById("globalLoader");
    if (!loader) return;
    const textEl = loader.querySelector(".loader-text");
    if (textEl) textEl.textContent = text;
    loader.classList.add("active");
    document.body.style.overflow = "hidden";
}

function hideLoader() {
    const loader = document.getElementById("globalLoader");
    if (!loader) return;
    loader.classList.remove("active");
    document.body.style.overflow = "";
}

// Add item to cart
// Add item to cart - ONLY if user is logged in
async function addToCart(productId) {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
        showCustomAlert("Please log in to add items to your cart.", "Login Required");
        showAuthModal(); // Show login modal
        return; // Stop execution if not logged in
    }

    showLoader("Adding item to cart...");
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
        const existingItemIndex = cart.findIndex(item => item.productId === productId);
        if (existingItemIndex > -1) {
            cart[existingItemIndex].quantity += 1;
        } else {
            cart.push({ productId: productId, quantity: 1 });
        }

        // Update cart in sessionStorage
        sessionStorage.setItem('cart', JSON.stringify(cart));
        // Update UI
        updateUIBasedOnUser(); // This function will now check cart state
        showCustomAlert(`${product.name} added to cart!`, "Added to Cart");

        // Sync cart to database
        syncCartToDatabase();

    } catch (error) {
        console.error("Error fetching product for cart:", error);
        showCustomAlert("Failed to add product to cart. Please try again.", "Error");
    } finally {
        hideLoader();
    }
}

// View Cart
async function viewCart() {
    if (!cart || cart.length === 0) {
        showCustomAlert("Your cart is empty.", "Cart Empty");
        return;
    }
    showLoader("Loading your cart...");
    try {
        // Create an array to hold all product data fetched from the API
        const cartItemsWithDetails = [];

        // Loop through each item in the cart and fetch its details
        for (const cartItem of cart) {
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

        let cartHTML = '<h3>Your Cart</h3><ul>';
        let total = 0;

        // Iterate through the fetched cart items
        cartItemsWithDetails.forEach(item => {
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
    } finally {
        hideLoader();
    }
}

// Update item quantity in cart
function updateCartItemQuantity(productId, newQuantity) {
    if (newQuantity < 1) {
        removeFromCart(productId);
        return;
    }
    const itemIndex = cart.findIndex(item => item.productId === productId);
    if (itemIndex > -1) {
        cart[itemIndex].quantity = newQuantity;
        // Update cart in sessionStorage
        sessionStorage.setItem('cart', JSON.stringify(cart));
        // Update UI
        updateUIBasedOnUser();
        viewCart(); // Refresh cart view
    }
    sessionStorage.setItem('cart', JSON.stringify(cart));
    syncCartToDatabase();
}

// Remove item from cart
function removeFromCart(productId) {
    // Filter out the item
    cart = cart.filter(item => item.productId !== productId);
    // Update cart in sessionStorage
    sessionStorage.setItem('cart', JSON.stringify(cart));
    // Update UI
    updateUIBasedOnUser();
    // Check if cart is now empty
    if (cart.length === 0) {
        // Close the cart modal
        closeCartModal();
        // Show a friendly message
        showCustomAlert("Your cart is now empty.", "Cart Updated");
    } else {
        // Refresh cart view if items still remain
        viewCart();
    }
    sessionStorage.setItem('cart', JSON.stringify(cart));
    syncCartToDatabase();
}


// Proceed to checkout

async function proceedToCheckout() {
    if (!cart || cart.length === 0) {
        showCustomAlert("Your cart is empty.", "Cart Empty");
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        showCustomAlert("Please log in to proceed to checkout.", "Login Required");
        showAuthModal();
        return;
    }

    showLoader("Preparing your order...");

    try {
        let total = 0;
        const orderItems = [];

        for (const cartItem of cart) {
            const productRes = await fetch(`/api/products/${cartItem.productId}`);
            if (!productRes.ok) continue;

            const product = await productRes.json();
            const price = parseFloat(product.price.replace(/[^\d.-]/g, '')) || 0;

            total += price * cartItem.quantity;

            orderItems.push({
                productId: product.id,
                quantity: cartItem.quantity,
                price: price
            });
        }

        if (orderItems.length === 0) {
            throw new Error("No valid products found.");
        }

        // Get user profile first
const userRes = await fetch('/api/user', {
    headers: { Authorization: `Bearer ${token}` }
});

if (!userRes.ok) {
    throw new Error("Failed to load user profile.");
}

const user = await userRes.json();

// Make sure address exists
if (!user.address) {
    throw new Error("Please update your delivery address before checkout.");
}

const orderData = {
    items: orderItems,
    total: total,
    deliveryAddress: user.address,
    paymentStatus: "pending",
    paymentReference: "manual"
};

        // Create order immediately as pending
        const orderRes = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(orderData)
        });

        const result = await orderRes.json();

        if (!result.success) {
            throw new Error("Failed to create order.");
        }

        // Clear cart
        cart = [];
        sessionStorage.removeItem('cart');
        updateUIBasedOnUser();
        closeCartModal();

        // Show manual payment modal
        openManualPaymentModal(result.orderId, total);

    } catch (err) {
        console.error(err);
        showCustomAlert(err.message, "Checkout Error");
    } finally {
        hideLoader();
    }
}

function openManualPaymentModal(orderId, total) {
  document.getElementById('accountModal').classList.remove('active');
  document.body.style.overflow = '';

  const modal = document.getElementById('manualPaymentModal');
  const summary = document.getElementById('manualOrderSummary');
  const bankDetailsContainer = document.getElementById('bankDetailsContainer');

  // Clear previous content
  summary.innerHTML = '';
  if (bankDetailsContainer) {
    bankDetailsContainer.innerHTML = '';
  }

  const paymentReference = `PHSOLAR-${orderId}`;

  // Render summary securely
  summary.innerHTML = `
    <p><strong>Order ID:</strong> ${escapeHTML(orderId)}</p>
    <p><strong>Total:</strong> ₦${escapeHTML(total.toLocaleString())}</p>
    <p><strong>Payment Reference:</strong> ${escapeHTML(paymentReference)}</p>
    <p><strong>Payment Instructions:</strong></p>
    <ul>
      <li>💳 Make payment to the account shown below</li>
      <li>📸 Upload your payment receipt after payment</li>
    </ul>

    <div class="receipt-upload-section">
      <label for="paymentReceipt">Upload Payment Receipt:</label>
      <input type="file" id="paymentReceipt" accept="image/*,.pdf">
      <button class="btn btn-primary" id="uploadReceiptBtn">Upload Receipt</button>
      <div id="receiptUploadStatus" class="upload-status"></div>
      <div class="receipt-upload-section">
  <label for="paymentReceipt">Upload Payment Receipt:</label>
  <input type="file" id="paymentReceipt" accept="image/*,.pdf">
  
  <div id="receiptPreviewContainer" class="receipt-preview"></div>
  
  <button class="btn btn-primary" id="uploadReceiptBtn">Upload Receipt</button>
  <div id="receiptUploadStatus" class="upload-status"></div>
</div>
    </div>
  `;

  // Fetch secure bank details
  if (bankDetailsContainer) {
    fetchBankDetails()
      .then(config => {
        bankDetailsContainer.innerHTML = `
          <h3>Bank Transfer Details</h3>
          <p><strong>Bank:</strong> ${escapeHTML(config.bankName)}</p>
          <p><strong>Account Name:</strong> ${escapeHTML(config.accountName)}</p>
          <p><strong>Account Number:</strong> ${escapeHTML(config.accountNumber)}</p>
          <p class="payment-note">
            <strong>Payment Reference:</strong> ${escapeHTML(paymentReference)}
          </p>
        `;
      })
      .catch(error => {
        console.error('Bank config error:', error);
        bankDetailsContainer.innerHTML = `
          <div class="error-banner">
            <p>Payment system unavailable. Contact support.</p>
          </div>
        `;
      });
  }

  modal.classList.add('active');
  document.body.style.overflow = "hidden";


// Live preview handler
document.getElementById('paymentReceipt').addEventListener('change', function () {
  const file = this.files[0];
  const previewContainer = document.getElementById('receiptPreviewContainer');
  previewContainer.innerHTML = '';

  if (!file) return;

  const fileType = file.type;

  // Image preview
  if (fileType.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = function (e) {
      previewContainer.innerHTML = `
        <p><strong>Image Preview:</strong></p>
        <img src="${e.target.result}" style="max-width: 100%; max-height: 300px; border-radius: 8px; margin-top: 10px;">
      `;
    };
    reader.readAsDataURL(file);
  }

  // PDF preview
  else if (fileType === 'application/pdf') {
    const fileURL = URL.createObjectURL(file);
    previewContainer.innerHTML = `
      <p><strong>PDF Preview:</strong></p>
      <iframe src="${fileURL}" width="100%" height="400px" style="margin-top: 10px; border-radius: 8px;"></iframe>
    `;
  }

  else {
    previewContainer.innerHTML = `
      <span class="error">Unsupported file type.</span>
    `;
  }
});


  // Handle receipt upload
  document.getElementById('uploadReceiptBtn').onclick = async function () {
    const fileInput = document.getElementById('paymentReceipt');
    const file = fileInput.files[0];
    const statusElement = document.getElementById('receiptUploadStatus');

    if (!file) {
      statusElement.innerHTML = '<span class="error">Please select a file to upload</span>';
      return;
    }

    try {
      statusElement.innerHTML = '<span class="info">Uploading receipt...</span>';

      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('receipt', file);

      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/upload-receipt`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        statusElement.innerHTML = `
          <span class="success">Receipt uploaded successfully!</span>
          <p>Your order will be processed once payment is confirmed by admin.</p>
        `;
        document.getElementById('uploadReceiptBtn').disabled = true;
        fileInput.disabled = true;
      } else {
        throw new Error(result.error || 'Failed to upload receipt');
      }

    } catch (error) {
      statusElement.innerHTML = `<span class="error">${escapeHTML(error.message)}</span>`;
    }
  };

  // Confirm button
  document.getElementById('confirmManualPaymentBtn').onclick = function () {
    const uploadBtn = document.getElementById('uploadReceiptBtn');
    const statusElement = document.getElementById('receiptUploadStatus');

    if (!uploadBtn.disabled) {
      statusElement.innerHTML = '<span class="error">Please upload your payment receipt before proceeding.</span>';
      return;
    }

    modal.classList.remove('active');
    document.body.style.overflow = "";
    showCustomAlert(
      "Payment receipt upload completed. Your order will be processed once payment is confirmed by admin.",
      "Receipt Uploaded"
    );
  };
}


// XSS protection utility
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, 
    m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}


// Secure bank details fetcher
async function fetchBankDetails() {
  const response = await fetch('/api/payment-config', {
    headers: {
      'Accept': 'application/json',
      'Cache-Control': 'no-cache'
    }
  });

  if (!response.ok) {
    throw new Error('Bank configuration unavailable');
  }

  const config = await response.json();

  if (!config.bankName || !config.accountName || !config.accountNumber) {
    throw new Error('Invalid bank configuration');
  }

  return config;
}




function closeManualPaymentModal() {
    const modal = document.getElementById('manualPaymentModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = "";
    }
}

// Close Cart Modal
function closeCartModal() {
    const modal = document.getElementById("cartModal");
    if (modal) {
        modal.classList.remove("active");
        document.body.style.overflow = "";
    }
}

// Requery payment status from Remita
async function requeryPayment(orderId) {
    const token = localStorage.getItem('token');
    if (!token) {
        showCustomAlert("Please log in to requery payment.", "Login Required");
        return;
    }

    showLoader("Checking payment status...");
    try {
        // Send request to your backend to requery Remita
        const response = await fetch(`/api/orders/${orderId}/requery`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to requery payment');
        }

        const result = await response.json();

        if (result.success && result.status) {
            // Show success alert
            showCustomAlert(
                `Payment successfully confirmed! Order #${orderId} is now marked as "${result.status}".`,
                "Payment Confirmed",
                "success"
            );

            // Optional: Refresh the order history to reflect updated status
            loadOrderHistory();
        } else {
            showCustomAlert(
                `Payment still pending or failed. Please try again later or contact support.`,
                "Payment Not Confirmed",
                "error"
            );
        }
    } catch (error) {
        console.error("Error requerying payment:", error);
        showCustomAlert(
            "Unable to check payment status. Please try again later.",
            "Error",
            "error"
        );
    } finally {
        hideLoader();
    }
}

// Resume payment for a specific order
async function resumePaymentForOrder(orderId) {
  const token = localStorage.getItem('token');
  if (!token) {
    showCustomAlert("Please log in to continue payment.", "Login Required");
    showAuthModal();
    return;
  }
  
  showLoader("Processing payment...");
  try {
    // Call API to initiate payment for this order
    const response = await fetch(`/api/orders/${orderId}/initiate-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to initiate payment');
    }
    
    const paymentData = await response.json();
    
    // Redirect to Remita payment page
    if (paymentData.rrr) {
      window.location.href = `https://remitademo.net/payment/${paymentData.rrr}`;
    } else {
      throw new Error('Payment reference not generated');
    }
    
  } catch (error) {
    console.error("Payment error:", error);
    showCustomAlert(error.message, "Payment Error");
  } finally {
    hideLoader();
  }
}
// Load user's order history (for account page)
async function loadOrderHistory() {
    const token = localStorage.getItem('token');
    if (!token) {
        document.getElementById('orderHistory').innerHTML = '<p>Please log in to view your order history.</p>';
        return;
    }
    showLoader("Loading your order history...");
    try {
        const response = await fetch('/api/orders', {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to load order history');
        const orders = await response.json();
        if (!orders.length) {
            document.getElementById('orderHistory').innerHTML = '<p>No orders found.</p>';
            return;
        }
        // Sort orders newest first
        orders.sort((a, b) => new Date(b.date) - new Date(a.date));
        // Collect all unique product IDs from all orders
        const allProductIds = [...new Set(orders.flatMap(order => order.items.map(item => item.productId)))];
        // Fetch all products in a single request (if supported)
        const productsResponse = await fetch(`/api/products?ids=${allProductIds.join(',')}`);
        if (!productsResponse.ok) throw new Error('Failed to load products');
        const productsData = await productsResponse.json();
        // Map products by ID for fast lookup
        const productsMap = {};
        for (const product of productsData) {
            productsMap[product.id] = product;
        }
        let historyHTML = '<h3>Your Order History</h3><div class="orders-list">';
        for (const order of orders) {
            // Correctly get delivery address
            const address = order.delivery_address || {};
            const fullAddress = `${address.street || ""}, ${address.city || ""}, ${address.state || ""} ${address.postalCode || ""}, ${address.country || "Nigeria"}`;
            // Keep order ID exactly as returned by DB
            const orderId = order.id;
            const orderDate = new Date(order.date);
            const formattedDate = orderDate.toLocaleString('en-NG', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
            });
            let itemsHTML = '';
            for (const item of order.items) {
                const product = productsMap[item.productId];
                const productName = product?.name || "Product unavailable";
                const imageUrl = product?.images?.[0] || '/placeholder.svg';
                itemsHTML += `
<div class="order-history-item">
<div class="order-item-image-wrapper">
<img src="${imageUrl}" alt="${productName}" onerror="this.src='/placeholder.svg'; this.alt='Image not available';">
</div>
<div class="order-item-details">
<div class="order-item-name">${productName}</div>
<div class="order-item-meta">
<span class="order-item-qty">Qty: ${item.quantity}</span>
<span class="order-item-price">${formatNaira(item.price * item.quantity)}</span>
</div>
</div>
</div>`;
            }
            
            // Check if receipt exists for this order
            const hasReceipt = order.receipt_url;
            const receiptStatus = hasReceipt 
                ? '<span class="receipt-status uploaded">Receipt Uploaded</span>'
                : '<span class="receipt-status pending">Receipt Pending</span>';
                
            // Build action buttons based on order status and receipt status
            let actionButtons = '';
            // Fixed code
            if (order.status === 'pending' && !hasReceipt) {
                actionButtons = `
                    <button class="btn btn-primary" onclick="reopenPaymentModal('${order.id}', ${order.total})">
                        Make Payment
                    </button>
                `;
            } else if (order.status === 'pending' && hasReceipt) {
                actionButtons = `
                    <span class="receipt-note">Receipt uploaded - awaiting admin confirmation</span>
                `;
            }
            
            historyHTML += `
<div class="order-item">
  <div class="order-header">
    <p><strong>Order #${order.id}</strong> - ${new Date(order.date).toLocaleDateString()}</p>
    <p><strong>Status:</strong> <span class="order-status ${order.status.toLowerCase()}">${order.status}</span></p>
    <p><strong>Receipt:</strong> ${receiptStatus}</p>
    ${actionButtons}
  </div>
  <p><strong>Total:</strong> <span class="order-total ${order.status.toLowerCase()}">${formatNaira(order.total)}</span></p>
  <div class="order-items-list">${itemsHTML}</div>
</div>`;
        }
        historyHTML += '</div>';
        document.getElementById('orderHistory').innerHTML = historyHTML;
    } catch (error) {
        console.error("Error loading order history:", error);
        document.getElementById('orderHistory').innerHTML = '<p>Error loading order history. Please try again.</p>';
    } finally {
        hideLoader();
    }
}
function openReceiptUploadModal(orderId, total) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('receiptUploadModal');
    if (!modal) {
        const modalHTML = `
            <div id="receiptUploadModal" class="modal">
                <div class="modal-content">
                    <span class="close">&times;</span>
                    <h2>Upload Payment Receipt</h2>
                    <p><strong>Order ID:</strong> ${orderId}</p>
                    <p><strong>Amount:</strong> ₦${total.toLocaleString()}</p>
                    
                    <div class="receipt-upload-section">
                        <label for="paymentReceipt">Upload Payment Receipt (JPG, PNG, or PDF):</label>
                        <input type="file" id="paymentReceipt" accept="image/*,.pdf">
                        <button class="btn btn-primary" id="uploadReceiptBtn">Upload Receipt</button>
                        <div id="receiptUploadStatus" class="upload-status"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Add close functionality
        document.querySelector('#receiptUploadModal .close').onclick = function() {
            document.getElementById('receiptUploadModal').remove();
        };
        
        // Close modal when clicking outside
        document.getElementById('receiptUploadModal').onclick = function(e) {
            if (e.target === this) {
                this.remove();
            }
        };
    }
    
    modal = document.getElementById('receiptUploadModal');
    modal.style.display = 'block';
    
    // Handle upload
    document.getElementById('uploadReceiptBtn').onclick = async function() {
        const fileInput = document.getElementById('paymentReceipt');
        const file = fileInput.files[0];
        const statusElement = document.getElementById('receiptUploadStatus');
        
        if (!file) {
            statusElement.innerHTML = '<span class="error">Please select a file to upload</span>';
            return;
        }
        
        try {
            statusElement.innerHTML = '<span class="info">Uploading receipt...</span>';
            
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('receipt', file);
            
            const response = await fetch(`/api/orders/${orderId}/upload-receipt`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                statusElement.innerHTML = `
                    <span class="success">Receipt uploaded successfully!</span>
                    <p>Your order will be processed once payment is confirmed by admin.</p>
                `;
                document.getElementById('uploadReceiptBtn').disabled = true;
                fileInput.disabled = true;
                
                // Refresh order history after 2 seconds
                setTimeout(loadOrderHistory, 2000);
            } else {
                throw new Error(result.error || 'Failed to upload receipt');
            }
        } catch (error) {
            statusElement.innerHTML = `<span class="error">${error.message}</span>`;
        }
    };
}

// Reopen the payment modal for existing orders
function reopenPaymentModal(orderId, total) {
    // Close any existing modals
    closeCartModal();
    closeManualPaymentModal();
    
    // Reopen the manual payment modal
    openManualPaymentModal(orderId, total);
    
    // Only update confirm button text
    const confirmBtn = document.getElementById('confirmManualPaymentBtn');
    if (confirmBtn) {
        confirmBtn.textContent = "I Have Paid";
    }
}
// Update UI elements based on user status and cart
function updateUIBasedOnUser() {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const accountLink = document.getElementById('accountLink');
    const cartCountElement = document.getElementById('cartCount');

    const isLoggedIn = !!localStorage.getItem('token');
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    if (isLoggedIn) {
        // User is logged in
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) {
            logoutBtn.style.display = 'inline-block';
            logoutBtn.onclick = handleLogout; // Ensure event handler is attached
        }
        if (accountLink) accountLink.style.display = 'inline-block';
        if (cartCountElement) cartCountElement.textContent = cartCount;
    } else {
        // User is not logged in
        if (loginBtn) loginBtn.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (accountLink) accountLink.style.display = 'none';
        if (cartCountElement) cartCountElement.textContent = '0';
    }
}


function handleLogout() {
    showCustomConfirm(
        "Are you sure you want to log out? You will need to log in again to access your account and cart.",
        "Confirm Logout",
        () => {
            // Clear authentication tokens and cart
            localStorage.removeItem('token');
            sessionStorage.removeItem('currentUser');
            sessionStorage.removeItem('cart');

            // Reset cart variable
            cart = [];

            // Update UI
            updateUIBasedOnUser();
            showCustomAlert("You have been logged out.", "Logged Out");
        }
    );
}



// Show the login/signup modal - ALWAYS show Login form first
function showAuthModal() {
    const modal = document.getElementById("authModal");
    if (modal) {
        // Reset form to Login state
        document.getElementById("authFormTitle").textContent = "Login";
        document.getElementById("authForm").dataset.mode = "login";
        document.getElementById("authSubmitBtn").textContent = "Login";
        document.getElementById("authToggleText").innerHTML = "Don't have an account? <a href='#' id='signupFormSwitch'>Sign Up</a>";
        document.getElementById("signupExtraFields").style.display = "none";
        
        // Clear form inputs and errors
        document.getElementById("authForm").reset();
        document.getElementById("authError").textContent = "";
        
        // Clear validation messages and spinners
        hideValidationMessages();
        const spinners = document.querySelectorAll('.field-spinner');
        spinners.forEach(spinner => spinner.remove());
        
        // Reattach event listeners for switching
        const signupSwitch = document.getElementById("signupFormSwitch");
        const loginSwitch = document.getElementById("loginFormSwitch");
        if (signupSwitch) {
            signupSwitch.removeEventListener("click", switchToSignup);
            signupSwitch.addEventListener("click", switchToSignup);
        }
        if (loginSwitch) {
            loginSwitch.removeEventListener("click", switchToLogin);
            loginSwitch.addEventListener("click", switchToLogin);
        }
        
        // --- REAL-TIME VALIDATION SETUP ---
        const usernameInput = document.getElementById("username");
        const emailInput = document.getElementById("email");
        const phoneInput = document.getElementById("phone");
        
        // Remove existing listeners (if any)
        usernameInput?.removeEventListener("input", validateFieldOnInput);
        emailInput?.removeEventListener("input", validateFieldOnInput);
        phoneInput?.removeEventListener("input", validateFieldOnInput);
        
        // Add new listeners
        if (usernameInput) {
            usernameInput.addEventListener("input", () => validateFieldOnInput("username"));
        }
        if (emailInput) {
            emailInput.addEventListener("input", () => validateFieldOnInput("email"));
        }
        if (phoneInput) {
            phoneInput.addEventListener("input", () => validateFieldOnInput("phone"));
        }
        
        // Hide all validation messages initially
        hideValidationMessages();
        modal.classList.add("active");
        document.body.style.overflow = "hidden";
    }
}

// ======================
// GLOBAL FUNCTIONS FOR FORM SWITCHING
// ======================

// Switch to Signup Form
// Switch to Signup Form
function switchToSignup(e) {
    e.preventDefault();
    document.getElementById("authFormTitle").textContent = "Sign Up";
    document.getElementById("authForm").dataset.mode = "signup";
    document.getElementById("authSubmitBtn").textContent = "Sign Up";
    document.getElementById("authToggleText").innerHTML = "Already have an account? <a href='#' id='loginFormSwitch'>Login</a>";
    document.getElementById("signupExtraFields").style.display = "block";
    
    // Clear all form inputs
    document.getElementById("authForm").reset();
    
    // Clear any existing error messages
    document.getElementById("authError").textContent = "";
    
    // Clear real-time validation messages
    hideValidationMessages();
    
    // Remove any spinners that might be present
    const spinners = document.querySelectorAll('.field-spinner');
    spinners.forEach(spinner => spinner.remove());
    
    // Reattach event listener for the new login link
    const loginSwitch = document.getElementById("loginFormSwitch");
    if (loginSwitch) {
        loginSwitch.removeEventListener("click", switchToLogin);
        loginSwitch.addEventListener("click", switchToLogin);
    }
}

// Switch to Login Form
function switchToLogin(e) {
    e.preventDefault();
    document.getElementById("authFormTitle").textContent = "Login";
    document.getElementById("authForm").dataset.mode = "login";
    document.getElementById("authSubmitBtn").textContent = "Login";
    document.getElementById("authToggleText").innerHTML = "Don't have an account? <a href='#' id='signupFormSwitch'>Sign Up</a>";
    document.getElementById("signupExtraFields").style.display = "none";
    
    // Clear all form inputs
    document.getElementById("authForm").reset();
    
    // Clear any existing error messages
    document.getElementById("authError").textContent = "";
    
    // Clear real-time validation messages
    hideValidationMessages();
    
    // Remove any spinners that might be present
    const spinners = document.querySelectorAll('.field-spinner');
    spinners.forEach(spinner => spinner.remove());
    
    // Reattach event listener for the new signup link
    const signupSwitch = document.getElementById("signupFormSwitch");
    if (signupSwitch) {
        signupSwitch.removeEventListener("click", switchToSignup);
        signupSwitch.addEventListener("click", switchToSignup);
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
// ======================
// HANDLE LOGIN OR SIGNUP
// ======================
async function handleAuthSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const authError = document.getElementById("authError");
    authError.textContent = "";

    const username = form.username.value.trim();
    const password = form.password.value;

    // ======================
    // LIVE VALIDATION CHECKS (REAL-TIME FEEDBACK)
    // ======================
    const usernameMsg = document.getElementById("usernameValidationMsg");
    const emailMsg = document.getElementById("emailValidationMsg");
    const phoneMsg = document.getElementById("phoneValidationMsg");

    if (usernameMsg?.classList.contains("error")) {
        authError.textContent = "Please fix the username.";
        return;
    }
    if (emailMsg?.classList.contains("error")) {
        authError.textContent = "Please fix the email.";
        return;
    }
    if (phoneMsg?.classList.contains("error")) {
        authError.textContent = "Please fix the phone number.";
        return;
    }

    if (!username || !password) {
        authError.textContent = "Username and password are required.";
        return;
    }

    const isLogin = form.dataset.mode === "login";

    // ======================
    // DECLARE SIGNUP FIELDS
    // ======================
    let email = "";
    let phone = "";
    let street = "";
    let city = "";
    let state = "";
    let postalCode = "";

    // ======================
    // SIGNUP VALIDATION
    // ======================
    if (!isLogin) {
        email = document.getElementById("email").value.trim();
        phone = document.getElementById("phone").value.trim();
        street = document.getElementById("street").value.trim();
        city = document.getElementById("city").value.trim();
        state = document.getElementById("state").value.trim();
        postalCode = document.getElementById("postalCode").value.trim();

        if (!email || !phone || !street || !city || !state) {
            authError.textContent = "Please fill in all required fields.";
            return;
        }

        // Email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            authError.textContent = "Please enter a valid email address.";
            return;
        }

        // Nigerian phone number
        const phoneRegex = /^(0\d{10}|234\d{10})$/;
        const cleanPhone = phone.replace(/\D/g, "");
        if (!phoneRegex.test(cleanPhone)) {
            authError.textContent = "Please enter a valid Nigerian phone number (e.g. 08012345678).";
            return;
        }
        phone = cleanPhone;

        // ======================
        // CHECK AVAILABILITY (GLOBAL LOADER ONLY)
        // ======================
        showLoader("Checking availability...");

        try {
            const checkResponse = await fetch("/api/auth/check", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, email, phone })
            });

            const checkResult = await checkResponse.json();

            if (!checkResponse.ok) {
                throw new Error("Availability check failed");
            }

            if (checkResult.exists) {
                let msg = "The following already exist:\n";
                if (checkResult.usernameExists) msg += "Username\n";
                if (checkResult.emailExists) msg += "Email\n";
                if (checkResult.phoneExists) msg += "Phone number\n";
                authError.textContent = msg;
                hideLoader();
                return;
            }
        } catch (err) {
            console.error(err);
            authError.textContent = "Network error. Please try again.";
            hideLoader();
            return;
        }
    }

    // ======================
    // REQUEST PAYLOAD
    // ======================
    let requestData = {
        username,
        password,
        action: isLogin ? "login" : "signup"
    };

    if (!isLogin) {
        requestData.email = email;
        requestData.phone = phone;
        requestData.address = {
            street,
            city,
            state,
            postalCode,
            country: "Nigeria"
        };
    }

    // ======================
    // AUTH REQUEST
    // ======================
    showLoader(isLogin ? "Logging in..." : "Creating your account...");

    try {
        const response = await fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestData)
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            authError.textContent = result.error || "Authentication failed.";
            return;
        }

        // ======================
        // LOGIN SUCCESS
        // ======================
        if (isLogin) {
            localStorage.setItem("token", result.token);
            localStorage.setItem("currentUser", JSON.stringify(result.user));

            updateUIBasedOnUser();
            closeAuthModal();

            showCustomAlert(
                `Welcome back, ${result.user.username}!`,
                "Logged In",
                "success"
            );

            // ✅ Update last_login
            try {
                const token = localStorage.getItem('token');
                if (token) {
                    const response = await fetch('/api/user/last-login', {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    if (!response.ok) {
                        console.warn('Failed to update last_login:', response.statusText);
                    } else {
                        console.log('Successfully updated last_login for user.');
                    }
                }
            } catch (err) {
                console.error('Error updating last_login:', err);
            }

            await loadCartFromDatabase();
            return;
        }

        // ======================
        // SIGNUP SUCCESS → AUTO LOGIN
        // ======================
        showCustomAlert(
            `Welcome, ${result.user.username}! Your account has been created.`,
            "Account Created",
            "success"
        );

        const loginResponse = await fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username,
                password,
                action: "login"
            })
        });

        const loginResult = await loginResponse.json();

        if (!loginResponse.ok || !loginResult.success) {
            authError.textContent = "Account created, but auto login failed. Please log in.";
            return;
        }

        localStorage.setItem("token", loginResult.token);
        localStorage.setItem("currentUser", JSON.stringify(loginResult.user));

        updateUIBasedOnUser();
        closeAuthModal();
        await loadCartFromDatabase();

    } catch (error) {
        console.error("Auth error:", error);
        authError.textContent = "Network error. Please try again.";
    } finally {
        hideLoader();
    }
}


// Add event listener for Forgot Password Form
const forgotPasswordForm = document.getElementById("forgotPasswordForm");
if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener("submit", handleForgotPasswordSubmit);
}

// Function to handle forgot password
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

    const modalContent = document.querySelector(".forgot-modal");
    const form = document.getElementById("forgotPasswordForm");

    // Grab the reset password heading (any level)
    const heading = modalContent.querySelector("h1, h2, h3, h4");

    // Remove any previous message completely
    modalContent.querySelectorAll("#forgotPasswordSuccess").forEach(el => el.remove());

    // Create ONE message container and force it to the top
    const msgBox = document.createElement("div");
    msgBox.id = "forgotPasswordSuccess";
    modalContent.insertBefore(msgBox, modalContent.firstChild);

    const showMessage = (type, title, message) => {
        let icon = "ℹ️";
        if (type === "success") icon = "✅";
        if (type === "error") icon = "❌";
        if (type === "warning") icon = "⚠️";

        // Hide heading and form to avoid stacking
        if (heading) heading.style.display = "none";
        if (form) form.style.display = "none";

        msgBox.innerHTML = `
          <div class="success-box ${type}">
              <div class="success-icon">${icon}</div>
              <h4>${title}</h4>
              <p>${message}</p>
              <button class="success-btn" onclick="closeForgotPasswordModal()">
                OK
              </button>
          </div>
        `;
    };

    if (!username || !email) {
        showMessage(
            "error",
            "Missing Information",
            "Username and email are required."
        );
        return;
    }

    // Client-side rate limit check (UX only)
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const lastResetKey = `lastPasswordReset_${username}_${email}`;
    const lastResetTime = localStorage.getItem(lastResetKey);

    if (lastResetTime && now - parseInt(lastResetTime) < thirtyDaysMs) {
        const nextResetDate = new Date(
            parseInt(lastResetTime) + thirtyDaysMs
        ).toLocaleDateString();

        showMessage(
            "warning",
            "Reset Limit Reached",
            `You can only reset your password once per month.<br>
             Next allowed: <strong>${nextResetDate}</strong>.`
        );
        return;
    }

    showLoader("Sending password reset link...");

    try {
        const response = await fetch("/api/forgot-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email })
        });

        const result = await response.json();

        if (!response.ok) {
            showMessage(
                "error",
                "Request Failed",
                result.error || "An unexpected error occurred."
            );
            return;
        }

        if (result.success) {
            showMessage(
                "success",
                "Password Reset Sent",
                `A password reset link has been sent to<br>
                 <strong>${email}</strong>`
            );

            localStorage.setItem(lastResetKey, Date.now().toString());
        } else {
            showMessage(
                "error",
                "Reset Failed",
                result.error || "Password reset failed."
            );
        }

    } catch (error) {
        console.error("Network error:", error);
        showMessage(
            "error",
            "Network Error",
            "Please check your internet connection and try again."
        );
    } finally {
        hideLoader();
    }
}


// --- END NEW: Custom Modal Functions for Login/Signup ---

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
    showLoader("Loading product details...");
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
        })
        .finally(() => {
            hideLoader();
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

    const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      });
    },
    {
      threshold: 0.1, // Trigger when 10% of element is visible
    }
  );

  // Observe all elements with class 'slide-in'
  document.querySelectorAll(".slide-in").forEach((el) => {
    observer.observe(el);
  });

    // Initialize cart from sessionStorage
    cart = JSON.parse(sessionStorage.getItem('cart')) || [];

    // Initialize mobile menu
    initMobileMenu();

    // Load featured products
    loadFeaturedProducts();

    // Load testimonials
    loadTestimonials();

    // Load latest news
    loadLatestNews();

    // Initialize UI based on current auth state
    updateUIBasedOnUser();

    // Add event listener for Edit Address Form (if it exists)
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

    async function loadAccountDetails() {
        const token = localStorage.getItem('token');
        if (!token) return;
        showLoader("Loading account details...");
        try {
            const response = await fetch('/api/user', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load user profile');
            }

            const user = await response.json();

            /* =========================
            CONTACT INFORMATION
            ========================== */
            const emailEl = document.getElementById('userEmail');
            const phoneEl = document.getElementById('userPhone');
            if (emailEl) emailEl.textContent = user.email || '—';
            if (phoneEl) phoneEl.textContent = user.phone || '—';

            /* =========================
            ADDRESS (EDIT FORM INPUTS)
            ========================== */
            const streetInput = document.getElementById('editStreet');
            const cityInput = document.getElementById('editCity');
            const stateInput = document.getElementById('editState');
            const postalInput = document.getElementById('editPostalCode');
            if (streetInput) streetInput.value = user.address?.street || '';
            if (cityInput) cityInput.value = user.address?.city || '';
            if (stateInput) stateInput.value = user.address?.state || '';
            if (postalInput) postalInput.value = user.address?.postalCode || '';
        } catch (error) {
            console.error('Error loading account details:', error);
            showCustomAlert('Failed to load account details.', 'Error');
        } finally {
            hideLoader();
        }
    }

    const accountLink = document.getElementById('accountLink');
    if (accountLink) {
        accountLink.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default link behavior
            // Load order history
            loadAccountDetails();   // ✅ ADD THIS
            loadOrderHistory();

            // Show account modal if it exists
            const accountModal = document.getElementById("accountModal");
            if (accountModal) {
                accountModal.classList.add("active");
                document.body.style.overflow = "hidden";
            }
        });
    }

    // NEW: Add event listener for Account Modal Close Button
    const accountModalCloseBtn = document.getElementById("accountModal");
    if (accountModalCloseBtn) {
        accountModalCloseBtn.addEventListener('click', (e) => {
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
        // Add key listener for cart modal close
        if (document.getElementById("cartModal")?.classList.contains("active")) {
            if (e.key === "Escape") closeCartModal();
        }
        // Add key listener for account modal close
        if (document.getElementById("accountModal")?.classList.contains("active")) {
            if (e.key === "Escape") {
                document.getElementById('accountModal').classList.remove('active');
                document.body.style.overflow = '';
            }
        }
    });
});

// Load and display featured products
async function loadFeaturedProducts() {
    const featuredContainer = document.getElementById("featuredProducts");
    if (!featuredContainer) return;
    showLoader("Loading products...");
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
    } finally {
        hideLoader();
    }
}

// Load and display testimonials
async function loadTestimonials() {
    const testimonialContainer = document.getElementById("testimonialsGrid");
    if (!testimonialContainer) return;
    showLoader("Loading testimonials...");
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
    } finally {
        hideLoader();
    }
}

// Load and display latest news
async function loadLatestNews() {
    const newsContainer = document.getElementById("latestNews");
    if (!newsContainer) return;
    showLoader("Loading news...");
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
<a href="news" class="news-link" onclick="viewFullArticle(${article.id});">Read More →</a>
</div>
</div>
`,
            )
            .join("");
    } catch (error) {
        console.error("Error loading latest news:", error);
        newsContainer.innerHTML = '<p class="error-message">Failed to load news.</p>';
    } finally {
        hideLoader();
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

// Format a date string
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

// Global variables for search and sort
let allProducts = []; // Will be populated from API
let filteredProducts = []; // Will be populated from API
let currentProductInModal = null;
let currentImageIndex = 0;

// Function to handle updating user's address
function handleUpdateAddress(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
        showCustomAlert("Please log in to update your address.", "Login Required");
        return;
    }

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

    showLoader("Updating your address...");
    // Send update to backend
    fetch('/api/user/address', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
            address: {
                street: street,
                city: city,
                state: state,
                postalCode: postalCode,
                country: "Nigeria"
            }
        })
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to update address');
            }
            return response.json();
        })
        .then(data => {
            // Success message
            showCustomAlert("Your delivery address has been updated successfully.", "Address Updated", "success");
        })
        .catch(error => {
            console.error("Error updating address:", error);
            showCustomAlert("Failed to update address. Please try again.", "Error");
        })
        .finally(() => {
            hideLoader();
        });
}

// View full article
function viewFullArticle(articleId) {
    showLoader("Loading article...");
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
            document.getElementById("articleImage").src = article.image || "/public/placeholder.svg";
            document.getElementById("articleBody").innerHTML = `<p>${(article.fullContent || article.body || article.description).replace(/ /g, "</p><p>")}</p>`;

            modal.classList.add("active");
            document.body.style.overflow = "hidden";
        })
        .catch(error => {
            console.error("Error fetching article:", error);
            // Optionally show an alert or handle the error differently
        })
        .finally(() => {
            hideLoader();
        });
}

function closeArticleModal() {
    const modal = document.getElementById("articleModal");
    if (modal) {
        modal.classList.remove("active");
        document.body.style.overflow = "";
    }
}

// Add event listeners for payment simulation buttons (removed as per requirements)
// The payment simulation functions have been completely removed as requested

// Initialize products from API
function initializeData() {
    // Data is loaded from the database via API calls
    // No need to populate localStorage here
}

// Display products (assuming this function exists elsewhere in your code)
function displayProducts(products) {
    // Implementation depends on your existing code structure
    // This function should render products to the DOM
}

async function syncCartToDatabase() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
        await fetch('/api/cart', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ cart })
        });
    } catch (error) {
        console.error("Failed to sync cart:", error);
    }
}

async function loadCartFromDatabase() {
    const token = localStorage.getItem('token');
    if (!token) return;
    showLoader("Loading your cart...");
    try {
        const response = await fetch('/api/cart', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        if (!response.ok) return;
        const savedCart = await response.json();
        cart = savedCart;
        sessionStorage.setItem('cart', JSON.stringify(cart));
        updateUIBasedOnUser();
    } catch (error) {
        console.error("Failed to load cart from DB:", error);
    } finally {
        hideLoader();
    }
}


async function mergeGuestCartToDatabase() {
    const guestCart = JSON.parse(sessionStorage.getItem("cart")) || [];
    const token = localStorage.getItem("token");

    if (!token || guestCart.length === 0) return;

    for (const item of guestCart) {
        await fetch("/api/cart/add", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                product_id: item.product_id,
                quantity: item.quantity
            })
        });
    }

    // Clear guest cart after merge
    sessionStorage.removeItem("cart");
    cart = [];

    updateUIBasedOnUser();
}


// Global variable to store debounced timeout
let validationTimeout;
// Validate field on input (debounced)
async function validateFieldOnInput(fieldType) {
   
    const form = document.getElementById("authForm");
    const mode = form.dataset.mode;

    // Only validate during signup
    if (mode !== "signup") return;

    const usernameInput = document.getElementById("username");
    const emailInput = document.getElementById("email");
    const phoneInput = document.getElementById("phone");

    const username = usernameInput?.value.trim() || "";
    const email = emailInput?.value.trim() || "";
    const phone = phoneInput?.value.trim() || "";

    // Don't validate empty fields
    if ((fieldType === "username" && !username) ||
        (fieldType === "email" && !email) ||
        (fieldType === "phone" && !phone)) {
        hideValidationMessage(fieldType);
        return;
    }

    // Debounce: Wait 500ms before sending request
    clearTimeout(validationTimeout);
    validationTimeout = setTimeout(async () => {
        showLoader("Checking availability...");

        try {
            const response = await fetch("/api/auth/check", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, email, phone })
            });

            const result = await response.json();

            if (!response.ok || !result) {
                throw new Error("Server error while checking availability.");
            }

            // Update UI based on results
            if (result.usernameexists && fieldType === "username") {
            showValidationMessage("username", "Username is already taken.", "error");
            } else if (!result.usernameexists && fieldType === "username" && username) {
                showValidationMessage("username", "Username available!", "success");
            }

            if (result.emailexists && fieldType === "email") {
                showValidationMessage("email", "Email is already registered.", "error");
            } else if (!result.emailexists && fieldType === "email" && email) {
                showValidationMessage("email", "Email available!", "success");
            }

            if (result.phoneexists && fieldType === "phone") {
                showValidationMessage("phone", "Phone number is already in use.", "error");
            } else if (!result.phoneexists && fieldType === "phone" && phone) {
                showValidationMessage("phone", "Phone number available!", "success");
            }

        } catch (error) {
            console.error("Real-time validation error:", error);
            showValidationMessage(fieldType, "Network error. Please try again.", "error");
        } finally {
            hideLoader();
        }

    }, 1000); // 500ms debounce(1 second)
}

// Show validation message under a field
function showValidationMessage(fieldType, message, type = "error") {
    const field = document.getElementById(fieldType);
    let messageEl = document.getElementById(`${fieldType}ValidationMsg`);

    if (!messageEl) {
        messageEl = document.createElement("div");
        messageEl.id = `${fieldType}ValidationMsg`;
        messageEl.className = `validation-message ${type}`;
        field.parentNode.insertBefore(messageEl, field.nextSibling);
    }

    messageEl.textContent = message;
    messageEl.className = `validation-message ${type}`;
}

// Hide validation message for a specific field
function hideValidationMessage(fieldType) {
    const messageEl = document.getElementById(`${fieldType}ValidationMsg`);
    if (messageEl) {
        messageEl.remove();
    }
}

// Hide all validation messages
function hideValidationMessages() {
    ["username", "email", "phone"].forEach(fieldType => {
        hideValidationMessage(fieldType);
    });
}
// In your modal open function (e.g., when showing #accountModal):
document.body.style.overflow = 'hidden';
document.body.style.paddingRight = window.innerWidth - document.documentElement.clientWidth + 'px'; // compensate for scrollbar loss

// On close:
document.body.style.overflow = '';
document.body.style.paddingRight = '';