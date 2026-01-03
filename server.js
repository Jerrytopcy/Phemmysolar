// server.js — Production-ready backend for Railway
const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
// --- ADD SENDGRID SETUP ---
const sgMail = require('@sendgrid/mail');

// Set your SendGrid API key (you can also use process.env.SENDGRID_API_KEY)
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
// --- END SENDGRID SETUP ---

// Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Parse JSON bodies
// Parse JSON bodies with increased limit to handle large Base64 image data
app.use(express.json({ limit: '500mb' })); // Adjust the limit as needed (e.g., 10mb, 20mb)

// --- ADD THIS BLOCK ---
const cors = require('cors');

// Enable CORS for development (allow all origins)
app.use(cors({
    origin: true, // Or '*' for dev only
    credentials: true
}));
// --- END ADDITION ---
// Connect to PostgreSQL (Railway auto-provides DATABASE_URL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// --- PRODUCTS ROUTES ---
// GET all products
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET product by ID
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

// POST create product
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

// PUT update product
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

// DELETE product
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
// GET all testimonials
app.get('/api/testimonials', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM testimonials ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching testimonials:', err);
    res.status(500).json({ error: 'Failed to fetch testimonials' });
  }
});

// GET testimonial by ID
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

// POST create testimonial
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

// PUT update testimonial
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

// DELETE testimonial
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
// GET all news
app.get('/api/news', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM news ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching news:', err);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// GET news by ID
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

// POST create news
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

// PUT update news
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

// DELETE news
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
// GET all users
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET user by ID
app.get('/api/users/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST create user
// app.post('/api/users', async (req, res) => {
//   const { username, passwordHash, email, phone, address, role } = req.body;
//   try {
//     const result = await pool.query(
//       'INSERT INTO users (username, passwordHash, email, phone, address, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
//       [username, passwordHash, email, phone, address, role]
//     );
//     res.json({ success: true, user: result.rows[0] });
//   } catch (err) {
//     console.error('Error creating user:', err);
//     res.status(500).json({ error: 'Failed to create user' });
//   }
// });

// PUT update user
app.put('/api/users/:id', async (req, res) => {
  const { username, passwordHash, email, phone, address, role } = req.body;
  try {
    const result = await pool.query(
      'UPDATE users SET username = $1, passwordHash = $2, email = $3, phone = $4, address = $5, role = $6 WHERE id = $7 RETURNING *',
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

// DELETE user
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

// POST create new order for authenticated user
app.post('/api/orders', async (req, res) => {
    const { userId, items, total, deliveryAddress } = req.body;

    if (!userId || !Array.isArray(items) || items.length === 0 || typeof total !== 'number' || !deliveryAddress) {
        return res.status(400).json({ error: 'Invalid order data' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO orders (user_id, items, total, delivery_address, status, payment_status)
             VALUES ($1, $2, $3, $4, 'Pending', 'pending')
             RETURNING *`,
            [userId, items, total, deliveryAddress]
        );

        res.json({ success: true, order: result.rows[0] });
    } catch (err) {
        console.error('Error creating order:', err);
        res.status(500).json({ error: 'Failed to create order' });
    }
});


// GET all orders for a specific user
app.get('/api/orders/user/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const result = await pool.query(
            `SELECT * FROM orders WHERE user_id = $1 ORDER BY date DESC`,
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching user orders:', err);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// PUT update order status or payment status
app.put('/api/orders/:orderId', async (req, res) => {
    const { orderId } = req.params;
    const { status, paymentStatus } = req.body;

    try {
        const result = await pool.query(
            `UPDATE orders SET 
                status = COALESCE($1, status),
                payment_status = COALESCE($2, payment_status),
                updated_at = NOW()
             WHERE id = $3
             RETURNING *`,
            [status, paymentStatus, orderId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json({ success: true, order: result.rows[0] });
    } catch (err) {
        console.error('Error updating order:', err);
        res.status(500).json({ error: 'Failed to update order' });
    }
});

// POST save or update cart for user
app.post('/api/cart/user/:userId', async (req, res) => {
    const { userId } = req.params;
    const { items } = req.body;

    if (!userId || !Array.isArray(items)) {
        return res.status(400).json({ error: 'Invalid cart data' });
    }

    try {
        // Check if cart exists
        let result = await pool.query(
            'SELECT * FROM carts WHERE user_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            // Create new cart
            result = await pool.query(
                `INSERT INTO carts (user_id, items)
                 VALUES ($1, $2)
                 RETURNING *`,
                [userId, items]
            );
        } else {
            // Update existing cart
            result = await pool.query(
                `UPDATE carts SET items = $1, updated_at = NOW()
                 WHERE user_id = $2
                 RETURNING *`,
                [items, userId]
            );
        }

        res.json({ success: true, cart: result.rows[0] });

    } catch (err) {
        console.error('Error saving cart:', err);
        res.status(500).json({ error: 'Failed to save cart' });
    }
});

// GET cart for user
app.get('/api/cart/user/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const result = await pool.query(
            'SELECT * FROM carts WHERE user_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            // Return empty cart if none exists
            return res.json({
                success: true,
                cart: {
                    user_id: parseInt(userId),
                    items: [],
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            });
        }

        res.json({ success: true, cart: result.rows[0] });

    } catch (err) {
        console.error('Error fetching cart:', err);
        res.status(500).json({ error: 'Failed to fetch cart' });
    }
});


// --- AUTHENTICATION ROUTE ---
// POST login/signup
// --- AUTHENTICATION ROUTE ---
const bcrypt = require('bcryptjs');

app.post('/api/auth', async (req, res) => {
    const { username, password, action } = req.body;

    // Log the incoming request for debugging
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

    return res.json({ success: true, user });
}
 else if (action === 'signup') {
            const { email, phone, address } = req.body;

            // Validate required fields for signup
            if (!username || !password || !email || !phone || !address || !address.street || !address.city || !address.state) {
                return res.status(400).json({ error: 'All required fields must be filled' });
            }

            // Hash the password on the server
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            // Insert new user
            const result = await pool.query(
                'INSERT INTO users (username, passwordHash, email, phone, address, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
                [username, hashedPassword, email, phone, address, 'user']
            );

            // Success - send new user data
            res.json({ success: true, user: result.rows[0] });

        } else {
            res.status(400).json({ error: 'Invalid action' });
        }
    } catch (err) {
        console.error('Detailed error in auth route:', err); // Log the full error object
        res.status(500).json({ error: 'Authentication failed', details: err.message }); // Send more detail to client for debugging
    }

});
// --- ADMIN AUTHENTICATION ROUTE ---

// --- FORGOT PASSWORD ROUTE ---
app.post('/api/forgot-password', async (req, res) => {
    const { username, email } = req.body;

    // Validate input
    if (!username || !email) {
        return res.status(400).json({ error: 'Username and email are required.' });
    }

    try {
        // Find the user by username and email
        const result = await pool.query(
            'SELECT id, username, email FROM users WHERE username = $1 AND email = $2',
            [username, email]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found with the provided username and email.' });
        }

        const user = result.rows[0];

        // Generate a unique reset token (for demo, we'll use a simple timestamp-based token)
        // In a real app, use a cryptographically secure random string
        const resetToken = `${user.id}:${Date.now()}:${Math.random().toString(36).substr(2)}`;
        const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now

        // Save the token and expiry in the database (you need to add these columns to your users table)
        // If you haven't added them yet, run this SQL in your PostgreSQL database:
        /*
        ALTER TABLE users ADD COLUMN reset_token VARCHAR;
        ALTER TABLE users ADD COLUMN reset_token_expiry BIGINT;
        */

        await pool.query(
            'UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3',
            [resetToken, resetTokenExpiry, user.id]
        );

        // Construct the reset link
        const resetLink = `https://phemmysolar-production.up.railway.app/reset-password?token=${encodeURIComponent(resetToken)}`;

        // Send the email using SendGrid
        const msg = {
            to: email,
            from: 'noreply@phemmysolar.com', // Use a verified sender address in SendGrid
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

        // Respond to client
        res.json({
            success: true,
            message: 'A password reset link has been sent to your email.'
        });

    } catch (err) {
        console.error('Error in forgot password route:', err);
        res.status(500).json({ error: 'An error occurred while processing your request.' });
    }
});
// --- END FORGOT PASSWORD ROUTE ---
// --- RESET PASSWORD ROUTE ---
app.post('/api/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({ error: 'Token and new password are required.' });
    }

    try {
        // Split the token to get user ID and validate
        const parts = token.split(':');
        if (parts.length !== 3) {
            return res.status(400).json({ error: 'Invalid token format.' });
        }

        const userId = parseInt(parts[0]);
        const expiry = parseInt(parts[1]);

        if (isNaN(userId) || isNaN(expiry)) {
            return res.status(400).json({ error: 'Invalid token.' });
        }

        // Check if token is expired
        if (Date.now() > expiry) {
            return res.status(400).json({ error: 'Token has expired.' });
        }

        // Verify token against database
        const result = await pool.query(
            'SELECT id FROM users WHERE id = $1 AND reset_token = $2',
            [userId, token]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired token.' });
        }

        // Hash the new password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update the user's password and clear the reset token
        await pool.query(
            'UPDATE users SET passwordHash = $1, reset_token = NULL, reset_token_expiry = NULL WHERE id = $2',
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
// --- END RESET PASSWORD ROUTE ---
// POST admin login
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const result = await pool.query(
            'SELECT id, username, passwordhash, role FROM users WHERE username = $1 AND role = $2',
            [username, 'admin']
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid admin credentials' });
        }

        const admin = result.rows[0];

        if (!admin.passwordhash || typeof admin.passwordhash !== 'string') {
            return res.status(401).json({ error: 'Invalid admin credentials' });
        }

        const isMatch = await bcrypt.compare(password, admin.passwordhash);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid admin credentials' });
        }

        return res.json({
            success: true,
            message: 'Admin logged in successfully',
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
// POST handle Remita payment callback
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

// --- CHECKOUT ROUTE ---
// POST initiate checkout
app.post('/api/checkout', async (req, res) => {
  const { productId, email } = req.body;
  try {
    const product = await pool.query('SELECT * FROM products WHERE id = $1', [productId]);
    if (product.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const order = await pool.query(
      'INSERT INTO orders (product_id, customer_email, status) VALUES ($1, $2, $3) RETURNING *',
      [productId, email, 'pending']
    );

    res.json({ orderId: order.rows[0].id, message: 'Checkout initiated' });
  } catch (err) {
    console.error('Error in checkout route:', err);
    res.status(500).json({ error: 'Checkout failed' });
  }
});
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

// Add this temporary route to server.js for testing (remove after testing)
