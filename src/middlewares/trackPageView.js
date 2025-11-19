// src/middlewares/trackPageView.js
const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const trackPageView = (req, res, next) => {
  try {
    // Bỏ qua static files & admin
    const staticPrefixes = [
      '/css',
      '/js',
      '/img',
      '/uploads',
      '/home_assets',
      '/fonts',
      '/admin',
    ];
    if (staticPrefixes.some((prefix) => req.path.startsWith(prefix)))
      return next();

    // Chỉ track request HTML
    const acceptHeader = req.headers['accept'] || '';
    if (!acceptHeader.includes('text/html')) return next();

    // Lấy hoặc tạo visitorId
    let visitorId = req.cookies?.visitorId;
    if (!visitorId) {
      visitorId = require('uuid').v4();
      res.cookie('visitorId', visitorId, {
        maxAge: 365 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      });
    }

    // Dùng cookie tạm thời để tránh ghi nhiều lần trong vài giây
    if (req.cookies?.hasVisited) return next(); // đã ghi trong 1 lần truy cập

    res.cookie('hasVisited', '1', { maxAge: 5 * 60 * 1000 }); // cookie 5 phút

    // Thông tin pageview
    const pageUrl = req.originalUrl || req.url;
    const userAgent = req.get('user-agent') || '';
    const ipAddress =
      req.headers['x-forwarded-for']?.split(',')[0] || req.ip || '';

    // Insert vào DB
    require('../config/db')
      .query(
        `INSERT INTO PageView (VisitorID, PageURL, UserAgent, IPAddress) VALUES (?, ?, ?, ?)`,
        [visitorId, pageUrl, userAgent, ipAddress]
      )
      .catch((err) => console.error('PageView error:', err));

    next();
  } catch (err) {
    console.error(err);
    next();
  }
};

module.exports = trackPageView;
