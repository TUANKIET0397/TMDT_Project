// Home page + about + profile + checkout
const siteRouter = require('./site');
// Products + detail
const productRouter = require('./product');
// Auth = login + register
const authRouter = require('./authSite');
// admin
const adminRouter = require('./admin');

function router(app) {
  app.use('/admin', adminRouter);
  app.use('/auth', authRouter);
  app.use('/products', productRouter);
  app.use('/', siteRouter); // dùng đúng biến siteRouter
}

module.exports = router;
