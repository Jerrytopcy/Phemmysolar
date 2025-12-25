// server.js — Production-ready backend for Railway
const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

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
