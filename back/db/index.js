const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'stock_database'
});

async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('MySQL 연결 성공!');
        connection.release();
        return true;
    } catch (error) {
        console.error('MySQL 연결 실패:', error.message);
        return false;
    }
}

module.exports = {
    pool,
    testConnection
};
