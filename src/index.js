require("dotenv").config()
const path = require("path")
const express = require("express")
const morgan = require("morgan")
const { engine } = require("express-handlebars")
const session = require("express-session")
const http = require("http") // CAUHINH SERVER CHO SOCKET.IO
const { Server } = require("socket.io") // CAUHINH SERVER CHO SOCKET.IO

const cookieParser = require("cookie-parser") // npm install cookie-parser
const trackPageView = require("./middlewares/trackPageView")

const app = express()
const port = process.env.PORT || 3000

// Route và Database
const route = require("./routes")
const server = http.createServer(app) // ← TẠO HTTP SERVER
const io = new Server(server) // ← TẠO SOCKET.IO SERVER

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

// middleware
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(cookieParser())
app.use(trackPageView)

// session middleware
app.use(
    session({
        name: "sid",
        secret: process.env.SESSION_SECRET || "keyboard cat",
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 1000 * 60 * 60 * 24, // 1 ngày
            httpOnly: true,
            secure: false, // để true khi chạy HTTPS
        },
    })
)

// expose basic auth info to all views + frontend scripts
app.use((req, res, next) => {
    const authUser =
        req.session && req.session.userId
            ? {
                  id: req.session.userId,
                  fullName: req.session.userFullName || null,
                  email: req.session.userEmail || null,
              }
            : null

    const serialized = JSON.stringify(authUser || null).replace(/</g, "\\u003c")
    res.locals.appUser = authUser
    res.locals.appUserJson = serialized

    next()
})

// static files
app.use(express.static(path.join(__dirname, "public")))
app.use("/img", express.static(path.join(__dirname, "img")))
app.use("/css", express.static(path.join(__dirname, "css")))
app.use("/js", express.static(path.join(__dirname, "js")))

// HTTP logger
app.use(morgan("combined"))

// ===== TEMPLATE ENGINE =====
app.engine(
    ".hbs",
    engine({
        extname: ".hbs",
        allowProtoPropertiesByDefault: true,
        helpers: {
            // Content block helpers
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

            // ===== CUSTOM HELPERS =====
            formatPrice: function (price) {
                if (!price) return "0.00"
                return parseFloat(price)
                    .toFixed(2)
                    .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
            },

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

            eq: function (a, b) {
                return a === b
            },

            multiply: function (a, b) {
                return parseFloat(a || 0) * parseFloat(b || 0)
            },
            // ✅ Thêm 2 helper này
            divide: function (a, b) {
                return (parseFloat(a) / parseFloat(b)).toFixed(2)
            },
            eq: function (a, b) {
                return a === b
            },
        },
    })
)

app.set("view engine", ".hbs")
app.set("views", path.join(__dirname, "resources", "views"))
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
            eq: function (a, b) {
                return a === b
            },
            includes: function (arr, val) {
                if (!arr) return false
                if (Array.isArray(arr)) {
                    return arr.includes(val)
                }
                return arr === val
            },
        },
    })

app.set("view engine", ".hbs")
app.set("views", path.join(__dirname, "resources", "views"))

// nạp route vào app
route(app)

// Cấu hình Socket.IO
// ===== SOCKET.IO LOGIC =====
io.on("connection", (socket) => {
    console.log("🟢 User connected:", socket.id)

    // User join với UserID hoặc SessionID
    socket.on("user:join", async (data = {}) => {
        try {
            const rawUserId = data.userId || socket.id
            socket.userId = rawUserId
            socket.join(`user:${rawUserId}`)

            let displayName = data.name || null
            const numericId = Number(rawUserId)

            if (!Number.isNaN(numericId)) {
                const [rows] = await db.query(
                    "SELECT FirstName, LastName, Email FROM Users WHERE ID = ? LIMIT 1",
                    [numericId]
                )
                if (rows.length > 0) {
                    const fullName = `${rows[0].FirstName || ""} ${
                        rows[0].LastName || ""
                    }`.trim()
                    displayName =
                        fullName || rows[0].Email || `User #${numericId}`
                }
            }

            socket.userName =
                displayName || `Guest ${String(rawUserId).slice(-4)}`

            console.log(`👤 User ${rawUserId} joined as ${socket.userName}`)

            socket.emit("user:joined", {
                userId: rawUserId,
                name: socket.userName,
            })

            io.emit("admin:new-user", {
                userId: rawUserId,
                name: socket.userName,
                timestamp: new Date().toISOString(),
            })
        } catch (error) {
            console.error("Error handling user:join:", error)
        }
    })

    // Admin join
    socket.on("admin:join", () => {
        socket.join("admin-room")
        console.log("👨‍💼 Admin joined")
    })

    // User gửi tin nhắn
    socket.on("user:message", async (data) => {
        console.log("📩 User message:", data)

        const dbUserId = Number(socket.userId)
        if (!dbUserId || Number.isNaN(dbUserId)) {
            console.warn(
                "⚠️ Blocked chat from unauthenticated user:",
                socket.id
            )
            return
        }

        const messageData = {
            userId: dbUserId,
            userName: socket.userName,
            message: data.message,
            productId: data.productId || null,
            productName: data.productName || null,
            productPrice: data.productPrice || null,
            productImage: data.productImage || null,
            timestamp: new Date().toISOString(),
            sender: "user",
        }

        // Lưu vào database
        try {
            await db.query(
                "INSERT INTO Chat (UserID, ProductID, Message, SendTime) VALUES (?, ?, ?, NOW())",
                [dbUserId, data.productId || null, data.message || ""]
            )
        } catch (error) {
            console.error("Error saving message:", error)
        }

        // Gửi cho admin
        io.to("admin-room").emit("admin:receive-message", messageData)

        // Gửi lại cho user (confirmation)
        socket.emit("user:message-sent", messageData)
    })

    // Admin gửi tin nhắn
    socket.on("admin:message", async (data) => {
        console.log("📩 Admin message:", data)

        const messageData = {
            userId: data.userId,
            userName: data.userName || null,
            message: data.message,
            timestamp: new Date().toISOString(),
            sender: "admin",
        }

        // Lưu vào database
        try {
            await db.query(
                "INSERT INTO Chat (UserID, AdminID, Message, SendTime) VALUES (?, ?, ?, NOW())",
                [data.userId, 1, data.message] // AdminID = 1 (tạm thời)
            )
        } catch (error) {
            console.error("Error saving message:", error)
        }

        // Gửi cho user cụ thể
        io.to(`user:${data.userId}`).emit("user:receive-message", messageData)

        // Gửi lại cho admin (confirmation)
        socket.emit("admin:message-sent", messageData)
    })

    // Disconnect
    socket.on("disconnect", () => {
        console.log("🔴 User disconnected:", socket.id)
    })
})

// Start HTTP server (so Socket.IO is attached to the same server)
server.listen(port, () => {
    console.log(`🚀 App listening on port ${port}`)
    console.log(`💬 Socket.IO ready`)
})
