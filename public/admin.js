// admin.js
// Authentication state
let isAuthenticated = false;
let currentEditingProductId = null;
let productImages = [];
let testimonialImage = "";
let newsImage = "";
let currentEditingUserId = null;

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
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: username,
        password: password,
        action: 'login'
      }),
    });

    const result = await response.json();

    if (result.success) {
      isAuthenticated = true;
      sessionStorage.setItem("adminAuth", "true");
      showDashboard();
      errorMessage.textContent = "";
    } else {
      errorMessage.textContent = result.error || "Invalid username or password";
    }
  } catch (error) {
    console.error("Login error:", error);
    errorMessage.textContent = "An error occurred. Please try again.";
  }
}

// Handle logout
async function handleLogout() {
  const confirmed = await showAdminConfirm("Are you sure you want to logout?", "Confirm Logout");
  if (confirmed) {
    isAuthenticated = false;
    sessionStorage.removeItem("adminAuth");
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
// ... (inside admin.js)

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
  }
}

// ... (rest of admin.js remains the same)

// Edit product
async function editProduct(productId) {
  try {
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
    settings: "Settings",
    testimonials: "Testimonial Management",
    news: "News Management",
    users: "User Management"
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
    loadUsers(); // Add this line to load users when users section is opened
  }
}

// Handle testimonial form submission
// ... (inside admin.js, find handleTestimonialSubmit)

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
  }
}

// ... (rest of admin.js remains the same)

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
  }
}

// Delete testimonial
async function deleteTestimonial(testimonialId) {
  const confirmed = await showAdminConfirm("Delete this testimonial?", "Delete Testimonial");
  if (confirmed) {
    try {
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
// ... (inside admin.js, find handleNewsSubmit)

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
  }
}

// ... (rest of admin.js remains the same)

// Load news
async function loadNews() {
  const tableBody = document.getElementById("newsTableBody");
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
async function loadUsers() {
  const tableBody = document.getElementById("usersTableBody");
  try {
    const response = await fetch('/api/users');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const users = await response.json(); // Assuming your API returns an array of users
    if (users.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">
            <p>No users found.</p>
          </td>
        </tr>
      `;
      return;
    }
    tableBody.innerHTML = users
      .map((user) => {
        // Format address for display
        const address = user.address || { street: "", city: "", state: "", postalCode: "", country: "Nigeria" };
        const fullAddress = `${address.street}, ${address.city}, ${address.state} ${address.postalCode}, ${address.country}`;
        return `
            <tr>
              <td>${user.username}</td>
              <td>${user.email || "Not set"}</td>
              <td>${user.phone || "Not set"}</td>
              <td>${fullAddress}</td>
              <td>${user.orders ? user.orders.length : 0}</td>
              <td>
                <div class="product-actions">
                  <button class="btn-edit" onclick="editUser(${user.id})">Edit</button>
                  <button class="btn-delete" onclick="deleteUser(${user.id})">Delete</button>
                </div>
              </td>
            </tr>
          `
      })
      .join("");
  } catch (error) {
    console.error("Error loading users:", error);
    tableBody.innerHTML = `<tr><td colspan="6" class="error-message"><p>Error loading users: ${error.message}</p></td></tr>`;
  }
}

// Show user form
function showUserForm(isEdit = false) {
  const formContainer = document.getElementById("userFormContainer");
  const formTitle = document.getElementById("userFormTitle");
  formTitle.textContent = isEdit ? "Edit User" : "Add New User";
  formContainer.style.display = "flex";
  if (!isEdit) {
    document.getElementById("userForm").reset();
    document.getElementById("userId").value = "";
    currentEditingUserId = null;
  }
}

// Hide user form
function hideUserForm() {
  document.getElementById("userFormContainer").style.display = "none";
  document.getElementById("userForm").reset();
  currentEditingUserId = null;
}

// Handle user form submission
async function handleUserSubmit(e) {
  e.preventDefault();
  const userId = document.getElementById("userId").value;
  const userData = {
    username: document.getElementById("username").value,
    passwordHash: hashPassword(document.getElementById("password").value), // Use your existing hashPassword function
    email: document.getElementById("email").value,
    phone: document.getElementById("phone").value,
    address: {
      street: document.getElementById("street").value,
      city: document.getElementById("city").value,
      state: document.getElementById("state").value,
      postalCode: document.getElementById("postalCode").value,
      country: "Nigeria"
    },
    role: document.getElementById("userRole").value || 'user' // Add role field
  };

  try {
    const method = userId ? 'PUT' : 'POST'; // Use PUT for updates, POST for new
    const url = userId ? `/api/users/${userId}` : '/api/users'; // Use route param, not query param
    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    if (result.success) {
      loadUsers(); // Reload the user list
      hideUserForm(); // Close the form
      await showAdminAlert(userId ? "User updated successfully!" : "User added successfully!", "Success");
    } else {
      throw new Error(result.error || "Failed to save user.");
    }
  } catch (error) {
    console.error("Error saving user:", error);
    await showAdminAlert(`Error saving user: ${error.message}`, "Error");
  }
}

// Edit user
function editUser(userId) {
  fetch(`/api/users/${userId}`) // Use route param, not query param
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
      document.getElementById("userId").value = user.id;
      document.getElementById("username").value = user.username;
      document.getElementById("email").value = user.email || "";
      document.getElementById("phone").value = user.phone || "";
      document.getElementById("userRole").value = user.role || 'user'; // Load role
      // Pre-fill address fields
      const address = user.address || { street: "", city: "", state: "", postalCode: "" };
      document.getElementById("street").value = address.street || "";
      document.getElementById("city").value = address.city || "";
      document.getElementById("state").value = address.state || "";
      document.getElementById("postalCode").value = address.postalCode || "";
      currentEditingUserId = userId;
      showUserForm(true);
    })
    .catch(error => {
      console.error("Error fetching user for edit:", error);
      showAdminAlert(`Error loading user: ${error.message}`, "Error");
    });
}

// Delete user
async function deleteUser(userId) {
  const confirmed = await showAdminConfirm(
    "Are you sure you want to delete this user? This action cannot be undone.",
    "Delete User",
  );
  if (confirmed) {
    try {
      const response = await fetch(`/api/users/${userId}`, { // Use route param, not query param
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (result.success) {
        loadUsers(); // Reload the user list
        await showAdminAlert("User deleted successfully!", "Success");
      } else {
        throw new Error(result.error || "Failed to delete user.");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      await showAdminAlert(`Error deleting user: ${error.message}`, "Error");
    }
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

// Initialize admin panel
document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
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
    // Add these event listeners inside the DOMContentLoaded block
  // Add user button
  const addUserBtn = document.getElementById("addUserBtn");
  if (addUserBtn) {
      addUserBtn.addEventListener("click", () => showUserForm(false));
  }
  // Close user form button
  const closeUserFormBtn = document.getElementById("closeUserFormBtn");
  if (closeUserFormBtn) {
      closeUserFormBtn.addEventListener("click", hideUserForm);
  }
  // Cancel user form button
  const cancelUserFormBtn = document.getElementById("cancelUserFormBtn");
  if (cancelUserFormBtn) {
      cancelUserFormBtn.addEventListener("click", hideUserForm);
  }
  // User form submission
  const userForm = document.getElementById("userForm");
  if (userForm) {
      userForm.addEventListener("submit", handleUserSubmit);
  }
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
});
