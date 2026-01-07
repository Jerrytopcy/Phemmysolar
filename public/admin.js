// admin.js
// Authentication state
let isAuthenticated = false;
let currentEditingProductId = null;
let productImages = [];
let testimonialImage = "";
let newsImage = "";
let currentEditingUserId = null;

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

// Load products into table
async function loadProducts() {
    const tableBody = document.getElementById("productsTableBody");
    showLoader("Loading products..."); // Show loader while loading products

    try {
        const response = await fetch('/api/products');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const products = await response.json();
        if (products.length === 0) {
            tableBody.innerHTML = `
<tr>
<td colspan="5" class="empty-state">
<p>No products found. Add your first product!</p>
</td>
</tr>
`;
            return;
        }
        tableBody.innerHTML = products
            .map((product) => {
                const firstImage = product.images ? product.images[0] : product.image;
                return `
<tr>
<td><img src="${firstImage}" alt="${product.name}" class="product-image-thumb"></td>
<td>${product.name}</td>
<td>${formatNaira(product.price)}</td>
<td>${product.description.substring(0, 60)}...</td>
<td>
<div class="product-actions">
<button class="btn-edit" onclick="editProduct(${product.id})">Edit</button>
<button class="btn-delete" onclick="deleteProduct(${product.id})">Delete</button>
</div>
</td>
</tr>
`
            })
            .join("");
    } catch (error) {
        console.error("Error loading products:", error);
        tableBody.innerHTML = `<tr><td colspan="5" class="error-message"><p>Error loading products: ${error.message}</p></td></tr>`;
    } finally {
        hideLoader(); // Hide loader after loading is complete
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

function removeImage(index) {
    productImages.splice(index, 1);
    updateImagePreview();
}

function updateImagePreview() {
    const container = document.getElementById("imagePreviewContainer");
    if (productImages.length === 0) {
        container.innerHTML = "";
        return;
    }
    container.innerHTML = productImages
        .map(
            (img, index) => `
<div class="image-preview-item">
<img src="${img}" alt="Product image ${index + 1}">
<button type="button" class="image-preview-remove" onclick="removeImage(${index})">×</button>
</div>
`,
        )
        .join("");
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

// Handle product form submission
async function handleProductSubmit(e) {
    e.preventDefault();
    let finalImages = [];
    if (productImages.length > 0) {
        finalImages = productImages;
    } else {
        finalImages = getImageUrlsFromInputs();
    }
    if (finalImages.length === 0) {
        await showAdminAlert("Please add at least one product image.", "Missing Image");
        return;
    }
    let priceInput = document.getElementById("productPrice").value;
    let formattedPrice = priceInput;
    const productId = document.getElementById("productId").value;
    const productData = {
        name: document.getElementById("productName").value,
        price: formattedPrice, // Send as string
        description: document.getElementById("productDescription").value,
        images: JSON.stringify(finalImages), // Send as stringified JSON array
        category: document.getElementById("productCategory").value,
    };

    try {
        showLoader(productId ? "Updating product..." : "Adding product..."); // Show loader during submission
        const method = productId ? 'PUT' : 'POST';
        const url = productId ? `/api/products/${productId}` : '/api/products';
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(productData),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` })); // Attempt to read error response
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.success) {
            loadProducts();
            hideProductForm();
            await showAdminAlert(productId ? "Product updated successfully!" : "Product added successfully!", "Success");
        } else {
            throw new Error(result.error || "Failed to save product.");
        }
    } catch (error) {
        console.error("Error saving product:", error); // Log the raw error for debugging
        // Check for the specific error indicating server returned HTML (likely due to payload size)
        if (error.message.includes("DOCTYPE") || error.message.includes("Unexpected token '<'")) {
            await showAdminAlert("File size too large. Please reduce image size and try again.", "File Size Error");
        } else {
            // Handle other potential errors (network issues, server errors returning JSON, etc.)
            await showAdminAlert(`Error saving product: ${error.message}`, "Error");
        }
    } finally {
        hideLoader(); // Always hide loader after submission
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
<td colspan="6" class="empty-state">No orders found</td>
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
        showLoader("Loading order details..."); // Show loader while loading order details
        const order = allOrders.find(o => o.order_id === orderId);
        if (!order) throw new Error("Order not found");

        // Fill meta
        document.getElementById("od-order-id").textContent = `#${order.order_id}`;
        document.getElementById("od-date").textContent =
            new Date(order.date).toLocaleString();
        document.getElementById("od-status").textContent = order.status;
        document.getElementById("od-status").className =
            `status-badge status-${order.status.toLowerCase()}`;

        // Customer
        document.getElementById("od-name").textContent = order.username;
        document.getElementById("od-email").textContent = order.email;
        document.getElementById("od-phone").textContent = order.phone;
        const address = order.delivery_address;
        document.getElementById("od-address").innerHTML = `
${address.street}<br>
${address.city}, ${address.state}<br>
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
        document.getElementById("od-payment").textContent =
            order.payment_status;
        document.getElementById("od-total").textContent =
            formatNaira(order.total);

        // Buttons
        document.getElementById("printOrderBtn").onclick = () => window.print();
        document.getElementById("updateOrderStatusBtn").onclick =
            () => openOrderStatusModal(order.status)
                .then(newStatus => {
                    if (newStatus && newStatus !== order.status) {
                        updateOrderStatus(order.order_id, newStatus);
                    }
                });

        // Open modal
        document.getElementById("orderDetailsModal").style.display = "flex";
    } catch (err) {
        showAdminAlert(err.message, "Order Error");
    } finally {
        hideLoader(); // Hide loader after loading order details
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

// Edit product
async function editProduct(productId) {
    try {
        showLoader("Loading product details..."); // Show loader while loading product details
        const response = await fetch(`/api/products/${productId}`); // Use route param, not query param
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const product = await response.json();
        if (!product) {
            await showAdminAlert("Product not found.", "Error");
            return;
        }
        document.getElementById("productId").value = product.id;
        document.getElementById("productName").value = product.name;
        document.getElementById("productPrice").value = product.price; // Set the raw price string
        document.getElementById("productDescription").value = product.description;
        document.getElementById("productCategory").value = product.category || "";
        if (product.images && product.images.length > 0) {
            // If images are URLs, populate URL inputs
            if (
                product.images[0].startsWith("http") ||
                product.images[0].startsWith("/") ||
                product.images[0].startsWith("images/")
            ) {
                populateImageUrlInputs(product.images);
                productImages = [];
                updateImagePreview();
            } else {
                // If images are base64 (uploaded files), show in preview
                productImages = [...product.images];
                updateImagePreview();
                clearImageUrlInputs();
            }
        } else if (product.image) {
            // Backward compatibility with single image
            populateImageUrlInputs([product.image]);
            productImages = [];
            updateImagePreview();
        }
        currentEditingProductId = productId;
        showProductForm(true);
    } catch (error) {
        console.error("Error fetching product for edit:", error);
        await showAdminAlert(`Error loading product: ${error.message}`, "Error");
    } finally {
        hideLoader(); // Hide loader after loading product details
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
        // Use the same authentication method as the rest of the admin panel
        const token = sessionStorage.getItem("adminToken");
        if (!token) {
            await showAdminAlert("Authentication Error", "Please log in again.");
            return;
        }

        const response = await fetch('/api/admin/messages', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch messages');
        }

        const messages = await response.json();

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
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem;">
                    No messages found.
                </td>
            </tr>
        `;
        return;
    }

    messages.forEach(msg => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${msg.name}</td>
            <td><a href="mailto:${msg.email}">${msg.email}</a></td>
            <td>${msg.subject}</td>
            <td>${new Date(msg.timestamp).toLocaleString()}</td>
            <td>
                <span class="status-badge ${msg.read ? 'status-read' : 'status-unread'}">
                    ${msg.read ? 'Read' : 'Unread'}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewMessage(${msg.id})">View</button>
                ${!msg.read ? `<button class="btn btn-sm btn-secondary" onclick="markAsRead(${msg.id})">Mark as Read</button>` : ''}
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
    const token = sessionStorage.getItem("adminToken");
    try {
        const response = await fetch(`/api/admin/messages/${messageId}/read`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            await showAdminAlert('Success', 'Message marked as read.');
            loadMessages(); // Refresh list
        } else {
            throw new Error('Failed to mark as read');
        }
    } catch (error) {
        console.error('Error marking message as read:', error);
        await showAdminAlert('Error', error.message || 'Failed to mark message as read');
    }
}

async function viewMessage(messageId) {
    const token = sessionStorage.getItem("adminToken");
    try {
        const response = await fetch(`/api/admin/messages/${messageId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch message');
        }

        const message = await response.json();

        // Create or get the modal element specifically for messages
        let messageModal = document.getElementById('messageDetailsModal');
        if (!messageModal) {
            // Create the modal dynamically if it doesn't exist
            messageModal = document.createElement('div');
            messageModal.id = 'messageDetailsModal';
            messageModal.className = 'modal';
            messageModal.style.display = 'none'; // Initially hidden

            // Add close button
            const closeButton = document.createElement('button');
            closeButton.id = 'closeMessageDetailsBtn';
            closeButton.className = 'close-btn';
            closeButton.textContent = '×';

            // Add content container
            const contentContainer = document.createElement('div');
            contentContainer.id = 'messageDetailsContent';
            contentContainer.className = 'modal-content';

            // Assemble the modal
            messageModal.appendChild(closeButton);
            messageModal.appendChild(contentContainer);
            document.body.appendChild(messageModal);

            // Add event listener to close button
            closeButton.addEventListener('click', () => {
                messageModal.style.display = 'none';
            });

            // Close on overlay click
            messageModal.addEventListener('click', (e) => {
                if (e.target === messageModal) {
                    messageModal.style.display = 'none';
                }
            });

            // Close on Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && messageModal.style.display === 'flex') {
                    messageModal.style.display = 'none';
                }
            });
        }

        // Populate modal content
        const content = document.getElementById('messageDetailsContent');
        content.innerHTML = `
            <div class="user-details">
                <h3>${message.subject}</h3>
                <div class="detail-row">
                    <strong>Name:</strong> <span>${message.name}</span>
                </div>
                <div class="detail-row">
                    <strong>Email:</strong> <a href="mailto:${message.email}">${message.email}</a>
                </div>
                <div class="detail-row">
                    <strong>Phone:</strong> <a href="tel:${message.phone}">${message.phone}</a>
                </div>
                <div class="detail-row">
                    <strong>Sent:</strong> <span>${new Date(message.timestamp).toLocaleString()}</span>
                </div>
                <div class="detail-row">
                    <strong>Status:</strong>
                    <span class="status-badge ${message.read ? 'status-read' : 'status-unread'}">
                        ${message.read ? 'Read' : 'Unread'}
                    </span>
                </div>
                <div class="detail-row">
                    <strong>Message:</strong>
                    <pre style="background: #f8f9fa; padding: 1rem; border-radius: 4px; white-space: pre-wrap; font-family: inherit;">${message.message}</pre>
                </div>
            </div>
        `;

        // Show the modal
        messageModal.style.display = 'flex';

    } catch (error) {
        console.error('Error viewing message:', error);
        await showAdminAlert('Error', error.message || 'Failed to view message');
    }
}

// Initialize event listeners for the messages section
document.addEventListener('DOMContentLoaded', () => {
    // Ensure the DOM is fully loaded before adding listeners
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