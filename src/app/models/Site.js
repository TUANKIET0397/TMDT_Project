// src/app/models/Site.js
const db = require("../../config/db")

class Site {
    static async all() {
        const connection = await db.connect()
        // trả về 2 loại dữ liệu là rows và fields
        const [rows] = await connection.execute("SELECT * FROM Users") // lấy dữ liệu từ bảng users
        // console.log(rows)
        return rows
    }
}



module.exports = Site
