// src/app/models/Product.js
const db = require('../../config/db');

function normalizeImagePath(p) {
  if (!p) return null;
  p = String(p).trim();
  // absolute url -> use pathname
  try {
    if (/^https?:\/\//i.test(p)) {
      const u = new URL(p);
      p = u.pathname;
    }
  } catch (e) {
    // ignore
  }
  if (!p) return null;
  if (p.startsWith('/')) return p;
  // if it's just a filename, make it consistent path
  return `/uploads/products/${p}`;
}

class Product {
  // Lấy tất cả sản phẩm
  static async getAllProducts() {
    try {
      const [rows] = await db.query(`
                SELECT 
                    p.ID,
                    p.ProductName,
                    p.Descriptions,
                    pr.Price,
                    tp.TypeName,
                    'NEW' as Label,
                    COALESCE((SELECT i.ImgPath 
                     FROM ProductImg pi 
                     JOIN Image i ON pi.ImgID = i.ID 
                     WHERE pi.ProductID = p.ID 
                     LIMIT 1), '/img/default.jpg') as ImgPath
                FROM Product p
                LEFT JOIN Price pr ON p.ID = pr.ProductID
                LEFT JOIN TypeProduct tp ON p.TypeID = tp.ID
                WHERE pr.Price IS NOT NULL
                ORDER BY p.ID DESC
            `);
      return rows;
    } catch (error) {
      console.error('Error in getAllProducts:', error);
      throw error;
    }
  }


  // Lấy sản phẩm theo loại
  static async getProductsByType(typeName) {
    try {
      const [rows] = await db.query(
        `
                SELECT 
                    p.ID,
                    p.ProductName,
                    p.Descriptions,
                    pr.Price,
                    tp.TypeName,
                    COALESCE((SELECT i.ImgPath 
                     FROM ProductImg pi 
                     JOIN Image i ON pi.ImgID = i.ID 
                     WHERE pi.ProductID = p.ID 
                     LIMIT 1), '/img/default.jpg') as ImgPath
                FROM Product p
                LEFT JOIN Price pr ON p.ID = pr.ProductID
                LEFT JOIN TypeProduct tp ON p.TypeID = tp.ID
                WHERE tp.TypeName = ? AND pr.Price IS NOT NULL
                ORDER BY p.ID DESC
            `,
        [typeName]
      );
      return rows;
    } catch (error) {
      console.error('Error in getProductsByType:', error);
      throw error;
    }
  }

  // search products by query
  static async searchByQuery(q, limit = 10) {
    try {
      const qLike = `%${q}%`;
      const [rows] = await db.query(
        `
                SELECT 
                    p.ID,
                    p.ProductName,
                    pr.Price,
                    COALESCE((SELECT i.ImgPath 
                     FROM ProductImg pi 
                     JOIN Image i ON pi.ImgID = i.ID 
                     WHERE pi.ProductID = p.ID 
                     LIMIT 1), '/img/default.jpg') as ImgPath
                FROM Product p
                LEFT JOIN Price pr ON p.ID = pr.ProductID
                WHERE (p.ProductName LIKE ? OR p.Descriptions LIKE ?)
                  AND pr.Price IS NOT NULL
                ORDER BY p.ID DESC
                LIMIT ?
                `,
        [qLike, qLike, Number(limit)]
      );
      return rows;
    } catch (error) {
      console.error('Error in searchByQuery:', error);
      throw error;
    }
  }

  static async getSizesForProduct(productId, isShoes = false) {
    try {
      if (isShoes) {
        const [rows] = await db.query(
          `
                    SELECT DISTINCT s.ID, s.SizeName, COALESCE(q.QuantityValue,0) as QuantityValue
                    FROM Quantity q
                    JOIN SizeProduct s ON q.SizeID = s.ID
                    WHERE q.ProductID = ? AND s.SizeName REGEXP '^[0-9]+'
                    ORDER BY CAST(s.SizeName AS UNSIGNED) ASC
                    `,
          [productId]
        );
        return rows;
      } else {
        const [rows] = await db.query(
          `
                    SELECT DISTINCT s.ID, s.SizeName, COALESCE(q.QuantityValue,0) as QuantityValue
                    FROM Quantity q
                    JOIN SizeProduct s ON q.SizeID = s.ID
                    WHERE q.ProductID = ? AND NOT (s.SizeName REGEXP '^[0-9]+')
                    ORDER BY FIELD(s.SizeName, 'XS','S','M','L','XL','XXL','XXXL') , s.SizeName
                    `,
          [productId]
        );
        return rows;
      }
    } catch (error) {
      console.error('Error in getSizesForProduct:', error);
      throw error;
    }
  }

  // Lấy chi tiết sản phẩm
  static async getProductById(productId) {
    try {
      // 1) Basic product
      const [rows] = await db.query(
        `SELECT p.ID, p.ProductName, p.Descriptions, p.TypeID, tp.TypeName,
                (SELECT Price FROM Price pr WHERE pr.ProductID = p.ID LIMIT 1) AS Price
         FROM Product p
         LEFT JOIN TypeProduct tp ON p.TypeID = tp.ID
         WHERE p.ID = ?`,
        [productId]
      )
      if (!rows || rows.length === 0) return null
      const product = rows[0]

      // 2) Find ImgIDs that belong to color images (so we can exclude them from main)
      const [colorImgIdRows] = await db.query(
        `SELECT DISTINCT cpi.ImgID
         FROM ColorProductImage cpi
         JOIN ColorProduct cp ON cpi.ColorProductID = cp.ID
         WHERE cp.ProductID = ?`,
        [productId]
      )
      const colorImgIds = colorImgIdRows.map(r => r.ImgID).filter(Boolean)

      // 3) Get main images (exclude color images)
      let mainQuery = `
        SELECT img.ImgPath
        FROM ProductImg pi
        JOIN Image img ON pi.ImgID = img.ID
        WHERE pi.ProductID = ?
      `
      const params = [productId]
      if (colorImgIds.length > 0) {
        const ph = colorImgIds.map(() => '?').join(',')
        mainQuery += ` AND pi.ImgID NOT IN (${ph})`
        params.push(...colorImgIds)
      }
      mainQuery += ' ORDER BY pi.ID ASC'
      const [mainImgs] = await db.query(mainQuery, params)
      const mainPaths = mainImgs.map(r => normalizeImagePath(r.ImgPath)).filter(Boolean)

      // Build Images6 (pad to 6 slots, fallback to first / default)
      const defaultImg = normalizeImagePath('/img/default.jpg') || '/img/default.jpg'
      const images6 = new Array(6).fill(null).map((_, i) => mainPaths[i] || mainPaths[0] || defaultImg)

      // 4) Load colors
      const [colorsRows] = await db.query(
        `SELECT cp.ID as ColorID, cp.ColorName
         FROM ColorProduct cp
         WHERE cp.ProductID = ?
         ORDER BY cp.ID ASC`,
        [productId]
      )

      const colors = []
      const colorMap = {} // for controller/view JSON
      for (const c of colorsRows) {
        const color = { ColorID: c.ColorID, ColorName: c.ColorName }

        // images for this color
        const [cImgs] = await db.query(
          `SELECT img.ImgPath
           FROM ColorProductImage cpi
           JOIN Image img ON cpi.ImgID = img.ID
           WHERE cpi.ColorProductID = ?
           ORDER BY cpi.ID ASC`,
          [c.ColorID]
        )
        const cPaths = cImgs.map(r => normalizeImagePath(r.ImgPath)).filter(Boolean)
        const cImages6 = new Array(6).fill(null).map((_, i) => cPaths[i] || cPaths[0] || defaultImg)
        color.images = cPaths
        color.images6 = cImages6

        // sizes / quantities for this color
        // use LEFT JOIN SizeProduct to ensure consistent columns
        const [sizes] = await db.query(
          `SELECT sp.ID, sp.SizeName, COALESCE(q.QuantityValue, 0) AS QuantityValue
           FROM SizeProduct sp
           LEFT JOIN Quantity q ON sp.ID = q.SizeID AND q.ColorID = ? AND q.ProductID = ?
           ORDER BY sp.ID ASC`,
          [c.ColorID, productId]
        )
        // normalize size fields names for frontend (keep existing shape)
        color.sizes = (sizes || []).map(s => ({
          ID: s.ID,
          SizeName: s.SizeName,
          QuantityValue: s.QuantityValue ?? 0
        }))

        colors.push(color)

        // build map used by detail.hbs script: colorName -> { colorId, images, images6, sizes }
        colorMap[c.ColorName] = {
          colorId: c.ColorID,
          images: color.images,
          images6: color.images6,
          sizes: color.sizes
        }
      }

      // attach to product object (fields expected by templates)
      product.Images = mainPaths
      product.Images6 = images6
      product.colors = colors
      product.ImagesByColorList = colors.map(c => ({
        color: c.ColorName,
        images: c.images,
        images6: c.images6
      }))

      // also expose colorMap string if someone imports Product.getProductById directly
      product._colorSizesMap = colorMap

      return product
    } catch (err) {
      console.error('Error in Product.getProductById:', err)
      throw err
    }
  }
  // ...existing code...

  // Lấy sản phẩm liên quan
  static async getRelatedProducts(typeId, limit = 4) {
    try {
      const [rows] = await db.query(
        `
                SELECT 
                    p.ID,
                    p.ProductName,
                    p.Descriptions,
                    pr.Price,
                    COALESCE((SELECT i.ImgPath 
                     FROM ProductImg pi 
                     JOIN Image i ON pi.ImgID = i.ID 
                     WHERE pi.ProductID = p.ID 
                     LIMIT 1), '/img/default.jpg') as ImgPath
                FROM Product p
                LEFT JOIN Price pr ON p.ID = pr.ProductID
                WHERE p.TypeID = ? AND pr.Price IS NOT NULL
                LIMIT ?
            `,
        [typeId, limit]
      );
      return rows;
    } catch (error) {
      console.error('Error in getRelatedProducts:', error);
      throw error;
    }
  }

  static async deleteById(productId) {
    try {
      const [result] = await db.query(
        `
                DELETE FROM Product 
                WHERE ID = ?
            `,
        [productId]
      );
      return result.affectedRows;
    } catch (error) {
      console.error('Error in deleteById:', error);
      throw error;
    }
  }

  // Lấy sizes cho một màu cụ thể của sản phẩm
  static async getSizesForProductColor(productId, colorId) {
    try {
      const [rows] = await db.query(
        `
            SELECT DISTINCT 
                s.ID, 
                s.SizeName, 
                COALESCE(q.QuantityValue, 0) as QuantityValue
            FROM Quantity q
            JOIN SizeProduct s ON q.SizeID = s.ID
            WHERE q.ProductID = ? AND q.ColorID = ?
            ORDER BY 
                CASE 
                    WHEN s.SizeName REGEXP '^[0-9]+$' THEN CAST(s.SizeName AS UNSIGNED)
                    ELSE 999
                END,
                FIELD(s.SizeName, 'XS','S','M','L','XL','XXL','XXXL'),
                s.SizeName
            `,
        [productId, colorId]
      );
      return rows;
    } catch (error) {
      console.error('Error in getSizesForProductColor:', error);
      throw error;
    }
  }

  // Lấy tất cả colors với IDs cho sản phẩm
  static async getColorsForProduct(productId) {
    try {
      const [rows] = await db.query(
        `
            SELECT DISTINCT 
                cp.ID as ColorID,
                cp.ColorName
            FROM ColorProduct cp
            WHERE cp.ProductID = ?
            ORDER BY cp.ID
            `,
        [productId]
      );
      return rows;
    } catch (error) {
      console.error('Error in getColorsForProduct:', error);
      throw error;
    }
  }
}

module.exports = Product;
