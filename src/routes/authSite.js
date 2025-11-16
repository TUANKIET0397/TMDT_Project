// src/routes/authSite.js
const express = require('express');
const router = express.Router();
const authController = require('../app/controllers/AuthController');

// ===== PUBLIC ROUTES =====

// GET /authSite - Trang chủ (index/login)
router.get('/', authController.index);

// GET /authSite/register - Hiển thị trang đăng ký
router.get('/register', authController.register);

// POST /authSite/register - Xử lý đăng ký
router.post('/register', authController.registerPost);

// GET /authSite/login - Hiển thị trang đăng nhập (nếu cần riêng)
router.get('/login', authController.login);

// POST /authSite/login - Xử lý đăng nhập
router.post('/login', authController.loginPost);

// GET /authSite/logout - Đăng xuất
router.get('/logout', authController.logout);

// ===== USER ROUTES =====

// GET /authSite/profile - Xem profile
router.get('/profile', authController.profile);

// POST /authSite/profile/update - Cập nhật profile
router.post('/profile/update', authController.updateProfile);

// POST /authSite/change-password - Đổi mật khẩu
router.post('/change-password', authController.changePassword);

// POST /authSite/update-username - Đổi username
router.post('/update-username', authController.updateUsername);

// ===== ADMIN ROUTES =====

// GET /authSite/admin/users - Quản lý users
router.get('/admin/users', authController.getAllUsers);

// GET /authSite/admin/users/search - Tìm kiếm users
router.get('/admin/users/search', authController.searchUsers);

// POST /authSite/admin/users/:userId/status - Cập nhật status
router.post('/admin/users/:userId/status', authController.updateUserStatus);

// DELETE /authSite/admin/users/:userId - Xóa user
router.delete('/admin/users/:userId', authController.deleteUser);

// GET /authSite/admin/stats - Thống kê users
router.get('/admin/stats', authController.getUserStats);

module.exports = router;
