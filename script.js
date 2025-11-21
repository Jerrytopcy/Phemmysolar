// Initialize products from localStorage or use default products
function initializeData() {
  const existingProducts = localStorage.getItem("solarProducts")
  const existingTestimonials = localStorage.getItem("testimonials")
  const existingNews = localStorage.getItem("news")

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
    ]
    localStorage.setItem("solarProducts", JSON.stringify(defaultProducts))
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
    ]
    localStorage.setItem("testimonials", JSON.stringify(defaultTestimonials))
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
    ]
    localStorage.setItem("news", JSON.stringify(defaultNews))
  }
}

// Global variables for search and sort
let allProducts = []
let filteredProducts = []
let currentProductInModal = null
let currentImageIndex = 0

// Load and display featured products
function loadFeaturedProducts() {
  const featuredContainer = document.getElementById("featuredProducts")
  if (!featuredContainer) return

  const products = JSON.parse(localStorage.getItem("solarProducts") || "[]").slice(0, 3)

  if (products.length === 0) {
    featuredContainer.innerHTML = '<p class="empty-state">No products available</p>'
    return
  }

  featuredContainer.innerHTML = products
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
function loadTestimonials() {
  const testimonialContainer = document.getElementById("testimonialsGrid")
  if (!testimonialContainer) return

  const testimonials = JSON.parse(localStorage.getItem("testimonials") || "[]")

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
function loadLatestNews() {
  const newsContainer = document.getElementById("latestNews")
  if (!newsContainer) return

  const news = JSON.parse(localStorage.getItem("news") || "[]").slice(0, 4)

  if (news.length === 0) {
    newsContainer.innerHTML = '<p class="empty-state">No news available</p>'
    return
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
    .join("")
}

// Search functionality
function handleSearch(e) {
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
function viewProduct(productId) {
  const products = JSON.parse(localStorage.getItem("solarProducts") || "[]")
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
document.addEventListener("DOMContentLoaded", () => {
  initializeData()
  loadFeaturedProducts()
  loadTestimonials()
  loadLatestNews()
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

function viewFullArticle(articleId) {
  const newsList = JSON.parse(localStorage.getItem("news") || "[]")
  const article = newsList.find((n) => n.id === articleId)

  if (article) {
    const modal = document.getElementById("articleModal")
    if (!modal) return

    document.getElementById("articleTitle").textContent = article.title
    document.getElementById("articleDate").textContent = article.date
    document.getElementById("articleImage").src = article.image || "/placeholder.svg"
    document.getElementById("articleBody").innerHTML = `<p>${(article.fullContent || article.body || article.description).replace(/\n/g, "</p><p>")}</p>`

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
