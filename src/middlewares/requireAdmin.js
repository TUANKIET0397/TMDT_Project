const AuthSite = require('../app/models/AuthSite');

async function requireAdmin(req, res, next) {
  try {
    // Nếu admin đã login
    if (req.session && req.session.adminId) {
      req.admin = {
        id: req.session.adminId,
        name: req.session.adminName || null,
        roles: req.session.adminRole || null,
      };
      return next();
    }

    // Không có admin session → redirect về login chung của user
    // Chú ý: Đừng redirect về /admin/login
    return res.redirect('/auth?next=/admin');
  } catch (err) {
    console.error('Error in requireAdmin middleware:', err);
    return res.status(500).render('error', {
      message: 'Server error',
      error: err.message,
      retryUrl: '/auth',
    });
  }
}

module.exports = requireAdmin;
