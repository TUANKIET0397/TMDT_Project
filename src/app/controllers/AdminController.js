// src/app/controllers/AdminController.js
const AdminSite = require('../models/Admin');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

class AdminController {
  // [GET] /admin - Trang chủ admin (Dashboard)
  async index(req, res) {
    try {
      // Lấy danh sách invoices + stats
      const [invoices, stats] = await Promise.all([
        AdminSite.getInvoicesWithProducts(), // tương tự invoice()
        AdminSite.getInvoiceStats(),
      ]);

      console.log('✅ Invoices loaded in dashboard:', invoices.length);
      const maxInvoices = 5;
      const invoicesLimited = invoices.slice(0, maxInvoices);

      // Render dashboard và truyền dữ liệu invoices
      res.render('admin/index', {
        layout: 'admin',
        invoices: invoicesLimited,
        stats,
      });
    } catch (error) {
      console.error('❌ Error loading dashboard invoices:', error);
      res.status(500).send('Internal Server Error');
    }
  }

  // [GET] /admin/dashboard/data - Lấy dữ liệu dashboard dưới dạng JSON
  async dashboardData(req, res) {
    try {
      const year = parseInt(req.query.year, 10) || new Date().getFullYear();

      // 1) Lấy dữ liệu cơ bản (dùng Promise.all để chạy song song)
      const [
        stats,
        invoices,
        typeData,
        totalPageViews,
        monthlyUsers,
        newSignUps,
        totalInvoices,
        clothesSold,
      ] = await Promise.all([
        // tổng quan (số order theo trạng thái, doanh thu tạm, v.v.)
        AdminSite.getInvoiceStats(),
        // danh sách invoices kèm product nếu cần
        AdminSite.getInvoicesWithProducts(),
        // product counts grouped by type
        AdminSite.getProductCountsByType(),
        // tổng page views (tháng/năm tùy hàm bạn cài)
        AdminSite.getTotalPageViews(),
        // monthly users (distinct logins trong tháng hiện tại)
        AdminSite.getMonthlyUsers(),
        // số user đăng ký mới trong tháng
        AdminSite.getNewSignUps(),
        // tổng số invoices trong tháng
        AdminSite.getTotalInvoices(),
        // tổng sản phẩm bán ra của category "Clothes" (tháng)
        AdminSite.getClothesSoldCount(),
      ]);

      // 2) Monthly revenue (dạng mảng 12 phần tử cho chart)
      const monthlyRevenue = await AdminSite.getMonthlyRevenueByYear(year);

      // 3) Growth: PageViews, MonthlyUsers, NewSignUps, TotalInvoices, Clothes
      //    Lưu ý: getGrowthPercentage(currentValue, tableName, column, dateColumn)
      const [
        pageViewsGrowth,
        monthlyUsersGrowth,
        signUpsGrowth,
        totalInvoicesGrowth,
        clothesGrowth,
      ] = await Promise.all([
        // PageViews: COUNT(DISTINCT VisitorID) last month
        AdminSite.getGrowthPercentage(
          totalPageViews,
          'PageView',
          'DISTINCT VisitorID',
          'ViewTime'
        ),
        // MonthlyUsers: sử dụng Accounts hoặc bảng login (hàm getMonthlyUsers phải tương thích)
        AdminSite.getGrowthPercentage(
          monthlyUsers,
          'Accounts',
          'DISTINCT UserID',
          'CreatedTime'
        ),
        // New signups: Users.CreatedAt
        AdminSite.getGrowthPercentage(newSignUps, 'Users', '*', 'CreatedAt'),
        // Total invoices: Invoice.DateCreated
        AdminSite.getGrowthPercentage(
          totalInvoices,
          'Invoice',
          '*',
          'DateCreated'
        ),
        // Clothes sold: dùng subquery bảng bán hàng (getGrowthPercentage hỗ trợ tableName là subquery alias)
        AdminSite.getGrowthPercentage(
          clothesSold,
          `(
          SELECT ci.ID, ci.Volume, i.DateCreated
          FROM CartItem ci
          JOIN Product p ON ci.ProductID = p.ID
          JOIN TypeProduct tp ON p.TypeID = tp.ID
          JOIN Cart c ON ci.CartID = c.ID
          JOIN Invoice i ON c.ID = i.CartID
          WHERE tp.TypeName = 'Clothes'
        ) AS sub`,
          'Volume',
          'DateCreated'
        ),
      ]);

      // 4) Tổng doanh thu năm hiện tại và growth YoY (year-over-year)
      //    getTotalRevenueByYear(year) => số (số tiền)
      //    getRevenueGrowthYoY(year) => % so với năm trước
      const [totalRevenueThisYear, totalRevenueGrowthYoY] = await Promise.all([
        AdminSite.getTotalRevenueByYear(year),
        AdminSite.getRevenueGrowthYoY(year),
      ]);

      // 5) Convert product counts by type sang object { TypeName: count }
      const productsByType = {};
      if (Array.isArray(typeData)) {
        typeData.forEach((item) => {
          const key = item.TypeName || 'Unknown';
          productsByType[key] = Number(item.cnt || 0);
        });
      }

      // 6) Trả về JSON cho frontend
      return res.json({
        success: true,
        stats: {
          // giữ nguyên các trường từ stats (nếu có)
          ...stats,
          // các metric mới/overrides
          TotalPageViews: Number(totalPageViews || 0),
          PageViewsGrowth: Number(pageViewsGrowth || 0),

          MonthlyUsers: Number(monthlyUsers || 0),
          MonthlyUsersGrowth: Number(monthlyUsersGrowth || 0),

          NewSignUps: Number(newSignUps || 0),
          NewSignUpsGrowth: Number(signUpsGrowth || 0),

          TotalInvoices: Number(totalInvoices || 0),
          TotalInvoicesGrowth: Number(totalInvoicesGrowth || 0),

          ClothesSold: Number(clothesSold || 0),
          ClothesGrowth: Number(clothesGrowth || 0),

          // Total revenue (year) và growth YoY
          TotalRevenue: Number(totalRevenueThisYear || 0),
          TotalRevenueGrowthYoY: Number(totalRevenueGrowthYoY || 0),
        },
        monthlyRevenue,
        productsByType,
        invoices,
        recentInvoices: Array.isArray(invoices) ? invoices.slice(0, 7) : [],
      });
    } catch (err) {
      console.error('Error in dashboardData:', err);
      return res
        .status(500)
        .json({ success: false, error: err.message || String(err) });
    }
  }

  // [GET] /admin/register - Đăng ký admin
  async register(req, res) {
    res.render('admin/register', { layout: 'admin' });
  }

  // [GET] /admin/users - Quản lý users
async users(req, res) {
  try {
    const users = await AdminSite.getAllUsers();

    res.render('admin/users', {
      layout: 'admin',
      users,
    });
  } catch (error) {
    console.error('Error loading users:', error);
    res.status(500).send('Internal Server Error');
  }
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

      const sortBy = req.query.sortBy || null; // Get sort parameter

      // Lấy dữ liệu từ Model
      const [invoices, stats] = await Promise.all([
        AdminSite.getInvoicesWithProducts(sortBy),
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

  // [POST] /admin/create - tạo sản phẩm mới với images
  async createPost(req, res) {
    try {
      console.log('--- createPost called ---');
      console.log('req.files:', req.files);
      console.log('req.body keys:', Object.keys(req.body || {}));

      // ===== Helper lưu file =====
      const saveUploadedFiles = async (filesArray, prefix = 'file') => {
        if (!Array.isArray(filesArray)) return [];
        const savedPaths = [];
        for (const f of filesArray) {
          const name = `${prefix}_${Date.now()}_${f.originalname}`.replace(
            /\s+/g,
            '_'
          );
          const outDir = path.join(
            __dirname,
            '..',
            '..',
            'public',
            'uploads',
            'products'
          );
          await fs.mkdir(outDir, { recursive: true });
          const outPath = path.join(outDir, name);

          if (f.path) {
            try {
              await fs.rename(f.path, outPath);
            } catch {
              const data = await fs.readFile(f.path);
              await fs.writeFile(outPath, data);
              await fs.unlink(f.path);
            }
          } else if (f.buffer) {
            await fs.writeFile(outPath, f.buffer);
          } else {
            console.warn('Unknown file object:', f);
            continue;
          }
          savedPaths.push(`/uploads/products/${name}`);
        }
        return savedPaths;
      };

      // ===== Lấy mainImages =====
      const mainFiles = Array.isArray(req.files)
        ? req.files.filter((x) => x.fieldname === 'mainImages')
        : req.files && req.files['mainImages']
        ? req.files['mainImages']
        : [];
      const savedMain = await saveUploadedFiles(mainFiles, 'main');

      // ===== Lấy colorsData từ req.body =====
      let colorsDataRaw = req.body.colors || {};
      const colorsData = Array.isArray(colorsDataRaw)
        ? colorsDataRaw
        : Object.values(colorsDataRaw);

      // ===== Chuẩn bị payload =====
      const payload = {
        ProductName: req.body.ProductName,
        Descriptions: req.body.Descriptions,
        TypeID: req.body.TypeID,
        Price: Number(req.body.Price) || 0,
        mainImages: savedMain,
        colors: [],
      };

      // Validate cơ bản
      if (
        !payload.ProductName ||
        !payload.Descriptions ||
        !payload.TypeID ||
        !payload.Price
      ) {
        return res
          .status(400)
          .json({ success: false, message: 'Missing required fields' });
      }

      // ===== Xử lý màu và ảnh màu =====
      const colorImagesGroups = {};
      if (req.files) {
        if (Array.isArray(req.files)) {
          req.files.forEach((f) => {
            const m =
              f.fieldname && f.fieldname.match(/^colors\[(\d+)\]\[images\]$/);
            if (m) {
              const idx = m[1];
              if (!colorImagesGroups[idx]) colorImagesGroups[idx] = [];
              colorImagesGroups[idx].push(f);
            }
          });
        } else {
          Object.keys(req.files).forEach((k) => {
            const m = k.match(/^colors\[(\d+)\]\[images\]$/);
            if (m) colorImagesGroups[m[1]] = req.files[k];
          });
        }
      }

      // ===== Build colors array =====
      for (const [index, colorData] of Object.entries(colorsData)) {
        const groupFiles = colorImagesGroups[index] || [];
        const savedColorImgs = await saveUploadedFiles(
          groupFiles,
          `color_${index}`
        );

        // Sizes
        const rawSizes = colorData.sizes || [];
        const sizes = Array.isArray(rawSizes)
          ? rawSizes
              .filter((s) => s && (s.size || s.quantity !== undefined))
              .map((s) => ({
                size: String(s.size || '').trim(),
                quantity: Number(s.quantity) || 0,
              }))
          : Object.values(rawSizes)
              .filter((s) => s && (s.size || s.quantity !== undefined))
              .map((s) => ({
                size: String(s.size || '').trim(),
                quantity: Number(s.quantity) || 0,
              }));

        payload.colors.push({
          colorName: colorData.colorName || 'Default',
          images: savedColorImgs,
          sizes: sizes,
        });
      }

      console.log('✅ Processed payload:', JSON.stringify(payload, null, 2));

      // ===== Lưu vào database =====
      const result = await AdminSite.createProductWithColors(payload);
      const productID = result?.productId || result?.insertId || null;

      return res.json({
        success: true,
        productID,
        message: 'Product created successfully',
      });
    } catch (err) {
      console.error('❌ Create product error:', err);
      return res
        .status(500)
        .json({ success: false, message: 'Server error', error: err.message });
    }
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
  }

  // [POST] /admin/invoice/delete/selected - Xóa nhiều đơn hàng theo danh sách ID
  async deleteSelectedInvoices(req, res) {
    try {
      const ids = req.body && req.body.ids;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No invoice IDs provided',
        });
      }

      const result = await AdminSite.deleteInvoicesByIds(ids);

      if (result && result > 0) {
        return res.json({ success: true, deleted: result });
      }

      return res
        .status(404)
        .json({ success: false, message: 'No invoices deleted' });
    } catch (error) {
      console.error('Error deleting selected invoices:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

}

module.exports = new AdminController();
