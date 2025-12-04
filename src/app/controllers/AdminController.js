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

      console.log(' Invoices loaded in dashboard:', invoices.length);
      const maxInvoices = 5;
      const invoicesLimited = invoices.slice(0, maxInvoices);

      // Render dashboard và truyền dữ liệu invoices
      res.render('admin/index', {
        layout: 'admin',
        invoices: invoicesLimited,
        stats,
      });
    } catch (error) {
      console.error(' Error loading dashboard invoices:', error);
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
        AdminSite.getTotalProductsSold(),
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
          productsByType[key] = Number(item.totalSold || 0);
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

  // [POST] /admin/users/:id/delete
  async deleteUser(req, res) {
    try {
      const userId = req.params.id;
      const result = await AdminSite.deleteUser(userId);

      if (result && result > 0) {
        return res.redirect('/admin/users');
      }
      return res.status(404).send('User not found');
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).send('Internal Server Error: ' + error.message);
    }
  }

  // [POST] /admin/users/delete/selected
  async deleteSelectedUsers(req, res) {
    try {
      const ids = req.body && req.body.ids;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No user IDs provided',
        });
      }

      const result = await AdminSite.deleteUsersByIds(ids);

      if (result && result > 0) {
        return res.json({ success: true, deleted: result });
      }

      return res
        .status(404)
        .json({ success: false, message: 'No users deleted' });
    } catch (error) {
      console.error('Error deleting selected users:', error);
      return res.status(500).json({ success: false, message: error.message });
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
      console.error(' Error in show products:', error);
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

      console.log(' Invoices loaded:', invoices.length);
      console.log(' Stats:', stats);

      // Render view với dữ liệu
      res.render('admin/invoice', {
        layout: 'admin',
        title: 'Orders Status - Admin',
        invoices: invoices,
        stats: stats,
      });
    } catch (error) {
      console.error(' Error in invoice:', error);
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
      const TypeID = Number(req.body.TypeID) || null;
      const isShoes = TypeID === 7;
      const payload = {
        ProductName: req.body.ProductName,
        Descriptions: req.body.Descriptions,
        TypeID,
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
        return res.status(400).json({
          success: false,
          message: 'Missing required fields',
        });
      }
       const normalizeSizesForType = (rawSizes) => {
        const arr = Array.isArray(rawSizes) ? rawSizes : Object.values(rawSizes);
        return arr
          .filter((s) => s && (s.size || s.quantity !== undefined))
          .map((s) => {
            const raw = String(s.size || '').trim();
            const qty = Number(s.quantity) || 0;
            if (isShoes) {
              if (!/^\d+$/.test(raw)) {
                throw new Error(`Invalid size "${raw}". For shoes (TypeID=7) size must be numeric.`);
              }
              const n = Number(raw);
              if (n < 30 || n > 50) {
                throw new Error(`Shoe size "${n}" out of allowed range (30-50).`);
              }
              return { size: String(n), quantity: qty };
            } else {
              // non-shoes expect letter sizes like S, M, L...
              if (/^\d+$/.test(raw)) {
                throw new Error(`Invalid size "${raw}". Non-shoe products must use letter sizes (e.g., S, M, L).`);
              }
              return { size: raw.toUpperCase(), quantity: qty };
            }
          });
      };

      // ===== Lấy danh sách màu bị xóa =====
      let deletedColorIds = req.body.deletedColorIds || [];
      if (typeof deletedColorIds === 'string') {
        deletedColorIds = [deletedColorIds];
      }
      deletedColorIds = deletedColorIds.map(Number).filter(Number.isFinite);

      console.log('Deleted color IDs from client:', deletedColorIds);

      payload.deletedColorIds = deletedColorIds; // ✅ Pass sang model
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
        let sizes = [];
        try {
          sizes = normalizeSizesForType(rawSizes);
        } catch (err) {
          return res.status(400).json({ success: false, message: err.message });
        }
        payload.colors.push({
          colorName: colorData.colorName || 'Default',
          images: savedColorImgs,
          sizes: sizes,
        });
      }

      console.log(' Processed payload:', JSON.stringify(payload, null, 2));

      // ===== Lưu vào database =====
      const result = await AdminSite.createProductWithColors(payload);
      const productID = result?.productId || result?.insertId || null;

      return res.json({
        success: true,
        productID,
        message: 'Product created successfully',
      });
    } catch (err) {
      console.error(' Create product error:', err);
      return res.status(500).json({
        success: false,
        message: 'Server error',
        error: err.message,
      });
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

  // [POST] /admin/invoice/:id/status - CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG
  async updateInvoiceStatus(req, res) {
    try {
      const invoiceID = req.params.id;
      const { status } = req.body;

      // Validate status
      const validStatuses = ['Prepare', 'Done', 'Delivered', 'Cancelled'];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Allowed: ${validStatuses.join(', ')}`,
        });
      }

      console.log(`Updating invoice ${invoiceID} to status: ${status}`);

      // Update using Invoice model
      const Invoice = require('../models/Invoice');
      const result = await Invoice.updateInvoiceStatus(invoiceID, status);

      if (result) {
        return res.json({
          success: true,
          message: `Invoice updated to ${status}`,
        });
      }

      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    } catch (error) {
      console.error('Error updating invoice status:', error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
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

  // [GET] /admin/dashboard/revenue-by-type - Lấy revenue theo TypeName
  async getRevenueByType(req, res) {
    try {
      const typeName = req.query.type;
      const year = parseInt(req.query.year, 10) || new Date().getFullYear();

      if (!typeName) {
        return res.status(400).json({
          success: false,
          message: 'TypeName is required',
        });
      }

      const [monthlyRevenue, totalRevenue] = await Promise.all([
        AdminSite.getMonthlyRevenueByType(typeName, year),
        AdminSite.getTotalRevenueByType(typeName, year),
      ]);

      return res.json({
        success: true,
        monthlyRevenue,
        totalRevenue,
      });
    } catch (err) {
      console.error('Error in getRevenueByType:', err);
      return res.status(500).json({
        success: false,
        error: err.message || String(err),
      });
    }
  }

    // [GET] /admin/products/search?q=keyword
async searchProductsAdmin(req, res) {
  try {
    const q = (req.query.q || '').trim().toLowerCase();

    // Nếu không có keyword thì trả mảng rỗng
    if (!q) {
      return res.json({ success: true, data: [] });
    }

    // Lấy toàn bộ product (dùng chung hàm đang có)
    const allProducts = await AdminSite.getAllProducts();

    // Lọc theo tên sản phẩm
    const filtered = allProducts.filter(p =>
      (p.ProductName || '').toLowerCase().includes(q)
    );

    // Chuẩn hóa dữ liệu trả về cho FE
    const data = filtered.slice(0, 50).map(p => ({
      id: p.ID,
      name: p.ProductName,
      price: p.Price,
      img: p.ImgPath || '/img/product-other1.png',
      description: p.Descriptions || '',
      quantity: p.QuantityValue || 0,
      typeName: p.TypeName || ''
    }));

    return res.json({ success: true, data });
  } catch (err) {
    console.error('Error in searchProductsAdmin:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
}

  // [GET] /admin/export/csv - Export dashboard data as CSV
  async exportCSV(req, res) {
    try {
      const year = parseInt(req.query.year, 10) || new Date().getFullYear();

      // Lấy tất cả dữ liệu cần thiết
      const [stats, monthlyRevenue, invoices, productsByType] =
        await Promise.all([
          AdminSite.getAllGrowthMetrics(),
          AdminSite.getMonthlyRevenueByYear(year),
          AdminSite.getInvoicesWithProducts(),
          AdminSite.getProductCountsByType(),
        ]);

      // Debug logging
      console.log('📊 Export Stats:', {
        totalPageViews: stats.totalPageViews,
        monthlyUsers: stats.monthlyUsers,
        totalRevenue: stats.totalRevenue,
        invoicesCount: invoices.length,
      });

      // Tạo CSV content
      let csv = '';

      // 1. Overview Stats Section
      csv += '=== OVERVIEW STATISTICS ===\n';
      csv += 'Metric,Value,Growth (%)\n';
      csv += `Total Page Views,"${(
        stats.totalPageViews || 0
      ).toLocaleString()}",${(stats.pageViewsGrowth || 0).toFixed(1)}%\n`;
      csv += `Monthly Users,"${(stats.monthlyUsers || 0).toLocaleString()}",${(
        stats.monthlyUsersGrowth || 0
      ).toFixed(1)}%\n`;
      csv += `New Sign Ups,"${(stats.newSignUps || 0).toLocaleString()}",${(
        stats.signUpsGrowth || 0
      ).toFixed(1)}%\n`;
      csv += `Total Invoices,"${(
        stats.totalInvoices || 0
      ).toLocaleString()}",${(stats.totalInvoicesGrowth || 0).toFixed(1)}%\n`;
      csv += `Products Sold,"${(
        stats.totalProductsSold || 0
      ).toLocaleString()}",${(stats.totalProductsGrowth || 0).toFixed(1)}%\n`;
      csv += `Total Revenue (${year}),"${(
        stats.totalRevenue || 0
      ).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}",${(stats.totalRevenueGrowthYoY || 0).toFixed(1)}%\n`;
      csv += '\n';

      // 2. Monthly Revenue Section
      csv += '=== MONTHLY REVENUE ===\n';
      csv += 'Month,Revenue\n';
      monthlyRevenue.forEach((m) => {
        const monthName = new Date(0, m.month - 1).toLocaleString('en', {
          month: 'long',
        });
        const revenue = Number(m.amount || 0).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        csv += `${monthName},"${revenue}"\n`;
      });
      csv += '\n';

      // 3. Products by Type Section
      csv += '=== PRODUCTS SOLD BY TYPE ===\n';
      csv += 'Type,Total Sold\n';
      productsByType.forEach((p) => {
        csv += `${p.TypeName},${p.totalSold}\n`;
      });
      csv += '\n';

      // 4. Recent Invoices Section
      csv += '=== RECENT INVOICES ===\n';
      csv +=
        'Invoice ID,Date,Customer Name,Email,Status,Country,Total Amount\n';
      invoices.slice(0, 50).forEach((inv) => {
        const date = new Date(inv.DateCreated).toLocaleDateString();
        const name = `${inv.FirstName} ${inv.LastName}`.replace(/,/g, '');
        const email = inv.Email || 'N/A';
        const total = Number(inv.TotalAmount || 0).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        csv += `#${inv.InvoiceID},${date},"${name}",${email},${
          inv.StatusName
        },${inv.Region || 'N/A'},"${total}"\n`;
      });

      // Set headers và gửi file
      const filename = `dashboard_export_${year}_${Date.now()}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`
      );
      res.send('\uFEFF' + csv); // UTF-8 BOM for Excel compatibility
    } catch (error) {
      console.error('Error exporting CSV:', error);
      res.status(500).json({ success: false, message: 'Export failed' });
    }
  }

  // [GET] /admin/export/json - Export dashboard data as JSON
  async exportJSON(req, res) {
    try {
      const year = parseInt(req.query.year, 10) || new Date().getFullYear();

      const [stats, monthlyRevenue, invoices, productsByType] =
        await Promise.all([
          AdminSite.getAllGrowthMetrics(),
          AdminSite.getMonthlyRevenueByYear(year),
          AdminSite.getInvoicesWithProducts(),
          AdminSite.getProductCountsByType(),
        ]);

      const exportData = {
        exportDate: new Date().toISOString(),
        year: year,
        stats: {
          totalPageViews: stats.totalPageViews || 0,
          pageViewsGrowth: stats.pageViewsGrowth || 0,
          monthlyUsers: stats.monthlyUsers || 0,
          monthlyUsersGrowth: stats.monthlyUsersGrowth || 0,
          newSignUps: stats.newSignUps || 0,
          signUpsGrowth: stats.signUpsGrowth || 0,
          totalInvoices: stats.totalInvoices || 0,
          totalInvoicesGrowth: stats.totalInvoicesGrowth || 0,
          totalProductsSold: stats.totalProductsSold || 0,
          totalProductsGrowth: stats.totalProductsGrowth || 0,
          totalRevenue: stats.totalRevenue || 0,
          totalRevenueGrowthYoY: stats.totalRevenueGrowthYoY || 0,
        },
        monthlyRevenue,
        productsByType: productsByType.map((p) => ({
          type: p.TypeName,
          totalSold: p.totalSold,
        })),
        recentInvoices: invoices.slice(0, 50).map((inv) => ({
          id: inv.InvoiceID,
          date: inv.DateCreated,
          customer: `${inv.FirstName} ${inv.LastName}`,
          email: inv.Email,
          status: inv.StatusName,
          country: inv.Region,
          total: inv.TotalAmount,
          products: inv.Products,
        })),
      };

      const filename = `dashboard_export_${year}_${Date.now()}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`
      );
      res.json(exportData);
    } catch (error) {
      console.error('Error exporting JSON:', error);
      res.status(500).json({ success: false, message: 'Export failed' });
    }
  }

  // [GET] /admin/export/excel - Export as Excel (XLSX)
  async exportExcel(req, res) {
    try {
      const year = parseInt(req.query.year, 10) || new Date().getFullYear();

      // Lấy dữ liệu
      const [stats, monthlyRevenue, invoices, productsByType] =
        await Promise.all([
          AdminSite.getAllGrowthMetrics(),
          AdminSite.getMonthlyRevenueByYear(year),
          AdminSite.getInvoicesWithProducts(),
          AdminSite.getProductCountsByType(),
        ]);

      // Tạo workbook (cần cài thư viện xlsx: npm install xlsx)
      const XLSX = require('xlsx');
      const workbook = XLSX.utils.book_new();

      // Sheet 1: Overview
      const overviewData = [
        ['Metric', 'Value', 'Growth (%)'],
        [
          'Total Page Views',
          (stats.totalPageViews || 0).toLocaleString(),
          `${(stats.pageViewsGrowth || 0).toFixed(1)}%`,
        ],
        [
          'Monthly Users',
          (stats.monthlyUsers || 0).toLocaleString(),
          `${(stats.monthlyUsersGrowth || 0).toFixed(1)}%`,
        ],
        [
          'New Sign Ups',
          (stats.newSignUps || 0).toLocaleString(),
          `${(stats.signUpsGrowth || 0).toFixed(1)}%`,
        ],
        [
          'Total Invoices',
          (stats.totalInvoices || 0).toLocaleString(),
          `${(stats.totalInvoicesGrowth || 0).toFixed(1)}%`,
        ],
        [
          'Products Sold',
          (stats.totalProductsSold || 0).toLocaleString(),
          `${(stats.totalProductsGrowth || 0).toFixed(1)}%`,
        ],
        [
          `Total Revenue (${year})`,
          `${(stats.totalRevenue || 0).toLocaleString('en-US', {
            minimumFractionDigits: 2,
          })}`,
          `${(stats.totalRevenueGrowthYoY || 0).toFixed(1)}%`,
        ],
      ];
      const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
      XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview');

      // Sheet 2: Monthly Revenue
      const revenueData = [['Month', 'Revenue']];
      monthlyRevenue.forEach((m) => {
        const monthName = new Date(0, m.month - 1).toLocaleString('en', {
          month: 'long',
        });
        const revenue = `${Number(m.amount || 0).toLocaleString('en-US', {
          minimumFractionDigits: 2,
        })}`;
        revenueData.push([monthName, revenue]);
      });
      const revenueSheet = XLSX.utils.aoa_to_sheet(revenueData);
      XLSX.utils.book_append_sheet(workbook, revenueSheet, 'Monthly Revenue');

      // Sheet 3: Products by Type
      const productsData = [['Type', 'Total Sold']];
      productsByType.forEach((p) => {
        productsData.push([p.TypeName, p.totalSold]);
      });
      const productsSheet = XLSX.utils.aoa_to_sheet(productsData);
      XLSX.utils.book_append_sheet(workbook, productsSheet, 'Products by Type');

      // Sheet 4: Invoices
      const invoicesData = [
        ['ID', 'Date', 'Customer', 'Email', 'Status', 'Country', 'Total'],
      ];
      invoices.slice(0, 100).forEach((inv) => {
        const date = new Date(inv.DateCreated).toLocaleDateString();
        const total = `${Number(inv.TotalAmount || 0).toLocaleString('en-US', {
          minimumFractionDigits: 2,
        })}`;
        invoicesData.push([
          `#${inv.InvoiceID}`,
          date,
          `${inv.FirstName} ${inv.LastName}`,
          inv.Email,
          inv.StatusName,
          inv.Region || 'N/A',
          total,
        ]);
      });
      const invoicesSheet = XLSX.utils.aoa_to_sheet(invoicesData);
      XLSX.utils.book_append_sheet(workbook, invoicesSheet, 'Invoices');

      // Tạo buffer
      const buffer = XLSX.write(workbook, {
        type: 'buffer',
        bookType: 'xlsx',
      });

      // Gửi file
      const filename = `dashboard_export_${year}_${Date.now()}.xlsx`;
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`
      );
      res.send(buffer);
    } catch (error) {
      console.error('Error exporting Excel:', error);
      res.status(500).json({ success: false, message: 'Export failed' });
    }
  }

  // [GET] /admin/ad_detail/:id - Xem chi tiết sản phẩm
  async detail(req, res) {
    try {
      const productId = req.params.id;
      console.log('=== LOADING PRODUCT DETAIL ===');
      console.log('Product ID:', productId);

      // Lấy chi tiết sản phẩm từ database
      const product = await AdminSite.getProductByID(productId);

      if (!product) {
        return res.status(404).send('Product not found');
      }

      console.log(' Product loaded:', product.ProductName);
      console.log('Colors:', product.colors?.length || 0);
      console.log('Main Images:', product.mainImages?.length || 0);

      // Render trang detail
      res.render('admin/ad_detail', {
        layout: 'admin',
        title: `Edit ${product.ProductName} - Admin`,
        product: product,
      });
    } catch (error) {
      console.error(' Error loading product detail:', error);
      res.status(500).send('Internal Server Error: ' + error.message);
    }
  }

  // [POST] /admin/ad_detail/:id - Cập nhật sản phẩm
  async updateProduct(req, res) {
    try {
      const productId = req.params.id;
      console.log('--- updateProduct called ---');
      console.log('Product ID:', productId);
      console.log('req.files:', req.files);
      console.log('req.body keys:', Object.keys(req.body || {}));

      // ===== Helper lưu file (giống createPost) =====
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

      // ===== Lấy mainImages mới + thông tin slot thay đổi =====
      const mainFiles = Array.isArray(req.files)
        ? req.files.filter((x) => x.fieldname === 'mainImages')
        : req.files && req.files['mainImages']
        ? req.files['mainImages']
        : [];
      const newMainImages = await saveUploadedFiles(mainFiles, 'main');

      // Lấy danh sách slot thay đổi
      let changedMainIndexes = req.body.mainImageChangedIndexes || [];
      if (!Array.isArray(changedMainIndexes)) {
        changedMainIndexes = [changedMainIndexes].filter(Boolean).map(Number);
      } else {
        changedMainIndexes = changedMainIndexes.map(Number);
      }

      // Lấy ảnh cũ giữ lại
      let existingMainImages = req.body.existingMainImages || [];
      if (typeof existingMainImages === 'string') {
        existingMainImages = [existingMainImages];
      }

      // Lấy danh sách màu bị xóa (nếu client gửi)
      let deletedColorIds = req.body.deletedColorIds || [];
      if (typeof deletedColorIds === 'string') {
        deletedColorIds = [deletedColorIds];
      }
      deletedColorIds = deletedColorIds.map(Number).filter(Number.isFinite);

      console.log('Main images:', {
        changedIndexes: changedMainIndexes,
        newCount: newMainImages.length,
        existingCount: existingMainImages.length,
      });

      const payload = {
        ProductName: req.body.ProductName,
        Descriptions: req.body.Descriptions,
        TypeID: req.body.TypeID,
        Price: Number(req.body.Price) || 0,
        mainImages: newMainImages,
        existingMainImages: existingMainImages,
        mainImageChangedIndexes: changedMainIndexes,
        colors: [],
        deletedColorIds,
      };

      // Validate cơ bản
      if (
        !payload.ProductName ||
        !payload.Descriptions ||
        !payload.TypeID ||
        !payload.Price
      ) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields',
        });
      }

      // ===== THÊM: Lấy colorsData từ req.body (CẦN THIẾT) =====
      let colorsDataRaw = req.body.colors || {};
      const colorsData = Array.isArray(colorsDataRaw)
        ? colorsDataRaw
        : Object.values(colorsDataRaw);

      // ===== Xử lý color images =====
      const colorImagesGroups = {};
      const colorChangedIndexes = {}; // { colorIdx: [imageIdx1, imageIdx2] }

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
      
      // Parse changedImageIndexes từ body
      // Parse changedImageIndexes từ body (FIX: phải lặp tất cả keys)
      Object.keys(req.body).forEach((key) => {
        const m = key.match(/^colors\[(\d+)\]\[changedImageIndexes\]$/);
        if (m) {
          const colorIdx = m[1];
          const indexes = req.body[key];
          // indexes có thể là string, array, hoặc undefined
          if (Array.isArray(indexes)) {
            colorChangedIndexes[colorIdx] = indexes.map((x) => Number(x)).filter(Number.isFinite);
          } else if (indexes !== undefined && indexes !== '') {
            colorChangedIndexes[colorIdx] = [Number(indexes)].filter(Number.isFinite);
          } else {
            colorChangedIndexes[colorIdx] = [];
          }
        }
      });

      console.log('Color changed indexes parsed:', colorChangedIndexes);

      // ===== Build colors array =====
      for (const [index, colorData] of Object.entries(colorsData)) {
        const groupFiles = colorImagesGroups[index] || [];
        const uploadedColorImgs = await saveUploadedFiles(
          groupFiles,
          `color_${index}`
        );

        // Lấy ảnh cũ giữ lại
        let existingColorImages = colorData.existingImages || [];
        if (typeof existingColorImages === 'string') {
          existingColorImages = [existingColorImages];
        }

        const changedIndexes = colorChangedIndexes[index] || [];

        // ✅ FIX: Build complete images array
        // changedIndexes = [slot0, slot1, ...] : các vị trí bị thay đổi
        // uploadedColorImgs = [img_path0, img_path1, ...] : ảnh mới tương ứng
        // existingColorImages = [img_path_old0, img_path_old1, ...] : ảnh giữ lại (thứ tự từ DB)
        // Result: images[] map theo changedIndexes để model biết update vị trí nào
        const images = uploadedColorImgs; // model sẽ parse từ changedIndexes
        console.log(`Color ${index}:`, {
          changedIndexes,
          uploadedCount: uploadedColorImgs.length,
          existingCount: existingColorImages.length,
          totalImages: images.length,
        });

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
          colorId: colorData.colorId || null,
          colorName: colorData.colorName || 'Default',
          images: images,
          existingImages: existingColorImages,
          changedImageIndexes: changedIndexes,
          sizes: sizes,
        });
      }

      console.log(' Processed update payload:', JSON.stringify(payload, null, 2));

      // ===== Cập nhật database =====
      const result = await AdminSite.updateProductWithColors(
        productId,
        payload
      );

      if (result.success) {
        return res.json({
          success: true,
          productID: productId,
          message: 'Product updated successfully',
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Failed to update product',
        });
      }
    } catch (err) {
      console.error(' Update product error:', err);
      return res.status(500).json({
        success: false,
        message: 'Server error',
        error: err.message,
      });
    }
  }
}

module.exports = new AdminController();
