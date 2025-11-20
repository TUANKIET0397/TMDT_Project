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
            return rows[0]
        } catch (error) {
            console.error("Error in getProductById:", error)
            throw error
        }
    }

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
}

module.exports = Product
