/**
 * migrateImages.js
 * 
 * Railway-ready migration script:
 * Converts all base64 images in your products table
 * to Cloudinary URLs and updates the database.
 */

const { Pool } = require('pg');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary from Railway environment variables
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

// Configure PostgreSQL pool from Railway DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Required for Railway Postgres
});

async function migrate() {
  try {
    console.log("Starting image migration...");

    // Fetch all products
    const res = await pool.query('SELECT id, images FROM products');
    console.log(`Found ${res.rows.length} products.`);

    for (const product of res.rows) {
      const { id, images } = product;

      if (!images || images.length === 0) continue;

      const newImages = [];

      for (const img of images) {
        if (!img.startsWith('data:image')) {
          // Already a URL, keep it
          newImages.push(img);
          continue;
        }

        // Upload base64 image to Cloudinary
        const uploadResult = await cloudinary.uploader.upload(img, {
          folder: 'products'
        });

        newImages.push(uploadResult.secure_url);
        console.log(`Product ${id} → image uploaded: ${uploadResult.secure_url}`);
      }

      // Update product images in DB
      await pool.query(
        'UPDATE products SET images = $1 WHERE id = $2',
        [newImages, id]
      );

      console.log(`Product ${id} images updated successfully.`);
    }

    console.log("✅ All products migrated successfully!");
    process.exit(0);

  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

// Run the migration
migrate();
