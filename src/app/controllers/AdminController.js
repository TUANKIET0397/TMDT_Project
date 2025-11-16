// src/app/controllers/AdminController.js
const AdminSite = require("../models/Admin")

class AdminController {
    // [GET] /admin - Trang chủ admin (Dashboard)
    async index(req, res) {
        res.render("admin/index", { layout: "admin" })
    }

    // [GET] /admin/register - Đăng ký admin
    async register(req, res) {
        res.render("admin/register", { layout: "admin" })
    }

    // [GET] /admin/users - Quản lý users
    async users(req, res) {
        res.render("admin/users", { layout: "admin" })
    }

    // [GET] /admin/show - Chi tiết sản phẩm
    async show(req, res) {
        res.render("admin/show", { layout: "admin" })
    }

    // [GET] /admin/invoice - Quản lý đơn hàng
    async invoice(req, res) {
        try {
            console.log("=== LOADING INVOICE PAGE ===")

            // Lấy dữ liệu từ Model
            const [invoices, stats] = await Promise.all([
                AdminSite.getInvoicesWithProducts(),
                AdminSite.getInvoiceStats(),
            ])

            console.log("✅ Invoices loaded:", invoices.length)
            console.log("✅ Stats:", stats)

            // Render view với dữ liệu
            res.render("admin/invoice", {
                layout: "admin",
                title: "Orders Status - Admin",
                invoices: invoices,
                stats: stats,
            })
        } catch (error) {
            console.error("❌ Error in invoice:", error)
            res.status(500).send("Internal Server Error: " + error.message)
        }
    }

    // [GET] /admin/create - Tạo sản phẩm mới
    async create(req, res) {
        res.render("admin/create", { layout: "admin" })
    }

    // [GET] /admin/chat - Chat admin
    async chat(req, res) {
        res.render("admin/chat", { layout: "admin" })
    }

    // ===== API ENDPOINTS =====

    // [DELETE] /admin/invoice/:id - Xóa đơn hàng
    async deleteInvoice(req, res) {
        try {
            const invoiceID = req.params.id
            const result = await AdminSite.deleteInvoice(invoiceID)
        } catch (error) {
            console.error("Error deleting invoice:", error)
            res.status(500).json({ success: false, message: error.message })
        }
    }
}

module.exports = new AdminController()
