// src/app/models/AdminSite.js
const db = require("../../config/db")

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
                    COALESCE(r.RegionName, 'N/A') as Region,
                    si.StatusName as InvoiceStatus,
                    CASE 
                        WHEN si.StatusName = 'Delivered' THEN 'green'
                        WHEN si.StatusName = 'Cancelled' THEN 'red'
                        WHEN si.StatusName = 'Prepare' THEN 'yellow'
                        ELSE 'gray'
                    END as StatusColor,
                    COALESCE(i.Payment, 'Unpaid') as InvoicePayment,
                    (SELECT SUM(ci.TotalPrice) 
                     FROM CartItem ci 
                     WHERE ci.CartID = i.CartID) as TotalAmount
                FROM Invoice i
                LEFT JOIN Users u ON i.UserID = u.ID
                LEFT JOIN Region r ON u.RegionID = r.ID
                LEFT JOIN StatusInvoice si ON i.StatusID = si.ID
                ORDER BY i.DateCreated DESC
            `)
            return rows
        } catch (error) {
            console.error("Error in getAllInvoices:", error)
            throw error
        }
    }

    // ===== LẤY CHI TIẾT SẢN PHẨM TRONG ĐƠN HÀNG (UPDATED) =====
    static async getInvoiceProducts(invoiceID) {
        try {
            const [invoice] = await db.query(
                `SELECT CartID FROM Invoice WHERE ID = ?`,
                [invoiceID]
            )

            if (!invoice || !invoice[0]) {
                return []
            }

            const cartID = invoice[0].CartID

            const [products] = await db.query(
                `
      SELECT 
        p.ProductName,
        cp.ColorName,
        (SELECT img.ImgPath 
         FROM ColorProductImage cpi
         LEFT JOIN Image img ON cpi.ImgID = img.ID
         WHERE cpi.ColorProductID = cp.ID
         LIMIT 1) as ColorImage,
        sp.SizeName as Size,
        ci.Volume,
        ci.UnitPrice,
        ci.TotalPrice
      FROM CartItem ci
      LEFT JOIN Product p ON ci.ProductID = p.ID
      LEFT JOIN ColorProduct cp ON ci.ColorID = cp.ID
      LEFT JOIN SizeProduct sp ON ci.SizeID = sp.ID
      WHERE ci.CartID = ?
      `,
                [cartID]
            )

            return products
        } catch (error) {
            console.error("Error in getInvoiceProducts:", error)
            throw error
        }
    }

    // ===== LẤY ĐƠN HÀNG KÈM SẢN PHẨM =====
    static async getInvoicesWithProducts(sortBy = null) {
        try {
            const invoices = await this.getAllInvoices()

            // Lấy sản phẩm cho từng invoice
            for (let invoice of invoices) {
                invoice.Products = await this.getInvoiceProducts(
                    invoice.InvoiceID
                )
            }

            // Sort by status if provided
            if (sortBy) {
                invoices.sort((a, b) => {
                    if (a.StatusName === sortBy) return -1
                    if (b.StatusName === sortBy) return 1
                    return 0
                })
            }

            return invoices
        } catch (error) {
            console.error("Error in getInvoicesWithProducts:", error)
            throw error
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
            `)
            return stats[0]
        } catch (error) {
            console.error("Error in getInvoiceStats:", error)
            throw error
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
            )
            return result.affectedRows
        } catch (error) {
            console.error("Error in deleteInvoice:", error)
            throw error
        }
    }
    // XÓA NHIỀU ĐƠN HÀNG THEO MẢNG ID
    static async deleteInvoicesByIds(ids = []) {
        if (!Array.isArray(ids) || ids.length === 0) return 0

        // Sanitize and build placeholders
        const placeholders = ids.map(() => "?").join(",")
        try {
            const [result] = await db.query(
                `DELETE FROM Invoice WHERE ID IN (${placeholders})`,
                ids
            )
            return result.affectedRows
        } catch (error) {
            console.error("Error in deleteInvoicesByIds:", error)
            throw error
        }
    }
    // all delete
    static async deleteAllInvoices() {
        const query = "DELETE FROM Invoice"
        const [result] = await db.execute(query)
        return result.affectedRows
    }

    // ===== CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG =====
    static async updateInvoiceStatus(invoiceID, statusID) {
        try {
            const [result] = await db.query(
                `
                UPDATE Invoice SET StatusID = ? WHERE ID = ?
            `,
                [statusID, invoiceID]
            )
            return result.affectedRows
        } catch (error) {
            console.error("Error in updateInvoiceStatus:", error)
            throw error
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
        `
            const params = []
            if (typeName) {
                query += " WHERE tp.TypeName = ?"
                params.push(typeName)
            }

            const [rows] = await db.query(query, params)
            return rows
        } catch (error) {
            console.error("Error in getAllProducts:", error)
            throw error
        }
    }

    // ===== LẤY CHI TIẾT SẢN PHẨM THEO ID (COMPLETELY FIXED) =====
    static async getProductByID(productID) {
        try {
            // 1. Get basic product info
            const [products] = await db.query(
                `
      SELECT 
        p.ID,
        p.ProductName,
        p.Descriptions,
        tp.ID AS TypeID,
        tp.TypeName,
        (SELECT Price FROM Price pr WHERE pr.ProductID = p.ID LIMIT 1) AS Price
      FROM Product p
      LEFT JOIN TypeProduct tp ON p.TypeID = tp.ID
      WHERE p.ID = ?
      `,
                [productID]
            )

            if (!products || !products[0]) return null
            const product = products[0]

            // 2. Get ALL ImgIDs that belong to ANY color (to exclude from main images)
            const [colorImageIds] = await db.query(
                `
      SELECT cpi.ImgID
      FROM ColorProductImage cpi
      JOIN ColorProduct cp ON cpi.ColorProductID = cp.ID
      WHERE cp.ProductID = ?
      GROUP BY cpi.ImgID
      `,
                [productID]
            )

            const colorImgIdsList = colorImageIds.map((row) => row.ImgID)

            // 3. Get ONLY main images (exclude color images)
            let mainImagesQuery = `
      SELECT img.ImgPath
      FROM ProductImg pi
      LEFT JOIN Image img ON pi.ImgID = img.ID
      WHERE pi.ProductID = ?
    `

            let mainImagesParams = [productID]

            if (colorImgIdsList.length > 0) {
                const placeholders = colorImgIdsList.map(() => "?").join(",")
                mainImagesQuery += ` AND pi.ImgID NOT IN (${placeholders})`
                mainImagesParams = [productID, ...colorImgIdsList]
            }

            mainImagesQuery += " ORDER BY pi.ID"

            const [mainImages] = await db.query(
                mainImagesQuery,
                mainImagesParams
            )
            product.mainImages = mainImages.map((img) => img.ImgPath)

            console.log("📦 Main images loaded:", {
                total: product.mainImages.length,
                excludedColorImgIds: colorImgIdsList.length,
                paths: product.mainImages,
            })

            // 4. Get colors with their images
            const [colors] = await db.query(
                `
      SELECT 
        cp.ID as ColorID,
        cp.ColorName
      FROM ColorProduct cp
      WHERE cp.ProductID = ?
      ORDER BY cp.ID
      `,
                [productID]
            )

            // 5. For each color, get its images and sizes
            for (const color of colors) {
                // Get color-specific images (ONLY from ColorProductImage)
                const [colorImages] = await db.query(
                    `
        SELECT img.ImgPath
        FROM ColorProductImage cpi
        LEFT JOIN Image img ON cpi.ImgID = img.ID
        WHERE cpi.ColorProductID = ?
        ORDER BY cpi.ID
        `,
                    [color.ColorID]
                )
                color.images = colorImages.map((img) => img.ImgPath)

                console.log(`🎨 Color "${color.ColorName}" images:`, {
                    colorId: color.ColorID,
                    imageCount: color.images.length,
                })

                // Get sizes and quantities for this color
                const [sizes] = await db.query(
                    `
        SELECT 
          sp.SizeName as size,
          q.QuantityValue as quantity
        FROM Quantity q
        LEFT JOIN SizeProduct sp ON q.SizeID = sp.ID
        WHERE q.ColorID = ? AND q.ProductID = ?
        ORDER BY sp.ID
        `,
                    [color.ColorID, productID]
                )
                color.sizes = sizes
            }

            product.colors = colors

            console.log(" Product loaded successfully:", {
                id: product.ID,
                name: product.ProductName,
                mainImagesCount: product.mainImages.length,
                colorsCount: product.colors.length,
                totalColorImages: product.colors.reduce(
                    (sum, c) => sum + c.images.length,
                    0
                ),
            })

            return product
        } catch (error) {
            console.error(" Error in getProductByID:", error)
            throw error
        }
    }
    // ===== THÊM SẢN PHẨM MỚI =====
    static async addProduct({ ProductName, Descriptions, TypeID, Price }) {
        const connection = await db.getConnection()
        try {
            await connection.beginTransaction()

            // Thêm sản phẩm
            const [result] = await connection.query(
                `
                INSERT INTO Product (ProductName, Descriptions, TypeID)
                VALUES (?, ?, ?)
            `,
                [ProductName, Descriptions, TypeID]
            )

            const productID = result.insertId

            // Thêm giá sản phẩm
            await connection.query(
                `
                INSERT INTO Price (ProductID, Price)
                VALUES (?, ?)
            `,
                [productID, Price]
            )

            await connection.commit()
            return productID
        } catch (error) {
            await connection.rollback()
            console.error("Error in addProduct:", error)
            throw error
        } finally {
            connection.release()
        }
    }

    // ===== CẬP NHẬT SẢN PHẨM =====
    static async updateProduct(
        productID,
        { ProductName, Descriptions, TypeID, Price }
    ) {
        const connection = await db.getConnection()
        try {
            await connection.beginTransaction()

            await connection.query(
                `
                UPDATE Product 
                SET ProductName = ?, Descriptions = ?, TypeID = ?
                WHERE ID = ?
            `,
                [ProductName, Descriptions, TypeID, productID]
            )

            // Cập nhật giá
            await connection.query(
                `
                UPDATE Price 
                SET Price = ?
                WHERE ProductID = ?
            `,
                [Price, productID]
            )

            await connection.commit()
            return true
        } catch (error) {
            await connection.rollback()
            console.error("Error in updateProduct:", error)
            throw error
        } finally {
            connection.release()
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
            )
            return result.affectedRows
        } catch (error) {
            console.error("Error in deleteProduct:", error)
            throw error
        }
    }
    // ===== LẤY TẤT CẢ LOẠI SẢN PHẨM =====
    static async getAllProductTypes() {
        try {
            const [types] = await db.query(`
                SELECT * FROM TypeProduct ORDER BY TypeName
            `)
            return types
        } catch (error) {
            console.error("Error in getAllProductTypes:", error)
            throw error
        }
    }

    // ===== TẠO SẢN PHẨM MỚI VỚI MÀU SẮC VÀ KÍCH CỠ (FIXED) =====


    // ===== TẠO SẢN PHẨM MỚI VỚI MÀU SẮC VÀ KÍCH CỠ =====
    static async createProductWithColors(payload) {
        const conn = await db.getConnection()
        try {
            await conn.beginTransaction()

            // 1) Insert Product
            const [productRes] = await conn.query(
                "INSERT INTO Product (ProductName, Descriptions, TypeID) VALUES (?, ?, ?)",
                [payload.ProductName, payload.Descriptions, payload.TypeID]
            )
            const productId = productRes.insertId

            // 2) Insert Price
            await conn.query("INSERT INTO Price (ProductID, Price) VALUES (?, ?)", [
                productId,
                payload.Price,
            ])

            // Helper: insert image and return id
            const insertImage = async (imgPath) => {
                const [imgRes] = await conn.query(
                    "INSERT INTO Image (ImgPath) VALUES (?)",
                    [imgPath]
                )
                return imgRes.insertId
            }

            // ===== 3) INSERT MAIN IMAGES (6 SLOTS) =====
            const mainImages = payload.mainImages || [];
            const TOTAL_MAIN_SLOTS = 6;

            for (let i = 0; i < TOTAL_MAIN_SLOTS; i++) {
                const imgPath = mainImages[i];
                if (!imgPath) continue;

                const imgId = await insertImage(imgPath);
                await conn.query(
                    "INSERT INTO ProductImg (ProductID, ImgID) VALUES (?, ?)",
                    [productId, imgId]
                );
                console.log(`➕ Inserted main image slot ${i}`);
            }

            console.log(`✅ Created ${Math.min(mainImages.length, TOTAL_MAIN_SLOTS)} main images`);

            // ===== 4) INSERT COLORS VỚI IMAGES & SIZES =====
            for (const color of payload.colors || []) {
                // Insert color
                const [colorRes] = await conn.query(
                    "INSERT INTO ColorProduct (ProductID, ColorName) VALUES (?, ?)",
                    [productId, color.colorName || "Default"]
                );
                const colorId = colorRes.insertId;

                console.log(`✅ Created colorId=${colorId} (${color.colorName})`);

                // Insert color images
                for (const imgPath of (color.images || [])) {
                    if (!imgPath) continue;
                    const imgId = await insertImage(imgPath);
                    await conn.query(
                        "INSERT INTO ColorProductImage (ColorProductID, ImgID) VALUES (?, ?)",
                        [colorId, imgId]
                    );
                }

                console.log(`  ➕ Added ${(color.images || []).length} color images`);

                // Insert sizes & quantities
                for (const s of (color.sizes || [])) {
                    if (!s || !s.size) continue;
                    const sizeName = String(s.size).trim();

                    // Get or create size
                    const [rows] = await conn.query(
                        "SELECT ID FROM SizeProduct WHERE SizeName = ?",
                        [sizeName]
                    );
                    let sizeId;
                    if (rows && rows.length) {
                        sizeId = rows[0].ID;
                    } else {
                        const [sizeRes] = await conn.query(
                            "INSERT INTO SizeProduct (SizeName) VALUES (?)",
                            [sizeName]
                        );
                        sizeId = sizeRes.insertId;
                    }

                    const quantityVal = Number(s.quantity) || 0;
                    await conn.query(
                        "INSERT INTO Quantity (QuantityValue, SizeID, ColorID, ProductID) VALUES (?, ?, ?, ?)",
                        [quantityVal, sizeId, colorId, productId]
                    );
                }

                console.log(`  ➕ Added ${(color.sizes || []).length} sizes for color`);
            }

            await conn.commit();
            console.log("✅ Product created successfully:", productId);
            return { success: true, productId };
        } catch (err) {
            await conn.rollback();
            console.error("createProductWithColors error:", err);
            throw err;
        } finally {
            conn.release();
        }
    }

    // ===== CẬP NHẬT SẢN PHẨM VỚI MÀU SẮC VÀ KÍCH CỠ (FIXED) =====
    static async updateProductWithColors(productId, payload) {
        const conn = await db.getConnection()
        try {
            await conn.beginTransaction()

            // 1) Update Product info
            await conn.query(
                "UPDATE Product SET ProductName = ?, Descriptions = ?, TypeID = ? WHERE ID = ?",
                [
                    payload.ProductName,
                    payload.Descriptions,
                    payload.TypeID,
                    productId,
                ]
            )

            // 2) Update Price
            await conn.query("UPDATE Price SET Price = ? WHERE ProductID = ?", [
                payload.Price,
                productId,
            ])

            // Helper: insert image and return id
            const insertImage = async (imgPath) => {
                const [imgRes] = await conn.query(
                    "INSERT INTO Image (ImgPath) VALUES (?)",
                    [imgPath]
                )
                return imgRes.insertId
            }

            // ===== 3) UPDATE MAIN IMAGES (MAP ĐÚNG VỊ TRÍ) =====
            const mainChangedIndexes = payload.mainImageChangedIndexes || [];
            const existingMainImages = payload.existingMainImages || [];
            const newMainImages = payload.mainImages || [];

            // Lấy tất cả ProductImg cũ (giữ nguyên thứ tự)
            const [allMainImgs] = await conn.query(
                'SELECT ID, ImgID FROM ProductImg WHERE ProductID = ? ORDER BY ID',
                [productId]
            );

            // Build final 6-slot array
            const TOTAL_SLOTS = 6;
            const finalMainImages = new Array(TOTAL_SLOTS).fill(null);
            let newIdx = 0;
            let existIdx = 0;

            for (let i = 0; i < TOTAL_SLOTS; i++) {
              if (mainChangedIndexes.includes(i)) {
                if (newIdx < newMainImages.length) {
                  finalMainImages[i] = newMainImages[newIdx++];
                }
              } else {
                if (existIdx < existingMainImages.length) {
                  finalMainImages[i] = existingMainImages[existIdx++];
                }
              }
            }

            // UPDATE hoặc INSERT ProductImg records
            for (let i = 0; i < TOTAL_SLOTS; i++) {
              const imgPath = finalMainImages[i];
              if (!imgPath) continue;

              const imgId = await insertImage(imgPath);

              if (i < allMainImgs.length) {
                // UPDATE existing record
                const recordId = allMainImgs[i].ID;
                await conn.query(
                  'UPDATE ProductImg SET ImgID = ? WHERE ID = ?',
                  [imgId, recordId]
                );
                console.log(`✏️ Updated main slot ${i} (record ${recordId})`);
              } else {
                // INSERT new record
                await conn.query(
                  'INSERT INTO ProductImg (ProductID, ImgID) VALUES (?, ?)',
                  [productId, imgId]
                );
                console.log(`➕ Inserted main slot ${i}`);
              }
            }

            console.log(`✅ Updated ${mainChangedIndexes.length} main image slots`);

            // ===== 4) HANDLE COLORS =====
            const [existingColors] = await conn.query(
                "SELECT ID, ColorName FROM ColorProduct WHERE ProductID = ?",
                [productId]
            );

            const existingColorById = {};
            const existingColorByName = {};
            existingColors.forEach((c) => {
                existingColorById[Number(c.ID)] = Number(c.ID);
                if (c.ColorName !== undefined && c.ColorName !== null) {
                    existingColorByName[c.ColorName] = Number(c.ID);
                }
            });
            const processedColorIds = new Set();

            for (const color of payload.colors || []) {
                const providedId = color.colorId !== undefined && color.colorId !== null ? Number(color.colorId) : null;
                let colorId = null;

                if (providedId && existingColorById[providedId]) {
                    colorId = providedId;
                } else if (color.colorName && existingColorByName[color.colorName]) {
                    colorId = existingColorByName[color.colorName];
                }

                if (colorId) {
                    processedColorIds.add(colorId);

                    if (color.colorName && color.colorName !== "Default") {
                       await conn.query(
                           'UPDATE ColorProduct SET ColorName = ? WHERE ID = ?',
                           [color.colorName, colorId]
                       );
                       console.log(`✏️ Updated colorId=${colorId} name to "${color.colorName}"`);
                   }

                    // Fetch current color images (ordered)
                    const [allColorImgs] = await conn.query(
                        'SELECT ID, ImgID FROM ColorProductImage WHERE ColorProductID = ? ORDER BY ID',
                        [colorId]
                    );

                    const changedSlots = Array.isArray(color.changedImageIndexes)
                        ? color.changedImageIndexes.map(Number).filter(Number.isFinite)
                        : [];

                    // Map changed slots to new images
                    for (let k = 0; k < changedSlots.length; k++) {
                        const slotIdx = changedSlots[k];
                        const newImgPath = (color.images || [])[k];

                        if (!newImgPath) continue;

                        const newImgId = await insertImage(newImgPath);

                        if (slotIdx < allColorImgs.length) {
                            const recordId = allColorImgs[slotIdx].ID;
                            await conn.query(
                                'UPDATE ColorProductImage SET ImgID = ? WHERE ID = ?',
                                [newImgId, recordId]
                            );
                            console.log(`✏️ Updated colorId=${colorId} slot ${slotIdx}`);
                        } else {
                            await conn.query(
                                'INSERT INTO ColorProductImage (ColorProductID, ImgID) VALUES (?, ?)',
                                [colorId, newImgId]
                            );
                            console.log(`➕ Appended image for colorId=${colorId}`);
                        }
                    }
                } else {
                    // create new color
                    const [colorRes] = await conn.query(
                        "INSERT INTO ColorProduct (ProductID, ColorName) VALUES (?, ?)",
                        [productId, color.colorName || "Default"]
                    );
                    colorId = colorRes.insertId;
                    processedColorIds.add(colorId);

                    for (const imgPath of (color.images || [])) {
                        if (!imgPath) continue;
                        const imgId = await insertImage(imgPath);
                        await conn.query(
                            "INSERT INTO ColorProductImage (ColorProductID, ImgID) VALUES (?, ?)",
                            [colorId, imgId]
                        );
                    }
                    console.log(`✅ Created new colorId=${colorId}`);
                }

                // ===== UPDATE QUANTITIES (SIZES) =====
                await conn.query(
                    "DELETE FROM Quantity WHERE ColorID = ? AND ProductID = ?",
                    [colorId, productId]
                );

                for (const s of color.sizes || []) {
                    if (!s || !s.size) continue;
                    const sizeName = String(s.size).trim();

                    const [rows] = await conn.query(
                        "SELECT ID FROM SizeProduct WHERE SizeName = ?",
                        [sizeName]
                    );
                    let sizeId;
                    if (rows && rows.length) {
                        sizeId = rows[0].ID;
                    } else {
                        const [sizeRes] = await conn.query(
                            "INSERT INTO SizeProduct (SizeName) VALUES (?)",
                            [sizeName]
                        );
                        sizeId = sizeRes.insertId;
                    }

                    const quantityVal = Number(s.quantity) || 0;
                    await conn.query(
                        "INSERT INTO Quantity (QuantityValue, SizeID, ColorID, ProductID) VALUES (?, ?, ?, ?)",
                        [quantityVal, sizeId, colorId, productId]
                    );
                }
            }

            // ===== 5) XÓA COLORS BỊ MARK (THÊM PHẦN NÀY) =====
            const deletedColorIds = payload.deletedColorIds || [];
            if (Array.isArray(deletedColorIds) && deletedColorIds.length > 0) {
              const placeholders = deletedColorIds.map(() => "?").join(",");

              // Xóa ColorProductImage
              await conn.query(
                `DELETE FROM ColorProductImage WHERE ColorProductID IN (${placeholders})`,
                deletedColorIds
              );

              // Xóa Quantity
              await conn.query(
                `DELETE FROM Quantity WHERE ColorID IN (${placeholders})`,
                deletedColorIds
              );

              // Xóa ColorProduct
              await conn.query(
                `DELETE FROM ColorProduct WHERE ID IN (${placeholders})`,
                deletedColorIds
              );

              console.log(`🗑️ Deleted ${deletedColorIds.length} colors`);
            }

            await conn.commit();
            console.log(" Product updated successfully:", productId);
            return { success: true, productId };
        } catch (err) {
            await conn.rollback();
            console.error("updateProductWithColors error:", err);
            throw err;
        } finally {
            conn.release();
        }
    }

    // returns [{ month: 1, amount: 12345.67 }, ...]
    static async getMonthlyRevenueByYear(year = new Date().getFullYear()) {
        try {
            const [rows] = await db.query(
                `
      SELECT MONTH(i.DateCreated) as month, 
             COALESCE(SUM(ci.TotalPrice),0) as amount
      FROM Invoice i
      LEFT JOIN CartItem ci ON i.CartID = ci.CartID
      WHERE YEAR(i.DateCreated) = ?
      GROUP BY MONTH(i.DateCreated)
      ORDER BY MONTH(i.DateCreated)
    `,
                [year]
            )

            // ensure months 1..12 all present
            const months = Array.from({ length: 12 }, (_, i) => ({
                month: i + 1,
                amount: 0,
            }))
            for (const r of rows) {
                const idx = r.month - 1
                months[idx].amount = Number(r.amount || 0)
            }
            return months
        } catch (err) {
            console.error("Error in getMonthlyRevenueByYear:", err)
            throw err
        }
    }

    // returns [{ TypeName, cnt }, ...]
    static async getProductCountsByType() {
        try {
            const [rows] = await db.query(`
    SELECT tp.TypeName, IFNULL(SUM(ci.Volume),0) AS totalSold
    FROM TypeProduct tp
    LEFT JOIN Product p ON p.TypeID = tp.ID
    LEFT JOIN CartItem ci ON ci.ProductID = p.ID
    LEFT JOIN Cart c ON ci.CartID = c.ID
    LEFT JOIN Invoice i ON c.ID = i.CartID AND i.StatusID = 2 -- chỉ Delivered
    GROUP BY tp.TypeName
    ORDER BY totalSold DESC;

    `)
            return rows
        } catch (err) {
            console.error("Error in getProductsSoldByType:", err)
            throw err
        }
    }

    // ===== LẤY TỔNG SỐ PAGEVIEWS =====
    static async getTotalPageViews() {
        try {
            const [result] = await db.query(`
        SELECT COUNT(*) as totalViews 
        FROM PageView
      `)
            return result[0]?.totalViews || 0
        } catch (error) {
            console.error("Error in getTotalPageViews:", error)
            // Nếu bảng chưa tồn tại, trả về 0
            return 0
        }
    }

    // ===== LẤY SỐ NGƯỜI ĐĂNG KÝ MỚI THÁNG NÀY =====
    static async getNewSignUps() {
        try {
            const [result] = await db.query(`
        SELECT COUNT(*) as newSignUps
        FROM Users
        WHERE YEAR(CreatedAt) = YEAR(CURRENT_DATE)
          AND MONTH(CreatedAt) = MONTH(CURRENT_DATE)
      `)
            return result[0]?.newSignUps || 0
        } catch (error) {
            console.error("Error in getNewSignUps:", error)
            return 0
        }
    }

    static async getAllGrowthMetrics() {
        try {
            const currentMonth = new Date().getMonth() + 1 // 1-12
            const currentYear = new Date().getFullYear()

            // --- 1. Total Page Views ---
            const [pageViewsResult] = await db.query(
                `
      SELECT COUNT(DISTINCT VisitorID) AS count
      FROM PageView
      WHERE YEAR(ViewTime) = ? AND MONTH(ViewTime) = ?
    `,
                [currentYear, currentMonth]
            )
            const totalPageViews = pageViewsResult[0]?.count || 0

            const pageViewsGrowth = await this.getGrowthPercentage(
                totalPageViews,
                "PageView",
                "DISTINCT VisitorID",
                "ViewTime"
            )

            // --- 2. Monthly Users ---
            const [monthlyUsersResult] = await db.query(
                `
      SELECT COUNT(DISTINCT a.UserID) AS count
      FROM Accounts a
      WHERE a.Statuses = 1
        AND YEAR(a.CreatedTime) = ? AND MONTH(a.CreatedTime) = ?
    `,
                [currentYear, currentMonth]
            )
            const monthlyUsers = monthlyUsersResult[0]?.count || 0

            const monthlyUsersGrowth = await this.getGrowthPercentage(
                monthlyUsers,
                "Accounts",
                "DISTINCT UserID",
                "CreatedTime"
            )

            // --- 3. New SignUps ---
            const [signUpsResult] = await db.query(
                `
      SELECT COUNT(*) AS count
      FROM Users
      WHERE YEAR(CreatedAt) = ? AND MONTH(CreatedAt) = ?
    `,
                [currentYear, currentMonth]
            )
            const newSignUps = signUpsResult[0]?.count || 0

            const signUpsGrowth = await this.getGrowthPercentage(
                newSignUps,
                "Users",
                "*",
                "CreatedAt"
            )

            // --- 4. Total Invoices ---
            const [invoicesResult] = await db.query(
                `
      SELECT COUNT(*) AS count
      FROM Invoice
      WHERE YEAR(DateCreated) = ? AND MONTH(DateCreated) = ?
    `,
                [currentYear, currentMonth]
            )
            const totalInvoices = invoicesResult[0]?.count || 0

            const totalInvoicesGrowth = await this.getGrowthPercentage(
                totalInvoices,
                "Invoice",
                "*",
                "DateCreated"
            )

            // --- 5. Products Sold (tháng hiện tại) ---
            const [thisMonth] = await db.query(`
      SELECT IFNULL(SUM(ci.Volume),0) AS total
      FROM CartItem ci
      JOIN Cart c ON ci.CartID = c.ID
      JOIN Invoice i ON c.ID = i.CartID
      WHERE i.StatusID = 2
        AND YEAR(i.DateCreated) = YEAR(CURRENT_DATE)
        AND MONTH(i.DateCreated) = MONTH(CURRENT_DATE)
    `)
            const totalProductsSold = Number(thisMonth[0]?.total || 0)

            // Products sold tháng trước
            const [lastMonth] = await db.query(`
      SELECT IFNULL(SUM(ci.Volume),0) AS total
      FROM CartItem ci
      JOIN Cart c ON ci.CartID = c.ID
      JOIN Invoice i ON c.ID = i.CartID
      WHERE i.StatusID = 2
        AND YEAR(i.DateCreated) = YEAR(DATE_SUB(CURRENT_DATE, INTERVAL 1 MONTH))
        AND MONTH(i.DateCreated) = MONTH(DATE_SUB(CURRENT_DATE, INTERVAL 1 MONTH))
    `)
            const previousMonthProductsSold = Number(lastMonth[0]?.total || 0)

            let totalProductsGrowth = 0
            if (previousMonthProductsSold > 0) {
                totalProductsGrowth =
                    Math.round(
                        ((totalProductsSold - previousMonthProductsSold) /
                            previousMonthProductsSold) *
                            100 *
                            10
                    ) / 10
            }

            // --- 6. Total Revenue (năm hiện tại) ---
            const [revenueThisYear] = await db.query(
                `
      SELECT IFNULL(SUM(ci.Volume * ci.UnitPrice), 0) AS totalRevenue
      FROM CartItem ci
      JOIN Cart c ON ci.CartID = c.ID
      JOIN Invoice i ON c.ID = i.CartID
      WHERE YEAR(i.DateCreated) = ?
        AND i.StatusID = 2
    `,
                [currentYear]
            )
            const totalRevenue = Number(revenueThisYear[0]?.totalRevenue || 0)

            // Total Revenue năm trước
            const [revenueLastYear] = await db.query(
                `
      SELECT IFNULL(SUM(ci.Volume * ci.UnitPrice), 0) AS totalRevenue
      FROM CartItem ci
      JOIN Cart c ON ci.CartID = c.ID
      JOIN Invoice i ON c.ID = i.CartID
      WHERE YEAR(i.DateCreated) = ?
        AND i.StatusID = 2
    `,
                [currentYear - 1]
            )
            const lastYearRevenue = Number(
                revenueLastYear[0]?.totalRevenue || 0
            )

            let totalRevenueGrowthYoY = 0
            if (lastYearRevenue > 0) {
                totalRevenueGrowthYoY =
                    Math.round(
                        ((totalRevenue - lastYearRevenue) / lastYearRevenue) *
                            100 *
                            10
                    ) / 10
            }

            // --- Return object ---
            return {
                totalPageViews: Number(totalPageViews),
                pageViewsGrowth: Number(pageViewsGrowth),
                monthlyUsers: Number(monthlyUsers),
                monthlyUsersGrowth: Number(monthlyUsersGrowth),
                newSignUps: Number(newSignUps),
                signUpsGrowth: Number(signUpsGrowth),
                totalInvoices: Number(totalInvoices),
                totalInvoicesGrowth: Number(totalInvoicesGrowth),
                totalProductsSold: Number(totalProductsSold),
                totalProductsGrowth: Number(totalProductsGrowth),
                totalRevenue: Number(totalRevenue),
                totalRevenueGrowthYoY: Number(totalRevenueGrowthYoY),
            }
        } catch (error) {
            console.error("getAllGrowthMetrics error:", error)
            // Return default values nếu có lỗi
            return {
                totalPageViews: 0,
                pageViewsGrowth: 0,
                monthlyUsers: 0,
                monthlyUsersGrowth: 0,
                newSignUps: 0,
                signUpsGrowth: 0,
                totalInvoices: 0,
                totalInvoicesGrowth: 0,
                totalProductsSold: 0,
                totalProductsGrowth: 0,
                totalRevenue: 0,
                totalRevenueGrowthYoY: 0,
            }
        }
    }

    // --- Hàm tính growth % dùng chung ---
    static async getGrowthPercentage(
        currentValue,
        tableName,
        column,
        dateColumn
    ) {
        try {
            const [result] = await db.query(`
        SELECT COUNT(${column}) AS lastMonthValue
        FROM ${tableName}
        WHERE YEAR(${dateColumn}) = YEAR(DATE_SUB(CURRENT_DATE, INTERVAL 1 MONTH))
          AND MONTH(${dateColumn}) = MONTH(DATE_SUB(CURRENT_DATE, INTERVAL 1 MONTH))
      `)

            const lastMonthValue = result[0]?.lastMonthValue || 0
            if (lastMonthValue === 0) return 0

            const growth =
                ((currentValue - lastMonthValue) / lastMonthValue) * 100
            return Math.round(growth * 10) / 10
        } catch (error) {
            console.error("Error in getGrowthPercentage:", error)
            return 0
        }
    }
    static async getTotalInvoices() {
        try {
            const [rows] = await db.query(
                `SELECT COUNT(*) AS total FROM Invoice`
            )
            return rows[0]?.total || 0
        } catch (err) {
            console.error("Error in getTotalInvoices:", err)
            return 0
        }
    }

    // Lấy tổng số sản phẩm bán ra theo type "Clothes"
    static async getTotalProductsSold() {
        try {
            const [rows] = await db.query(`
      SELECT SUM(ci.Volume) AS total
      FROM CartItem ci
      JOIN Cart c ON ci.CartID = c.ID
      JOIN Invoice i ON c.ID = i.CartID
      JOIN StatusInvoice si ON i.StatusID = si.ID
      WHERE si.StatusName = 'Delivered'
    `)
            return rows[0]?.total || 0
        } catch (err) {
            console.error("Error in getTotalProductsSold:", err)
            return 0
        }
    }

    static async getMonthlyUsers() {
        try {
            const [rows] = await db.query(`
        SELECT COUNT(DISTINCT UserID) AS total
        FROM Accounts
        WHERE MONTH(CreatedTime) = MONTH(CURRENT_DATE)
          AND YEAR(CreatedTime) = YEAR(CURRENT_DATE)
      `)
            return rows[0]?.total || 0
        } catch (err) {
            console.error("Error in getMonthlyUsers:", err)
            return 0
        }
    }

    // --- lấy tổng doanh thu trong 1 năm ---
    static async getTotalRevenueByYear(year) {
        try {
            const [rows] = await db.query(
                `
      SELECT IFNULL(SUM(ci.Volume * ci.UnitPrice), 0) AS totalRevenue
      FROM CartItem ci
      JOIN Cart c ON ci.CartID = c.ID
      JOIN Invoice i ON c.ID = i.CartID
      WHERE YEAR(i.DateCreated) = ?
      `,
                [year]
            )
            return Number(rows[0]?.totalRevenue || 0)
        } catch (err) {
            console.error("Error in getTotalRevenueByYear:", err)
            return 0
        }
    }

    // ===== LẤY DANH SÁCH USER + SỐ ĐƠN + TỔNG TIỀN =====
    static async getAllUsers() {
        try {
            const [rows] = await db.query(`
      SELECT 
        u.ID,
        u.FirstName,
        u.LastName,
        u.Email,
        u.PhoneNumber,
        u.Address,
        COALESCE(r.RegionName, 'N/A') as Region,
        -- Số đơn (số Invoice)
        COUNT(i.ID) AS TotalOrders,
        -- Tổng tiền tất cả đơn (sum CartItem.TotalPrice từ các cart của user)
        COALESCE(SUM(ci.TotalPrice), 0) AS TotalAmount
      FROM Users u
      LEFT JOIN Region r ON u.RegionID = r.ID
      LEFT JOIN Invoice i ON u.ID = i.UserID
      LEFT JOIN Cart c ON i.CartID = c.ID
      LEFT JOIN CartItem ci ON c.ID = ci.CartID
      GROUP BY u.ID
      ORDER BY u.ID DESC;
    `)

            return rows // trả thẳng mảng user
        } catch (error) {
            console.error("Error in getAllUsers:", error)
            throw error
        }
    }

    // XÓA 1 USER
    static async deleteUser(userId) {
        try {
            const [result] = await db.query(`DELETE FROM Users WHERE ID = ?`, [
                userId,
            ])
            return result.affectedRows
        } catch (error) {
            console.error("Error in deleteUser:", error)
            throw error
        }
    }

    // XÓA NHIỀU USER
    static async deleteUsersByIds(ids = []) {
        if (!Array.isArray(ids) || ids.length === 0) return 0

        const placeholders = ids.map(() => "?").join(",")
        try {
            const [result] = await db.query(
                `DELETE FROM Users WHERE ID IN (${placeholders})`,
                ids
            )
            return result.affectedRows
        } catch (error) {
            console.error("Error in deleteUsersByIds:", error)
            throw error
        }
    }

    // --- tính growth YoY cho doanh thu ---
    static async getRevenueGrowthYoY(currentYear) {
        try {
            const thisYear = Number(currentYear || new Date().getFullYear())
            const lastYear = thisYear - 1

            const [thisRows] = await db.query(
                `SELECT IFNULL(SUM(ci.Volume * ci.UnitPrice),0) AS totalRevenue
       FROM CartItem ci
       JOIN Cart c ON ci.CartID = c.ID
       JOIN Invoice i ON c.ID = i.CartID
       WHERE YEAR(i.DateCreated) = ?`,
                [thisYear]
            )

            const [lastRows] = await db.query(
                `SELECT IFNULL(SUM(ci.Volume * ci.UnitPrice),0) AS totalRevenue
       FROM CartItem ci
       JOIN Cart c ON ci.CartID = c.ID
       JOIN Invoice i ON c.ID = i.CartID
       WHERE YEAR(i.DateCreated) = ?`,
                [lastYear]
            )

            const thisTotal = Number(thisRows[0]?.totalRevenue || 0)
            const lastTotal = Number(lastRows[0]?.totalRevenue || 0)

            if (lastTotal === 0) return 0 // tránh chia 0 — bạn có thể trả null hoặc 100 nếu muốn

            const growth = ((thisTotal - lastTotal) / lastTotal) * 100
            return Math.round(growth * 10) / 10 // 1 decimal
        } catch (err) {
            console.error("Error in getRevenueGrowthYoY:", err)
            return 0
        }
    }

    // Lấy revenue theo TypeName và năm
    static async getMonthlyRevenueByType(
        typeName,
        year = new Date().getFullYear()
    ) {
        try {
            const [rows] = await db.query(
                `
      SELECT MONTH(i.DateCreated) as month, 
             COALESCE(SUM(ci.Volume * ci.UnitPrice), 0) as amount
      FROM Invoice i
      LEFT JOIN CartItem ci ON i.CartID = ci.CartID
      LEFT JOIN Product p ON ci.ProductID = p.ID
      LEFT JOIN TypeProduct tp ON p.TypeID = tp.ID
      WHERE YEAR(i.DateCreated) = ? 
        AND tp.TypeName = ?
        AND i.StatusID = 2
      GROUP BY MONTH(i.DateCreated)
      ORDER BY MONTH(i.DateCreated)
      `,
                [year, typeName]
            )

            // Ensure months 1..12 all present
            const months = Array.from({ length: 12 }, (_, i) => ({
                month: i + 1,
                amount: 0,
            }))

            for (const r of rows) {
                const idx = r.month - 1
                months[idx].amount = Number(r.amount || 0)
            }

            return months
        } catch (err) {
            console.error("Error in getMonthlyRevenueByType:", err)
            throw err
        }
    }

    // Lấy tổng revenue theo TypeName và năm
    static async getTotalRevenueByType(
        typeName,
        year = new Date().getFullYear()
    ) {
        try {
            const [rows] = await db.query(
                `
      SELECT COALESCE(SUM(ci.Volume * ci.UnitPrice), 0) as totalRevenue
      FROM Invoice i
      LEFT JOIN CartItem ci ON i.CartID = ci.CartID
      LEFT JOIN Product p ON ci.ProductID = p.ID
      LEFT JOIN TypeProduct tp ON p.TypeID = tp.ID
      WHERE YEAR(i.DateCreated) = ? 
        AND tp.TypeName = ?
        AND i.StatusID = 2
      `,
                [year, typeName]
            )

            return Number(rows[0]?.totalRevenue || 0)
        } catch (err) {
            console.error("Error in getTotalRevenueByType:", err)
            throw err
        }
    }

    // Thêm vào AdminSite model

    // ===== CẬP NHẬT SẢN PHẨM VỚI MÀU SẮC VÀ KÍCH CỠ =====
    static async updateProductWithColors(productId, payload) {
        const conn = await db.getConnection()
        try {
            await conn.beginTransaction()

            // 1) Update Product info
            await conn.query(
                "UPDATE Product SET ProductName = ?, Descriptions = ?, TypeID = ? WHERE ID = ?",
                [
                    payload.ProductName,
                    payload.Descriptions,
                    payload.TypeID,
                    productId,
                ]
            )

            // 2) Update Price
            await conn.query("UPDATE Price SET Price = ? WHERE ProductID = ?", [
                payload.Price,
                productId,
            ])

            // Helper: insert image and return id
            const insertImage = async (imgPath) => {
                const [imgRes] = await conn.query(
                    "INSERT INTO Image (ImgPath) VALUES (?)",
                    [imgPath]
                )
                return imgRes.insertId
            }

            // ===== 3) UPDATE MAIN IMAGES (GIỮ THỨ TỰ - CHỈ CẬP NHẬT IMGID) =====
            const mainChangedIndexes = payload.mainImageChangedIndexes || [];
            
            // Lấy tất cả ProductImg cũ (giữ nguyên thứ tự)
            const [allMainImgs] = await conn.query(
                'SELECT ID, ImgID FROM ProductImg WHERE ProductID = ? ORDER BY ID',
                [productId]
            );

            // UPDATE ảnh của những slot thay đổi
            let newMainImgIdx = 0;
            for (let i = 0; i < mainChangedIndexes.length; i++) {
                const slotIdx = mainChangedIndexes[i];
                const imgPath = payload.mainImages[i];

                if (slotIdx >= allMainImgs.length) {
                    console.warn(`⚠️ Main image: slot ${slotIdx} không tồn tại (chỉ có ${allMainImgs.length} slots)`);
                    continue;
                }

                if (imgPath) {
                    const imgId = await insertImage(imgPath);
                    const oldImgId = allMainImgs[slotIdx].ImgID;
                    const recordId = allMainImgs[slotIdx].ID;

                    await conn.query(
                        'UPDATE ProductImg SET ImgID = ? WHERE ID = ?',
                        [imgId, recordId]
                    );
                    console.log(`✏️ Updated main image slot ${slotIdx} (record ID: ${recordId}, old ImgID: ${oldImgId}, new ImgID: ${imgId})`);
                }
            }

            console.log(`✅ Updated ${mainChangedIndexes.length} main image slots`);

            // ===== 4) HANDLE COLORS =====
            // Lấy danh sách màu hiện tại
            const [existingColors] = await conn.query(
                "SELECT ID, ColorName FROM ColorProduct WHERE ProductID = ?",
                [productId]
            );

            // Build quick lookup maps by ID and by Name.
            // Prefer matching by colorId (sent from client) to avoid ambiguity when names change or duplicate names exist.
            const existingColorById = {};
            const existingColorByName = {};
            existingColors.forEach((c) => {
                existingColorById[Number(c.ID)] = Number(c.ID);
                if (c.ColorName !== undefined && c.ColorName !== null) {
                    existingColorByName[c.ColorName] = Number(c.ID);
                }
            });
            const processedColorIds = new Set();

            for (const color of payload.colors || []) {
                // determine existing colorId (prefer provided id)
                const providedId = color.colorId !== undefined && color.colorId !== null ? Number(color.colorId) : null;
                let colorId = null;

                if (providedId && existingColorById[providedId]) {
                    colorId = providedId;
                } else if (color.colorName && existingColorByName[color.colorName]) {
                    colorId = existingColorByName[color.colorName];
                }

                // If found existing color -> update images & sizes
                if (colorId) {
                    processedColorIds.add(colorId);

                     // ✅ UPDATE color name if changed
                   if (color.colorName && color.colorName !== "Default") {
                       await conn.query(
                           'UPDATE ColorProduct SET ColorName = ? WHERE ID = ?',
                           [color.colorName, colorId]
                       );
                       console.log(`✏️ Updated colorId=${colorId} name to "${color.colorName}"`);
                   }

                    // Fetch current color images (ordered)
                    const [allColorImgs] = await conn.query(
                        'SELECT ID, ImgID FROM ColorProductImage WHERE ColorProductID = ? ORDER BY ID',
                        [colorId]
                    );

                    const changedSlots = Array.isArray(color.changedImageIndexes)
                        ? color.changedImageIndexes.map(Number).filter(Number.isFinite)
                        : [];

                    const fullImages = [...(color.existingImages || [])];
                   (color.images || []).forEach((img, idx) => {
                       if (img && changedSlots.includes(idx)) {
                           fullImages[idx] = img; // Replace slot bị thay
                       }
                   });

                    // color.images is array of NEW image paths (from saved uploads) in same order as changedSlots
                    for (let k = 0; k < changedSlots.length; k++) {
                        const slotIdx = changedSlots[k];
                        const newImgPath = (color.images || [])[k];

                        if (!newImgPath) continue;

                        const newImgId = await insertImage(newImgPath);

                        if (slotIdx < allColorImgs.length) {
                            // update existing ColorProductImage row
                            const recordId = allColorImgs[slotIdx].ID;
                            const oldImgId = allColorImgs[slotIdx].ImgID;
                            await conn.query(
                                'UPDATE ColorProductImage SET ImgID = ? WHERE ID = ?',
                                [newImgId, recordId]
                            );
                            console.log(`✏️ Updated colorId=${colorId} slot ${slotIdx} (record ${recordId}) oldImg=${oldImgId} -> newImg=${newImgId}`);
                        } else {
                            // slot not exists: insert new ColorProductImage (append)
                            await conn.query(
                                'INSERT INTO ColorProductImage (ColorProductID, ImgID) VALUES (?, ?)',
                                [colorId, newImgId]
                            );
                            console.log(`➕ Appended new image for colorId=${colorId} (imgId=${newImgId})`);
                        }
                    }

                    // If client provided any 'existingImages' (kept images), we do nothing — they remain in DB.
                } else {
                    // create new color
                    const [colorRes] = await conn.query(
                        "INSERT INTO ColorProduct (ProductID, ColorName) VALUES (?, ?)",
                        [productId, color.colorName || "Default"]
                    );
                    colorId = colorRes.insertId;
                    processedColorIds.add(colorId);

                    // insert all provided images (new color)
                    for (const imgPath of (color.images || [])) {
                        if (!imgPath) continue;
                        const imgId = await insertImage(imgPath);
                        await conn.query(
                            "INSERT INTO ColorProductImage (ColorProductID, ImgID) VALUES (?, ?)",
                            [colorId, imgId]
                        );
                    }
                    console.log(`✅ Created new colorId=${colorId} with ${ (color.images || []).length } images`);
                }

                // ===== UPDATE QUANTITIES (SIZES) =====
                // remove existing quantities and insert new ones
                await conn.query(
                    "DELETE FROM Quantity WHERE ColorID = ? AND ProductID = ?",
                    [colorId, productId]
                );

                for (const s of color.sizes || []) {
                    if (!s || !s.size) continue;
                    const sizeName = String(s.size).trim();

                    const [rows] = await conn.query(
                        "SELECT ID FROM SizeProduct WHERE SizeName = ?",
                        [sizeName]
                    );
                    let sizeId;
                    if (rows && rows.length) {
                        sizeId = rows[0].ID;
                    } else {
                        const [sizeRes] = await conn.query(
                            "INSERT INTO SizeProduct (SizeName) VALUES (?)",
                            [sizeName]
                        );
                        sizeId = sizeRes.insertId;
                    }

                    const quantityVal = Number(s.quantity) || 0;
                    await conn.query(
                        "INSERT INTO Quantity (QuantityValue, SizeID, ColorID, ProductID) VALUES (?, ?, ?, ?)",
                        [quantityVal, sizeId, colorId, productId]
                    );
                }
            }
            

             // ===== XÓA COLORS BỊ MARK =====
            const deletedColorIds = payload.deletedColorIds || [];
            if (deletedColorIds.length > 0) {
              const placeholders = deletedColorIds.map(() => "?").join(",");

              // Xóa ColorProductImage
              await conn.query(
                `DELETE FROM ColorProductImage WHERE ColorProductID IN (${placeholders})`,
                deletedColorIds
              );

              // Xóa Quantity
              await conn.query(
                `DELETE FROM Quantity WHERE ColorID IN (${placeholders})`,
                deletedColorIds
              );

              // Xóa ColorProduct
              await conn.query(
                `DELETE FROM ColorProduct WHERE ID IN (${placeholders})`,
                deletedColorIds
              );

              console.log(`🗑️ Deleted ${deletedColorIds.length} colors`);
            }
            await conn.commit();
            console.log(" Product updated successfully:", productId);
            return { success: true, productId };
        } catch (err) {
            await conn.rollback();
            console.error("updateProductWithColors error:", err);
            throw err;
        } finally {
            conn.release();
        }
    }
}
module.exports = AdminSite
