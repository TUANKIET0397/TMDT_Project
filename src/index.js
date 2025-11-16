require("dotenv").config()
const path = require("path")
const express = require("express")
const morgan = require("morgan")
const { engine } = require("express-handlebars")
const app = express()
const port = process.env.PORT || 3000

// !!!
// khi gõ tìm thư mục thì file index.js sẽ được tự động tìm
const route = require("./routes")
const db = require("./config/db")
// connect to db - Test database connection
db.getConnection()
    .then((connection) => {
        console.log("✅ Database connected")
        connection.release()
    })
    .catch((err) => {
        console.error("❌ Database error:", err.message)
    })

// middleware
app.use(express.urlencoded({ extended: true })) // xử lý dữ liệu từ form
app.use(express.json()) // xử lý dữ liệu json

// xử lý dạng file tĩnh - start form public
app.use(express.static(path.join(__dirname, "public")))
app.use("/img", express.static(path.join(__dirname, "img")))

// HTTP logger
app.use(morgan("combined"))

// Template engine
app.engine(
    ".hbs",
    engine({
        extname: ".hbs",
        allowProtoPropertiesByDefault: true,
        helpers: {
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
        },
    })
)
app.set("view engine", ".hbs")
app.set("views", path.join(__dirname, "resources", "views"))

// nạp route vào app
route(app)

app.listen(port, () => {
    console.log(`App listening on port ${port}`)
})
