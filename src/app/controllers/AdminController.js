// src/app/controllers/AdminController.js
const AdminSite = require('../models/Admin');

class AdminController {
  // [GET] /admin - Trang chủ admin (Dashboard)
  async index(req, res) {
    res.render('admin/index', { layout: 'admin' });
  }

  // [GET] /admin/register - Đăng ký admin
  async register(req, res) {
    res.render('admin/register', { layout: 'admin' });
  }

  // [GET] /admin/users - Quản lý users
  async users(req, res) {
    res.render('admin/users', { layout: 'admin' });
  }

  // [GET] /admin/show?type=TypeName
  async show(req, res) {
    try {
      const selectedType = req.query.type || null; // Lấy type từ query string

      const [products, types] = await Promise.all([
        AdminSite.getAllProducts(selectedType), // truyền loại để lọc
        AdminSite.getAllProductTypes(),
      ]);

      res.render('admin/show', {
        layout: 'admin',
        title: 'All Products - Admin',
        products,
        types,
        selectedType,
      });
    } catch (error) {
      console.error('❌ Error in show products:', error);
      res.status(500).send('Internal Server Error');
    }
  }

  // [GET] /admin/invoice - Quản lý đơn hàng
  async invoice(req, res) {
    try {
      console.log('=== LOADING INVOICE PAGE ===');

      // Lấy dữ liệu từ Model
      const [invoices, stats] = await Promise.all([
        AdminSite.getInvoicesWithProducts(),
        AdminSite.getInvoiceStats(),
      ]);

      console.log('✅ Invoices loaded:', invoices.length);
      console.log('✅ Stats:', stats);

      // Render view với dữ liệu
      res.render('admin/invoice', {
        layout: 'admin',
        title: 'Orders Status - Admin',
        invoices: invoices,
        stats: stats,
      });
    } catch (error) {
      console.error('❌ Error in invoice:', error);
      res.status(500).send('Internal Server Error: ' + error.message);
    }
  }

  // [GET] /admin/create - Tạo sản phẩm mới
  async create(req, res) {
    res.render('admin/create', { layout: 'admin' });
  }

  // [GET] /admin/chat - Chat admin
  async chat(req, res) {
    res.render('admin/chat', { layout: 'admin' });
  }

  // [DELETE] /admin/invoice/:id - Xóa đơn hàng
  async deleteInvoice(req, res) {
    try {
      const invoiceID = req.params.id;
      const result = await AdminSite.deleteInvoice(invoiceID);
      // If deletion succeeded, redirect back to the invoice page so the UI updates
      if (result && result > 0) {
        return res.redirect('/admin/invoice');
      }

      // If nothing was deleted, return 404 so caller knows
      return res.status(404).send('Invoice not found');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      // Send a simple error response (form POST expects an HTTP response)
      res.status(500).send('Internal Server Error: ' + error.message);
    }

async deleteAllInvoices(req, res) {
    try {
        const result = await AdminSite.deleteAllInvoices() // hàm bạn tự viết

        if (result && result > 0) {
            return res.json({ success: true })
        }

        return res.status(404).json({ success: false, message: "No invoices found" })
    } catch (error) {
        console.error("Error deleting all invoices:", error)
        return res.status(500).json({ success: false, error: error.message })
    }
}


  }
}

module.exports = new AdminController();
