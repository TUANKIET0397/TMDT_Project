// src/routes/admin.js
const express = require('express');
const router = express.Router();
const adminController = require('../app/controllers/AdminController');
const { uploadProductImages } = require('../config/multer.config');

// Trang admin
router.get('/', (req, res) => {
  adminController.index(req, res);
});

router.get('/register', (req, res) => {
  adminController.register(req, res);
});

router.get('/users', (req, res) => {
  adminController.users(req, res);
});

router.get('/show', (req, res) => {
  adminController.show(req, res);
});

router.get('/invoice', (req, res) => {
  adminController.invoice(req, res);
});

// GET: trả về form tạo product
router.get('/create', (req, res) => {
  adminController.create(req, res);
});

// POST: nhận payload và files từ form
// SỬ DỤNG uploadProductImages middleware để xử lý file upload
router.post('/create', uploadProductImages, (req, res) => {
  adminController.createPost(req, res);
});

//
router.get('/chat', (req, res) => {
  adminController.chat(req, res);
});

// ===== XÓA ĐƠN HÀNG - DÙNG POST =====
router.post('/invoice/:id/delete', (req, res) => {
  adminController.deleteInvoice(req, res);
});

// XÓA NHIỀU ĐƠN HÀNG (CHỌN) - DÙNG POST
router.post('/invoice/delete/selected', (req, res) => {
  adminController.deleteSelectedInvoices(req, res);
});

module.exports = router;
