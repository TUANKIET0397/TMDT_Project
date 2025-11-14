// src/app/models/Site.js
const db = require("../../config/db")

class Site {
    static async all() {
        const connection = await db.connect()
        const [rows] = await connection.execute("SELECT * FROM Users") // lấy dữ liệu từ bảng users
        return rows
    }
}



module.exports = Site
