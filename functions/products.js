// functions/products.js
const { neon } = require('@netlify/neon');

// Initialize the connection pool using the environment variable
const sql = neon();

exports.handler = async (event, context) => {
    try {
        // Handle different HTTP methods
        switch (event.httpMethod) {
            case 'GET':
                return await handleGetProducts(sql);
            case 'POST':
                return await handleCreateProduct(sql, event.body);
            case 'PUT':
                return await handleUpdateProduct(sql, event.body);
            case 'DELETE':
                return await handleDeleteProduct(sql, event.queryStringParameters.id);
            default:
                return {
                    statusCode: 405,
                    body: JSON.stringify({ error: 'Method Not Allowed' })
                };
        }
    } catch (error) {
        console.error('Database Error:', error); // Log the full error object
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: 'Internal Server Error',
                message: error.message, // Include the specific error message
                stack: error.stack // Include the stack trace for debugging
            })
        };
    }
};

async function handleGetProducts(sql) {
    const result = await sql`SELECT * FROM products ORDER BY id ASC`;
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(result)
    };
}

async function handleCreateProduct(sql, body) {
    const product = JSON.parse(body);
    const { name, price, description, category, images } = product;

    // Validate required fields
    if (!name || !price || !description) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Name, price, and description are required.' })
        };
    }

    const result = await sql`
        INSERT INTO products (name, price, description, category, images)
        VALUES (${name}, ${price}, ${description}, ${category || null}, ${images || []})
        RETURNING *
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

async function handleUpdateProduct(sql, body) {
    const product = JSON.parse(body);
    const { id, name, price, description, category, images } = product;

    if (!id) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Product ID is required.' })
        };
    }

    const result = await sql`
        UPDATE products
        SET name = ${name}, price = ${price}, description = ${description},
            category = ${category || null}, images = ${images || []}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
    `;
    if (result.length === 0) {
        return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Product not found.' })
        };
    }
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(result[0])
    };
}

async function handleDeleteProduct(sql, id) {
    if (!id) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Product ID is required.' })
        };
    }

    const result = await sql`
        DELETE FROM products WHERE id = ${id} RETURNING id
    `;
    if (result.length === 0) {
        return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Product not found.' })
        };
    }
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ message: 'Product deleted successfully.' })
    };
}