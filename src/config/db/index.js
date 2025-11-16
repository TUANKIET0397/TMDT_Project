require("dotenv").config()
const mysql = require("mysql2/promise")

const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "231125",
    database: process.env.DB_NAME || "tmdt",
    port: parseInt(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: "+07:00",
    charset: "utf8mb4",
})

// Test connection
pool.getConnection()
    .then((connection) => {
        console.log("✅ Connected to MySQL successfully!")
        console.log(`   Database: ${process.env.DB_NAME}`)
        connection.release()
    })
    .catch((err) => {
        console.error("❌ Database connection failed!")
        console.error("   Error:", err.message)
        console.error("   Check your .env file and MySQL server")
        process.exit(1)
    })

module.exports = pool
