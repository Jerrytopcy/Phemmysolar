// functions/auth.js
const { neon } = require('@netlify/neon');

const sql = neon();

exports.handler = async (event, context) => {
    try {
        switch (event.httpMethod) {
            case 'POST':
                const action = event.queryStringParameters.action;
                if (action === 'login') {
                    return await handleLogin(sql, event.body);
                } else if (action === 'signup') {
                    return await handleSignup(sql, event.body);
                } else {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ error: 'Invalid action parameter.' })
                    };
                }
            default:
                return {
                    statusCode: 405,
                    body: JSON.stringify({ error: 'Method Not Allowed' })
                };
        }
    } catch (error) {
        console.error('Authentication Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error' })
        };
    }
};

async function handleLogin(sql, body) {
    const { username, password } = JSON.parse(body);

    // Validate input
    if (!username || !password) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Username and password are required.' })
        };
    }

    // Find user by username
    const result = await sql`SELECT * FROM users WHERE username = ${username}`;
    if (result.length === 0) {
        return {
            statusCode: 401,
            body: JSON.stringify({ error: 'Invalid username or password.' })
        };
    }

    const user = result[0];

    // In a real app, you would compare the hashed password here.
    // For now, since we're using the same hash function as your frontend,
    // we'll simulate the comparison.
    // Note: This is NOT secure for production!
    const storedHash = user.password_hash;
    const calculatedHash = hashPassword(password); // Use the same function as in your frontend

    if (storedHash !== calculatedHash) {
        return {
            statusCode: 401,
            body: JSON.stringify({ error: 'Invalid username or password.' })
        };
    }

    // Return user data (excluding password hash)
    const { password_hash, ...userWithoutPassword } = user;
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(userWithoutPassword)
    };
}

async function handleSignup(sql, body) {
    const { username, password, email, phone, street, city, state, postalCode } = JSON.parse(body);

    // Validate required fields
    if (!username || !password || !email || !phone || !street || !city || !state) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Please fill in all required fields.' })
        };
    }

    // Check for duplicate username
    const existingUser = await sql`SELECT id FROM users WHERE username = ${username}`;
    if (existingUser.length > 0) {
        return {
            statusCode: 409,
            body: JSON.stringify({ error: 'Username already exists. Please choose another.' })
        };
    }

    // Create new user
    const userId = Date.now().toString();
    const passwordHash = hashPassword(password); // Use the same function as in your frontend

    const address = {
        street: street,
        city: city,
        state: state,
        postalCode: postalCode,
        country: "Nigeria"
    };

    const result = await sql`
        INSERT INTO users (id, username, password_hash, email, phone, address, cart, orders)
        VALUES (${userId}, ${username}, ${passwordHash}, ${email}, ${phone}, ${address}, ${[]}, ${[]})
        RETURNING id, username, email, phone, address, cart, orders
    `;

    return {
        statusCode: 201,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(result[0])
    };
}

// Simple password hashing simulation (NOT secure for real applications)
function hashPassword(password) {
    // A basic hash using Array reduce - very weak, just for client-side simulation
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
}