const { Pool } = require('pg');
require('dotenv').config(); // Load environment variables

// Configure the PostgreSQL connection
const pool = new Pool({
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    database: process.env.PG_DATABASE,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
});

// Test the connection when the application starts
pool.connect((err, client, release) => {
    if (err) {
        console.error('Error acquiring client', err.stack);
    } else {
        console.log('Connected to PostgreSQL database');
    }
    release(); // Release the client back to the pool
});

// Export the pool for use in other modules
module.exports = pool;
