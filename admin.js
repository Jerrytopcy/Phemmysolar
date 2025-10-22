// Authentication state
let isAuthenticated = false
let currentEditingProductId = null
let productImages = []

// Custom Alert Modal
function showAdminAlert(message, title = "Alert") {
  return new Promise((resolve) => {
    const modal = document.getElementById("adminAlertModal")
    const titleEl = document.getElementById("adminAlertTitle")
    const messageEl = document.getElementById("adminAlertMessage")
    const okBtn = document.getElementById("adminAlertOkBtn")

    titleEl.textContent = title
    messageEl.textContent = message
    modal.classList.add("active")

    const handleOk = () => {
      modal.classList.remove("active")
      okBtn.removeEventListener("click", handleOk)
      resolve(true)
    }

    okBtn.addEventListener("click", handleOk)

    // Close on overlay click
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        handleOk()
      }
    })

    // Close on Escape key
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        handleOk()
        document.removeEventListener("keydown", handleEscape)
      }
    }
    document.addEventListener("keydown", handleEscape)
  })
}

// Custom Confirm Modal
function showAdminConfirm(message, title = "Confirm Action") {
  return new Promise((resolve) => {
    const modal = document.getElementById("adminConfirmModal")
    const titleEl = document.getElementById("adminConfirmTitle")
    const messageEl = document.getElementById("adminConfirmMessage")
    const okBtn = document.getElementById("adminConfirmOkBtn")
    const cancelBtn = document.getElementById("adminConfirmCancelBtn")

    titleEl.textContent = title
    messageEl.textContent = message
    modal.classList.add("active")

    const handleOk = () => {
      modal.classList.remove("active")
      cleanup()
      resolve(true)
    }

    const handleCancel = () => {
      modal.classList.remove("active")
      cleanup()
      resolve(false)
    }

    const cleanup = () => {
      okBtn.removeEventListener("click", handleOk)
      cancelBtn.removeEventListener("click", handleCancel)
    }

    okBtn.addEventListener("click", handleOk)
    cancelBtn.addEventListener("click", handleCancel)

    // Close on overlay click (counts as cancel)
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        handleCancel()
      }
    })

    // Close on Escape key (counts as cancel)
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        handleCancel()
        document.removeEventListener("keydown", handleEscape)
      }
    }
    document.addEventListener("keydown", handleEscape)
  })
}

// Check authentication on page load
function checkAuth() {
  const authStatus = sessionStorage.getItem("adminAuth")
  if (authStatus === "true") {
    isAuthenticated = true
    showDashboard()
  } else {
    showLogin()
  }
}

// Show login page
function showLogin() {
  document.getElementById("loginContainer").style.display = "flex"
  document.getElementById("dashboardContainer").style.display = "none"
}

// Show dashboard
function showDashboard() {
  document.getElementById("loginContainer").style.display = "none"
  document.getElementById("dashboardContainer").style.display = "flex"
  loadProducts()
}

// Handle login
function handleLogin(e) {
  e.preventDefault()

  const username = document.getElementById("username").value
  const password = document.getElementById("password").value
  const errorMessage = document.getElementById("errorMessage")

  // Simple authentication (in production, this should be server-side)
  if (username === "admin" && password === "admin123") {
    isAuthenticated = true
    sessionStorage.setItem("adminAuth", "true")
    showDashboard()
    errorMessage.textContent = ""
  } else {
    errorMessage.textContent = "Invalid username or password"
  }
}

// Handle logout
async function handleLogout() {
  const confirmed = await showAdminConfirm("Are you sure you want to logout?", "Confirm Logout")
  if (confirmed) {
    isAuthenticated = false
    sessionStorage.removeItem("adminAuth")
    showLogin()
  }
}

// Load products into table
function loadProducts() {
  const products = JSON.parse(localStorage.getItem("solarProducts") || "[]")
  const tableBody = document.getElementById("productsTableBody")

  if (products.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">
          <p>No products found. Add your first product!</p>
        </td>
      </tr>
    `
    return
  }

  tableBody.innerHTML = products
    .map((product) => {
      const firstImage = product.images ? product.images[0] : product.image
      return `
          <tr>
            <td><img src="${firstImage}" alt="${product.name}" class="product-image-thumb"></td>
            <td>${product.name}</td>
            <td>${product.price}</td>
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
    .join("")
}

// Show product form
function showProductForm(isEdit = false) {
  const formContainer = document.getElementById("productFormContainer")
  const formTitle = document.getElementById("formTitle")

  formTitle.textContent = isEdit ? "Edit Product" : "Add New Product"
  formContainer.style.display = "block"

  if (!isEdit) {
    document.getElementById("productForm").reset()
    document.getElementById("productId").value = ""
    currentEditingProductId = null
    productImages = []
    updateImagePreview()
    clearImageUrlInputs()
  }
}

// Hide product form
function hideProductForm() {
  document.getElementById("productFormContainer").style.display = "none"
  document.getElementById("productForm").reset()
  currentEditingProductId = null
  productImages = []
  updateImagePreview()
  clearImageUrlInputs()
}

function handleImageSelect(e) {
  const files = e.target.files

  if (files.length + productImages.length > 5) {
    showAdminAlert("You can only upload up to 5 images per product.", "Upload Limit")
    return
  }

  Array.from(files).forEach((file) => {
    if (file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = (event) => {
        productImages.push(event.target.result)
        updateImagePreview()
      }
      reader.readAsDataURL(file)
    }
  })

  // Reset file input
  e.target.value = ""
}

function removeImage(index) {
  productImages.splice(index, 1)
  updateImagePreview()
}

function updateImagePreview() {
  const container = document.getElementById("imagePreviewContainer")

  if (productImages.length === 0) {
    container.innerHTML = ""
    return
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
    .join("")
}

function getImageUrlsFromInputs() {
  const inputs = document.querySelectorAll(".image-url-input")
  const urls = []

  inputs.forEach((input) => {
    const value = input.value.trim()
    if (value) {
      urls.push(value)
    }
  })

  return urls
}

function clearImageUrlInputs() {
  document.querySelectorAll(".image-url-input").forEach((input) => {
    input.value = ""
  })
}

function populateImageUrlInputs(images) {
  const inputs = document.querySelectorAll(".image-url-input")
  images.forEach((img, index) => {
    if (inputs[index]) {
      inputs[index].value = img
    }
  })
}

// Handle product form submission
async function handleProductSubmit(e) {
  e.preventDefault()

  const products = JSON.parse(localStorage.getItem("solarProducts") || "[]")
  const productId = document.getElementById("productId").value

  let finalImages = []

  if (productImages.length > 0) {
    finalImages = productImages
  } else {
    finalImages = getImageUrlsFromInputs()
  }

  if (finalImages.length === 0) {
    await showAdminAlert("Please add at least one product image.", "Missing Image")
    return
  }

  const productData = {
    id: productId ? Number.parseInt(productId) : Date.now(),
    name: document.getElementById("productName").value,
    price: document.getElementById("productPrice").value,
    description: document.getElementById("productDescription").value,
    images: finalImages,
    image: finalImages[0],
  }

  if (productId) {
    const index = products.findIndex((p) => p.id === Number.parseInt(productId))
    if (index !== -1) {
      products[index] = productData
    }
  } else {
    products.push(productData)
  }

  localStorage.setItem("solarProducts", JSON.stringify(products))
  loadProducts()
  hideProductForm()

  await showAdminAlert(productId ? "Product updated successfully!" : "Product added successfully!", "Success")
}

// Edit product
function editProduct(productId) {
  const products = JSON.parse(localStorage.getItem("solarProducts") || "[]")
  const product = products.find((p) => p.id === productId)

  if (product) {
    document.getElementById("productId").value = product.id
    document.getElementById("productName").value = product.name
    document.getElementById("productPrice").value = product.price
    document.getElementById("productDescription").value = product.description

    if (product.images && product.images.length > 0) {
      // If images are URLs, populate URL inputs
      if (
        product.images[0].startsWith("http") ||
        product.images[0].startsWith("/") ||
        product.images[0].startsWith("images/")
      ) {
        populateImageUrlInputs(product.images)
        productImages = []
        updateImagePreview()
      } else {
        // If images are base64 (uploaded files), show in preview
        productImages = [...product.images]
        updateImagePreview()
        clearImageUrlInputs()
      }
    } else if (product.image) {
      // Backward compatibility with single image
      populateImageUrlInputs([product.image])
      productImages = []
      updateImagePreview()
    }

    currentEditingProductId = productId
    showProductForm(true)
  }
}

// Delete product
async function deleteProduct(productId) {
  const confirmed = await showAdminConfirm(
    "Are you sure you want to delete this product? This action cannot be undone.",
    "Delete Product",
  )

  if (confirmed) {
    let products = JSON.parse(localStorage.getItem("solarProducts") || "[]")
    products = products.filter((p) => p.id !== productId)
    localStorage.setItem("solarProducts", JSON.stringify(products))
    loadProducts()
    await showAdminAlert("Product deleted successfully!", "Success")
  }
}

// Handle section navigation
function handleNavigation(e) {
  e.preventDefault()

  const navItems = document.querySelectorAll(".nav-item")
  const sections = document.querySelectorAll(".content-section")
  const targetSection = e.currentTarget.dataset.section

  navItems.forEach((item) => item.classList.remove("active"))
  e.currentTarget.classList.add("active")

  sections.forEach((section) => {
    section.style.display = "none"
  })

  document.getElementById(`${targetSection}Section`).style.display = "block"

  // Update page title
  const titles = {
    products: "Product Management",
    settings: "Settings",
  }
  document.getElementById("pageTitle").textContent = titles[targetSection]
}

// Initialize admin panel
document.addEventListener("DOMContentLoaded", () => {
  checkAuth()

  // Login form
  const loginForm = document.getElementById("loginForm")
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin)
  }

  // Logout button
  const logoutBtn = document.getElementById("logoutBtn")
  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout)
  }

  // Add product button
  const addProductBtn = document.getElementById("addProductBtn")
  if (addProductBtn) {
    addProductBtn.addEventListener("click", () => showProductForm(false))
  }

  // Close form button
  const closeFormBtn = document.getElementById("closeFormBtn")
  if (closeFormBtn) {
    closeFormBtn.addEventListener("click", hideProductForm)
  }

  // Cancel form button
  const cancelFormBtn = document.getElementById("cancelFormBtn")
  if (cancelFormBtn) {
    cancelFormBtn.addEventListener("click", hideProductForm)
  }

  // Product form submission
  const productForm = document.getElementById("productForm")
  if (productForm) {
    productForm.addEventListener("submit", handleProductSubmit)
  }

  // Navigation items
  const navItems = document.querySelectorAll(".nav-item")
  navItems.forEach((item) => {
    item.addEventListener("click", handleNavigation)
  })

  const selectImagesBtn = document.getElementById("selectImagesBtn")
  const imageInput = document.getElementById("imageInput")

  if (selectImagesBtn && imageInput) {
    selectImagesBtn.addEventListener("click", () => {
      imageInput.click()
    })

    imageInput.addEventListener("change", handleImageSelect)
  }
})
