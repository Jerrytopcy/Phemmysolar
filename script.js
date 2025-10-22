// Initialize products from localStorage or use default products
function initializeProducts() {
  const existingProducts = localStorage.getItem("solarProducts")

  if (!existingProducts) {
    const defaultProducts = [
      {
        id: 1,
        name: "220Ah Tubular Battery",
        price: "₦85,000",
        description:
          "High-capacity deep cycle battery perfect for solar systems. Long-lasting and reliable with excellent performance in various weather conditions.",
        images: ["images/sample-product1.jpg", "/solar-charge-controller-device.jpg", "/solar-panel-on-roof.png"],
      },
      {
        id: 2,
        name: "5KVA Solar Inverter",
        price: "₦320,000",
        description:
          "Pure sine wave inverter with MPPT charge controller. Efficient and durable with advanced protection features.",
        images: ["images/sample-product2.jpg", "/solar-panel-on-roof.png", "/solar-charge-controller-device.jpg"],
      },
      {
        id: 3,
        name: "250W Solar Panel",
        price: "₦45,000",
        description:
          "Monocrystalline solar panel with high efficiency rating. Weather-resistant design for long-term outdoor use.",
        images: ["/solar-panel-on-roof.png", "images/sample-product1.jpg"],
      },
      {
        id: 4,
        name: "Solar Charge Controller 60A",
        price: "₦28,000",
        description:
          "MPPT charge controller for optimal battery charging. LCD display included with multiple protection features.",
        images: ["/solar-charge-controller-device.jpg", "images/sample-product2.jpg"],
      },
    ]

    localStorage.setItem("solarProducts", JSON.stringify(defaultProducts))
  }
}

// Global variables for search and sort
let allProducts = []
let filteredProducts = []
let currentProductInModal = null
let currentImageIndex = 0

// Load and display products
function loadProducts() {
  const productsGrid = document.getElementById("productsGrid")
  allProducts = JSON.parse(localStorage.getItem("solarProducts") || "[]")
  filteredProducts = [...allProducts]

  displayProducts(filteredProducts)
}

function displayProducts(products) {
  const productsGrid = document.getElementById("productsGrid")

  if (products.length === 0) {
    productsGrid.innerHTML = `
      <div class="empty-state">
        <p>No products found.</p>
        <p>Try adjusting your search or filters.</p>
      </div>
    `
    return
  }

  productsGrid.innerHTML = products
    .map(
      (product) => `
        <div class="product-card">
          <img src="${product.images ? product.images[0] : product.image}" alt="${product.name}" class="product-image">
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

// Load and display products with search and sort
// function loadProducts() {
//   const productsGrid = document.getElementById("productsGrid")
//   const products = JSON.parse(localStorage.getItem("solarProducts") || "[]")

//   if (products.length === 0) {
//     productsGrid.innerHTML = `
//             <div class="empty-state">
//                 <p>No products available at the moment.</p>
//                 <p>Please check back later.</p>
//             </div>
//         `
//     return
//   }

//   productsGrid.innerHTML = products
//     .map(
//       (product) => `
//         <div class="product-card">
//             <img src="${product.image}" alt="${product.name}" class="product-image">
//             <div class="product-info">
//                 <h3 class="product-name">${product.name}</h3>
//                 <p class="product-price">${product.price}</p>
//                 <p class="product-description">${product.description}</p>
//                 <button class="btn product-btn" onclick="viewProduct(${product.id})">View Details</button>
//             </div>
//         </div>
//     `,
//     )
//     .join("")
// }

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

// View product details (can be expanded to show modal)
// function viewProduct(productId) {
//   const products = JSON.parse(localStorage.getItem("solarProducts") || "[]")
//   const product = products.find((p) => p.id === productId)

//   if (product) {
//     alert(
//       `Product: ${product.name}\nPrice: ${product.price}\n\n${product.description}\n\nContact us to place an order!`,
//     )
//   }
// }

// View product details in modal
function viewProduct(productId) {
  const products = JSON.parse(localStorage.getItem("solarProducts") || "[]")
  const product = products.find((p) => p.id === productId)

  if (product) {
    currentProductInModal = product
    currentImageIndex = 0

    // Ensure product has images array
    if (!product.images) {
      product.images = [product.image]
    }

    const modal = document.getElementById("productModal")
    const mainImage = document.getElementById("modalMainImage")
    const productName = document.getElementById("modalProductName")
    const productPrice = document.getElementById("modalProductPrice")
    const productDescription = document.getElementById("modalProductDescription")
    const thumbnailContainer = document.getElementById("thumbnailContainer")

    // Set product details
    productName.textContent = product.name
    productPrice.textContent = product.price
    productDescription.textContent = product.description
    mainImage.src = product.images[0]
    mainImage.alt = product.name

    // Create thumbnails
    thumbnailContainer.innerHTML = product.images
      .map(
        (img, index) => `
      <div class="thumbnail ${index === 0 ? "active" : ""}" onclick="changeImage(${index})">
        <img src="${img}" alt="${product.name} ${index + 1}">
      </div>
    `,
      )
      .join("")

    // Update navigation buttons
    updateGalleryNav()

    modal.classList.add("active")
    document.body.style.overflow = "hidden"
  }
}

function changeImage(index) {
  if (!currentProductInModal) return

  currentImageIndex = index
  const mainImage = document.getElementById("modalMainImage")
  mainImage.src = currentProductInModal.images[index]

  // Update active thumbnail
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
    changeImage(newIndex)
  }
}

function closeProductModal() {
  const modal = document.getElementById("productModal")
  modal.classList.remove("active")
  document.body.style.overflow = ""
  currentProductInModal = null
  currentImageIndex = 0
}

// Handle contact form submission
function handleContactForm(e) {
  e.preventDefault()

  const formData = {
    name: document.getElementById("name").value,
    email: document.getElementById("email").value,
    phone: document.getElementById("phone").value,
    message: document.getElementById("message").value,
  }

  // In a real application, this would send data to a server
  console.log("Contact form submitted:", formData)

  alert("Thank you for contacting us! We will get back to you shortly.")
  e.target.reset()
}

// Smooth scrolling for navigation links
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const href = this.getAttribute("href")
      if (href !== "#" && href.startsWith("#")) {
        e.preventDefault()
        const target = document.querySelector(href)
        if (target) {
          target.scrollIntoView({
            behavior: "smooth",
            block: "start",
          })

          window.closeMobileMenu()
        }
      }
    })
  })
}

// Active navigation link on scroll
function updateActiveNavLink() {
  const sections = document.querySelectorAll("section[id]")
  const navLinks = document.querySelectorAll(".nav-link")

  window.addEventListener("scroll", () => {
    let current = ""

    sections.forEach((section) => {
      const sectionTop = section.offsetTop
      const sectionHeight = section.clientHeight
      if (window.pageYOffset >= sectionTop - 200) {
        current = section.getAttribute("id")
      }
    })

    navLinks.forEach((link) => {
      link.classList.remove("active")
      if (link.getAttribute("href") === `#${current}`) {
        link.classList.add("active")
      }
    })
  })
}

function initMobileMenu() {
  const mobileMenuBtn = document.getElementById("mobileMenuBtn")
  const nav = document.getElementById("navMenu")
  const navOverlay = document.getElementById("navOverlay")
  let isMenuOpen = false

  // Toggle mobile menu
  function toggleMobileMenu() {
    isMenuOpen = !isMenuOpen
    mobileMenuBtn.classList.toggle("active", isMenuOpen)
    nav.classList.toggle("active", isMenuOpen)
    navOverlay.classList.toggle("active", isMenuOpen)

    // Prevent body scroll when menu is open
    document.body.style.overflow = isMenuOpen ? "hidden" : ""
  }

  // Close mobile menu
  window.closeMobileMenu = () => {
    if (isMenuOpen) {
      isMenuOpen = false
      mobileMenuBtn.classList.remove("active")
      nav.classList.remove("active")
      navOverlay.classList.remove("active")
      document.body.style.overflow = ""
    }
  }

  // Mobile menu button click
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener("click", toggleMobileMenu)
  }

  // Close menu when clicking overlay
  if (navOverlay) {
    navOverlay.addEventListener("click", window.closeMobileMenu)
  }

  // Handle window resize - auto-switch between mobile and desktop
  let resizeTimer
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      const windowWidth = window.innerWidth

      // If window is resized to desktop size, close mobile menu
      if (windowWidth > 768 && isMenuOpen) {
        window.closeMobileMenu()
      }
    }, 250)
  })

  // Close menu on escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isMenuOpen) {
      window.closeMobileMenu()
    }
  })
}

// Initialize everything when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  initializeProducts()
  loadProducts()
  initSmoothScroll()
  updateActiveNavLink()
  initMobileMenu()

  const contactForm = document.getElementById("contactForm")
  if (contactForm) {
    contactForm.addEventListener("submit", handleContactForm)
  }

  const searchInput = document.getElementById("searchInput")
  if (searchInput) {
    searchInput.addEventListener("input", handleSearch)
  }

  const sortSelect = document.getElementById("sortSelect")
  if (sortSelect) {
    sortSelect.addEventListener("change", handleSort)
  }

  // Modal close buttons
  const closeModal = document.getElementById("closeModal")
  if (closeModal) {
    closeModal.addEventListener("click", closeProductModal)
  }

  const alertOk = document.getElementById("alertOk")
  if (alertOk) {
    alertOk.addEventListener("click", () => {
      document.getElementById("alertModal").classList.remove("active")
      document.body.style.overflow = ""
    })
  }

  // Gallery navigation
  const prevImage = document.getElementById("prevImage")
  if (prevImage) {
    prevImage.addEventListener("click", () => navigateGallery(-1))
  }

  const nextImage = document.getElementById("nextImage")
  if (nextImage) {
    nextImage.addEventListener("click", () => navigateGallery(1))
  }

  // Close modals on overlay click
  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.classList.remove("active")
        document.body.style.overflow = ""
      }
    })
  })

  // Contact button in modal
  const contactBtn = document.getElementById("contactBtn")
  if (contactBtn) {
    contactBtn.addEventListener("click", closeProductModal)
  }

  // Keyboard navigation for gallery
  document.addEventListener("keydown", (e) => {
    if (document.getElementById("productModal").classList.contains("active")) {
      if (e.key === "ArrowLeft") navigateGallery(-1)
      if (e.key === "ArrowRight") navigateGallery(1)
      if (e.key === "Escape") closeProductModal()
    }
  })
})
