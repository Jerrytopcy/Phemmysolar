// server.js — Production-ready backend for Railway
const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// --- ADD SENDGRID SETUP ---
const sgMail = require('@sendgrid/mail');
const jwt = require('jsonwebtoken');
const rateLimit = require("express-rate-limit");


// Set your SendGrid API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
// --- END SENDGRID SETUP ---

// Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Serve HTML files without .html extension
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

app.get('/products', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'products.html'));
});

app.get('/news', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'news.html'));
});

app.get('/services', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'services.html'));
});

app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'about.html'));
});

app.get('/reset-password', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'reset-password.html'));
});
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/index', (req, res) => {
    res.redirect('/');
});



// Parse JSON bodies (increased limit for Base64 images)
app.use(express.json({ limit: '500mb' }));

// --- ENABLE CORS ---
const cors = require('cors');
app.use(cors({
    origin: true,
    credentials: true
}));
// --- END CORS ---
const checkLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10, // 10 requests per IP per minute
    message: {
        error: "Too many requests. Please wait a minute and try again."
    },
});
// Connect to PostgreSQL (Railway auto-provides DATABASE_URL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// --- AUTH MIDDLEWARE ---
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    req.user = decoded;
    next();
  } catch (err) {
    console.error('JWT verification failed:', err.message);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};



app.get('/api/admin/orders', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        o.id AS order_id,
        o.date,
        o.total,
        o.status,
        o.payment_status,
        o.delivery_address,

        u.id AS user_id,
        u.username,
        u.email,
        u.phone,

        json_agg(
          json_build_object(
            'productId', p.id,
            'name', p.name,
            'price', oi.price,
            'quantity', oi.quantity
          )
        ) AS items

      FROM orders o
      JOIN users u ON u.id = o.user_id
      JOIN order_items oi ON oi.order_id = o.id
      JOIN products p ON p.id = oi.product_id

      GROUP BY o.id, u.id
      ORDER BY o.date DESC
    `);

    res.json(result.rows);

  } catch (err) {
    console.error('Admin fetch orders error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.put('/api/admin/orders/:id/status', authMiddleware, adminOnly, async (req, res) => {
  const { status } = req.body;

  try {
    await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2',
      [status, req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Update order status error:', err);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});


// --- CURRENT USER PROFILE ROUTE  ---

app.get('/api/user', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         id, 
         username, 
         email, 
         phone, 
         address, 
         role
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Fetch user profile error:', err);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});
// --- UPDATE USER ADDRESS ROUTE (PROTECTED) ---
app.put('/api/user/address', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { address } = req.body;

    if (!address || typeof address !== 'object') {
      return res.status(400).json({ error: 'Address must be an object.' });
    }

    // Validate required fields
    if (!address.street || !address.city || !address.state) {
      return res.status(400).json({ error: 'Street, city, and state are required.' });
    }

    // Ensure country defaults to "Nigeria" if not provided
    if (!address.country) {
      address.country = 'Nigeria';
    }

    // Update the user's address in the database
    const result = await pool.query(
      'UPDATE users SET address = $1 WHERE id = $2 RETURNING id, username, email, phone, address, role',
      [address, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Address updated successfully.',
      user: result.rows[0] // Return the updated user object
    });

  } catch (err) {
    console.error('Error updating user address:', err);
    res.status(500).json({ error: 'Failed to update address' });
  }
});

// --- CART ROUTES (PROTECTED) ---

// Get user's cart
app.get('/api/cart', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(`
      SELECT 
        c.product_id AS "productId",
        c.quantity,
        p.name,
        p.price,
        p.images
      FROM carts c
      JOIN products p ON p.id = c.product_id
      WHERE c.user_id = $1
    `, [userId]);

    res.json(result.rows);
  } catch (err) {
    console.error('Fetch cart error:', err);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

// --- UPDATE USER LAST LOGIN ROUTE (PROTECTED) ---
app.put('/api/user/last-login', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Update the user's last_login in the database
    const result = await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1 RETURNING id, username, email, phone, address, role',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Last login updated successfully.',
      user: result.rows[0] // Return the updated user object
    });

  } catch (err) {
    console.error('Error updating last login:', err);
    res.status(500).json({ error: 'Failed to update last login' });
  }
});
// Save / update cart
app.post('/api/cart', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { cart } = req.body;

    if (!Array.isArray(cart)) {
      return res.status(400).json({ error: 'Cart must be an array' });
    }

    // Clear existing cart
    await pool.query('DELETE FROM carts WHERE user_id = $1', [userId]);

    // Insert new cart items
    for (const item of cart) {
      await pool.query(
        `INSERT INTO carts (user_id, product_id, quantity)
         VALUES ($1, $2, $3)`,
        [userId, item.productId, item.quantity]
      );
    }

    res.json({ success: true });

  } catch (err) {
    console.error('Save cart error:', err);
    res.status(500).json({ error: 'Failed to save cart' });
  }
});


// Clear cart (after checkout or logout)
app.delete('/api/cart', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM carts WHERE user_id = $1',
      [req.user.id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Clear cart error:', err);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});



// --- PRODUCTS ROUTES ---
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching product:', err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

app.post('/api/products', async (req, res) => {
  const { name, price, description, images, category } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO products (name, price, description, images, category) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, price, description, images, category]
    );
    res.json({ success: true, product: result.rows[0] });
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

app.put('/api/products/:id', async (req, res) => {
  const { name, price, description, images, category } = req.body;
  try {
    const result = await pool.query(
      'UPDATE products SET name = $1, price = $2, description = $3, images = $4, category = $5 WHERE id = $6 RETURNING *',
      [name, price, description, images, category, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ success: true, product: result.rows[0] });
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// --- TESTIMONIALS ROUTES ---
app.get('/api/testimonials', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM testimonials ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching testimonials:', err);
    res.status(500).json({ error: 'Failed to fetch testimonials' });
  }
});

app.get('/api/testimonials/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM testimonials WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Testimonial not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching testimonial:', err);
    res.status(500).json({ error: 'Failed to fetch testimonial' });
  }
});

app.post('/api/testimonials', async (req, res) => {
  const { name, role, text, rating, image } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO testimonials (name, role, text, rating, image) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, role, text, rating, image]
    );
    res.json({ success: true, testimonial: result.rows[0] });
  } catch (err) {
    console.error('Error creating testimonial:', err);
    res.status(500).json({ error: 'Failed to create testimonial' });
  }
});

app.put('/api/testimonials/:id', async (req, res) => {
  const { name, role, text, rating, image } = req.body;
  try {
    const result = await pool.query(
      'UPDATE testimonials SET name = $1, role = $2, text = $3, rating = $4, image = $5 WHERE id = $6 RETURNING *',
      [name, role, text, rating, image, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Testimonial not found' });
    }
    res.json({ success: true, testimonial: result.rows[0] });
  } catch (err) {
    console.error('Error updating testimonial:', err);
    res.status(500).json({ error: 'Failed to update testimonial' });
  }
});

app.delete('/api/testimonials/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM testimonials WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Testimonial not found' });
    }
    res.json({ success: true, message: 'Testimonial deleted' });
  } catch (err) {
    console.error('Error deleting testimonial:', err);
    res.status(500).json({ error: 'Failed to delete testimonial' });
  }
});

// --- NEWS ROUTES ---
// --- NEWS ROUTES ---

app.get('/api/news', async (req, res) => {
  try {
    const result = await pool.query('SELECT "id", "title", "description", "fullContent", "image", "date", "created_at" FROM news ORDER BY "id"');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching news:', err);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

app.get('/api/news/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT "id", "title", "description", "fullContent", "image", "date", "created_at" FROM news WHERE "id" = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'News article not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching news:', err);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

app.post('/api/news', async (req, res) => {
  const { title, description, fullContent, image, date } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO news ("title", "description", "fullContent", "image", "date") VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, description, fullContent, image, date]
    );
    res.json({ success: true, news: result.rows[0] });
  } catch (err) {
    console.error('Error creating news:', err);
    res.status(500).json({ error: 'Failed to create news' });
  }
});

app.put('/api/news/:id', async (req, res) => {
  const { title, description, fullContent, image, date } = req.body;
  try {
    const result = await pool.query(
      'UPDATE news SET "title" = $1, "description" = $2, "fullContent" = $3, "image" = $4, "date" = $5 WHERE "id" = $6 RETURNING *',
      [title, description, fullContent, image, date, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'News article not found' });
    }
    res.json({ success: true, news: result.rows[0] });
  } catch (err) {
    console.error('Error updating news:', err);
    res.status(500).json({ error: 'Failed to update news' });
  }
});

app.delete('/api/news/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM news WHERE "id" = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'News article not found' });
    }
    res.json({ success: true, message: 'News article deleted' });
  } catch (err) {
    console.error('Error deleting news:', err);
    res.status(500).json({ error: 'Failed to delete news' });
  }
});

// --- USERS ROUTES ---
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.phone,
        u.address::json AS address,
        u.role,
        COUNT(o.id) AS order_count
      FROM users u
      LEFT JOIN orders o ON o.user_id = u.id
      GROUP BY u.id, u.username, u.email, u.phone, u.address, u.role
      ORDER BY u.id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.phone,
        u.address::json AS address,
        u.role,
        u.last_login,
        COUNT(o.id) AS order_count,
        json_agg(
          json_build_object(
            'order_id', o.id,
            'date', o.date,
            'total', o.total,
            'status', o.status
          )
        ) FILTER (WHERE o.id IS NOT NULL) AS recent_orders
      FROM users u
      LEFT JOIN orders o ON o.user_id = u.id
      WHERE u.id = $1
      GROUP BY u.id, u.username, u.email, u.phone, u.address, u.role, u.last_login
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

app.put('/api/users/:id', async (req, res) => {
  const { username, passwordHash, email, phone, address, role } = req.body;
  try {
    const result = await pool.query(
      'UPDATE users SET username = $1, passwordhash = $2, email = $3, phone = $4, address = $5, role = $6 WHERE id = $7 RETURNING *',
      [username, passwordHash, email, phone, address, role, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// --- AUTHENTICATION ROUTE ---
const bcrypt = require('bcryptjs');

app.post('/api/auth', async (req, res) => {
  const { username, password, action } = req.body;

  console.log('Received auth request:', { username, action });

  try {
    if (action === 'login') {
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const result = await pool.query(
        'SELECT * FROM users WHERE username = $1',
        [username]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = result.rows[0];

      console.log('Login attempt:', {
        id: user.id,
        username: user.username,
        hashExists: !!user.passwordhash
      });

      if (!user.passwordhash || typeof user.passwordhash !== 'string') {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isMatch = await bcrypt.compare(password, user.passwordhash);

      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username },
        process.env.JWT_SECRET || 'dev_secret',
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          address: user.address,
          role: user.role
        },
        token
      });

    } else if (action === 'signup') {
      const { email, phone, address } = req.body;

      if (!username || !password || !email || !phone || !address || !address.street || !address.city || !address.state) {
        return res.status(400).json({ error: 'All required fields must be filled' });
      }

      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const result = await pool.query(
        'INSERT INTO users (username, passwordhash, email, phone, address, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [username, hashedPassword, email, phone, address, 'user']
      );

      res.json({ success: true, user: result.rows[0] });

    } else {
      res.status(400).json({ error: 'Invalid action' });
    }

  } catch (err) {
    console.error('Detailed error in auth route:', err);
    res.status(500).json({ error: 'Authentication failed', details: err.message });
  }
});

// --- REAL-TIME VALIDATION ENDPOINT ---
app.post('/api/auth/check', checkLimiter, async (req, res) => {
    const { username = "", email = "", phone = "" } = req.body;

    // Normalize: trim and lowercase where appropriate
    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    try {
        // Build dynamic WHERE clauses only for non-empty fields
        let conditions = [];
        let params = [];

        if (cleanUsername) {
            conditions.push(`username = $${params.length + 1}`);
            params.push(cleanUsername);
        }
        if (cleanEmail) {
            conditions.push(`email = $${params.length + 1}`);
            params.push(cleanEmail);
        }
        if (cleanPhone) {
            conditions.push(`phone = $${params.length + 1}`);
            params.push(cleanPhone);
        }

        // If no fields provided, return no conflicts
        if (conditions.length === 0) {
            return res.json({
                exists: false,
                usernameExists: false,
                emailExists: false,
                phoneExists: false
            });
        }

        // Construct query dynamically
        const query = `
            SELECT 
                EXISTS(SELECT 1 FROM users WHERE ${conditions.join(' OR ')}) AS exists,
                EXISTS(SELECT 1 FROM users WHERE username = $1) AS usernameExists,
                EXISTS(SELECT 1 FROM users WHERE email = $2) AS emailExists,
                EXISTS(SELECT 1 FROM users WHERE phone = $3) AS phoneExists
        `;

        // Execute query with parameters (even if some are empty, we pass them)
        const result = await pool.query(query, [
            cleanUsername || null,
            cleanEmail || null,
            cleanPhone || null
        ]);

        res.json(result.rows[0]);

    } catch (err) {
        console.error('Error checking availability:', err);
        res.status(500).json({ error: 'Server error while checking availability' });
    }
});


// --- ORDERS ROUTES (PROTECTED) ---
app.post('/api/orders', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { items, total, deliveryAddress, paymentStatus, paymentReference } = req.body;


    const orderResult = await pool.query(
      `INSERT INTO orders (user_id, total, delivery_address, payment_status, transaction_id)
      VALUES ($1, $2, $3, $4, $5)

       RETURNING id, date`,
      [userId, total, deliveryAddress, paymentStatus || 'paid', paymentReference]
    );

    const orderId = orderResult.rows[0].id;

    for (const item of items) {
      await pool.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price)
         VALUES ($1, $2, $3, $4)`,
        [orderId, item.productId, item.quantity, item.price]
      );
    }

    res.json({ success: true, orderId });

  } catch (err) {
    console.error('Order creation error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

app.get('/api/orders', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(`
      SELECT 
        o.id,
        o.date,
        o.total,
        o.status,
        o.payment_status,
        o.delivery_address,
        json_agg(
          json_build_object(
            'productId', oi.product_id,
            'quantity', oi.quantity,
            'price', oi.price
          )
        ) AS items
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      WHERE o.user_id = $1
      GROUP BY o.id
      ORDER BY o.date DESC
    `, [userId]);

    res.json(result.rows);

  } catch (err) {
    console.error('Order fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// --- REMITA PAYMENT INITIATION ROUTE ---
app.post('/api/orders/remita-initiate', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { items, total, deliveryAddress } = req.body;
        
        // Create order in database with pending status
        const orderResult = await pool.query(
            `INSERT INTO orders (user_id, total, delivery_address, payment_status, status)
             VALUES ($1, $2, $3, 'pending', 'pending')
             RETURNING id, date`,
            [userId, total, deliveryAddress]
        );
        
        const orderId = orderResult.rows[0].id;
        
        // Insert order items
        for (const item of items) {
            await pool.query(
                `INSERT INTO order_items (order_id, product_id, quantity, price)
                 VALUES ($1, $2, $3, $4)`,
                [orderId, item.productId, item.quantity, item.price]
            );
        }
        
        // Generate RRR (Remittance Reference Number)
        const rrr = `RRR${Date.now()}${Math.floor(Math.random() * 1000)}`;
        
        // Update order with RRR
        await pool.query(
            'UPDATE orders SET transaction_id = $1 WHERE id = $2',
            [rrr, orderId]
        );
        
        // Here you would typically make an API call to Remita to generate the payment URL
        // For demonstration, we'll create a mock redirect URL
        // In a real implementation, you would use Remita's API
        
        // Mock Remita redirect URL - replace with actual Remita API call
        const remitaRedirectUrl = `https://www.remita.net/pay/${rrr}?amount=${total}&orderId=${orderId}`;
        
        res.json({ 
            success: true, 
            redirectUrl: remitaRedirectUrl,
            orderId: orderId,
            rrr: rrr
        });
    } catch (err) {
        console.error('Order creation error:', err);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

// --- REMITA WEBHOOK ENDPOINT ---
app.post('/api/webhook/remita', async (req, res) => {
    try {
        const { transactionId, status, rrr } = req.body;
        
        // Update order status based on payment status
        let newStatus = status === 'SUCCESS' ? 'paid' : 'pending';
        
        await pool.query(
            'UPDATE orders SET status = $1, payment_status = $1 WHERE transaction_id = $2',
            [newStatus, transactionId]
        );
        
        res.status(200).send('OK');
    } catch (err) {
        console.error('Error handling Remita webhook:', err);
        res.status(500).json({ error: 'Failed to update order status' });
    }
});
// --- FORGOT PASSWORD ROUTE ---
app.post('/api/forgot-password', async (req, res) => {
    const { username, email } = req.body;

    if (!username || !email) {
        return res.status(400).json({ error: 'Username and email are required.' });
    }

    try {
        // Find user by username and email
        const result = await pool.query(
            'SELECT id, username, email, last_password_reset FROM users WHERE username = $1 AND email = $2',
            [username, email]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found with the provided username and email.' });
        }

        const user = result.rows[0];

        // Check if reset was done in last 30 days
        const now = Date.now();
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

        if (user.last_password_reset) {
            const lastResetTime = new Date(user.last_password_reset).getTime();
            if (now - lastResetTime < thirtyDaysMs) {
                const nextResetDate = new Date(lastResetTime + thirtyDaysMs);
                return res.status(400).json({
                    error: 'You can only reset your password once per month.',
                    next_reset_allowed: nextResetDate.toISOString()
                });
            }
        }

        // Generate a secure JWT token for password reset
        const resetToken = jwt.sign(
            { userId: user.id }, // Payload
            process.env.JWT_SECRET, // Secret key (must be set in env)
            { expiresIn: '1h' } // Token expires in 1 hour
        );

        // Save the token in the database for verification
        await pool.query(
            'UPDATE users SET reset_token = $1, reset_token_expiry = $2, reset_token_used = FALSE WHERE id = $3',
            [resetToken, Date.now() + 3600000, user.id] // 1 hour from now
        );

        // Create the reset URL (pointing to your frontend)
        const resetUrl = `https://www.phemmysolar.com/reset-password?token=${encodeURIComponent(resetToken)}`;

        // Compose the email
        
        // Compose the email
        const msg = {
            to: email,
            from: 'info@phemmysolar.com', // Use verified sender
            subject: `🔐 Password Reset Request for ${username}`,
            html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    background-color: #f5f5f5;
                    margin: 0;
                    padding: 20px;
                }
                .email-container {
                    max-width: 600px;
                    margin: 0 auto;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    overflow: hidden;
                }
                .header {
                    background: #007BFF; /* Blue header */
                    color: white;
                    padding: 20px;
                    text-align: center;
                }
                .header h2 {
                    margin: 0;
                    font-size: 24px;
                }
                .content {
                    padding: 30px;
                }
                .message {
                    background: #fff;
                    border: 1px solid #ddd;
                    padding: 15px;
                    border-radius: 4px;
                    margin: 20px 0;
                }
                .cta-button {
                    display: inline-block;
                    background: #007BFF;
                    color: white;
                    padding: 12px 24px;
                    text-decoration: none;
                    border-radius: 4px;
                    font-weight: bold;
                    margin: 20px 0;
                    text-align: center;
                }
                .footer {
                    background: #eee;
                    padding: 15px;
                    text-align: center;
                    font-size: 12px;
                    color: #666;
                    border-top: 1px solid #ddd;
                }
                .timestamp {
                    font-style: italic;
                    color: #777;
                    font-size: 14px;
                    margin-top: 10px;
                }
                @media (max-width: 600px) {
                    .email-container {
                        margin: 10px;
                    }
                    .content {
                        padding: 20px;
                    }
                }
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="header">
                    <h2>🔐 Password Reset Request</h2>
                </div>
                <div class="content">
                    <p>Hello <strong>${username}</strong>,</p>
                    
                    <div class="message">
                        You requested a password reset for your <strong>PhemmySolar</strong> account.
                    </div>

                    <p>Click the button below to reset your password:</p>

                    <a href="${resetUrl}" target="_blank" class="cta-button">Reset Password 🔑</a>

                    <p>This link will expire in <strong>1 hour</strong>.</p>

                    <p>If you did not request this, please ignore this email or contact support.</p>

                    <div class="timestamp">🕒 Sent at: ${new Date().toLocaleString()}</div>
                </div>
                <div class="footer">
                    🤖 This is an automated message. Please do not reply directly to this email.
                </div>
            </div>
        </body>
        </html>
        `,
        };


        // Send the email
        await sgMail.send(msg);

        console.log(`Password reset email sent to ${email}`);

        res.json({
            success: true,
            message: 'A password reset link has been sent to your email.'
        });

    } catch (err) {
        console.error('Error in forgot password route:', err);
        res.status(500).json({ error: 'An error occurred while processing your request.' });
    }
});

// --- RESET PASSWORD ROUTE ---
app.post('/api/auth/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({ error: 'Token and new password are required.' });
    }

    try {
        // Verify the JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find the user by the ID in the token
        const userResult = await pool.query(
            'SELECT id, reset_token, reset_token_expiry, reset_token_used FROM users WHERE id = $1',
            [decoded.userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired token.' });
        }

        const user = userResult.rows[0];

        // Check if token is expired
        if (user.reset_token_expiry < Date.now()) {
            return res.status(400).json({ error: 'Token has expired.' });
        }

        // Check if token has already been used
        if (user.reset_token_used) {
            return res.status(400).json({ error: 'This reset link has already been used.' });
        }

        // Check if token matches
        if (user.reset_token !== token) {
            return res.status(400).json({ error: 'Invalid token.' });
        }

        // Hash the new password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update the user's password and mark token as used
        await pool.query(
            'UPDATE users SET passwordhash = $1, reset_token = NULL, reset_token_expiry = NULL, reset_token_used = TRUE, last_password_reset = NOW() WHERE id = $2',
            [hashedPassword, decoded.userId]
        );

        res.json({
            success: true,
            message: 'Password successfully reset. You can now log in.'
        });

    } catch (err) {
        console.error('Error resetting password:', err);
        res.status(500).json({ error: 'An error occurred while resetting your password.' });
    }
});


// --- CHECK RESET STATUS BEFORE SHOWING FORM ---
app.post('/api/auth/reset-password/check', async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ error: 'Token is required.' });
    }

    try {
        // Verify the JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find the user by the ID in the token
        const userResult = await pool.query(
            'SELECT id, last_password_reset FROM users WHERE id = $1',
            [decoded.userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired token.' });
        }

        const user = userResult.rows[0];

        // Check if reset was done in last 30 days
        const now = Date.now();
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

        if (user.last_password_reset) {
            const lastResetTime = new Date(user.last_password_reset).getTime();
            if (now - lastResetTime < thirtyDaysMs) {
                const nextResetDate = new Date(lastResetTime + thirtyDaysMs);
                return res.json({
                    success: true,
                    last_password_reset: user.last_password_reset,
                    next_reset_allowed: nextResetDate.toISOString()
                });
            }
        }

        // No restriction → allow reset
        res.json({ success: true });

    } catch (err) {
        console.error('Error checking reset status:', err);
        res.status(500).json({ error: 'An error occurred while checking your reset status.' });
    }
});
// --- ADMIN LOGIN ROUTE ---
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 AND role = $2',
      [username, 'admin']
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const admin = result.rows[0];
    const isMatch = await bcrypt.compare(password, admin.passwordhash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const token = jwt.sign(
      { id: admin.id, role: 'admin' },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role
      }
    });

  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Admin login failed' });
  }
});

app.post('/api/audit/user-view', authMiddleware, async (req, res) => {
    const { userId } = req.body;
    const adminId = req.user.id; // Assuming admin is logged in

    try {
        await pool.query(`
            INSERT INTO audit_logs (user_id, viewed_by, ip_address, user_agent)
            VALUES ($1, $2, $3, $4)
        `, [userId, adminId, req.ip, req.get('User-Agent')]);

        res.json({ success: true });
    } catch (err) {
        console.error('Error logging user view:', err);
        res.status(500).json({ error: 'Failed to log user view' });
    }
});
// --- CONTACT FORM ENDPOINT ---
app.post('/api/contact', async (req, res) => {
    const { name, email, phone, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !subject || !message) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        // Save message to database
        const result = await pool.query(
            `INSERT INTO contact_messages (name, email, phone, subject, message)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, created_at`,
            [name, email, phone, subject, message]
        );

        const messageId = result.rows[0].id;
        const createdAt = result.rows[0].created_at;

        // Send email to admin via SendGrid
        const msg = {
            to: process.env.ADMIN_EMAIL || 'admin@phemmysolar.ng',
            from: 'info@phemmysolar.com', // Use your verified sender
            subject: `[📬 New Message] ${subject}`,
            html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Message from User</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    background-color: #f5f5f5;
                    margin: 0;
                    padding: 20px;
                }
                .email-container {
                    max-width: 600px;
                    margin: 0 auto;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    overflow: hidden;
                }
                .header {
                    background: #007BFF; /* Blue header */
                    color: white;
                    padding: 20px;
                    text-align: center;
                }
                .header h2 {
                    margin: 0;
                    font-size: 24px;
                }
                .content {
                    padding: 30px;
                }
                .section {
                    margin-bottom: 20px;
                    padding: 15px;
                    background: #f9f9f9;
                    border-left: 4px solid #007BFF;
                    border-radius: 4px;
                }
                .label {
                    font-weight: bold;
                    color: #007BFF;
                    display: block;
                    margin-bottom: 5px;
                }
                .message {
                    background: #fff;
                    border: 1px solid #ddd;
                    padding: 15px;
                    border-radius: 4px;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                }
                .cta {
                    background: #FFF8E1;
                    border: 1px solid #FFD54F;
                    padding: 15px;
                    border-radius: 4px;
                    margin: 20px 0;
                    text-align: center;
                    font-weight: bold;
                    color: #FF6F00;
                }
                .footer {
                    background: #eee;
                    padding: 15px;
                    text-align: center;
                    font-size: 12px;
                    color: #666;
                    border-top: 1px solid #ddd;
                }
                .timestamp {
                    font-style: italic;
                    color: #777;
                    font-size: 14px;
                    margin-top: 10px;
                }
                @media (max-width: 600px) {
                    .email-container {
                        margin: 10px;
                    }
                    .content {
                        padding: 20px;
                    }
                }
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="header">
                    <h2>📬 New Message from User on Your App</h2>
                </div>
                <div class="content">
                    <div class="section">
                        <div class="label">👤 Name:</div>
                        <div>${name}</div>
                    </div>
                    <div class="section">
                        <div class="label">✉️ Email:</div>
                        <div>${email}</div>
                    </div>
                    <div class="section">
                        <div class="label">📞 Phone:</div>
                        <div>${phone}</div>
                    </div>
                    <div class="section">
                        <div class="label">📌 Subject:</div>
                        <div>${subject}</div>
                    </div>
                    <div class="section">
                        <div class="label">💬 Message:</div>
                        <div class="message">${message}</div>
                    </div>
                    <div class="timestamp">🕒 Sent at: ${new Date().toLocaleString()}</div>

                    <!-- ⚡️ ACTION REQUIRED CTA -->
                    <div class="cta">
                        🚨 <strong>Action Required:</strong><br>
                        Please log in to your <a href="https://www.phemmysolar.com/admin/messages" target="_blank" style="color: #FF6F00; text-decoration: underline;">Admin Panel</a> to view and reply to this message.<br>
                        💬 Replies sent through the admin dashboard are tracked and logged.
                    </div>
                </div>
                <div class="footer">
                    🤖 This is an automated message from Phemmy Solar. Please do not reply directly to this email.
                </div>
            </div>
        </body>
        </html>
        `,
        };

        try {
            await sgMail.send(msg);
            console.log(`✅ Email sent to admin for contact message ID: ${messageId}`);
        } catch (emailError) {
            console.error('❌ Error sending email:', emailError.message);
            // Still return success — we saved the message
        }

        // Respond to client
        res.status(200).json({
            success: true,
            message: 'Your message has been received!',
            messageId,
            timestamp: createdAt
        });

    } catch (dbError) {
        console.error('❌ Database error saving contact message:', dbError.message);
        res.status(500).json({ error: 'Failed to save message. Please try again.' });
    }
});
// --- ADMIN CONTACT MESSAGES ROUTE ---
app.get('/api/admin/messages', authMiddleware, adminOnly, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                id,
                name,
                email,
                phone,
                subject,
                message,
                created_at AS timestamp,
                read
            FROM contact_messages
            ORDER BY created_at DESC
        `);

        res.json(result.rows);
    } catch (err) {
        console.error('Admin fetch messages error:', err);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// --- MARK MESSAGE AS READ ---
app.patch('/api/admin/messages/:id/read', authMiddleware, adminOnly, async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query(
            'UPDATE contact_messages SET read = TRUE WHERE id = $1',
            [id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Mark message as read error:', err);
        res.status(500).json({ error: 'Failed to mark message as read' });
    }
});
// --- GET SINGLE MESSAGE FOR VIEWING ---
app.get('/api/admin/messages/:id', authMiddleware, adminOnly, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(`
            SELECT 
                id,
                name,
                email,
                phone,
                subject,
                message,
                created_at AS timestamp,
                read
            FROM contact_messages
            WHERE id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Message not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching single message:', err);
        res.status(500).json({ error: 'Failed to fetch message' });
    }
});
// --- REMITA WEBHOOK ROUTE ---
app.post('/api/webhook/remita', async (req, res) => {
  const { transactionId, status } = req.body;
  try {
    await pool.query(
      'UPDATE orders SET status = $1 WHERE transaction_id = $2',
      [status, transactionId]
    );
    res.status(200).send('OK');
  } catch (err) {
    console.error('Error handling Remita webhook:', err);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// --- HEALTH CHECK ---
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    database: pool ? 'Connected' : 'Disconnected',
    env: process.env.DATABASE_URL ? 'DATABASE_URL set' : 'DATABASE_URL missing'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});