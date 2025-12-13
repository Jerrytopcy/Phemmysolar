// functions/testimonials.js
const { neon } = require('@netlify/neon');

const sql = neon();

exports.handler = async (event, context) => {
    try {
        switch (event.httpMethod) {
            case 'GET':
                return await handleGetTestimonials(sql);
            case 'POST':
                return await handleCreateTestimonial(sql, event.body);
            case 'PUT':
                return await handleUpdateTestimonial(sql, event.body);
            case 'DELETE':
                return await handleDeleteTestimonial(sql, event.queryStringParameters.id);
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

async function handleGetTestimonials(sql) {
    const result = await sql`SELECT * FROM testimonials ORDER BY id ASC`;
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(result)
    };
}

async function handleCreateTestimonial(sql, body) {
    const testimonial = JSON.parse(body);
    const { name, role, text, rating, image } = testimonial;

    // Validate required fields
    if (!name || !text || !rating) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Name, text, and rating are required.' })
        };
    }

    // Ensure rating is between 1 and 5
    if (rating < 1 || rating > 5) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Rating must be between 1 and 5.' })
        };
    }

    const result = await sql`
        INSERT INTO testimonials (name, role, text, rating, image)
        VALUES (${name}, ${role || null}, ${text}, ${rating}, ${image || null})
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

async function handleUpdateTestimonial(sql, body) {
    const testimonial = JSON.parse(body);
    const { id, name, role, text, rating, image } = testimonial;

    if (!id) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Testimonial ID is required.' })
        };
    }

    const result = await sql`
        UPDATE testimonials
        SET name = ${name}, role = ${role || null}, text = ${text},
            rating = ${rating}, image = ${image || null}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
    `;
    if (result.length === 0) {
        return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Testimonial not found.' })
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

async function handleDeleteTestimonial(sql, id) {
    if (!id) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Testimonial ID is required.' })
        };
    }

    const result = await sql`
        DELETE FROM testimonials WHERE id = ${id} RETURNING id
    `;
    if (result.length === 0) {
        return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Testimonial not found.' })
        };
    }
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ message: 'Testimonial deleted successfully.' })
    };
}