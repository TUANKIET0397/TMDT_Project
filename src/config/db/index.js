require("dotenv").config()
const mysql = require("mysql2/promise")

async function connect() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 3306,
        })
        console.log("✅ Connected to MySQL successfully!")
        return connection
    } catch (error) {
        console.error("❌ Database connection failed:", error.message)
        throw error
    }
}

module.exports = { connect }
