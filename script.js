const API_BASE_URL = "https://phemmy-backend.onrender.com/api"

// Global variables for search and sort
const allProducts = []
let filteredProducts = []
let currentProductInModal = null
let currentImageIndex = 0

// Fetch data from backend
async function fetchData(endpoint) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`)
    if (!response.ok) throw new Error(`Failed to fetch from ${endpoint}`)
    return await response.json()
  } catch (error) {
    console.error(`[v0] Error fetching ${endpoint}:`, error)
    return []
  }
}

// Load and display featured products
async function loadFeaturedProducts() {
  const featuredContainer = document.getElementById("featuredProducts")
  if (!featuredContainer) return

  const products = await fetchData("/products")
  const featured = products.slice(0, 3)

  if (featured.length === 0) {
    featuredContainer.innerHTML = '<p class="empty-state">No products available</p>'
    return
  }

  featuredContainer.innerHTML = featured
    .map(
      (product) => `
        <div class="product-card">
          <img src="${product.images?.[0] || product.image}" alt="${product.name}" class="product-image">
          <div class="product-info">
            <h3 class="product-name">${product.name}</h3>
            <p class="product-price">${product.price}</p>
            <p class="product-description">${product.description.substring(0, 80)}...</p>
            <button class="btn product-btn" onclick="viewProduct(${product.id})">View Details</button>
          </div>
        </div>
      `,
    )
    .join("")
}

// Load and display testimonials
async function loadTestimonials() {
  const testimonialContainer = document.getElementById("testimonialsGrid")
  if (!testimonialContainer) return

  const testimonials = await fetchData("/testimonials")

  if (testimonials.length === 0) {
    testimonialContainer.innerHTML = '<p class="empty-state">No testimonials available</p>'
    return
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
    .join("")
}

// Load and display latest news
async function loadLatestNews() {
  const newsContainer = document.getElementById("latestNews")
  if (!newsContainer) return

  const news = await fetchData("/news")
  const latest = news.slice(0, 4)

  if (latest.length === 0) {
    newsContainer.innerHTML = '<p class="empty-state">No news available</p>'
    return
  }

  newsContainer.innerHTML = latest
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
    .join("")
}

// Search functionality
async function handleSearch(e) {
  const searchTerm = e.target.value.toLowerCase()

  filteredProducts = allProducts.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm) || product.description.toLowerCase().includes(searchTerm),
  )

  applySorting()
  displayProducts(filteredProducts)
}

// Sort functionality
function handleSort(e) {
  applySorting()
  displayProducts(filteredProducts)
}

function applySorting() {
  const sortValue = document.getElementById("sortSelect").value

  switch (sortValue) {
    case "name-asc":
      filteredProducts.sort((a, b) => a.name.localeCompare(b.name))
      break
    case "name-desc":
      filteredProducts.sort((a, b) => b.name.localeCompare(a.name))
      break
    case "price-asc":
      filteredProducts.sort((a, b) => {
        const priceA = Number.parseInt(a.price.replace(/[^0-9]/g, ""))
        const priceB = Number.parseInt(b.price.replace(/[^0-9]/g, ""))
        return priceA - priceB
      })
      break
    case "price-desc":
      filteredProducts.sort((a, b) => {
        const priceA = Number.parseInt(a.price.replace(/[^0-9]/g, ""))
        const priceB = Number.parseInt(b.price.replace(/[^0-9]/g, ""))
        return priceB - priceA
      })
      break
    default:
      // Default order (by ID)
      filteredProducts.sort((a, b) => a.id - b.id)
  }
}

function displayProducts(products) {
  const container = document.getElementById("productsGrid")
  if (!container) return

  if (products.length === 0) {
    container.innerHTML = '<p class="empty-state">No products found</p>'
    return
  }

  container.innerHTML = products
    .map(
      (product) => `
        <div class="product-card">
          <img src="${product.images?.[0] || product.image}" alt="${product.name}" class="product-image">
          <div class="product-info">
            <h3 class="product-name">${product.name}</h3>
            <p class="product-price">${product.price}</p>
            <p class="product-description">${product.description.substring(0, 80)}...</p>
            <button class="btn product-btn" onclick="viewProduct(${product.id})">View Details</button>
          </div>
        </div>
      `,
    )
    .join("")
}

// Custom modal functions
function showCustomAlert(message, title = "Success", type = "success") {
  const modal = document.getElementById("alertModal")
  const alertIcon = document.getElementById("alertIcon")
  const alertTitle = document.getElementById("alertTitle")
  const alertMessage = document.getElementById("alertMessage")

  alertTitle.textContent = title
  alertMessage.textContent = message
  alertIcon.textContent = type === "success" ? "✓" : "✕"
  alertIcon.className = `alert-icon ${type}`

  modal.classList.add("active")
  document.body.style.overflow = "hidden"
}

function showCustomConfirm(message, title = "Confirm Action", onConfirm) {
  const modal = document.getElementById("confirmModal")
  const confirmTitle = document.getElementById("confirmTitle")
  const confirmMessage = document.getElementById("confirmMessage")
  const confirmYes = document.getElementById("confirmYes")
  const confirmNo = document.getElementById("confirmNo")

  confirmTitle.textContent = title
  confirmMessage.textContent = message

  modal.classList.add("active")
  document.body.style.overflow = "hidden"

  // Remove old listeners
  const newYes = confirmYes.cloneNode(true)
  const newNo = confirmNo.cloneNode(true)
  confirmYes.parentNode.replaceChild(newYes, confirmYes)
  confirmNo.parentNode.replaceChild(newNo, confirmNo)

  // Add new listeners
  newYes.addEventListener("click", () => {
    modal.classList.remove("active")
    document.body.style.overflow = ""
    if (onConfirm) onConfirm()
  })

  newNo.addEventListener("click", () => {
    modal.classList.remove("active")
    document.body.style.overflow = ""
  })
}

// View product details in modal
async function viewProduct(productId) {
  const products = await fetchData("/products")
  const product = products.find((p) => p.id === productId)

  if (product) {
    currentProductInModal = product
    currentImageIndex = 0

    if (!product.images) {
      product.images = [product.image]
    }

    const modal = document.getElementById("productModal")
    const mainImage = document.getElementById("modalMainImage")
    const productName = document.getElementById("modalProductName")
    const productPrice = document.getElementById("modalProductPrice")
    const productDescription = document.getElementById("modalProductDescription")
    const thumbnailContainer = document.getElementById("thumbnailContainer")

    productName.textContent = product.name
    productPrice.textContent = product.price
    productDescription.textContent = product.description
    mainImage.src = product.images[0]
    mainImage.alt = product.name

    thumbnailContainer.innerHTML = product.images
      .map(
        (img, index) => `
      <div class="thumbnail ${index === 0 ? "active" : ""}" onclick="changeImage(${index})">
        <img src="${img}" alt="${product.name} ${index + 1}">
      </div>
    `,
      )
      .join("")

    updateGalleryNav()

    modal.classList.add("active")
    document.body.style.overflow = "hidden"
  }
}

function changeImage(index) {
  if (!currentProductInModal) return

  if (index < 0 || index >= currentProductInModal.images.length) {
    return
  }

  currentImageIndex = index
  const mainImage = document.getElementById("modalMainImage")
  mainImage.src = currentProductInModal.images[index]

  document.querySelectorAll(".thumbnail").forEach((thumb, i) => {
    thumb.classList.toggle("active", i === index)
  })

  updateGalleryNav()
}

function updateGalleryNav() {
  if (!currentProductInModal) return

  const prevBtn = document.getElementById("prevImage")
  const nextBtn = document.getElementById("nextImage")

  prevBtn.disabled = currentImageIndex === 0
  nextBtn.disabled = currentImageIndex === currentProductInModal.images.length - 1
}

function navigateGallery(direction) {
  if (!currentProductInModal) return

  const newIndex = currentImageIndex + direction

  if (newIndex >= 0 && newIndex < currentProductInModal.images.length) {
    currentImageIndex = newIndex
    const mainImage = document.getElementById("modalMainImage")
    mainImage.src = currentProductInModal.images[newIndex]

    document.querySelectorAll(".thumbnail").forEach((thumb, i) => {
      thumb.classList.toggle("active", i === newIndex)
    })

    updateGalleryNav()
  }
}

function closeProductModal() {
  const modal = document.getElementById("productModal")
  modal.classList.remove("active")
  document.body.style.overflow = ""
  currentProductInModal = null
  currentImageIndex = 0
}

// Mobile menu initialization
function initMobileMenu() {
  const mobileMenuBtn = document.getElementById("mobileMenuBtn")
  const nav = document.getElementById("navMenu")
  const navOverlay = document.getElementById("navOverlay")
  let isMenuOpen = false

  function toggleMobileMenu() {
    isMenuOpen = !isMenuOpen
    mobileMenuBtn.classList.toggle("active", isMenuOpen)
    nav.classList.toggle("active", isMenuOpen)
    navOverlay.classList.toggle("active", isMenuOpen)
    document.body.style.overflow = isMenuOpen ? "hidden" : ""
  }

  window.closeMobileMenu = () => {
    if (isMenuOpen) {
      isMenuOpen = false
      mobileMenuBtn.classList.remove("active")
      nav.classList.remove("active")
      navOverlay.classList.remove("active")
      document.body.style.overflow = ""
    }
  }

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener("click", toggleMobileMenu)
  }

  if (navOverlay) {
    navOverlay.addEventListener("click", window.closeMobileMenu)
  }

  // Mobile dropdown menus
  const dropdownToggles = document.querySelectorAll(".dropdown-toggle")
  dropdownToggles.forEach((toggle) => {
    toggle.addEventListener("click", (e) => {
      if (window.innerWidth <= 768) {
        e.preventDefault()
        const dropdown = toggle.closest(".nav-dropdown")
        const isActive = dropdown.classList.contains("active")

        document.querySelectorAll(".nav-dropdown.active").forEach((d) => {
          if (d !== dropdown) d.classList.remove("active")
        })

        dropdown.classList.toggle("active", !isActive)
      }
    })
  })

  let resizeTimer
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      if (window.innerWidth > 768 && isMenuOpen) {
        window.closeMobileMenu()
      }
    }, 250)
  })

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isMenuOpen) {
      window.closeMobileMenu()
    }
  })
}

// Initialize everything when DOM is loaded
document.addEventListener("DOMContentLoaded", async () => {
  await loadFeaturedProducts()
  await loadTestimonials()
  await loadLatestNews()
  initMobileMenu()

  // Modal event listeners
  const closeModal = document.getElementById("closeModal")
  if (closeModal) {
    closeModal.addEventListener("click", closeProductModal)
  }

  const prevImage = document.getElementById("prevImage")
  if (prevImage) {
    prevImage.addEventListener("click", () => navigateGallery(-1))
  }

  const nextImage = document.getElementById("nextImage")
  if (nextImage) {
    nextImage.addEventListener("click", () => navigateGallery(1))
  }

  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.classList.remove("active")
        document.body.style.overflow = ""
      }
    })
  })

  const alertOk = document.getElementById("alertOk")
  if (alertOk) {
    alertOk.addEventListener("click", () => {
      document.getElementById("alertModal").classList.remove("active")
      document.body.style.overflow = ""
    })
  }

  document.addEventListener("keydown", (e) => {
    if (document.getElementById("productModal")?.classList.contains("active")) {
      if (e.key === "ArrowLeft") navigateGallery(-1)
      if (e.key === "ArrowRight") navigateGallery(1)
      if (e.key === "Escape") closeProductModal()
    }
  })
})

async function viewFullArticle(articleId) {
  const newsList = await fetchData("/news")
  const article = newsList.find((n) => n.id === articleId)

  if (article) {
    const modal = document.getElementById("articleModal")
    if (!modal) return

    document.getElementById("articleTitle").textContent = article.title
    document.getElementById("articleDate").textContent = article.date
    document.getElementById("articleImage").src = article.image || "/placeholder.svg"
    document.getElementById("articleBody").innerHTML =
      `<p>${(article.fullContent || article.body || article.description).replace(/\n/g, "</p><p>")}</p>`

    modal.classList.add("active")
    document.body.style.overflow = "hidden"
  }
}

function closeArticleModal() {
  const modal = document.getElementById("articleModal")
  if (modal) {
    modal.classList.remove("active")
    document.body.style.overflow = ""
  }
}
