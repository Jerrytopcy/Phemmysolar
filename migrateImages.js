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

    const res = await pool.query('SELECT id, images FROM products');
    console.log(`Found ${res.rows.length} products.`);

    for (const product of res.rows) {
      const { id, images } = product;
      if (!images) continue;

      // Parse images if stored as JSON string
      const rawImages = typeof images === 'string' ? JSON.parse(images) : images;
      const newImages = [];

      for (const img of rawImages) {
        if (!img.startsWith('data:image')) {
          newImages.push(img);
          continue;
        }

        const uploadResult = await cloudinary.uploader.upload(img, {
          folder: 'products',
        });

        newImages.push(uploadResult.secure_url);
        console.log(`Product ${id} → uploaded: ${uploadResult.secure_url}`);
      }

      // Update DB, store as JSON array
      await pool.query('UPDATE products SET images = $1 WHERE id = $2', [
        newImages,
        id,
      ]);

      console.log(`Product ${id} images updated.`);
    }

    console.log("✅ All products migrated!");
    process.exit(0);

  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

// Run the migration
migrate();
