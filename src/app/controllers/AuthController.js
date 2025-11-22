// src/app/controllers/AuthController.js
const AuthSite = require('../models/AuthSite');

class AuthController {
  // ===== [GET] /auth - Trang chủ auth (index) =====
  async index(req, res) {
    res.render('auth/index', { layout: 'Auth' });
  }

  // ===== [GET] /auth/register - Hiển thị trang đăng ký =====
  async register(req, res) {
    res.render('auth/register', { layout: 'Auth' });
  }

  // ===== [POST] /auth/register - Xử lý đăng ký =====
  async registerPost(req, res) {
    try {
      const result = await AuthSite.register(req.body);

      res.status(201).json({
        success: true,
        message: result.message,
        redirect: '/auth',
      });
    } catch (error) {
      console.error('Register error:', error);

      res.status(400).json({
        success: false,
        message: error.message || 'Registration failed',
      });
    }
  }

  // ===== [GET] /auth/login - Hiển thị trang đăng nhập =====
  async login(req, res) {
    res.render('auth/login', { layout: 'Auth' });
  }

  // ===== [POST] /auth/login - Xử lý đăng nhập =====
  async loginPost(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username and password are required',
        });
      }

      // 1. Kiểm tra admin
      const admin = await AuthSite.loginAdmin(username, password);
      if (admin) {
        req.session.adminId = admin.ID;
        req.session.adminName = admin.AdminName;
        req.session.adminRole = admin.Roles;

        return res.json({
          success: true,
          message: 'Admin login successful',
          redirect: '/admin',
        });
      }

      // 2. Kiểm tra user
      const userResult = await AuthSite.loginUser(username, password);
      req.session.userId = userResult.data.user.ID;
      req.session.userName = userResult.data.account.userName;
      req.session.userEmail = userResult.data.user.Email;
      req.session.userFullName =
        userResult.data.user.FirstName + ' ' + userResult.data.user.LastName;
      req.session.userAvt = userResult.data.user.Avt;

      res.json({
        success: true,
        message: userResult.message,
        redirect: '/',
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({
        success: false,
        message: error.message || 'Login failed',
      });
    }
  }

  // ===== [GET] /auth/logout - Đăng xuất =====
  logout(req, res) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
      }
      res.redirect('/auth');
    });
  }

  // ===== [GET] /auth/profile - Xem profile =====
  async profile(req, res) {
    try {
      if (!req.session.userId) {
        return res.redirect('/auth');
      }

      const user = await AuthSite.getUserById(req.session.userId);
      const account = await AuthSite.getAccountByUserId(req.session.userId);

      if (!user) {
        return res.redirect('/auth');
      }

      res.render('auth/profile', {
        layout: 'Auth',
        user: user,
        account: account,
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).render('error', {
        layout: 'Auth',
        message: 'Failed to load profile',
      });
    }
  }

  // ===== [POST] /auth/profile/update - Cập nhật profile =====
  async updateProfile(req, res) {
    try {
      if (!req.session.userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const updatedUser = await AuthSite.updateProfile(
        req.session.userId,
        req.body
      );

      // Update session info
      req.session.userFullName = updatedUser.fullName;
      req.session.userEmail = updatedUser.email;

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedUser,
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Update failed',
      });
    }
  }

  // ===== [POST] /auth/change-password - Đổi mật khẩu =====
  async changePassword(req, res) {
    try {
      if (!req.session.userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const { oldPassword, newPassword, confirmPassword } = req.body;

      if (!oldPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'All password fields are required',
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'New passwords do not match',
        });
      }

      const result = await AuthSite.changePassword(
        req.session.userId,
        oldPassword,
        newPassword
      );

      res.json(result);
    } catch (error) {
      console.error('Change password error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Change password failed',
      });
    }
  }

  // ===== [POST] /auth/update-username - Đổi username =====
  async updateUsername(req, res) {
    try {
      if (!req.session.userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const { newUsername } = req.body;

      if (!newUsername) {
        return res.status(400).json({
          success: false,
          message: 'New username is required',
        });
      }

      const result = await AuthSite.updateUsername(
        req.session.userId,
        newUsername
      );

      // Update session
      req.session.userName = newUsername;

      res.json(result);
    } catch (error) {
      console.error('Update username error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Update username failed',
      });
    }
  }
}

module.exports = new AuthController();
