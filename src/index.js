require("dotenv").config()
const path = require("path")
const express = require("express")
const morgan = require("morgan")
const { engine } = require("express-handlebars")
const app = express()
const port = process.env.PORT || 3000

// Route và Database
const route = require("./routes")
const db = require("./config/db")

// Test database connection
db.getConnection()
    .then((connection) => {
        console.log("✅ Database connected")
        connection.release()
    })
    .catch((err) => {
        console.error("❌ Database error:", err.message)
    })

// Middleware
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

// Static files
app.use(express.static(path.join(__dirname, "public")))
app.use("/img", express.static(path.join(__dirname, "img")))

// HTTP logger
app.use(morgan("combined"))

// ===== TEMPLATE ENGINE =====
app.engine(
    ".hbs",
    engine({
        extname: ".hbs",
        allowProtoPropertiesByDefault: true,
        helpers: {
            // Helper cho content blocks (GIỮ NGUYÊN)
            block: function (name) {
                this._blocks = this._blocks || {}
                const val = (this._blocks[name] || []).join("\n")
                return val
            },
            contentFor: function (name, options) {
                this._blocks = this._blocks || {}
                this._blocks[name] = this._blocks[name] || []
                this._blocks[name].push(options.fn(this))
            },

            // ===== THÊM CÁC HELPER MỚI =====

            // Format giá tiền: 5870.32 → 5,870.32
            formatPrice: function (price) {
                if (!price) return "0.00"
                return parseFloat(price)
                    .toFixed(2)
                    .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
            },

            // Format ngày: 2025-11-16 → Nov 16, 2025
            formatDate: function (date) {
                if (!date) return ""
                const d = new Date(date)
                const months = [
                    "Jan",
                    "Feb",
                    "Mar",
                    "Apr",
                    "May",
                    "Jun",
                    "Jul",
                    "Aug",
                    "Sep",
                    "Oct",
                    "Nov",
                    "Dec",
                ]
                return `${
                    months[d.getMonth()]
                } ${d.getDate()}, ${d.getFullYear()}`
            },

            // So sánh: {{#if (eq a b)}}
            eq: function (a, b) {
                return a === b
            },

            // Nhân: {{multiply price quantity}}
            multiply: function (a, b) {
                return parseFloat(a || 0) * parseFloat(b || 0)
            },
        },
    })
)

app.set("view engine", ".hbs")
app.set("views", path.join(__dirname, "resources", "views"))

// Routes
route(app)

// Start server
app.listen(port, () => {
    console.log(`App listening on port ${port}`)
})
