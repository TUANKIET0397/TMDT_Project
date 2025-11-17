// src/app/controllers/AdminController.js
const AdminSite = require('../models/Admin');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

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
