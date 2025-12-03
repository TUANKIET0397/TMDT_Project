const Product = require('../models/Product');

class ProductController {
  // GET /products/search?q=...
  async search(req, res) {
    try {
      const q = (req.query.q || '').trim();
      if (!q) {
        return res.json({ success: true, data: [] });
      }
      const limit = Math.min(50, Number(req.query.limit) || 10);
      const products = await Product.searchByQuery(q, limit);
      const out = (products || []).map((p) => ({
        id: p.ID,
        name: p.ProductName,
        price: p.Price || 0,
        img: p.ImgPath || '/img/default.jpg',
      }));
      return res.json({ success: true, data: out });
    } catch (error) {
      console.error('Product search error:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  async deleteProduct(req, res) {
    const { id } = req.params;
    if (!id) {
      return res.status(400).send('Product id is required');
    }

    try {
      const deleted = await Product.deleteById(id);
      if (!deleted) {
        return res.status(404).send('Product not found');
      }

      const wantsJson =
        req.xhr ||
        (req.headers.accept && req.headers.accept.includes('application/json'));

      if (wantsJson) {
        return res.json({
          success: true,
          message: 'Product has been deleted.',
        });
      }

      return res.send('Product has been deleted.');
    } catch (error) {
      console.error('Delete product error:', error);
      if (req.xhr) {
        return res
          .status(500)
          .json({ success: false, message: 'Failed to delete product.' });
      }
      return res.status(500).send('Failed to delete product');
    }
  }

  // Trang danh sách sản phẩm
  async index(req, res) {
    try {
      const { price, category, size } = req.query;
      let products = await Product.getAllProducts();

      // prepare categories array
      const categories = category
        ? Array.isArray(category)
          ? category
          : [category]
        : [];

      // ánh xạ tên hiển thị -> tên lưu trong DB (fix typos)
      const categoryMap = {
        't-shirts': 't-shirts',
        tshirts: 't-shirts',
        shirts: 'shirts',
        knitwear: 'knitwear',
        sweatshirts: 'sweatshirts',
        pants: 'pants',
        outerwear: 'outerwear',
        shoes: 'shoes',
      };

      const categoriesMapped = categories.map((c) => {
        // chuẩn hoá: lowercase, remove spaces, keep hyphen
        const key = String(c)
          .toLowerCase()
          .replace(/\s+/g, '')
          .replace(/[^a-z0-9-]/g, '');
        return categoryMap[key] || key;
      });

      // Lọc theo category (nếu có) - so sánh với p.TypeName từ DB
      if (categoriesMapped.length > 0) {
        products = products.filter((p) => {
          const type = (p.TypeName || '').toLowerCase();
          return categoriesMapped.includes(type);
        });
      }

      // Sắp xếp theo giá
      if (price === 'low-high') {
        products.sort((a, b) => parseFloat(a.Price) - parseFloat(b.Price));
      } else if (price === 'high-low') {
        products.sort((a, b) => parseFloat(b.Price) - parseFloat(a.Price));
      }

      // Lọc theo size (nếu cần) ...
      res.render('products/index', {
        products,
        count: products.length,
        filters: { price, category, size },
      });
    } catch (error) {
      console.error('Error:', error.message);
      res.render('products/index', {
        products: [],
        count: 0,
        filters: {},
      });
    }
  }

  // Sản phẩm theo category
  async knitwear(req, res) {
    try {
      const { price, size } = req.query;
      let products = await Product.getProductsByType('Knitwear');

      // Sort by price
      if (price === 'low-high') {
        products.sort((a, b) => parseFloat(a.Price) - parseFloat(b.Price));
      } else if (price === 'high-low') {
        products.sort((a, b) => parseFloat(b.Price) - parseFloat(a.Price));
      }

      // Filter by size (if implemented in DB)
      // For now, we just pass the filter

      res.render('products/knitwear', {
        products: products,
        count: products.length,
        filters: { price, size },
      });
    } catch (error) {
      console.log(error);
      res.render('products/knitwear', {
        products: [],
        count: 0,
        filters: {},
      });
    }
  }

  async outerwear(req, res) {
    try {
      const { price, size } = req.query;
      let products = await Product.getProductsByType('Outerwear');

      // Sort by price
      if (price === 'low-high') {
        products.sort((a, b) => parseFloat(a.Price) - parseFloat(b.Price));
      } else if (price === 'high-low') {
        products.sort((a, b) => parseFloat(b.Price) - parseFloat(a.Price));
      }

      // Filter by size (if implemented in DB)
      // For now, we just pass the filter

      res.render('products/outerwear', {
        products: products,
        count: products.length,
        filters: { price, size },
      });
    } catch (error) {
      console.log(error);
      res.render('products/outerwear', {
        products: [],
        count: 0,
        filters: {},
      });
    }
  }

  async pants(req, res) {
    try {
      const { price, size } = req.query;
      let products = await Product.getProductsByType('Pants');
      // Sort by price
      if (price === 'low-high') {
        products.sort((a, b) => parseFloat(a.Price) - parseFloat(b.Price));
      } else if (price === 'high-low') {
        products.sort((a, b) => parseFloat(b.Price) - parseFloat(a.Price));
      }

      // Filter by size (if implemented in DB)
      // For now, we just pass the filter

      res.render('products/pants', {
        products: products,
        count: products.length,
        filters: { price, size },
      });
    } catch (error) {
      console.log(error);
      res.render('products/pants', { products: [], count: 0, filters: {} });
    }
  }

  async shirts(req, res) {
    try {
      const { price, size } = req.query;
      let products = await Product.getProductsByType('Shirts');

      // Sort by price
      if (price === 'low-high') {
        products.sort((a, b) => parseFloat(a.Price) - parseFloat(b.Price));
      } else if (price === 'high-low') {
        products.sort((a, b) => parseFloat(b.Price) - parseFloat(a.Price));
      }

      // Filter by size (if implemented in DB)
      // For now, we just pass the filter

      res.render('products/shirts', {
        products: products,
        count: products.length,
        filters: { price, size },
      });
    } catch (error) {
      console.log(error);
      res.render('products/shirts', { products: [], count: 0, filters: {} });
    }
  }

  async shoes(req, res) {
    try {
      const products = await Product.getProductsByType('Shoes');
      res.render('products/shoes', {
        products: products,
        count: products.length,
      });
    } catch (error) {
      console.log(error);
      res.render('products/shoes', { products: [], count: 0 });
    }
  }

  async sweatshirts(req, res) {
    try {
      const { price, size } = req.query;
      let products = await Product.getProductsByType('Sweatshirts');

      // Sort by price
      if (price === 'low-high') {
        products.sort((a, b) => parseFloat(a.Price) - parseFloat(b.Price));
      } else if (price === 'high-low') {
        products.sort((a, b) => parseFloat(b.Price) - parseFloat(a.Price));
      }

      // Filter by size (if implemented in DB)
      // For now, we just pass the filter

      res.render('products/sweatshirts', {
        products: products,
        count: products.length,
        filters: { price, size },
      });
    } catch (error) {
      console.log(error);
      res.render('products/sweatshirts', {
        products: [],
        count: 0,
        filters: {},
      });
    }
  }

  async tShirts(req, res) {
    try {
      const { price, size } = req.query;
      let products = await Product.getProductsByType('T-Shirts');

      // Sort by price
      if (price === 'low-high') {
        products.sort((a, b) => parseFloat(a.Price) - parseFloat(b.Price));
      } else if (price === 'high-low') {
        products.sort((a, b) => parseFloat(b.Price) - parseFloat(a.Price));
      }

      // Filter by size (if implemented in DB)
      // For now, we just pass the filter

      res.render('products/t_shirts', {
        products: products,
        count: products.length,
        filters: { price, size },
      });
    } catch (error) {
      console.log(error);
      res.render('products/t_shirts', { products: [], count: 0, filters: {} });
    }
  }

  // Chi tiết sản phẩm
  async detail(req, res) {
    try {
      const rawId = req.params.id;
      const productId = (() => {
        const n = Number(rawId);
        return Number.isNaN(n) ? rawId : n;
      })();

      const product = await Product.getProductById(productId);
      if (!product) {
        return res.status(404).send('Product not found');
      }

      const isShoes = String(product.TypeName || '').toLowerCase() === 'shoes';

      // Lấy colors với IDs
      const colors = await Product.getColorsForProduct(productId);

      // Lấy sizes cho từng màu
      const colorSizesMap = {};
      for (const color of colors) {
        const sizes = await Product.getSizesForProductColor(
          productId,
          color.ColorID
        );
        colorSizesMap[color.ColorName] = {
          colorId: color.ColorID,
          sizes: sizes,
        };
      }

      // ✅ CONVERT TO JSON STRING
      const colorSizesMapJSON = JSON.stringify(colorSizesMap);

      // Fallback sizes nếu không có colors
      let defaultSizes = [];
      if (colors.length === 0) {
        defaultSizes = await Product.getSizesForProduct(productId, isShoes);
      }

      // Related products
      let related = [];
      if (product.TypeName) {
        const relatedProducts = await Product.getProductsByType(
          product.TypeName
        );
        related = relatedProducts
          .filter((p) => String(p.ID) !== String(productId))
          .slice(0, 4);
      }

      return res.render('products/detail', {
        product,
        relatedProducts: related,
        colors,
        colorSizesMap,
        colorSizesMapJSON, // ✅ PASS AS STRING
        defaultSizes,
        isShoes,
      });
    } catch (error) {
      console.error('Detail error:', error);
      return res.status(500).send('Error loading product');
    }
  }
}

module.exports = new ProductController();
