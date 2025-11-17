// src/app/models/AdminSite.js
const db = require('../../config/db');

class AdminSite {
  // ===== LẤY TẤT CẢ ĐƠN HÀNG (INVOICE) =====
  static async getAllInvoices() {
    try {
      const [rows] = await db.query(`
                SELECT 
                    i.ID as InvoiceID,
                    i.DateCreated,
                    u.FirstName,
                    u.LastName,
                    u.Email,
                    u.Region,
                    si.StatusName,
                    CASE 
                        WHEN si.StatusName = 'Delivered' THEN 'green'
                        WHEN si.StatusName = 'Cancelled' THEN 'red'
                        WHEN si.StatusName = 'Prepare' THEN 'yellow'
                        ELSE 'gray'
                    END as StatusColor,
                    (SELECT SUM(ci.TotalPrice) 
                     FROM CartItem ci 
                     WHERE ci.CartID = i.CartID) as TotalAmount
                FROM Invoice i
                LEFT JOIN Users u ON i.UserID = u.ID
                LEFT JOIN StatusInvoice si ON i.StatusID = si.ID
                ORDER BY i.DateCreated DESC
            `);
      return rows;
    } catch (error) {
      console.error('Error in getAllInvoices:', error);
      throw error;
    }
  }

  // ===== LẤY CHI TIẾT SẢN PHẨM TRONG ĐƠN HÀNG =====
  static async getInvoiceProducts(invoiceID) {
    try {
      const [invoice] = await db.query(
        `
                SELECT CartID FROM Invoice WHERE ID = ?
            `,
        [invoiceID]
      );

      if (!invoice || !invoice[0]) {
        return [];
      }

      const cartID = invoice[0].CartID;

      const [products] = await db.query(
        `
                SELECT 
                    p.ProductName,
                    cp.ImgID,
                    (SELECT img.ImgPath 
                     FROM Image img 
                     WHERE img.ID = cp.ImgID 
                     LIMIT 1) as ColorName,
                    ci.Volume,
                    ci.UnitPrice,
                    ci.TotalPrice
                FROM CartItem ci
                LEFT JOIN Product p ON ci.ProductID = p.ID
                LEFT JOIN ColorProduct cp ON ci.ColorID = cp.ID
                WHERE ci.CartID = ?
            `,
        [cartID]
      );

      return products;
    } catch (error) {
      console.error('Error in getInvoiceProducts:', error);
      throw error;
    }
  }

  // ===== LẤY ĐƠN HÀNG KÈM SẢN PHẨM =====
  static async getInvoicesWithProducts(sortBy = null) {
    try {
      const invoices = await this.getAllInvoices();

      // Lấy sản phẩm cho từng invoice
      for (let invoice of invoices) {
        invoice.Products = await this.getInvoiceProducts(invoice.InvoiceID);
      }

      // Sort by status if provided
      if (sortBy) {
        invoices.sort((a, b) => {
          if (a.StatusName === sortBy) return -1;
          if (b.StatusName === sortBy) return 1;
          return 0;
        });
      }

      return invoices;
    } catch (error) {
      console.error('Error in getInvoicesWithProducts:', error);
      throw error;
    }
  }

  // ===== THỐNG KÊ ĐơN HÀNG =====
  static async getInvoiceStats() {
    try {
      const [stats] = await db.query(`
                SELECT 
                    COUNT(*) as TotalInvoices,
                    SUM(CASE WHEN si.StatusName = 'Delivered' THEN 1 ELSE 0 END) as DeliveredCount,
                    SUM(CASE WHEN si.StatusName = 'Cancelled' THEN 1 ELSE 0 END) as CancelledCount,
                    SUM(CASE WHEN si.StatusName = 'Pending' THEN 1 ELSE 0 END) as PendingCount
                FROM Invoice i
                LEFT JOIN StatusInvoice si ON i.StatusID = si.ID
            `);
      return stats[0];
    } catch (error) {
      console.error('Error in getInvoiceStats:', error);
      throw error;
    }
  }

  // ===== XÓA ĐƠN HÀNG =====
  static async deleteInvoice(invoiceID) {
    try {
      const [result] = await db.query(
        `
                DELETE FROM Invoice WHERE ID = ?
            `,
        [invoiceID]
      );
      return result.affectedRows;
    } catch (error) {
      console.error('Error in deleteInvoice:', error);
      throw error;
    }
  }
  // XÓA NHIỀU ĐƠN HÀNG THEO MẢNG ID
  static async deleteInvoicesByIds(ids = []) {
    if (!Array.isArray(ids) || ids.length === 0) return 0;

    // Sanitize and build placeholders
    const placeholders = ids.map(() => '?').join(',');
    try {
      const [result] = await db.query(
        `DELETE FROM Invoice WHERE ID IN (${placeholders})`,
        ids
      );
      return result.affectedRows;
    } catch (error) {
      console.error('Error in deleteInvoicesByIds:', error);
      throw error;
    }
  }
  // all delete
  static async deleteAllInvoices() {
    const query = 'DELETE FROM Invoice';
    const [result] = await db.execute(query);
    return result.affectedRows;
  }

  // ===== CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG =====
  static async updateInvoiceStatus(invoiceID, statusID) {
    try {
      const [result] = await db.query(
        `
                UPDATE Invoice SET StatusID = ? WHERE ID = ?
            `,
        [statusID, invoiceID]
      );
      return result.affectedRows;
    } catch (error) {
      console.error('Error in updateInvoiceStatus:', error);
      throw error;
    }
  }

  // ===== LẤY TẤT CẢ SẢN PHẨM =====
  static async getAllProducts(typeName = null) {
    try {
      let query = `
            SELECT 
                p.ID,
                p.ProductName,
                p.Descriptions,
                tp.TypeName,
                pr.Price,
                (SELECT SUM(q.QuantityValue) 
                FROM Quantity q 
                WHERE q.ProductID = p.ID
                ) AS QuantityValue,
                (SELECT img.ImgPath 
                 FROM ProductImg pi 
                 LEFT JOIN Image img ON pi.ImgID = img.ID 
                 WHERE pi.ProductID = p.ID LIMIT 1) as ImgPath
            FROM Product p
            LEFT JOIN TypeProduct tp ON p.TypeID = tp.ID
            LEFT JOIN Price pr ON p.ID = pr.ProductID
        `;
      const params = [];
      if (typeName) {
        query += ' WHERE tp.TypeName = ?';
        params.push(typeName);
      }

      const [rows] = await db.query(query, params);
      return rows;
    } catch (error) {
      console.error('Error in getAllProducts:', error);
      throw error;
    }
  }

  // ===== LẤY CHI TIẾT SẢN PHẨM THEO ID =====
  static async getProductByID(productID) {
    try {
      const [products] = await db.query(
        `
                SELECT 
                    p.ID,
                    p.ProductName,
                    p.Descriptions,
                    tp.ID AS TypeID,
                    tp.TypeName,
                    (SELECT Price FROM Price pr WHERE pr.ProductID = p.ID LIMIT 1) AS Price,
                    (SELECT GROUP_CONCAT(img.ImgPath) FROM ProductImg pi
                        LEFT JOIN Image img ON pi.ImgID = img.ID
                        WHERE pi.ProductID = p.ID) AS Images
                FROM Product p
                LEFT JOIN TypeProduct tp ON p.TypeID = tp.ID
                WHERE p.ID = ?
            `,
        [productID]
      );
      return products[0] || null;
    } catch (error) {
      console.error('Error in getProductByID:', error);
      throw error;
    }
  }

  // ===== THÊM SẢN PHẨM MỚI =====
  static async addProduct({ ProductName, Descriptions, TypeID, Price }) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Thêm sản phẩm
      const [result] = await connection.query(
        `
                INSERT INTO Product (ProductName, Descriptions, TypeID)
                VALUES (?, ?, ?)
            `,
        [ProductName, Descriptions, TypeID]
      );

      const productID = result.insertId;

      // Thêm giá sản phẩm
      await connection.query(
        `
                INSERT INTO Price (ProductID, Price)
                VALUES (?, ?)
            `,
        [productID, Price]
      );

      await connection.commit();
      return productID;
    } catch (error) {
      await connection.rollback();
      console.error('Error in addProduct:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // ===== CẬP NHẬT SẢN PHẨM =====
  static async updateProduct(
    productID,
    { ProductName, Descriptions, TypeID, Price }
  ) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(
        `
                UPDATE Product 
                SET ProductName = ?, Descriptions = ?, TypeID = ?
                WHERE ID = ?
            `,
        [ProductName, Descriptions, TypeID, productID]
      );

      // Cập nhật giá
      await connection.query(
        `
                UPDATE Price 
                SET Price = ?
                WHERE ProductID = ?
            `,
        [Price, productID]
      );

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      console.error('Error in updateProduct:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // ===== XÓA SẢN PHẨM =====
  static async deleteProduct(productID) {
    try {
      const [result] = await db.query(
        `
                DELETE FROM Product WHERE ID = ?
            `,
        [productID]
      );
      return result.affectedRows;
    } catch (error) {
      console.error('Error in deleteProduct:', error);
      throw error;
    }
  }
  // ===== LẤY TẤT CẢ LOẠI SẢN PHẨM =====
  static async getAllProductTypes() {
    try {
      const [types] = await db.query(`
                SELECT * FROM TypeProduct ORDER BY TypeName
            `);
      return types;
    } catch (error) {
      console.error('Error in getAllProductTypes:', error);
      throw error;
    }
  }

  // ===== TẠO SẢN PHẨM MỚI VỚI MÀU SẮC VÀ KÍCH CỠ =====
  static async createProductWithColors(payload) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // 1) Insert Product
      const [prodRes] = await conn.query(
        'INSERT INTO Product (ProductName, Descriptions, TypeID) VALUES (?, ?, ?)',
        [payload.ProductName, payload.Descriptions, payload.TypeID]
      );
      const productId = prodRes.insertId;

      // 2) Insert Price
      await conn.query('INSERT INTO Price (ProductID, Price) VALUES (?, ?)', [
        productId,
        payload.Price,
      ]);

      // helper: insert image and return id
      const insertImage = async (imgPath) => {
        const [imgRes] = await conn.query(
          'INSERT INTO Image (ImgPath) VALUES (?)',
          [imgPath]
        );
        return imgRes.insertId;
      };

      // 3) main images -> Image + ProductImg
      if (Array.isArray(payload.mainImages)) {
        for (const p of payload.mainImages) {
          if (!p) continue;
          const imgId = await insertImage(p);
          await conn.query(
            'INSERT INTO ProductImg (ProductID, ImgID) VALUES (?, ?)',
            [productId, imgId]
          );
        }
      }

      // 4) process colors
      for (const color of payload.colors || []) {
        // insert all images of this color as Image + ProductImg
        const colorImgIds = [];
        if (Array.isArray(color.images)) {
          for (const imgPath of color.images) {
            if (!imgPath) continue;
            const imgId = await insertImage(imgPath);
            colorImgIds.push(imgId);
            // also link to product
            await conn.query(
              'INSERT INTO ProductImg (ProductID, ImgID) VALUES (?, ?)',
              [productId, imgId]
            );
          }
        }

        // use first image as ColorProduct.ImgID (nullable)
        const imgIdForColor = colorImgIds.length ? colorImgIds[0] : null;
        const [colorRes] = await conn.query(
          'INSERT INTO ColorProduct (ProductID, ImgID, ColorName) VALUES (?, ?, ?)',
          [productId, imgIdForColor, color.colorName || 'Default']
        );
        const colorId = colorRes.insertId;

        // ensure sizes exist in SizeProduct table and insert Quantity
        for (const s of color.sizes || []) {
          if (!s || !s.size) continue;
          const sizeName = String(s.size).trim();

          // find or create size
          const [rows] = await conn.query(
            'SELECT ID FROM SizeProduct WHERE SizeName = ?',
            [sizeName]
          );
          let sizeId;
          if (rows && rows.length) {
            sizeId = rows[0].ID;
          } else {
            const [sizeRes] = await conn.query(
              'INSERT INTO SizeProduct (SizeName) VALUES (?)',
              [sizeName]
            );
            sizeId = sizeRes.insertId;
          }

          // insert into Quantity (unique key on product,size,color)
          const quantityVal = Number(s.quantity) || 0;
          await conn.query(
            `INSERT INTO Quantity (QuantityValue, SizeID, ColorID, ProductID)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE QuantityValue = VALUES(QuantityValue)`,
            [quantityVal, sizeId, colorId, productId]
          );
        }
      }

      await conn.commit();
      return { success: true, productId };
    } catch (err) {
      await conn.rollback();
      console.error('createProductWithColors error:', err);
      throw err;
    } finally {
      conn.release();
    }
  }
}

module.exports = AdminSite;
