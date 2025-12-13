// functions/news.js
const { neon } = require('@netlify/neon');

const sql = neon();

exports.handler = async (event, context) => {
    try {
        switch (event.httpMethod) {
            case 'GET':
                return await handleGetNews(sql);
            case 'POST':
                return await handleCreateNews(sql, event.body);
            case 'PUT':
                return await handleUpdateNews(sql, event.body);
            case 'DELETE':
                return await handleDeleteNews(sql, event.queryStringParameters.id);
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

async function handleGetNews(sql) {
    const result = await sql`SELECT * FROM news ORDER BY date DESC, id ASC`;
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(result)
    };
}

async function handleCreateNews(sql, body) {
    const article = JSON.parse(body);
    const { title, description, full_content, image, date } = article;

    // Validate required fields
    if (!title || !description) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Title and description are required.' })
        };
    }

    // Parse date string to Date object
    let parsedDate = null;
    if (date) {
        parsedDate = new Date(date);
        if (isNaN(parsedDate)) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid date format.' })
            };
        }
    }

    const result = await sql`
        INSERT INTO news (title, description, full_content, image, date)
        VALUES (${title}, ${description}, ${full_content || description}, ${image || null}, ${parsedDate || null})
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

async function handleUpdateNews(sql, body) {
    const article = JSON.parse(body);
    const { id, title, description, full_content, image, date } = article;

    if (!id) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'News ID is required.' })
        };
    }

    // Parse date string to Date object
    let parsedDate = null;
    if (date) {
        parsedDate = new Date(date);
        if (isNaN(parsedDate)) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid date format.' })
            };
        }
    }

    const result = await sql`
        UPDATE news
        SET title = ${title}, description = ${description}, full_content = ${full_content || description},
            image = ${image || null}, date = ${parsedDate || null}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
    `;
    if (result.length === 0) {
        return {
            statusCode: 404,
            body: JSON.stringify({ error: 'News article not found.' })
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

async function handleDeleteNews(sql, id) {
    if (!id) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'News ID is required.' })
        };
    }

    const result = await sql`
        DELETE FROM news WHERE id = ${id} RETURNING id
    `;
    if (result.length === 0) {
        return {
            statusCode: 404,
            body: JSON.stringify({ error: 'News article not found.' })
        };
    }
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ message: 'News article deleted successfully.' })
    };
}