const API_BASE_URL = "https://phemmy-backend.onrender.com/api"

// Authentication state
let isAuthenticated = false
let currentEditingProductId = null
let productImages = []
let testimonialImage = ""
let newsImage = ""

async function apiRequest(method, endpoint, data = null) {
  try {
    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    }

    if (data) {
      options.body = JSON.stringify(data)
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options)
    if (!response.ok) throw new Error(`API error: ${response.status}`)

    return await response.json()
  } catch (error) {
    console.error(`[v0] API request failed:`, error)
    throw error
  }
}

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
async function showDashboard() {
  document.getElementById("loginContainer").style.display = "none"
  document.getElementById("dashboardContainer").style.display = "flex"
  await loadProducts()
  await loadTestimonials()
  await loadNews()
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
async function loadProducts() {
  const products = await apiRequest("GET", "/products")
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
    name: document.getElementById("productName").value,
    price: document.getElementById("productPrice").value,
    description: document.getElementById("productDescription").value,
    images: finalImages,
    image: finalImages[0],
    category: document.getElementById("productCategory").value,
  }

  try {
    if (productId) {
      await apiRequest("PUT", `/products/${productId}`, productData)
      await showAdminAlert("Product updated successfully!", "Success")
    } else {
      await apiRequest("POST", "/products", productData)
      await showAdminAlert("Product added successfully!", "Success")
    }

    await loadProducts()
    hideProductForm()
  } catch (error) {
    await showAdminAlert(`Error saving product: ${error.message}`, "Error")
  }
}

// Edit product
async function editProduct(productId) {
  const products = await apiRequest("GET", "/products")
  const product = products.find((p) => p.id === productId)

  if (product) {
    document.getElementById("productId").value = product.id
    document.getElementById("productName").value = product.name
    document.getElementById("productPrice").value = product.price
    document.getElementById("productDescription").value = product.description
    document.getElementById("productCategory").value = product.category || ""

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
    try {
      await apiRequest("DELETE", `/products/${productId}`)
      await loadProducts()
      await showAdminAlert("Product deleted successfully!", "Success")
    } catch (error) {
      await showAdminAlert(`Error deleting product: ${error.message}`, "Error")
    }
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
    testimonials: "Testimonial Management",
    news: "News Management",
  }
  document.getElementById("pageTitle").textContent = titles[targetSection]
}

// Handle testimonial form submission
async function handleTestimonialSubmit(e) {
  e.preventDefault()

  const testimonialId = document.getElementById("testimonialId").value

  const finalImage = testimonialImage || document.getElementById("testimonialImageUrl").value || ""

  const testimonialData = {
    name: document.getElementById("testimonialName").value,
    role: document.getElementById("testimonialRole").value,
    text: document.getElementById("testimonialText").value,
    rating: Number.parseInt(document.getElementById("testimonialRating").value),
    image: finalImage,
  }

  try {
    if (testimonialId) {
      await apiRequest("PUT", `/testimonials/${testimonialId}`, testimonialData)
      await showAdminAlert("Testimonial updated!", "Success")
    } else {
      await apiRequest("POST", "/testimonials", testimonialData)
      await showAdminAlert("Testimonial added!", "Success")
    }

    await loadTestimonials()
    hideTestimonialForm()
  } catch (error) {
    await showAdminAlert(`Error saving testimonial: ${error.message}`, "Error")
  }
}

async function editTestimonial(testimonialId) {
  const testimonials = await apiRequest("GET", "/testimonials")
  const testimonial = testimonials.find((t) => t.id === testimonialId)

  if (testimonial) {
    document.getElementById("testimonialId").value = testimonial.id
    document.getElementById("testimonialName").value = testimonial.name
    document.getElementById("testimonialRole").value = testimonial.role
    document.getElementById("testimonialText").value = testimonial.text
    document.getElementById("testimonialRating").value = testimonial.rating

    if (testimonial.image) {
      if (testimonial.image.startsWith("http") || testimonial.image.startsWith("/")) {
        document.getElementById("testimonialImageUrl").value = testimonial.image
        testimonialImage = ""
      } else {
        testimonialImage = testimonial.image
        updateTestimonialImagePreview()
      }
    }

    document.getElementById("testimonialFormTitle").textContent = "Edit Testimonial"
    document.getElementById("testimonialFormContainer").style.display = "block"
  }
}

// Load testimonials
async function loadTestimonials() {
  const testimonials = await apiRequest("GET", "/testimonials")
  const tableBody = document.getElementById("testimonialsTableBody")

  if (testimonials.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5" class="empty-state"><p>No testimonials found.</p></td></tr>`
    return
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
    .join("")
}

// Delete testimonial
async function deleteTestimonial(testimonialId) {
  const confirmed = await showAdminConfirm("Delete this testimonial?", "Delete Testimonial")
  if (confirmed) {
    try {
      await apiRequest("DELETE", `/testimonials/${testimonialId}`)
      await loadTestimonials()
      await showAdminAlert("Testimonial deleted!", "Success")
    } catch (error) {
      await showAdminAlert(`Error deleting testimonial: ${error.message}`, "Error")
    }
  }
}

// Hide testimonial form
function hideTestimonialForm() {
  document.getElementById("testimonialFormContainer").style.display = "none"
  document.getElementById("testimonialForm").reset()
  document.getElementById("testimonialId").value = ""
  testimonialImage = ""
  updateTestimonialImagePreview()
}

// Show testimonial form
function showTestimonialForm() {
  document.getElementById("testimonialFormTitle").textContent = "Add Testimonial"
  document.getElementById("testimonialFormContainer").style.display = "block"
  document.getElementById("testimonialForm").reset()
}

function handleTestimonialImageSelect(e) {
  const files = e.target.files
  if (files.length > 0 && files[0].type.startsWith("image/")) {
    const reader = new FileReader()
    reader.onload = (event) => {
      testimonialImage = event.target.result
      updateTestimonialImagePreview()
    }
    reader.readAsDataURL(files[0])
  }
  e.target.value = ""
}

function updateTestimonialImagePreview() {
  const container = document.getElementById("testimonialImagePreview")
  if (testimonialImage) {
    container.innerHTML = `
      <div class="profile-image-preview-item">
        <img src="${testimonialImage}" alt="Testimonial image">
        <button type="button" class="image-preview-remove" onclick="removeTestimonialImage()">×</button>
      </div>
    `
  } else {
    container.innerHTML = ""
  }
}

function removeTestimonialImage() {
  testimonialImage = ""
  updateTestimonialImagePreview()
  document.getElementById("testimonialImageUrl").value = ""
}

// Handle news form submission
async function handleNewsSubmit(e) {
  e.preventDefault()

  const newsId = document.getElementById("newsId").value

  const finalImage = newsImage || document.getElementById("newsImage").value || ""

  const newsData = {
    title: document.getElementById("newsTitle").value,
    description: document.getElementById("newsDescription").value,
    fullContent: document.getElementById("newsContent").value,
    body: document.getElementById("newsContent").value,
    image: finalImage,
    date: formatDate(document.getElementById("newsDate").value),
  }

  try {
    if (newsId) {
      await apiRequest("PUT", `/news/${newsId}`, newsData)
      await showAdminAlert("Article updated!", "Success")
    } else {
      await apiRequest("POST", "/news", newsData)
      await showAdminAlert("Article added!", "Success")
    }

    await loadNews()
    hideNewsForm()
  } catch (error) {
    await showAdminAlert(`Error saving article: ${error.message}`, "Error")
  }
}

// Load news
async function loadNews() {
  const newsList = await apiRequest("GET", "/news")
  const tableBody = document.getElementById("newsTableBody")

  if (newsList.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="4" class="empty-state"><p>No articles found.</p></td></tr>`
    return
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
    .join("")
}

// Edit news
async function editNews(newsId) {
  const newsList = await apiRequest("GET", "/news")
  const news = newsList.find((n) => n.id === newsId)

  if (news) {
    document.getElementById("newsId").value = news.id
    document.getElementById("newsTitle").value = news.title
    document.getElementById("newsDescription").value = news.description
    document.getElementById("newsContent").value = news.fullContent || news.body || news.description
    document.getElementById("newsImage").value = news.image || ""
    document.getElementById("newsDate").value = reverseDateFormat(news.date)
    document.getElementById("newsFormTitle").textContent = "Edit Article"
    document.getElementById("newsFormContainer").style.display = "block"

    if (news.image) {
      if (news.image.startsWith("http") || news.image.startsWith("/")) {
        document.getElementById("newsImage").value = news.image
        newsImage = ""
      } else {
        newsImage = news.image
        updateNewsImagePreview()
      }
    }
  }
}

// Delete news
async function deleteNews(newsId) {
  const confirmed = await showAdminConfirm("Delete this article?", "Delete Article")
  if (confirmed) {
    try {
      await apiRequest("DELETE", `/news/${newsId}`)
      await loadNews()
      await showAdminAlert("Article deleted!", "Success")
    } catch (error) {
      await showAdminAlert(`Error deleting article: ${error.message}`, "Error")
    }
  }
}

// Hide news form
function hideNewsForm() {
  document.getElementById("newsFormContainer").style.display = "none"
  document.getElementById("newsForm").reset()
  document.getElementById("newsId").value = ""
  newsImage = ""
  updateNewsImagePreview()
}

// Show news form
function showNewsForm() {
  document.getElementById("newsFormTitle").textContent = "Add News Article"
  document.getElementById("newsFormContainer").style.display = "block"
  document.getElementById("newsForm").reset()
}

function handleNewsImageSelect(e) {
  const files = e.target.files
  if (files.length > 0 && files[0].type.startsWith("image/")) {
    const reader = new FileReader()
    reader.onload = (event) => {
      newsImage = event.target.result
      updateNewsImagePreview()
    }
    reader.readAsDataURL(files[0])
  }
  e.target.value = ""
}

function updateNewsImagePreview() {
  const container = document.getElementById("newsImagePreview")
  if (newsImage) {
    container.innerHTML = `
      <div class="image-preview-item">
        <img src="${newsImage}" alt="News image">
        <button type="button" class="image-preview-remove" onclick="removeNewsImage()">×</button>
      </div>
    `
  } else {
    container.innerHTML = ""
  }
}

function removeNewsImage() {
  newsImage = ""
  updateNewsImagePreview()
  document.getElementById("newsImage").value = ""
}

// Date formatting utilities
function formatDate(dateString) {
  const date = new Date(dateString)
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

function reverseDateFormat(formattedDate) {
  const date = new Date(formattedDate)
  return date.toISOString().split("T")[0]
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

  const addTestimonialBtn = document.getElementById("addTestimonialBtn")
  if (addTestimonialBtn) {
    addTestimonialBtn.addEventListener("click", showTestimonialForm)
  }

  const closeTestimonialFormBtn = document.getElementById("closeTestimonialFormBtn")
  if (closeTestimonialFormBtn) {
    closeTestimonialFormBtn.addEventListener("click", hideTestimonialForm)
  }

  const cancelTestimonialFormBtn = document.getElementById("cancelTestimonialFormBtn")
  if (cancelTestimonialFormBtn) {
    cancelTestimonialFormBtn.addEventListener("click", hideTestimonialForm)
  }

  const testimonialForm = document.getElementById("testimonialForm")
  if (testimonialForm) {
    testimonialForm.addEventListener("submit", handleTestimonialSubmit)
  }

  const selectTestimonialImageBtn = document.getElementById("selectTestimonialImageBtn")
  const testimonialImageInput = document.getElementById("testimonialImageInput")

  if (selectTestimonialImageBtn && testimonialImageInput) {
    selectTestimonialImageBtn.addEventListener("click", () => {
      testimonialImageInput.click()
    })
    testimonialImageInput.addEventListener("change", handleTestimonialImageSelect)
  }

  const addNewsBtn = document.getElementById("addNewsBtn")
  if (addNewsBtn) {
    addNewsBtn.addEventListener("click", showNewsForm)
  }

  const closeNewsFormBtn = document.getElementById("closeNewsFormBtn")
  if (closeNewsFormBtn) {
    closeNewsFormBtn.addEventListener("click", hideNewsForm)
  }

  const cancelNewsFormBtn = document.getElementById("cancelNewsFormBtn")
  if (cancelNewsFormBtn) {
    cancelNewsFormBtn.addEventListener("click", hideNewsForm)
  }

  const newsForm = document.getElementById("newsForm")
  if (newsForm) {
    newsForm.addEventListener("submit", handleNewsSubmit)
  }

  const selectNewsImageBtn = document.getElementById("selectNewsImageBtn")
  const newsImageInput = document.getElementById("newsImageInput")

  if (selectNewsImageBtn && newsImageInput) {
    selectNewsImageBtn.addEventListener("click", () => {
      newsImageInput.click()
    })
    newsImageInput.addEventListener("change", handleNewsImageSelect)
  }

  // Load all data
  loadProducts()
  loadTestimonials()
  loadNews()
})
