// admin.js
// Authentication state
let isAuthenticated = false;
let currentEditingProductId = null;
let productImages = [];
let testimonialImage = "";
let newsImage = "";
let currentEditingUserId = null;
let cachedMessages = []; 

let existingImages = []; // Already uploaded Cloudinary URLs


let currentPage = 1;
const usersPerPage = 10;
let totalUsers = 0;
let allUsers = []; // Store all users for pagination
// ===== Global Loader Helpers =====
function showLoader(text = "Loading, please wait...") {
    const loader = document.getElementById("globalLoader");
    if (!loader) return;
    const textEl = loader.querySelector(".loader-text");
    if (textEl) textEl.textContent = text;
    loader.classList.add("active");
    document.body.style.overflow = "hidden";
}
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}
function hideLoader() {
    const loader = document.getElementById("globalLoader");
    if (!loader) return;
    loader.classList.remove("active");
    document.body.style.overflow = "";
}

function adminAuthHeaders() {
    const token = sessionStorage.getItem("adminToken");
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    };
}

// Custom Alert Modal
function showAdminAlert(message, title = "Alert") {
    return new Promise((resolve) => {
        const modal = document.getElementById("adminAlertModal");
        const titleEl = document.getElementById("adminAlertTitle");
        const messageEl = document.getElementById("adminAlertMessage");
        const okBtn = document.getElementById("adminAlertOkBtn");
        titleEl.textContent = title;
        messageEl.textContent = message;
        modal.classList.add("active");
        const handleOk = () => {
            modal.classList.remove("active");
            okBtn.removeEventListener("click", handleOk);
            resolve(true);
        };
        okBtn.addEventListener("click", handleOk);
        // Close on overlay click
        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                handleOk();
            }
        });
        // Close on Escape key
        const handleEscape = (e) => {
            if (e.key === "Escape") {
                handleOk();
                document.removeEventListener("keydown", handleEscape);
            }
        };
        document.addEventListener("keydown", handleEscape);
    });
}

// Custom Confirm Modal
function showAdminConfirm(message, title = "Confirm Action") {
    return new Promise((resolve) => {
        const modal = document.getElementById("adminConfirmModal");
        const titleEl = document.getElementById("adminConfirmTitle");
        const messageEl = document.getElementById("adminConfirmMessage");
        const okBtn = document.getElementById("adminConfirmOkBtn");
        const cancelBtn = document.getElementById("adminConfirmCancelBtn");
        titleEl.textContent = title;
        messageEl.textContent = message;
        modal.classList.add("active");
        const handleOk = () => {
            modal.classList.remove("active");
            cleanup();
            resolve(true);
        };
        const handleCancel = () => {
            modal.classList.remove("active");
            cleanup();
            resolve(false);
        };
        const cleanup = () => {
            okBtn.removeEventListener("click", handleOk);
            cancelBtn.removeEventListener("click", handleCancel);
        };
        okBtn.addEventListener("click", handleOk);
        cancelBtn.addEventListener("click", handleCancel);
        // Close on overlay click (counts as cancel)
        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                handleCancel();
            }
        });
        // Close on Escape key (counts as cancel)
        const handleEscape = (e) => {
            if (e.key === "Escape") {
                handleCancel();
                document.removeEventListener("keydown", handleEscape);
            }
        };
        document.addEventListener("keydown", handleEscape);
    });
}

// Check authentication on page load
function checkAuth() {
    const authStatus = sessionStorage.getItem("adminAuth");
    if (authStatus === "true") {
        isAuthenticated = true;
        showDashboard();
    } else {
        showLogin();
    }
}

// Show login page
function showLogin() {
    document.getElementById("loginContainer").style.display = "flex";
    document.getElementById("dashboardContainer").style.display = "none";
}

// Show dashboard
function showDashboard() {
    document.getElementById("loginContainer").style.display = "none";
    document.getElementById("dashboardContainer").style.display = "flex";
    loadProducts(); // Load products by default when dashboard opens
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const errorMessage = document.getElementById("errorMessage");

    try {
        showLoader("Logging in..."); // Show loader during login
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username,
                password: password
            }),
        });
        const result = await response.json();
        if (result.success) {
            isAuthenticated = true;
            sessionStorage.setItem("adminAuth", "true");
            sessionStorage.setItem("adminToken", result.token);
            showDashboard();
            errorMessage.textContent = "";
        } else {
            // Show the error message returned by the server
            errorMessage.textContent = result.error || "Invalid username or password";
        }
    } catch (error) {
        console.error("Login error:", error);
        errorMessage.textContent = "An error occurred. Please try again.";
    } finally {
        hideLoader(); // Always hide loader, even if there's an error
    }
}

// Handle logout
async function handleLogout() {
    const confirmed = await showAdminConfirm("Are you sure you want to logout?", "Confirm Logout");
    if (confirmed) {
        isAuthenticated = false;
        sessionStorage.removeItem("adminAuth"); // 👈 This is correct
        showLogin();
    }
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



// Load all products (active and inactive) for admin panel
async function loadProducts() {
    try {
        showLoader("Loading products...");
        
        // Try to fetch all products
        const response = await fetch('/api/products/all');
        
        // Log the response status to help debug
        console.log("Response status:", response.status);
        console.log("Response ok:", response.ok);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error("API Error Response:", errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        
        const products = await response.json();
        console.log("Raw API Response:", products);
        
        const tableBody = document.getElementById("productsTableBody");
        
        if (!tableBody) {
            console.error("Element with ID 'productsTableBody' not found!");
            return;
        }
        
        if (products.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" class="empty-state"><p>No products found. Add your first product!</p></td></tr>`;
            return;
        }
        
        // Process each product and build HTML with status indicators
        const productRows = products.map((product, index) => {
            console.log(`Processing product ${index}:`, product);
            
            // Sanitize the name and description to handle emojis and special characters
            const sanitizeText = (text) => {
                if (!text) return '';
                return String(text)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#x27;');
            };
            
            const productName = sanitizeText(product.name);
            const productDescription = sanitizeText(product.description);
            const firstImage = product.images ? 
                (Array.isArray(product.images) ? product.images[0] : product.images) : 
                (product.image || '/uploads/default-product.jpg');
            
            // Determine if product is active and set appropriate status and actions
            const isActive = product.active !== false; // Handle NULL values
            const statusText = isActive ? 'Active' : 'Inactive';
            const statusClass = isActive ? 'status-active' : 'status-inactive';
            const statusBadge = `<span class="status-badge ${statusClass}">${statusText}</span>`;
            
            return `<tr>
                <td><img src="${firstImage}" alt="${productName}" class="product-image-thumb"></td>
                <td>${productName}</td>
                <td>${formatNaira(product.price)}</td>
                <td>${productDescription.substring(0, 60)}...</td>
                <td>
                    ${statusBadge}
                </td>
                <td>
                    <div class="product-actions">
                        <button class="btn-edit" onclick="editProduct(${product.id})">Edit</button>
                        ${isActive 
                            ? `<button class="btn-delete" onclick="deleteProduct(${product.id})">Deactivate</button>` 
                            : `<button class="btn-reactivate" onclick="reactivateProduct(${product.id})">Reactivate</button>`
                        }
                    </div>
                </td>
            </tr>`;
        });
        
        console.log("Generated HTML rows:", productRows);
        tableBody.innerHTML = productRows.join("");
        
    } catch (error) {
        console.error("Error loading products:", error);
        const tableBody = document.getElementById("productsTableBody");
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="6" class="error-message"><p>Error loading products: ${error.message}</p></td></tr>`;
        } else {
            console.error("Could not display error message - table element not found");
        }
    } finally {
        hideLoader();
    }
}

// Function to reactivate products (needed for admin panel)
async function reactivateProduct(productId) {
    const confirmed = await showAdminConfirm("Are you sure you want to reactivate this product?", "Reactivate Product");
    if (confirmed) {
        try {
            showLoader("Reactivating product...");
            const response = await fetch(`/api/products/${productId}/reactivate`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            if (result.success) {
                loadProducts(); // Reload the product list
                await showAdminAlert("Product reactivated successfully!", "Success");
            } else {
                throw new Error(result.error || "Failed to reactivate product.");
            }
        } catch (error) {
            console.error("Error reactivating product:", error);
            await showAdminAlert(`Error reactivating product: ${error.message}`, "Error");
        } finally {
            hideLoader();
        }
    }
}
// Show product form
function showProductForm(isEdit = false) {
    const formContainer = document.getElementById("productFormContainer");
    const formTitle = document.getElementById("formTitle");
    formTitle.textContent = isEdit ? "Edit Product" : "Add New Product";
    formContainer.style.display = "block";
    if (!isEdit) {
        document.getElementById("productForm").reset();
        document.getElementById("productId").value = "";
        currentEditingProductId = null;
        productImages = [];
        updateImagePreview();
        clearImageUrlInputs();
    }
}

// Hide product form
function hideProductForm() {
    document.getElementById("productFormContainer").style.display = "none";
    document.getElementById("productForm").reset();
    currentEditingProductId = null;
    productImages = [];
    updateImagePreview();
    clearImageUrlInputs();
}

function handleImageSelect(e) {
    const files = e.target.files;
    if (files.length + productImages.length > 5) {
        showAdminAlert("You can only upload up to 5 images per product.", "Upload Limit");
        return;
    }
    Array.from(files).forEach((file) => {
        if (file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onload = (event) => {
                productImages.push(event.target.result);
                updateImagePreview();
            };
            reader.readAsDataURL(file);
        }
    });
    // Reset file input
    e.target.value = "";
}


// Function to update preview container
function updateImagePreview() {
  const container = document.getElementById("imagePreviewContainer");
  if (!container) {
    console.error("Image preview container element not found.");
    return;
  }

  container.innerHTML = ''; // Clear previous previews

  // --- Display Existing Cloudinary Images (URLs) ---
  existingImages.forEach((url, index) => {
    // Validate URL format if necessary (optional)
    if (typeof url === 'string' && url.trim() !== '') {
      const imgWrapper = document.createElement('div');
      // Apply the exact class name from your CSS
      imgWrapper.classList.add('image-preview-item');
      imgWrapper.innerHTML = `
        <img src="${url}" alt="Existing product image ${index + 1}" class="existing-image-preview">
        <!-- Use the exact class name for the remove button from your CSS -->
        <button type="button" class="image-preview-remove" onclick="removeExistingImage(${index})">×</button>
      `;
      container.appendChild(imgWrapper);
    }
  });

  // --- Display New Uploaded Files (using object URLs) ---
  productImages.forEach((file, index) => { // Assumes 'file' is a File object
    if (file instanceof File) { // Validate that it's a File object
      const imgWrapper = document.createElement('div');
      // Apply the exact class name from your CSS
      imgWrapper.classList.add('image-preview-item');
      const objectUrl = URL.createObjectURL(file); // Create object URL for the file
      imgWrapper.innerHTML = `
        <img src="${objectUrl}" alt="Newly selected image ${index + 1}" class="new-image-preview">
        <!-- Use the exact class name for the remove button from your CSS -->
        <button type="button" class="image-preview-remove" onclick="removeNewImage(${index})">×</button>
      `;
      container.appendChild(imgWrapper);
    }
  });
}


// Update functions to ensure they trigger the fixed preview function
function removeExistingImage(index) {
  existingImages.splice(index, 1);
  updateImagePreview();
}

function removeNewImage(index) {
  productImages.splice(index, 1);
  updateImagePreview();
}

// Ensure the image selection handler also updates the preview correctly
function handleImageSelect(e) {
  const files = e.target.files;
  if (files.length + productImages.length > 5) {
    showAdminAlert("You can only upload up to 5 images per product.", "Upload Limit");
    return;
  }
  Array.from(files).forEach((file) => {
    if (file.type.startsWith("image/")) {
      // Add the File object directly to the array
      productImages.push(file);
      // Update the preview after adding the new file
      updateImagePreview();
    } else {
      console.warn(`File ${file.name} is not an image and was skipped.`);
    }
  });
  // Reset file input so the same file can be selected again if needed
  e.target.value = "";
}

function getImageUrlsFromInputs() {
    const inputs = document.querySelectorAll(".image-url-input");
    const urls = [];
    inputs.forEach((input) => {
        const value = input.value.trim();
        if (value) {
            urls.push(value);
        }
    });
    return urls;
}

function clearImageUrlInputs() {
    document.querySelectorAll(".image-url-input").forEach((input) => {
        input.value = "";
    });
}

function populateImageUrlInputs(images) {
    const inputs = document.querySelectorAll(".image-url-input");
    images.forEach((img, index) => {
        if (inputs[index]) {
            inputs[index].value = img;
        }
    });
}


// Edit product 
async function editProduct(productId) { 
    try {
        showLoader("Loading product details...");
        const response = await fetch(`/api/products/${productId}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const product = await response.json();

        document.getElementById("productId").value = product.id;
        document.getElementById("productName").value = product.name;
        document.getElementById("productPrice").value = product.price;
        document.getElementById("productDescription").value = product.description;
        document.getElementById("productCategory").value = product.category || "";

        // Reset images
        productImages = [];
        existingImages = [];

        if (product.images && product.images.length > 0) {
            existingImages = Array.isArray(product.images) ? [...product.images] : [product.images];
        } else if (product.image) {
            existingImages = [product.image];
        }

        updateImagePreview(); // Show both existing & new images in preview
        showProductForm(true);
    } catch (error) {
        console.error("Error fetching product for edit:", error);
        await showAdminAlert(`Error loading product: ${error.message}`, "Error");
    } finally {
        hideLoader();
    }
}

// Update preview container
function updateImagePreview() {
    const container = document.getElementById("imagePreviewContainer");
    container.innerHTML = '';

    // Existing images (Cloudinary URLs)
    existingImages.forEach((url, index) => {
        const imgWrapper = document.createElement('div');
        imgWrapper.classList.add('image-wrapper');
        imgWrapper.innerHTML = `
            <img src="${url}" class="existing-image">
            <button type="button" class="btn-remove" onclick="removeExistingImage(${index})">×</button>
        `;
        container.appendChild(imgWrapper);
    });

    // New uploaded images
    productImages.forEach((file, index) => {
        const imgWrapper = document.createElement('div');
        imgWrapper.classList.add('image-wrapper');
        imgWrapper.innerHTML = `
            <img src="${URL.createObjectURL(file)}" class="new-image">
            <button type="button" class="btn-remove" onclick="removeNewImage(${index})">×</button>
        `;
        container.appendChild(imgWrapper);
    });
}

function removeExistingImage(index) {
    existingImages.splice(index, 1);
    updateImagePreview();
}

function removeNewImage(index) {
    productImages.splice(index, 1);
    updateImagePreview();
}

// Handle Add/Edit Product submit
// admin.js (Inside handleProductSubmit)

async function handleProductSubmit(e) {
  e.preventDefault();

  const productId = document.getElementById("productId").value; // Get ID for edit
  const name = document.getElementById("productName").value.trim();
  const price = document.getElementById("productPrice").value.trim();
  const description = document.getElementById("productDescription").value.trim();
  const category = document.getElementById("productCategory").value.trim();

  // Basic validation
  if (!name || !price || !description || !category) {
    await showAdminAlert("Please fill in all required fields (Name, Price, Description, Category).", "Validation Error");
    return;
  }

  // Validate images: either existing images or new uploads are required
  if (existingImages.length === 0 && productImages.length === 0) {
     await showAdminAlert("Please add at least one product image.", "Missing Image");
     return;
  }

  // Use FormData for multipart/form-data submission (required for file uploads)
  const formData = new FormData();
  formData.append("name", name);
  formData.append("price", price);
  formData.append("description", description);
  formData.append("category", category);

  // Append existing Cloudinary URLs as a JSON string
  // Backend will parse this and combine with newly uploaded URLs
  formData.append("existingImageUrls", JSON.stringify(existingImages));

  // Append new files (only if any were selected)
  productImages.forEach((file, index) => {
    if (file instanceof File) {
      formData.append("images", file); // Use the field name matching your multer config ('images')
    }
  });

  // Determine URL and method based on whether it's an edit or add
  const method = productId ? 'PUT' : 'POST';
  const url = productId ? `/api/products/${productId}` : '/api/products';

  try {
    showLoader(productId ? "Updating product..." : "Adding product...");

    const response = await fetch(url, {
      method: method,
      body: formData // Send FormData object
      // Do NOT set Content-Type header manually - let the browser set it with the boundary
    });

    if (!response.ok) {
      // Try to get error details from the response
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        console.warn("Could not parse error response as JSON:", e);
        // errorMessage remains the HTTP status message
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    if (result.success) {
      await showAdminAlert(productId ? "Product updated successfully!" : "Product added successfully!", "Success");
      // Reset form state and data after successful save
      hideProductForm();
      productImages = []; // Clear new files
      existingImages = []; // Clear existing URLs if necessary (depends on if you stay on the form)
      loadProducts(); // Refresh the product list
    } else {
      throw new Error(result.error || "Failed to save product (server returned failure).");
    }
  } catch (error) {
    console.error("Error saving product:", error);
    await showAdminAlert(`Error saving product: ${error.message}`, "Error");
  } finally {
    hideLoader();
  }
}


let allOrders = [];

// Load orders
async function loadOrders() {
    const tableBody = document.getElementById("ordersTableBody");
    showLoader("Loading orders..."); // Show loader while loading orders

    try {
        const response = await fetch("/api/admin/orders", {
            headers: adminAuthHeaders()
        });
        if (!response.ok) throw new Error("Failed to load orders");
        // ✅ STORE orders globally
        allOrders = await response.json();
        // ✅ Render using shared function
        renderOrders(allOrders);
    } catch (err) {
        console.error(err);
        tableBody.innerHTML = `
<tr>
<td colspan="6" class="error-message">${err.message}</td>
</tr>`;
    } finally {
        hideLoader(); // Hide loader after loading is complete
    }
}

function renderOrders(orders) {
    const tableBody = document.getElementById("ordersTableBody");
    if (!orders || orders.length === 0) {
        tableBody.innerHTML = `
<tr>
<td colspan="7" class="empty-state">No orders found</td>
</tr>`;
        return;
    }
    tableBody.innerHTML = orders.map(order => `
<tr>
<td>#${order.order_id}</td>
<td>${order.username}</td>
<td>${formatNaira(order.total)}</td>
<td>
<span class="status-badge status-${order.status.toLowerCase()}">
${order.status}
</span>
</td>
<td>${new Date(order.date).toLocaleDateString()}</td>
<!-- Add RRR column -->
<td>${order.transaction_id || "—"}</td>
<td>
<button class="btn-view" onclick="viewOrder(${order.order_id})">
View
</button>
</td>
</tr>
`).join("");
}

function applyOrderFilters() {
    const search = document
        .getElementById("orderSearchInput")
        .value.toLowerCase();
    const status = document.getElementById("statusFilter").value;
    const payment = document.getElementById("paymentFilter").value;
    const filtered = allOrders.filter(order => {
        const matchesSearch =
            order.username.toLowerCase().includes(search) ||
            String(order.order_id).includes(search);
        const matchesStatus =
            !status || order.status === status;
        const matchesPayment =
            !payment || order.payment_status === payment;
        return matchesSearch && matchesStatus && matchesPayment;
    });
    renderOrders(filtered);
}

async function viewOrder(orderId) {
    try {
        showLoader("Loading order details...");

        const order = allOrders.find(o => o.order_id === orderId);
        if (!order) throw new Error("Order not found");

        // Meta
        document.getElementById("od-order-id").textContent = `#${order.order_id}`;
        document.getElementById("od-date").textContent =
            new Date(order.date).toLocaleString();

        const statusEl = document.getElementById("od-status");
        statusEl.textContent = order.status;
        statusEl.className = `status-badge status-${order.status.toLowerCase()}`;

        // RRR (safe check)
        const rrrEl = document.getElementById("od-rrr");
        if (rrrEl) {
            rrrEl.textContent = order.transaction_id || "Not available";
        }

        // Customer
        document.getElementById("od-name").textContent = order.username;
        document.getElementById("od-email").textContent = order.email;
        document.getElementById("od-phone").textContent = order.phone;

        const address = order.delivery_address || {};
        document.getElementById("od-address").innerHTML = `
            ${address.street || ""}<br>
            ${address.city || ""}, ${address.state || ""}<br>
            ${address.postalCode || ""}
        `;

        // Items
        const itemsBody = document.getElementById("od-items");
        itemsBody.innerHTML = order.items.map(i => `
            <tr>
                <td>${i.name}</td>
                <td>${i.quantity}</td>
                <td>${formatNaira(i.price)}</td>
                <td>${formatNaira(i.price * i.quantity)}</td>
            </tr>
        `).join("");

        // Summary
        document.getElementById("od-payment").textContent = order.payment_status;
        document.getElementById("od-total").textContent =
            formatNaira(order.total);

        // Buttons
        document.getElementById("printOrderBtn").onclick = () => window.print();

        document.getElementById("updateOrderStatusBtn").onclick = async () => {
            const newStatus = await openOrderStatusModal(order.status);
            if (newStatus && newStatus !== order.status) {
                updateOrderStatus(order.order_id, newStatus);
            }
        };

        // Open modal
        document.getElementById("orderDetailsModal").style.display = "flex";

    } catch (err) {
        console.error(err);
        showAdminAlert(err.message || "Something went wrong", "Order Error");
    } finally {
        hideLoader();
    }
}


let resolveOrderStatus;

function openOrderStatusModal(currentStatus) {
    const modal = document.getElementById("orderStatusModal");
    const select = document.getElementById("orderStatusSelect");
    select.value = currentStatus;
    modal.style.display = "flex";
    return new Promise(resolve => {
        resolveOrderStatus = resolve;
    });
}

document.getElementById("confirmStatusBtn").onclick = () => {
    const modal = document.getElementById("orderStatusModal");
    const value = document.getElementById("orderStatusSelect").value;
    modal.style.display = "none";
    resolveOrderStatus(value);
};

document.getElementById("cancelStatusBtn").onclick = () => {
    document.getElementById("orderStatusModal").style.display = "none";
    resolveOrderStatus(null);
};

async function updateOrderStatus(orderId, newStatus) {
    try {
        showLoader("Updating order status..."); // Show loader while updating status
        const response = await fetch(
            `/api/admin/orders/${orderId}/status`,
            {
                method: "PUT",
                headers: adminAuthHeaders(),
                body: JSON.stringify({ status: newStatus })
            }
        );
        if (!response.ok) throw new Error("Status update failed");
        await showAdminAlert("Order status updated", "Success");
        loadOrders();
    } catch (err) {
        showAdminAlert(err.message, "Update Error");
    } finally {
        hideLoader(); // Hide loader after updating status
    }
}



// Delete product
async function deleteProduct(productId) {
    const confirmed = await showAdminConfirm(
        "Are you sure you want to delete this product? This action cannot be undone.",
        "Delete Product",
    );
    if (confirmed) {
        try {
            showLoader("Deleting product..."); // Show loader while deleting product
            const response = await fetch(`/api/products/${productId}`, { // Use route param, not query param
                method: 'DELETE',
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            if (result.success) {
                loadProducts(); // Reload the product list
                await showAdminAlert("Product deleted successfully!", "Success");
            } else {
                throw new Error(result.error || "Failed to delete product.");
            }
        } catch (error) {
            console.error("Error deleting product:", error);
            await showAdminAlert(`Error deleting product: ${error.message}`, "Error");
        } finally {
            hideLoader(); // Hide loader after deleting product
        }
    }
}

// Handle section navigation
function handleNavigation(e) {
    e.preventDefault();
    const navItems = document.querySelectorAll(".nav-item");
    const sections = document.querySelectorAll(".content-section");
    const targetSection = e.currentTarget.dataset.section;
    navItems.forEach((item) => item.classList.remove("active"));
    e.currentTarget.classList.add("active");
    sections.forEach((section) => {
        section.style.display = "none";
    });
    document.getElementById(`${targetSection}Section`).style.display = "block";
    // Update page title
    const titles = {
        products: "Product Management",
        orders: "Order Management",
        settings: "Settings",
        testimonials: "Testimonial Management",
        news: "News Management",
        users: "User Management",
        messages:"Contact Messages"
    };
    document.getElementById("pageTitle").textContent = titles[targetSection];
    // Load data for the selected section
    if (targetSection === "products") {
        loadProducts();
    } else if (targetSection === "testimonials") {
        loadTestimonials();
    } else if (targetSection === "news") {
        loadNews();
    } else if (targetSection === "users") {
        loadUsers(); 
    } else if (targetSection === "orders") {
        loadOrders();
    }else if (targetSection === "messages") loadMessages();
}

// Handle testimonial form submission
async function handleTestimonialSubmit(e) {
    e.preventDefault();
    let finalImage = testimonialImage || document.getElementById("testimonialImageUrl").value || "";
    const testimonialData = {
        name: document.getElementById("testimonialName").value,
        role: document.getElementById("testimonialRole").value,
        text: document.getElementById("testimonialText").value,
        rating: Number.parseInt(document.getElementById("testimonialRating").value),
        image: finalImage, // Updated to include profile image
    };

    try {
        showLoader("Saving testimonial..."); // Show loader during submission
        const testimonialId = document.getElementById("testimonialId").value;
        const method = testimonialId ? 'PUT' : 'POST';
        const url = testimonialId ? `/api/testimonials/${testimonialId}` : '/api/testimonials';
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testimonialData),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` })); // Attempt to read error response
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.success) {
            loadTestimonials();
            hideTestimonialForm();
            await showAdminAlert(testimonialId ? "Testimonial updated!" : "Testimonial added!", "Success");
        } else {
            throw new Error(result.error || "Failed to save testimonial.");
        }
    } catch (error) {
        console.error("Error saving testimonial:", error); // Log the raw error for debugging
        // Check for the specific error indicating server returned HTML (likely due to payload size)
        if (error.message.includes("DOCTYPE") || error.message.includes("Unexpected token '<'")) {
            await showAdminAlert("File size too large. Please reduce image size and try again.", "File Size Error");
        } else {
            // Handle other potential errors
            await showAdminAlert(`Error saving testimonial: ${error.message}`, "Error");
        }
    } finally {
        hideLoader(); // Always hide loader after submission
    }
}

function editTestimonial(testimonialId) {
    fetch(`/api/testimonials/${testimonialId}`) // Use route param, not query param
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(testimonial => {
            if (!testimonial) {
                showAdminAlert("Testimonial not found.", "Error");
                return;
            }
            document.getElementById("testimonialId").value = testimonial.id;
            document.getElementById("testimonialName").value = testimonial.name;
            document.getElementById("testimonialRole").value = testimonial.role;
            document.getElementById("testimonialText").value = testimonial.text;
            document.getElementById("testimonialRating").value = testimonial.rating;
            if (testimonial.image) {
                if (testimonial.image.startsWith("http") || testimonial.image.startsWith("/")) {
                    document.getElementById("testimonialImageUrl").value = testimonial.image;
                    testimonialImage = "";
                } else {
                    testimonialImage = testimonial.image;
                    updateTestimonialImagePreview();
                }
            }
            document.getElementById("testimonialFormTitle").textContent = "Edit Testimonial";
            document.getElementById("testimonialFormContainer").style.display = "block";
        })
        .catch(error => {
            console.error("Error fetching testimonial for edit:", error);
            showAdminAlert(`Error loading testimonial: ${error.message}`, "Error");
        });
}

// Load testimonials
async function loadTestimonials() {
    const tableBody = document.getElementById("testimonialsTableBody");
    showLoader("Loading testimonials..."); // Show loader while loading testimonials

    try {
        const response = await fetch('/api/testimonials');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const testimonials = await response.json();
        if (testimonials.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="empty-state"><p>No testimonials found.</p></td></tr>`;
            return;
        }
        tableBody.innerHTML = testimonials
            .map(
                (t) => `
<tr>
<td>${t.name}</td>
<td>${t.role}</td>
<td>${t.text.substring(0, 50)}...</td>
<td>${"⭐".repeat(t.rating)}</td>
<td>
<div class="product-actions">
<button class="btn-edit" onclick="editTestimonial(${t.id})">Edit</button>
<button class="btn-delete" onclick="deleteTestimonial(${t.id})">Delete</button>
</div>
</td>
</tr>
`,
            )
            .join("");
    } catch (error) {
        console.error("Error loading testimonials:", error);
        tableBody.innerHTML = `<tr><td colspan="5" class="error-message"><p>Error loading testimonials: ${error.message}</p></td></tr>`;
    } finally {
        hideLoader(); // Hide loader after loading is complete
    }
}

// Delete testimonial
async function deleteTestimonial(testimonialId) {
    const confirmed = await showAdminConfirm("Delete this testimonial?", "Delete Testimonial");
    if (confirmed) {
        try {
            showLoader("Deleting testimonial..."); // Show loader while deleting testimonial
            const response = await fetch(`/api/testimonials/${testimonialId}`, { // Use route param, not query param
                method: 'DELETE',
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            if (result.success) {
                loadTestimonials(); // Reload the testimonial list
                await showAdminAlert("Testimonial deleted!", "Success");
            } else {
                throw new Error(result.error || "Failed to delete testimonial.");
            }
        } catch (error) {
            console.error("Error deleting testimonial:", error);
            await showAdminAlert(`Error deleting testimonial: ${error.message}`, "Error");
        } finally {
            hideLoader(); // Hide loader after deleting testimonial
        }
    }
}

// Hide testimonial form
function hideTestimonialForm() {
    document.getElementById("testimonialFormContainer").style.display = "none";
    document.getElementById("testimonialForm").reset();
    document.getElementById("testimonialId").value = "";
    testimonialImage = "";
    updateTestimonialImagePreview();
}

// Show testimonial form
function showTestimonialForm() {
    document.getElementById("testimonialFormTitle").textContent = "Add Testimonial";
    document.getElementById("testimonialFormContainer").style.display = "block";
    document.getElementById("testimonialForm").reset();
}

function handleTestimonialImageSelect(e) {
    const files = e.target.files;
    if (files.length > 0 && files[0].type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (event) => {
            testimonialImage = event.target.result;
            updateTestimonialImagePreview();
        };
        reader.readAsDataURL(files[0]);
    }
    e.target.value = "";
}

function updateTestimonialImagePreview() {
    const container = document.getElementById("testimonialImagePreview");
    if (testimonialImage) {
        container.innerHTML = `
<div class="profile-image-preview-item">
<img src="${testimonialImage}" alt="Testimonial image">
<button type="button" class="image-preview-remove" onclick="removeTestimonialImage()">×</button>
</div>
`;
    } else {
        container.innerHTML = "";
    }
}

function removeTestimonialImage() {
    testimonialImage = "";
    updateTestimonialImagePreview();
    document.getElementById("testimonialImageUrl").value = "";
}

// Handle news form submission
async function handleNewsSubmit(e) {
    e.preventDefault();
    let finalImage = newsImage || document.getElementById("newsImage").value || "";
    const newsData = {
        title: document.getElementById("newsTitle").value,
        description: document.getElementById("newsDescription").value,
        fullContent: document.getElementById("newsContent").value, // Save full content
        image: finalImage,
        date: formatDate(document.getElementById("newsDate").value),
    };

    try {
        showLoader("Saving article..."); // Show loader during submission
        const newsId = document.getElementById("newsId").value;
        const method = newsId ? 'PUT' : 'POST';
        const url = newsId ? `/api/news/${newsId}` : '/api/news';
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newsData),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` })); // Attempt to read error response
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.success) {
            loadNews();
            hideNewsForm();
            await showAdminAlert(newsId ? "Article updated!" : "Article added!", "Success");
        } else {
            throw new Error(result.error || "Failed to save article.");
        }
    } catch (error) {
        console.error("Error saving article:", error); // Log the raw error for debugging
        // Check for the specific error indicating server returned HTML (likely due to payload size)
        if (error.message.includes("DOCTYPE") || error.message.includes("Unexpected token '<'")) {
            await showAdminAlert("File size too large. Please reduce image size and try again.", "File Size Error");
        } else {
            // Handle other potential errors
            await showAdminAlert(`Error saving article: ${error.message}`, "Error");
        }
    } finally {
        hideLoader(); // Always hide loader after submission
    }
}

// Load news
async function loadNews() {
    const tableBody = document.getElementById("newsTableBody");
    showLoader("Loading articles..."); // Show loader while loading news

    try {
        const response = await fetch('/api/news');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const newsList = await response.json();
        if (newsList.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" class="empty-state"><p>No articles found.</p></td></tr>`;
            return;
        }
        tableBody.innerHTML = newsList
            .map(
                (n) => `
<tr>
<td>${n.title}</td>
<td>${n.date}</td>
<td>${n.description.substring(0, 50)}...</td>
<td>
<div class="product-actions">
<button class="btn-edit" onclick="editNews(${n.id})">Edit</button>
<button class="btn-delete" onclick="deleteNews(${n.id})">Delete</button>
</div>
</td>
</tr>
`,
            )
            .join("");
    } catch (error) {
        console.error("Error loading news:", error);
        tableBody.innerHTML = `<tr><td colspan="4" class="error-message"><p>Error loading news: ${error.message}</p></td></tr>`;
    } finally {
        hideLoader(); // Hide loader after loading is complete
    }
}

// Edit news
function editNews(newsId) {
    fetch(`/api/news/${newsId}`) // Use route param, not query param
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(news => {
            if (!news) {
                showAdminAlert("Article not found.", "Error");
                return;
            }
            document.getElementById("newsId").value = news.id;
            document.getElementById("newsTitle").value = news.title;
            document.getElementById("newsDescription").value = news.description;
            document.getElementById("newsContent").value = news.fullContent || news.body || news.description;
            document.getElementById("newsImage").value = news.image || "";
            document.getElementById("newsDate").value = reverseDateFormat(news.date);
            document.getElementById("newsFormTitle").textContent = "Edit Article";
            document.getElementById("newsFormContainer").style.display = "block";
            if (news.image) {
                if (news.image.startsWith("http") || news.image.startsWith("/")) {
                    document.getElementById("newsImage").value = news.image;
                    newsImage = "";
                } else {
                    newsImage = news.image;
                    updateNewsImagePreview();
                }
            }
        })
        .catch(error => {
            console.error("Error fetching news for edit:", error);
            showAdminAlert(`Error loading article: ${error.message}`, "Error");
        });
}

// Delete news
async function deleteNews(newsId) {
    const confirmed = await showAdminConfirm("Delete this article?", "Delete Article");
    if (confirmed) {
        try {
            showLoader("Deleting article..."); // Show loader while deleting article
            const response = await fetch(`/api/news/${newsId}`, { // Use route param, not query param
                method: 'DELETE',
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            if (result.success) {
                loadNews(); // Reload the news list
                await showAdminAlert("Article deleted!", "Success");
            } else {
                throw new Error(result.error || "Failed to delete article.");
            }
        } catch (error) {
            console.error("Error deleting article:", error);
            await showAdminAlert(`Error deleting article: ${error.message}`, "Error");
        } finally {
            hideLoader(); // Hide loader after deleting article
        }
    }
}

// Hide news form
function hideNewsForm() {
    document.getElementById("newsFormContainer").style.display = "none";
    document.getElementById("newsForm").reset();
    document.getElementById("newsId").value = "";
    newsImage = "";
    updateNewsImagePreview();
}

// Show news form
function showNewsForm() {
    document.getElementById("newsFormTitle").textContent = "Add News Article";
    document.getElementById("newsFormContainer").style.display = "block";
    document.getElementById("newsForm").reset();
}

function handleNewsImageSelect(e) {
    const files = e.target.files;
    if (files.length > 0 && files[0].type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (event) => {
            newsImage = event.target.result;
            updateNewsImagePreview();
        };
        reader.readAsDataURL(files[0]);
    }
    e.target.value = "";
}

function updateNewsImagePreview() {
    const container = document.getElementById("newsImagePreview");
    if (newsImage) {
        container.innerHTML = `
<div class="image-preview-item">
<img src="${newsImage}" alt="News image">
<button type="button" class="image-preview-remove" onclick="removeNewsImage()">×</button>
</div>
`;
    } else {
        container.innerHTML = "";
    }
}

function removeNewsImage() {
    newsImage = "";
    updateNewsImagePreview();
    document.getElementById("newsImage").value = "";
}

// Date formatting utilities
function formatDate(dateString) {
    const date = new Date(dateString);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function reverseDateFormat(formattedDate) {
    const date = new Date(formattedDate);
    return date.toISOString().split("T")[0];
}

// Load users into table
let isCurrentlyLoadingUsers = false; // Add this global variable

async function loadUsers() {
    // Prevent multiple simultaneous loads
    if (isCurrentlyLoadingUsers) {
        console.log("loadUsers called but already loading, skipping.");
        return;
    }

    isCurrentlyLoadingUsers = true;
    console.log("loadUsers called");

    const tableBody = document.getElementById("usersTableBody");
    showLoader("Loading users..."); // Show loader while loading users
    try {
        const response = await fetch('/api/users');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        allUsers = await response.json(); // Store all users
        totalUsers = allUsers.length;
        // Apply filters first
        applyUserFilters();
        // Paginate
        const startIndex = (currentPage - 1) * usersPerPage;
        const paginatedUsers = allUsers.slice(startIndex, startIndex + usersPerPage);
        if (paginatedUsers.length === 0) {
            tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <p>No users found.</p>
                </td>
            </tr>
            `;
            updatePaginationControls();
            hideLoader();
            isCurrentlyLoadingUsers = false; // Reset flag
            return;
        }
        tableBody.innerHTML = paginatedUsers
            .map((user) => {
                const address = user.address || { street: "", city: "", state: "", postalCode: "", country: "Nigeria" };
                const fullAddress = `${address.street}, ${address.city}, ${address.state} ${address.postalCode}, ${address.country}`;
                return `
                <tr>
                    <td>${user.username}</td>
                    <td>${user.email || "Not set"}</td>
                    <td>${user.phone || "Not set"}</td>
                    <td>${fullAddress}</td>
                    <td>${user.order_count || 0}</td>
                    <td>
                        <div class="product-actions">
                            <button class="btn-view" onclick="viewUser(${user.id})" data-role="${user.role}" data-active="${user.active !== false}">
                                View
                            </button>
                        </div>
                    </td>
                </tr>
                `
            })
            .join("");
        updatePaginationControls();
    } catch (error) {
        console.error("Error loading users:", error);
        tableBody.innerHTML = `<tr><td colspan="6" class="error-message"><p>Error loading users: ${error.message}</p></td></tr>`;
    } finally {
        hideLoader(); // Hide loader after loading is complete
        isCurrentlyLoadingUsers = false; // Reset flag
    }
}

// --- CONTACT MESSAGES SECTION ---
let currentMessagePage = 1;
const MESSAGE_PER_PAGE = 10;

// Load contact messages
async function loadMessages() {
    showLoader();
    try {
        // ✅ Use the correct token from sessionStorage
        const token = sessionStorage.getItem("adminToken");
        if (!token) {
            await showAdminAlert("Authentication Error", "Please log in again.");
            return;
        }

        const response = await fetch('/api/admin/messages', {
            headers: {
                'Authorization': `Bearer ${token}` // ✅ Pass the token correctly
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch messages');
        }

        const messages = await response.json();
         cachedMessages = [...messages]; // ← Store for fast updates
        applyMessageFilters(); // Now uses cachedMessages
        // Apply filters
        const searchQuery = document.getElementById('messageSearchInput').value.toLowerCase().trim();
        const statusFilter = document.getElementById('messageStatusFilter').value;

        const filteredMessages = messages.filter(msg => {
            const matchesSearch = !searchQuery ||
                msg.name.toLowerCase().includes(searchQuery) ||
                msg.email.toLowerCase().includes(searchQuery) ||
                msg.subject.toLowerCase().includes(searchQuery);

            const matchesStatus = !statusFilter ||
                (statusFilter === 'unread' && !msg.read) ||
                (statusFilter === 'read' && msg.read);

            return matchesSearch && matchesStatus;
        });

        renderMessages(filteredMessages);
        updatePagination(filteredMessages.length);

    } catch (error) {
        console.error('Error loading messages:', error);
        await showAdminAlert('Error', error.message || 'Failed to load messages');
    } finally {
        hideLoader();
    }
}

function renderMessages(messages) {
    const tableBody = document.getElementById('messagesTableBody');
    tableBody.innerHTML = '';
    if (messages.length === 0) {
        tableBody.innerHTML = `
            <tr><td colspan="6" style="text-align: center; padding: 2rem;">No messages found.</td></tr>
        `;
        return;
    }

    messages.forEach(msg => {
        const statusText = msg.replied_at 
            ? "Replied"
            : (msg.read ? "Read" : "Unread");
        const statusClass = msg.replied_at 
            ? "status-replied"
            : (msg.read ? "status-read" : "status-unread");

        const row = document.createElement("tr");
        row.className = "message-row";
        row.innerHTML = `
            <td class="cell-name">${msg.name}</td>
            <td class="cell-email">
                <a href="mailto:${msg.email}">${msg.email}</a>
            </td>
            <td class="cell-subject">${msg.subject}</td>
            <td class="cell-date">${new Date(msg.timestamp).toLocaleString()}</td>
            <td class="cell-status">
                <span class="msg-status ${statusClass}">${statusText}</span>
            </td>
            <td class="cell-actions">
                <button class="action-btn view" onclick="viewMessage(${msg.id})">View</button>
                ${!msg.replied_at
                    ? `<button class="action-btn reply" onclick="openReplyForm(${msg.id}, '${msg.email}', '${msg.subject}')">Reply</button>`
                    : ""}
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function updatePagination(totalCount) {
    const pageInfo = document.getElementById('pageInfo');
    const totalPages = Math.ceil(totalCount / MESSAGE_PER_PAGE);
    pageInfo.textContent = `Page ${currentMessagePage} of ${totalPages}`;
}

async function markAsRead(messageId) {
    const token = sessionStorage.getItem("adminToken"); // ✅ Use correct token
    try {
        const response = await fetch(`/api/admin/messages/${messageId}/read`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            loadMessages(); // Refresh list
        } else {
            throw new Error('Failed to mark as read');
        }
    } catch (error) {
        console.error('Error marking message as read:', error);
        await showAdminAlert('Error', error.message || 'Failed to mark message as read');
    }
}
function applyMessageFilters() {
  const searchQuery = document.getElementById('messageSearchInput').value.toLowerCase().trim();
  const statusFilter = document.getElementById('messageStatusFilter').value;

  let filtered = [...cachedMessages];

  if (searchQuery) {
    filtered = filtered.filter(msg =>
      msg.name.toLowerCase().includes(searchQuery) ||
      msg.email.toLowerCase().includes(searchQuery) ||
      msg.subject.toLowerCase().includes(searchQuery)
    );
  }

  if (statusFilter === 'unread') filtered = filtered.filter(msg => !msg.read);
  else if (statusFilter === 'read') filtered = filtered.filter(msg => msg.read);

  renderMessages(filtered);
  updatePagination(filtered.length);
}

async function viewMessage(messageId) {
  const token = sessionStorage.getItem("adminToken");
  if (!token) {
    await showAdminAlert("Authentication Error", "Please log in again.");
    return;
  }

  try {
    showLoader();

    // 1. Mark as read on server
    const markRes = await fetch(`/api/admin/messages/${messageId}/read`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    if (!markRes.ok) throw new Error('Failed to mark as read');

    // 2. Update local cache
    const idx = cachedMessages.findIndex(m => m.id === messageId);
    if (idx !== -1) {
      cachedMessages[idx] = { ...cachedMessages[idx], read: true };
    }

    // 3. Fetch updated message (for modal)
    const resp = await fetch(`/api/admin/messages/${messageId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!resp.ok) throw new Error('Failed to fetch message');
    const message = await resp.json();

    hideLoader();

   // 4. Render modal
const modal = document.getElementById('messageDetailsModal');
const content = document.getElementById('messageDetailsContent');
const formatReplyText = (text) => {
  if (!text) return "No reply text provided.";
  // Preserve line breaks: \n → <br>, and prevent XSS by escaping HTML first
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
};
const replySection = message.replied_at
  ? `
    <div class="reply-section">
      <h4 style="margin-top: 1.5rem; color: #2c3e50;">Admin Reply</h4>
      <div class="reply-bubble">
        <div class="reply-meta">
          <span class="reply-author">PhemmySolar Support</span>
          <span class="reply-timestamp">
            ${new Date(message.replied_at).toLocaleString()}
          </span>
        </div>
         <div class="reply-text">${formatReplyText(message.reply_text)}</div>
      </div>
    </div>
  `
  : "";

content.innerHTML = `
  <div class="modal-header">
    <h3>${message.subject}</h3>
  </div>

  <div class="modal-content">
    <div class="detail-row"><strong>Name</strong><span>${message.name}</span></div>
    <div class="detail-row"><strong>Email</strong>
      <a href="mailto:${message.email}">${message.email}</a>
    </div>
    <div class="detail-row"><strong>Phone</strong>
      <a href="tel:${message.phone}">${message.phone}</a>
    </div>
    <div class="detail-row"><strong>Sent</strong>
      <span>${new Date(message.timestamp).toLocaleString()}</span>
    </div>

    <div class="detail-row">
      <strong>Status</strong>
      <span class="status-badge ${
        message.replied_at
          ? 'status-replied'
          : message.read
            ? 'status-read'
            : 'status-unread'
      }">
        ${
          message.replied_at
            ? 'Replied'
            : message.read
              ? 'Read'
              : 'Unread'
        }
      </span>
    </div>

    <div class="message-box">
      <strong>Original Message</strong>
      <p>${message.message}</p>
    </div>

    ${replySection}
  </div>
`;

modal.style.display = 'flex';


    // 5. ✅ Refresh table *without full reload* — just re-filter & re-render
    applyMessageFilters();

  } catch (error) {
    console.error('Error viewing message:', error);
    hideLoader();
    await showAdminAlert('Error', error.message || 'Failed to view message');
  }
}

// Initialize event listeners for the messages section
document.addEventListener('DOMContentLoaded', () => {


    // Add this block for message section
    const messageSearchInput = document.getElementById('messageSearchInput');
    const messageStatusFilter = document.getElementById('messageStatusFilter');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');

    if (messageSearchInput) {
        messageSearchInput.addEventListener('input', loadMessages);
    }

    if (messageStatusFilter) {
        messageStatusFilter.addEventListener('change', loadMessages);
    }

    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentMessagePage > 1) {
                currentMessagePage--;
                loadMessages();
            }
        });
    }

    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            currentMessagePage++;
            loadMessages();
        });
    }

    // 👇  handle closing the message details modal
    const closeMessageDetailsBtn = document.getElementById('closeMessageDetailsBtn');
    const closeMessageDetailsBtn2 = document.getElementById('closeMessageDetailsBtn2');
    const messageDetailsModal = document.getElementById('messageDetailsModal');

    if (closeMessageDetailsBtn && messageDetailsModal) {
        closeMessageDetailsBtn.addEventListener('click', () => {
            messageDetailsModal.style.display = 'none';
        });
    }

    if (closeMessageDetailsBtn2 && messageDetailsModal) {
        closeMessageDetailsBtn2.addEventListener('click', () => {
            messageDetailsModal.style.display = 'none';
        });
    }

    // Also allow clicking outside the modal to close it
    if (messageDetailsModal) {
        messageDetailsModal.addEventListener('click', (e) => {
            if (e.target === messageDetailsModal) {
                messageDetailsModal.style.display = 'none';
            }
        });
    }

    // Allow Escape key to close the modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && messageDetailsModal && messageDetailsModal.style.display === 'flex') {
            messageDetailsModal.style.display = 'none';
        }
    });

    
});
// Close View Modal
document.getElementById('closeViewUserBtn')?.addEventListener('click', () => {
    document.getElementById('viewUserModal').style.display = 'none';
});
document.getElementById('closeViewUserBtn2')?.addEventListener('click', () => {
    document.getElementById('viewUserModal').style.display = 'none';
});

// Add event listeners for filters
document.getElementById('messageSearchInput')?.addEventListener('input', loadMessages);
document.getElementById('messageStatusFilter')?.addEventListener('change', loadMessages);

// Optional: Add pagination buttons if needed
document.getElementById('prevPageBtn')?.addEventListener('click', () => {
    if (currentMessagePage > 1) {
        currentMessagePage--;
        loadMessages();
    }
});
document.getElementById('nextPageBtn')?.addEventListener('click', () => {
    currentMessagePage++;
    loadMessages();
});

function updatePaginationControls() {
    const totalPages = Math.ceil(totalUsers / usersPerPage);
    const pageInfo = document.getElementById("pageInfo");
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

    const prevBtn = document.getElementById("prevPageBtn");
    const nextBtn = document.getElementById("nextPageBtn");

    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;

    prevBtn.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            loadUsers(); // Reload with new page
        }
    });

    nextBtn.addEventListener("click", () => {
        if (currentPage < totalPages) {
            currentPage++;
            loadUsers(); // Reload with new page
        }
    });
}

function applyUserFilters() {
    const search = document.getElementById("userSearchInput").value.toLowerCase();
    const role = document.getElementById("userRoleFilter").value;

    // Filter all users
    const filteredUsers = allUsers.filter(user => {
        const username = user.username.toLowerCase();
        const email = (user.email || "").toLowerCase();
        const userRole = user.role;

        const matchesSearch = username.includes(search) || email.includes(search);
        const matchesRole = !role || userRole === role;

        return matchesSearch && matchesRole;
    });

    // Update global array for pagination
    allUsers = filteredUsers;
    totalUsers = filteredUsers.length;

    // Reset to page 1 when filtering
    currentPage = 1;

    // Re-render table with pagination
    loadUsers();
}

function viewUser(userId) {
    // Show loader before fetching
    showLoader("Loading user details...");

    fetch(`/api/users/${userId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(user => {
            if (!user) {
                showAdminAlert("User not found.", "Error");
                return;
            }

            // Populate modal content
            const content = document.getElementById("viewUserContent");
            content.innerHTML = `
              <div class="user-modal-content">
                  <div class="user-header">
                      <h3>User Details</h3>
                      <span class="user-role ${user.role}">${user.role}</span>
                  </div>
                  <div class="user-info-grid">
                      <div class="info-item">
                          <strong>Username:</strong>
                          <span>${user.username}</span>
                      </div>
                      <div class="info-item">
                          <strong>Email:</strong>
                          <span>${user.email || "—"}</span>
                      </div>
                      <div class="info-item">
                          <strong>Phone:</strong>
                          <span>${user.phone || "—"}</span>
                      </div>
                      <div class="info-item">
                          <strong>Order Count:</strong>
                          <span>${user.order_count || 0}</span>
                      </div>
                      <div class="info-item">
                          <strong>Last Login:</strong>
                          <span>${user.last_login ? new Date(user.last_login).toLocaleString() : "Never"}</span>
                      </div>
                      <div class="info-item">
                          <strong>Recent Orders:</strong>
                         <ul class="recent-orders">
                        ${
                          user.recent_orders && user.recent_orders.length > 0
                            ? user.recent_orders.slice(0, 3).map(order => `
                                <li class="order-item status-${order.status.toLowerCase()}">
                                  <div class="order-top">
                                    <span class="order-id">Order #${order.order_id}</span>
                                    <span class="order-date">
                                      ${new Date(order.date).toLocaleDateString()}
                                    </span>
                                  </div>

                                  <div class="order-bottom">
                                    <span class="order-amount">₦${order.total}</span>
                                    <span class="order-status">${order.status}</span>
                                  </div>
                                </li>
                              `).join("")
                            : `<li class="order-empty">No recent orders</li>`
                        }
                      </ul>

                      </div>
                      <div class="info-item">
                          <strong>Address:</strong>
                          <span>${user.address ? `${user.address.street}, ${user.address.city}, ${user.address.state} ${user.address.postalCode}, ${user.address.country}` : "—"}</span>
                      </div>
                  </div>
              </div>
          `;

            // Hide loader after loading
            hideLoader();

            // Show modal
            document.getElementById("viewUserModal").style.display = "flex";

            // After showing the modal, log the view
            fetch('/api/audit/user-view', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}` // Or however you store JWT
                },
                body: JSON.stringify({ userId: userId })
            })
            .then(response => {
                if (!response.ok) {
                    console.warn('Failed to log user view.');
                }
            })
            .catch(err => {
                console.warn('Error logging user view:', err);
            });
        })
        .catch(error => {
            console.error("Error fetching user for view:", error);
            showAdminAlert(`Error loading user: ${error.message}`, "Error");
            // Always hide loader on error
            hideLoader();
        });
}

// Open reply modal with pre-filled data
function openReplyForm(messageId, toEmail, originalSubject) {
  document.getElementById("replyMessageId").value = messageId;
  document.getElementById("replyToEmail").value = toEmail;
  document.getElementById("replySubject").value = `Re: ${originalSubject}`;
  document.getElementById("replyBody").focus();

  document.getElementById("replyMessageModal").style.display = "flex";
}

// Close reply modal
document.getElementById("closeReplyModalBtn")?.addEventListener("click", () => {
  document.getElementById("replyMessageModal").style.display = "none";
});

document.getElementById("cancelReplyBtn")?.addEventListener("click", () => {
  document.getElementById("replyMessageModal").style.display = "none";
});

// Handle reply form submission
document.getElementById("replyForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const messageId = document.getElementById("replyMessageId").value;
  const toEmail = document.getElementById("replyToEmail").value;
  const subject = document.getElementById("replySubject").value;
  const body = document.getElementById("replyBody").value;

  const token = sessionStorage.getItem("adminToken");
  if (!token) {
    await showAdminAlert("Authentication Error", "Please log in again.");
    return;
  }

  try {
    showLoader("Sending reply...");
    
    const response = await fetch(`/api/admin/messages/${messageId}/reply`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ to: toEmail, subject, body })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    if (result.success) {
      await showAdminAlert("Reply sent successfully!", "Success");
      // Optional: Mark as read + refresh list
      await markAsRead(messageId); // Reuse existing function
    } else {
      throw new Error(result.error || "Reply failed");
    }
  } catch (err) {
    console.error("Reply error:", err);
    await showAdminAlert(`Failed to send reply: ${err.message}`, "Error");
  } finally {
    hideLoader();
    document.getElementById("replyMessageModal").style.display = "none";
    document.getElementById("replyForm").reset();
  }
});

// Initialize admin panel
document.addEventListener("DOMContentLoaded", () => {
    checkAuth();
    document.getElementById("exportCsvBtn")?.addEventListener("click", exportToCSV);
    // Login form
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", handleLogin);
    }
    // Logout button
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", handleLogout);
    }
    // Add product button
    const addProductBtn = document.getElementById("addProductBtn");
    if (addProductBtn) {
        addProductBtn.addEventListener("click", () => showProductForm(false));
    }
    // Close form button
    const closeFormBtn = document.getElementById("closeFormBtn");
    if (closeFormBtn) {
        closeFormBtn.addEventListener("click", hideProductForm);
    }
    // Cancel form button
    const cancelFormBtn = document.getElementById("cancelFormBtn");
    if (cancelFormBtn) {
        cancelFormBtn.addEventListener("click", hideProductForm);
    }
    const closeOrderDetailsBtn = document.getElementById("closeOrderDetailsBtn");
    const orderDetailsModal = document.getElementById("orderDetailsModal");
    if (closeOrderDetailsBtn && orderDetailsModal) {
        // Close button click
        closeOrderDetailsBtn.addEventListener("click", () => {
            orderDetailsModal.style.display = "none";
        });
        // Close when clicking outside the modal content (on the overlay)
        orderDetailsModal.addEventListener("click", (e) => {
            // Check if the click was on the modal background/overlay itself, not the content
            if (e.target === orderDetailsModal) {
                orderDetailsModal.style.display = "none";
            }
        });
    }
    // Product form submission
    const productForm = document.getElementById("productForm");
    if (productForm) {
        productForm.addEventListener("submit", handleProductSubmit);
    }
    // Navigation items
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach((item) => {
        item.addEventListener("click", handleNavigation);
    });
    const selectImagesBtn = document.getElementById("selectImagesBtn");
    const imageInput = document.getElementById("imageInput");
    if (selectImagesBtn && imageInput) {
        selectImagesBtn.addEventListener("click", () => {
            imageInput.click();
        });
        imageInput.addEventListener("change", handleImageSelect);
    }
    const addTestimonialBtn = document.getElementById("addTestimonialBtn");
    if (addTestimonialBtn) {
        addTestimonialBtn.addEventListener("click", showTestimonialForm);
    }
    const closeTestimonialFormBtn = document.getElementById("closeTestimonialFormBtn");
    if (closeTestimonialFormBtn) {
        closeTestimonialFormBtn.addEventListener("click", hideTestimonialForm);
    }
    const cancelTestimonialFormBtn = document.getElementById("cancelTestimonialFormBtn");
    if (cancelTestimonialFormBtn) {
        cancelTestimonialFormBtn.addEventListener("click", hideTestimonialForm);
    }
    const testimonialForm = document.getElementById("testimonialForm");
    if (testimonialForm) {
        testimonialForm.addEventListener("submit", handleTestimonialSubmit);
    }
    const selectTestimonialImageBtn = document.getElementById("selectTestimonialImageBtn");
    const testimonialImageInput = document.getElementById("testimonialImageInput");
    if (selectTestimonialImageBtn && testimonialImageInput) {
        selectTestimonialImageBtn.addEventListener("click", () => {
            testimonialImageInput.click();
        });
        testimonialImageInput.addEventListener("change", handleTestimonialImageSelect);
    }
    const addNewsBtn = document.getElementById("addNewsBtn");
    if (addNewsBtn) {
        addNewsBtn.addEventListener("click", showNewsForm);
    }
    const closeNewsFormBtn = document.getElementById("closeNewsFormBtn");
    if (closeNewsFormBtn) {
        closeNewsFormBtn.addEventListener("click", hideNewsForm);
    }
    const cancelNewsFormBtn = document.getElementById("cancelNewsFormBtn");
    if (cancelNewsFormBtn) {
        cancelNewsFormBtn.addEventListener("click", hideNewsForm);
    }
    const newsForm = document.getElementById("newsForm");
    if (newsForm) {
        newsForm.addEventListener("submit", handleNewsSubmit);
    }
    const selectNewsImageBtn = document.getElementById("selectNewsImageBtn");
    const newsImageInput = document.getElementById("newsImageInput");
    if (selectNewsImageBtn && newsImageInput) {
        selectNewsImageBtn.addEventListener("click", () => {
            newsImageInput.click();
        });
        newsImageInput.addEventListener("change", handleNewsImageSelect);
    }
    // Load all data
    loadProducts();
    loadTestimonials();
    loadNews();
    
    // Add event listener for the "Users" navigation item
    const usersNav = document.querySelector('[data-section="users"]');
    if (usersNav) {
        usersNav.addEventListener("click", (e) => {
            e.preventDefault();
            handleNavigation(e); // Reuse your existing handleNavigation function
        });
    }
    // Auto-format price input with Naira symbol and commas
    const productPriceInput = document.getElementById("productPrice");
    if (productPriceInput) {
        productPriceInput.addEventListener("input", function (e) {
            let value = e.target.value.replace(/[^0-9]/g, ""); // Keep only digits
            if (value === "") {
                e.target.value = "";
                return;
            }
            const formatted = new Intl.NumberFormat("en-NG", {
                style: "currency",
                currency: "NGN",
                minimumFractionDigits: 0,
            }).format(value);
            e.target.value = formatted;
        });
    }

    // Close view user modal
      document.getElementById("closeViewUserBtn")?.addEventListener("click", () => {
          document.getElementById("viewUserModal").style.display = "none";
      });
      document.getElementById("closeViewUserBtn2")?.addEventListener("click", () => {
          document.getElementById("viewUserModal").style.display = "none";
      });
      // Add event listeners for user filters
        ["userSearchInput", "userRoleFilter"].forEach(id => {
            document.getElementById(id).addEventListener("input", applyUserFilters);
        });

      // Close on overlay click
      document.getElementById("viewUserModal")?.addEventListener("click", (e) => {
          if (e.target === document.getElementById("viewUserModal")) {
              document.getElementById("viewUserModal").style.display = "none";
          }
      });

      // Close on Escape key
      document.addEventListener("keydown", (e) => {
          if (e.key === "Escape" && document.getElementById("viewUserModal").style.display === "flex") {
              document.getElementById("viewUserModal").style.display = "none";
          }
      });
});

["orderSearchInput", "statusFilter", "paymentFilter"]
    .forEach(id => {
        document
            .getElementById(id)
            .addEventListener("input", applyOrderFilters);
    });
const orderDetailsOverlay =
    document.getElementById("orderDetailsOverlay");
const closeOrderDetailsBtn =
    document.getElementById("closeOrderDetailsBtn");
const mobileNavToggle = document.getElementById("mobileNavToggle");
const sidebar = document.querySelector(".sidebar");
mobileNavToggle.addEventListener("click", () => {
    sidebar.classList.toggle("active");
    mobileNavToggle.classList.toggle("open");
});
document.querySelectorAll(".sidebar .nav-item").forEach(item => {
    item.addEventListener("click", () => {
        if (window.innerWidth <= 1200) {
            sidebar.classList.remove("active");
            mobileNavToggle.classList.remove("open");
        }
    });
});
// Close sidebar when clicking outside
document.addEventListener("click", (e) => {
    const isClickInsideSidebar = sidebar.contains(e.target);
    const isClickOnHamburger = mobileNavToggle.contains(e.target);
    // Only run for mobile
    if (window.innerWidth <= 768 && sidebar.classList.contains("active")) {
        // If click is outside sidebar AND hamburger
        if (!isClickInsideSidebar && !isClickOnHamburger) {
            sidebar.classList.remove("active");
            mobileNavToggle.classList.remove("open");
        }
    }
});
function exportToCSV() {
    const headers = ["Username", "Email", "Phone", "Address", "Order Count", "Role"];
    const rows = allUsers.map(user => [
        user.username,
        user.email || "",
        user.phone || "",
        user.address ? `${user.address.street}, ${user.address.city}, ${user.address.state} ${user.address.postalCode}, ${user.address.country}` : "",
        user.order_count || 0,
        user.role
    ]);

    // Create CSV content
    const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `users_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}