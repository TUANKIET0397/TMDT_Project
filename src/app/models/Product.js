// src/app/models/Product.js
const db = require("../../config/db")

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
            `)
            return rows
        } catch (error) {
            console.error("Error in getAllProducts:", error)
            throw error
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
            )
            return rows
        } catch (error) {
            console.error("Error in getProductsByType:", error)
            throw error
        }
    }

// search products by query
static async searchByQuery(q, limit = 10) {
        try {
            const qLike = `%${q}%`
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
            )
            return rows
        } catch (error) {
            console.error("Error in searchByQuery:", error)
            throw error
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
                )
                return rows
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
                )
                return rows
            }
        } catch (error) {
            console.error("Error in getSizesForProduct:", error)
            throw error
        }
    }

    // Lấy chi tiết sản phẩm
static async getProductById(productId) {
    try {
        const [rows] = await db.query(
            `
            SELECT 
                p.ID,
                p.ProductName,
                p.Descriptions,
                pr.Price,
                tp.TypeName,
                p.TypeID,
                (SELECT GROUP_CONCAT(i.ImgPath SEPARATOR ',') 
                 FROM ProductImg pi 
                 JOIN Image i ON pi.ImgID = i.ID 
                 WHERE pi.ProductID = p.ID) as Images,
                -- images grouped by color via ColorProduct -> ColorProductImage -> Image
                (SELECT GROUP_CONCAT(CONCAT(cp.ColorName, '::', i.ImgPath) SEPARATOR ',')
                 FROM ColorProduct cp
                 JOIN ColorProductImage cpi ON cpi.ColorProductID = cp.ID
                 JOIN Image i ON cpi.ImgID = i.ID
                 WHERE cp.ProductID = p.ID) as ImagesByColor,
                COALESCE((SELECT i.ImgPath 
                 FROM ProductImg pi 
                 JOIN Image i ON pi.ImgID = i.ID 
                 WHERE pi.ProductID = p.ID 
                 LIMIT 1), '/img/default.jpg') as ImgPath
            FROM Product p
            LEFT JOIN Price pr ON p.ID = pr.ProductID
            LEFT JOIN TypeProduct tp ON p.TypeID = tp.ID
            WHERE p.ID = ?
        `,
            [productId]
        )

        const product = rows[0]
        if (!product) return product

        const normalize = (p) => {
            if (!p) return '/img/default.jpg'
            p = String(p).trim()
            if (/^https?:\/\//.test(p) || p.startsWith('/')) return p
            return `/uploads/products/${p}`
        }

        // all images for product
        let imgsRaw = []
        if (product.Images && typeof product.Images === 'string') {
            imgsRaw = product.Images.split(',').map(s => s.trim()).filter(Boolean)
        } else if (product.ImgPath) {
            imgsRaw = [String(product.ImgPath).trim()]
        }
        if (imgsRaw.length === 0) imgsRaw = [product.ImgPath || '/img/default.jpg']
        product.ImagesArray = imgsRaw.map(String)
        product.Images6 = imgsRaw.slice(0, 6).map(normalize)

        // parse ImagesByColor into map — only real color entries (no fallback)
        const byColorMap = {}
        if (product.ImagesByColor && typeof product.ImagesByColor === 'string') {
            product.ImagesByColor.split(',').forEach(entry => {
                const parts = entry.split('::')
                if (parts.length >= 2) {
                    const colorRaw = parts[0].trim()
                    const path = parts.slice(1).join('::').trim()
                    if (!colorRaw) return
                    if (!byColorMap[colorRaw]) byColorMap[colorRaw] = []
                    byColorMap[colorRaw].push(path)
                }
            })
        }

        const byColorList = []
        for (const [color, arr] of Object.entries(byColorMap)) {
            const clean = arr.map(a => String(a).trim()).filter(Boolean)
            if (clean.length === 0) continue
            const normalized = clean.slice(0, 6).map(normalize)
            byColorList.push({ color, images: clean.map(normalize), images6: normalized })
        }

        product.ImagesByColorMap = byColorMap
        product.ImagesByColorList = byColorList

        return product
    } catch (error) {
        console.error("Error in getProductById:", error)
        throw error
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
            )
            return rows
        } catch (error) {
            console.error("Error in getRelatedProducts:", error)
            throw error
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
            )
            return result.affectedRows
        } catch (error) {
            console.error("Error in deleteById:", error)
            throw error
        }
    }
}

module.exports = Product
