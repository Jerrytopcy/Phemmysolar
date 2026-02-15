const { Pool } = require('pg');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
  secure: true,
});

// PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Migration function
async function migrate() {
  try {
    console.log("Starting image migration...");

    const res = await pool.query('SELECT id, images FROM products');
    console.log(`Found ${res.rows.length} products.`);

    for (const product of res.rows) {
      const { id, images } = product;
      if (!images) continue;

      const rawImages = typeof images === 'string' ? JSON.parse(images) : images;
      const newImages = [];

      for (const img of rawImages) {
        if (!img.startsWith('data:image')) {
          newImages.push(img);
          continue;
        }

        const uploadResult = await cloudinary.uploader.upload(img, { folder: 'products' });
        newImages.push(uploadResult.secure_url);
        console.log(`Product ${id} → uploaded: ${uploadResult.secure_url}`);
      }

      await pool.query('UPDATE products SET images = $1 WHERE id = $2', [
        JSON.stringify(newImages),
        id,
      ]);

      console.log(`Product ${id} images updated.`);
    }

    console.log("✅ All products migrated successfully!");
  } catch (err) {
    console.error("Migration error:", err);
    throw err; // important so your route can catch it
  }
}

// Export the function for your temporary route
module.exports = migrate;

// Optional: run directly if called with node
if (require.main === module) {
  migrate().then(() => process.exit(0)).catch(() => process.exit(1));
}
