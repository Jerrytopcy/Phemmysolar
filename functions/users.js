// functions/users.js
const { neon } = require('@netlify/neon');

const sql = neon();

exports.handler = async (event, context) => {
    try {
        switch (event.httpMethod) {
            case 'GET':
                return await handleGetUsers(sql);
            case 'POST':
                return await handleCreateUser(sql, event.body);
            case 'PUT':
                return await handleUpdateUser(sql, event.body);
            case 'DELETE':
                return await handleDeleteUser(sql, event.queryStringParameters.id);
            default:
                return {
                    statusCode: 405,
                    body: JSON.stringify({ error: 'Method Not Allowed' })
                };
        }
    } catch (error) {
        console.error('Database Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error' })
        };
    }
};

async function handleGetUsers(sql) {
    const result = await sql`SELECT id, username, email, phone, address, cart, orders FROM users ORDER BY id ASC`;
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(result)
    };
}

async function handleCreateUser(sql, body) {
    const user = JSON.parse(body);
    const { id, username, passwordHash, email, phone, address, cart, orders } = user;

    // Validate required fields
    if (!username || !passwordHash) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Username and password are required.' })
        };
    }

    // Check for duplicate username
    const existingUser = await sql`SELECT id FROM users WHERE username = ${username}`;
    if (existingUser.length > 0) {
        return {
            statusCode: 409,
            body: JSON.stringify({ error: 'Username already exists.' })
        };
    }

    // Set default values if not provided
    const userId = id || Date.now().toString();
    const newUser = {
        id: userId,
        username: username,
        password_hash: passwordHash,
        email: email || null,
        phone: phone || null,
        address: address || {},
        cart: cart || [],
        orders: orders || []
    };

    const result = await sql`
        INSERT INTO users (id, username, password_hash, email, phone, address, cart, orders)
        VALUES (${newUser.id}, ${newUser.username}, ${newUser.password_hash}, ${newUser.email}, ${newUser.phone},
                ${newUser.address}, ${newUser.cart}, ${newUser.orders})
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

async function handleUpdateUser(sql, body) {
    const user = JSON.parse(body);
    const { id, username, passwordHash, email, phone, address, cart, orders } = user;

    if (!id) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'User ID is required.' })
        };
    }

    // Check if user exists
    const existingUser = await sql`SELECT id FROM users WHERE id = ${id}`;
    if (existingUser.length === 0) {
        return {
            statusCode: 404,
            body: JSON.stringify({ error: 'User not found.' })
        };
    }

    // Check for duplicate username (if changing)
    if (username) {
        const existingUsername = await sql`SELECT id FROM users WHERE username = ${username} AND id != ${id}`;
        if (existingUsername.length > 0) {
            return {
                statusCode: 409,
                body: JSON.stringify({ error: 'Username already exists.' })
            };
        }
    }

    const result = await sql`
        UPDATE users
        SET username = ${username || null}, password_hash = ${passwordHash || null}, email = ${email || null},
            phone = ${phone || null}, address = ${address || null}, cart = ${cart || null}, orders = ${orders || null},
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, username, email, phone, address, cart, orders
    `;
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(result[0])
    };
}

async function handleDeleteUser(sql, id) {
    if (!id) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'User ID is required.' })
        };
    }

    const result = await sql`
        DELETE FROM users WHERE id = ${id} RETURNING id
    `;
    if (result.length === 0) {
        return {
            statusCode: 404,
            body: JSON.stringify({ error: 'User not found.' })
        };
    }
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ message: 'User deleted successfully.' })
    };
}