// migrate-data.js
const fs = require('fs');
const { neon } = require('@netlify/neon');

// Initialize connection
const sql = neon();

// Function to migrate products
async function migrateProducts() {
  console.log("Starting product migration...");

  // Read products from localStorage (you'll need to get this data from your browser)
  // For now, let's assume you copied the JSON string from your browser's DevTools
  const productsData = `[{
    "id": 1,
    "name": "220Ah Tubular Battery",
    "price": 85000,
    "category": "batteries",
    "description": "High-capacity deep cycle battery perfect for solar systems. Long-lasting and reliable with excellent performance in various weather conditions.",
    "images": ["images/sample-product1.jpg", "/solar-charge-controller-device.jpg", "/solar-panel-on-roof.png"]
  },
  {
    "id": 2,
    "name": "5KVA Solar Inverter",
    "price": 320000,
    "category": "inverters",
    "description": "Pure sine wave inverter with MPPT charge controller. Efficient and durable with advanced protection features.",
    "images": ["images/sample-product2.jpg", "/solar-panel-on-roof.png", "/solar-charge-controller-device.jpg"]
  },
  {
    "id": 3,
    "name": "250W Solar Panel",
    "price": 45000,
    "category": "panels",
    "description": "Monocrystalline solar panel with high efficiency rating. Weather-resistant design for long-term outdoor use.",
    "images": ["/solar-panel-on-roof.png", "images/sample-product1.jpg"]
  },
  {
    "id": 4,
    "name": "Solar Charge Controller 60A",
    "price": 28000,
    "category": "controllers",
    "description": "MPPT charge controller for optimal battery charging. LCD display included with multiple protection features.",
    "images": ["/solar-charge-controller-device.jpg", "images/sample-product2.jpg"]
  }]`;

  const products = JSON.parse(productsData);

  for (let product of products) {
    try {
      await sql`
        INSERT INTO products (name, price, description, category, images)
        VALUES (${product.name}, ${product.price}, ${product.description}, ${product.category || null}, ${product.images})
        ON CONFLICT DO NOTHING
      `;
      console.log(`Migrated product: ${product.name}`);
    } catch (error) {
      console.error(`Error migrating product ${product.name}:`, error);
    }
  }

  console.log("Product migration completed.");
}

// Function to migrate testimonials
async function migrateTestimonials() {
  console.log("Starting testimonial migration...");

  const testimonialsData = `[{
    "id": 1,
    "name": "Aisha Johnson",
    "role": "Homeowner, Lagos",
    "text": "PhemmySolar transformed our energy bills. The installation was professional and the system has been running flawlessly.",
    "rating": 5,
    "image": "images/aisha-johnson.jpg"
  },
  {
    "id": 2,
    "name": "Emeka Okafor",
    "role": "Business Owner, Ibadan",
    "text": "Best investment for my business. Their support team is always available and the system efficiency is outstanding.",
    "rating": 5,
    "image": "images/emeka-okafor.jpg"
  },
  {
    "id": 3,
    "name": "Zainab Hassan",
    "role": "School Principal, Kano",
    "text": "Reliable energy solution for our institution. PhemmySolar's professionalism and quality are unmatched.",
    "rating": 5,
    "image": "images/zainab-hassan.jpg"
  },
  {
    "id": 4,
    "name": "Chisom Nwankwo",
    "role": "Factory Manager, Onitsha",
    "text": "Reduced our operational costs significantly. The solar system pays for itself through energy savings.",
    "rating": 5,
    "image": "images/chisom-nwankwo.jpg"
  }]`;

  const testimonials = JSON.parse(testimonialsData);

  for (let testimonial of testimonials) {
    try {
      await sql`
        INSERT INTO testimonials (name, role, text, rating, image)
        VALUES (${testimonial.name}, ${testimonial.role || null}, ${testimonial.text}, ${testimonial.rating}, ${testimonial.image || null})
        ON CONFLICT DO NOTHING
      `;
      console.log(`Migrated testimonial: ${testimonial.name}`);
    } catch (error) {
      console.error(`Error migrating testimonial ${testimonial.name}:`, error);
    }
  }

  console.log("Testimonial migration completed.");
}

// Function to migrate news
async function migrateNews() {
  console.log("Starting news migration...");

  const newsData = `[{
    "id": 1,
    "title": "Solar Energy Adoption Surges in Nigeria",
    "description": "Recent reports show a 40% increase in solar energy adoption across Nigerian homes and businesses in 2024.",
    "full_content": "Recent reports show a 40% increase in solar energy adoption across Nigerian homes and businesses in 2024.",
    "image": "/solar-energy-statistics.jpg",
    "date": "Dec 15, 2024"
  },
  {
    "id": 2,
    "title": "New Solar Technology Breaks Efficiency Records",
    "description": "Latest monocrystalline panels achieve 23% efficiency, offering better performance and faster ROI for customers.",
    "full_content": "Latest monocrystalline panels achieve 23% efficiency, offering better performance and faster ROI for customers.",
    "image": "/advanced-solar-panel-technology.jpg",
    "date": "Dec 10, 2024"
  },
  {
    "id": 3,
    "title": "Government Incentives for Solar Installation",
    "description": "Federal government announces tax breaks and subsidies to encourage more Nigerian businesses to go solar.",
    "full_content": "Federal government announces tax breaks and subsidies to encourage more Nigerian businesses to go solar.",
    "image": "/government-solar-incentives.jpg",
    "date": "Dec 5, 2024"
  },
  {
    "id": 4,
    "title": "Energy Independence Becomes Reality",
    "description": "More Nigerian families achieve complete energy independence with advanced solar battery storage solutions.",
    "full_content": "More Nigerian families achieve complete energy independence with advanced solar battery storage solutions.",
    "image": "/solar-energy-independence-home.jpg",
    "date": "Nov 28, 2024"
  }]`;

  const news = JSON.parse(newsData);

  for (let article of news) {
    try {
      await sql`
        INSERT INTO news (title, description, full_content, image, date)
        VALUES (${article.title}, ${article.description}, ${article.full_content || article.description}, ${article.image || null}, ${article.date})
        ON CONFLICT DO NOTHING
      `;
      console.log(`Migrated news: ${article.title}`);
    } catch (error) {
      console.error(`Error migrating news ${article.title}:`, error);
    }
  }

  console.log("News migration completed.");
}

// Function to migrate users
async function migrateUsers() {
  console.log("Starting user migration...");

  const usersData = `{}`;

  const users = JSON.parse(usersData);

  for (let userId in users) {
    const user = users[userId];
    // Ensure cart and orders are arrays
    user.cart = Array.isArray(user.cart) ? user.cart : [];
    user.orders = Array.isArray(user.orders) ? user.orders : [];

    try {
      await sql`
        INSERT INTO users (id, username, password_hash, email, phone, address, cart, orders)
        VALUES (${user.id}, ${user.username}, ${user.passwordHash}, ${user.email || null}, ${user.phone || null},
                ${user.address || {}}, ${user.cart}, ${user.orders})
        ON CONFLICT DO NOTHING
      `;
      console.log(`Migrated user: ${user.username}`);
    } catch (error) {
      console.error(`Error migrating user ${user.username}:`, error);
    }
  }

  console.log("User migration completed.");
}

// Run migrations
(async () => {
  try {
    console.log("Starting data migration...");
    await migrateProducts();
    await migrateTestimonials();
    await migrateNews();
    await migrateUsers();
    console.log("Data migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  }
})();