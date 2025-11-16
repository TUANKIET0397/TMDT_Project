// src/routes/admin.js
const express = require("express")
const router = express.Router()
const adminController = require("../app/controllers/AdminController")

// Trang admin
router.get("/", (req, res) => {
    adminController.index(req, res)
})

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

router.get("/create", (req, res) => {
    adminController.create(req, res)
})

router.get("/chat", (req, res) => {
    adminController.chat(req, res)
})

// ===== XÓA ĐƠN HÀNG - DÙNG POST =====
router.post("/invoice/:id/delete", (req, res) => {
    adminController.deleteInvoice(req, res)
})

// XÓA NHIỀU ĐƠN HÀNG (CHỌN) - DÙNG POST
router.post("/invoice/delete/selected", (req, res) => {
    adminController.deleteSelectedInvoices(req, res)
})

module.exports = router
