// server.js — Production-ready backend for Railway
const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// --- ADD SENDGRID SETUP ---
const sgMail = require('@sendgrid/mail');
const jwt = require('jsonwebtoken');

// Set your SendGrid API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
// --- END SENDGRID SETUP ---

// Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Parse JSON bodies (increased limit for Base64 images)
app.use(express.json({ limit: '500mb' }));

// --- ENABLE CORS ---
const cors = require('cors');
app.use(cors({
    origin: true,
    credentials: true
}));
// --- END CORS ---

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
app.get('/api/news', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM news ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching news:', err);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

app.get('/api/news/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM news WHERE id = $1', [req.params.id]);
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
      'INSERT INTO news (title, description, fullContent, image, date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
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
      'UPDATE news SET title = $1, description = $2, fullContent = $3, image = $4, date = $5 WHERE id = $6 RETURNING *',
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
    const result = await pool.query('DELETE FROM news WHERE id = $1 RETURNING *', [req.params.id]);
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
    id,
    username,
    email,
    phone,
    address::json AS address, -- 👈 Force PostgreSQL to return address as JSON object
    role
  FROM users 
  ORDER BY id
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
        id,
        username,
        email,
        phone,
        address::json AS address, -- 👈 Add this
        role
      FROM users WHERE id = $1
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

// --- FORGOT PASSWORD ROUTE ---
app.post('/api/forgot-password', async (req, res) => {
  const { username, email } = req.body;

  if (!username || !email) {
    return res.status(400).json({ error: 'Username and email are required.' });
  }

  try {
    const result = await pool.query(
      'SELECT id, username, email FROM users WHERE username = $1 AND email = $2',
      [username, email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found with the provided username and email.' });
    }

    const user = result.rows[0];
    const resetToken = `${user.id}:${Date.now()}:${Math.random().toString(36).substr(2)}`;
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour

    await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3',
      [resetToken, resetTokenExpiry, user.id]
    );

    const resetLink = `https://phemmysolar-production.up.railway.app/reset-password?token=${encodeURIComponent(resetToken)}`;

    const msg = {
      to: email,
      from: 'noreply@phemmysolar.com',
      subject: 'Password Reset Request',
      text: `Hello ${username},\n\nYou requested to reset your password. Please click the link below to reset it:\n${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you did not request this, please ignore this email.`,
      html: `<p>Hello ${username},</p>
             <p>You requested to reset your password. Please click the link below to reset it:</p>
             <p><a href="${resetLink}">${resetLink}</a></p>
             <p>This link will expire in 1 hour.</p>
             <p>If you did not request this, please ignore this email.</p>`
    };

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
app.post('/api/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required.' });
  }

  try {
    const parts = token.split(':');
    if (parts.length !== 3) {
      return res.status(400).json({ error: 'Invalid token format.' });
    }

    const userId = parseInt(parts[0]);
    const expiry = parseInt(parts[1]);

    if (isNaN(userId) || isNaN(expiry)) {
      return res.status(400).json({ error: 'Invalid token.' });
    }

    if (Date.now() > expiry) {
      return res.status(400).json({ error: 'Token has expired.' });
    }

    const result = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND reset_token = $2',
      [userId, token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired token.' });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await pool.query(
      'UPDATE users SET passwordhash = $1, reset_token = NULL, reset_token_expiry = NULL WHERE id = $2',
      [hashedPassword, userId]
    );

    res.json({
      success: true,
      message: 'Password reset successfully.'
    });

  } catch (err) {
    console.error('Error resetting password:', err);
    res.status(500).json({ error: 'An error occurred while resetting your password.' });
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