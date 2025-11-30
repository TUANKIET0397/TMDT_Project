// src/routes/admin.js
const express = require("express")
const router = express.Router()
const adminController = require("../app/controllers/AdminController")
const db = require("../config/db")
const { uploadProductImages } = require("../config/multer.config")

// Trang admin
router.get("/", (req, res) => {
    adminController.index(req, res)
})

// Lấy dữ liệu cho dashboard (dùng AJAX)
router.get("/dashboard/data", (req, res) =>
    adminController.dashboardData(req, res)
)

router.get("/register", (req, res) => {
    adminController.register(req, res)
})

router.get("/users", (req, res) => {
    adminController.users(req, res)
})

router.get("/show", (req, res) => {
    adminController.show(req, res)
})

router.get("/invoice", (req, res) => {
    adminController.invoice(req, res)
})

// GET: trả về form tạo product
router.get("/create", (req, res) => {
    adminController.create(req, res)
})

// POST: nhận payload và files từ form
// SỬ DỤNG uploadProductImages middleware để xử lý file upload
router.post("/create", uploadProductImages, (req, res) => {
    adminController.createPost(req, res)
})

// ===== DETAIL PRODUCT ROUTES =====
// GET: xem chi tiết sản phẩm theo ID
router.get("/detail/:id", (req, res) => {
    adminController.detail(req, res)
})

// POST: cập nhật sản phẩm
router.post("/detail/:id", uploadProductImages, (req, res) => {
    adminController.updateProduct(req, res)
})

// ===== CHAT ROUTES =====
router.get("/chat", (req, res) => {
    adminController.chat(req, res)
})

router.get("/chat/users", async (req, res) => {
    try {
        const [users] = await db.query(`
            SELECT DISTINCT 
                c.UserID as userId,
                TRIM(CONCAT(IFNULL(u.FirstName, ''), ' ', IFNULL(u.LastName, ''))) as name,
                u.Email,
                MAX(c.SendTime) as lastActivity,
                (SELECT Message 
                 FROM Chat 
                 WHERE UserID = c.UserID 
                 ORDER BY SendTime DESC 
                 LIMIT 1) as lastMessage
            FROM Chat c
            LEFT JOIN Users u ON c.UserID = u.ID
            GROUP BY c.UserID, name, u.Email
            ORDER BY lastActivity DESC
        `)

        res.json({
            users: users.map((user) => ({
                userId: user.userId,
                name: user.name?.trim() || user.Email || `User #${user.userId}`,
                email: user.Email || null,
                lastMessage: user.lastMessage || "New conversation",
                lastActivity: user.lastActivity,
            })),
        })
    } catch (error) {
        console.error("Error fetching users:", error)
        res.status(500).json({ error: "Failed to fetch users" })
    }
})

router.get("/chat/history/:userId", async (req, res) => {
    try {
        const [messages] = await db.query(
            `
            SELECT 
                c.*,
                p.ProductName,
                pr.Price as ProductPrice,
                COALESCE((SELECT img.ImgPath 
                         FROM ProductImg pi 
                         LEFT JOIN Image img ON pi.ImgID = img.ID 
                         WHERE pi.ProductID = p.ID 
                         LIMIT 1), '/img/default.jpg') as ProductImage
            FROM Chat c
            LEFT JOIN Product p ON c.ProductID = p.ID
            LEFT JOIN Price pr ON p.ID = pr.ProductID
            WHERE c.UserID = ?
            ORDER BY c.SendTime ASC
        `,
            [req.params.userId]
        )

        res.json({ messages })
    } catch (error) {
        console.error("Error fetching history:", error)
        res.status(500).json({ error: "Failed to fetch history" })
    }
})

// ===== XÓA ĐƠN HÀNG - DÙNG POST =====
router.post("/invoice/:id/delete", (req, res) => {
    adminController.deleteInvoice(req, res)
})

// ===== CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG =====
router.post("/invoice/:id/status", (req, res) => {
    adminController.updateInvoiceStatus(req, res)
})

// XÓA NHIỀU ĐƠN HÀNG (CHỌN) - DÙNG POST
router.post("/invoice/delete/selected", (req, res) => {
    adminController.deleteSelectedInvoices(req, res)
})

// Xóa 1 user
router.post("/users/:id/delete", (req, res) => {
    adminController.deleteUser(req, res)
})

// Xóa nhiều user
router.post("/users/delete/selected", (req, res) => {
    adminController.deleteSelectedUsers(req, res)
})

// Lấy revenue theo product type
router.get("/dashboard/revenue-by-type", (req, res) => {
    adminController.getRevenueByType(req, res)
})

// ===== EXPORT ROUTES =====
router.get("/export/csv", (req, res) => {
    adminController.exportCSV(req, res)
})

router.get("/export/json", (req, res) => {
    adminController.exportJSON(req, res)
})

router.get("/export/excel", (req, res) => {
    adminController.exportExcel(req, res)
})

// Delete color
router.delete("/color/:colorId", (req, res) => {
    adminController.deleteColor(req, res)
})

module.exports = router
