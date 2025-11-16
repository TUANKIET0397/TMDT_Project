// src/app/controllers/AuthController.js
const AuthSite = require('../models/AuthSite');

class AuthController {
  // ===== [GET] /authSite - Trang chủ auth (index) =====
  async index(req, res) {
    res.render('auth/index', { layout: 'Auth' });
  }

  // ===== [GET] /authSite/register - Hiển thị trang đăng ký =====
  async register(req, res) {
    res.render('auth/register', { layout: 'Auth' });
  }

  // ===== [POST] /authSite/register - Xử lý đăng ký =====
  async registerPost(req, res) {
    try {
      const result = await AuthSite.register(req.body);

      res.status(201).json({
        success: true,
        message: result.message,
        redirect: '/authSite',
      });
    } catch (error) {
      console.error('Register error:', error);

      res.status(400).json({
        success: false,
        message: error.message || 'Registration failed',
      });
    }
  }

  // ===== [GET] /authSite/login - Hiển thị trang đăng nhập =====
  async login(req, res) {
    res.render('auth/login', { layout: 'Auth' });
  }

  // ===== [POST] /authSite/login - Xử lý đăng nhập =====
  async loginPost(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username and password are required',
        });
      }

      const result = await AuthSite.login(username, password);

      // Lưu session
      req.session.userId = result.data.user.id;
      req.session.userName = result.data.account.userName;
      req.session.userEmail = result.data.user.email;
      req.session.userFullName = result.data.user.fullName;
      req.session.userAvt = result.data.user.avt;

      res.json({
        success: true,
        message: result.message,
        redirect: '/admin',
      });
    } catch (error) {
      console.error('Login error:', error);

      res.status(401).json({
        success: false,
        message: error.message || 'Login failed',
      });
    }
  }

  // ===== [GET] /authSite/logout - Đăng xuất =====
  logout(req, res) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
      }
      res.redirect('/authSite');
    });
  }

  // ===== [GET] /authSite/profile - Xem profile =====
  async profile(req, res) {
    try {
      if (!req.session.userId) {
        return res.redirect('/authSite');
      }

      const user = await AuthSite.getUserById(req.session.userId);
      const account = await AuthSite.getAccountByUserId(req.session.userId);

      if (!user) {
        return res.redirect('/authSite');
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

  // ===== [POST] /authSite/profile/update - Cập nhật profile =====
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

  // ===== [POST] /authSite/change-password - Đổi mật khẩu =====
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

  // ===== [POST] /authSite/update-username - Đổi username =====
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

  // ===== ADMIN METHODS =====

  // ===== [GET] /authSite/admin/users - Quản lý users =====
  async getAllUsers(req, res) {
    try {
      // Check admin permission
      if (!req.session.userId) {
        return res.redirect('/authSite');
      }

      const { limit = 50, offset = 0, status } = req.query;

      const users = await AuthSite.getAllUsers({
        limit: parseInt(limit),
        offset: parseInt(offset),
        status: status ? parseInt(status) : null,
      });

      const stats = await AuthSite.getUserStats();
      const totalUsers = await AuthSite.countUsers();

      res.render('admin/users', {
        layout: 'main',
        users: users,
        stats: stats,
        totalUsers: totalUsers,
        currentPage: Math.floor(offset / limit) + 1,
        limit: limit,
      });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).render('error', {
        layout: 'main',
        message: 'Failed to load users',
      });
    }
  }

  // ===== [GET] /authSite/admin/users/search - Tìm kiếm users =====
  async searchUsers(req, res) {
    try {
      const { keyword, limit = 20, offset = 0 } = req.query;

      if (!keyword) {
        return res.json({
          success: false,
          message: 'Keyword is required',
        });
      }

      const users = await AuthSite.searchUsers(keyword, {
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      res.json({
        success: true,
        data: users,
      });
    } catch (error) {
      console.error('Search users error:', error);
      res.status(500).json({
        success: false,
        message: 'Search failed',
      });
    }
  }

  // ===== [POST] /authSite/admin/users/:userId/status - Cập nhật status user =====
  async updateUserStatus(req, res) {
    try {
      const { userId } = req.params;
      const { status } = req.body;

      if (status === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Status is required',
        });
      }

      await AuthSite.updateUserStatus(userId, status);
      await AuthSite.updateAccountStatus(userId, status);

      res.json({
        success: true,
        message: 'User status updated successfully',
      });
    } catch (error) {
      console.error('Update user status error:', error);
      res.status(500).json({
        success: false,
        message: 'Update status failed',
      });
    }
  }

  // ===== [DELETE] /authSite/admin/users/:userId - Xóa user =====
  async deleteUser(req, res) {
    try {
      const { userId } = req.params;
      const { hard = false } = req.query;

      let result;
      if (hard === 'true') {
        result = await AuthSite.deleteUser(userId);
      } else {
        result = await AuthSite.softDeleteUser(userId);
      }

      res.json(result);
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        message: 'Delete user failed',
      });
    }
  }

  // ===== [GET] /authSite/admin/stats - Thống kê users =====
  async getUserStats(req, res) {
    try {
      const stats = await AuthSite.getUserStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get stats',
      });
    }
  }
}

module.exports = new AuthController();
