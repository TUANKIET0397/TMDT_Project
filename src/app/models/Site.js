// src/app/models/Site.js
const db = require("../../config/db")

class Site {
    
    static async getAllCategories() {
        try {
            const [rows] = await db.query(`
                SELECT 
                    tp.ID,
                    tp.TypeName,
                    COUNT(p.ID) as ProductCount
                FROM TypeProduct tp
                LEFT JOIN Product p ON tp.ID = p.TypeID
                GROUP BY tp.ID, tp.TypeName
            `)
            return rows
        } catch (error) {
            console.error("Error in getAllCategories:", error)
            throw error
        }
    }

    // ===== 2. LẤY SẢN PHẨM MỚI NHẤT =====
    static async getNewProducts(limit = 14) {
        try {
            const [rows] = await db.query(
                `
                SELECT 
                    p.ID,
                    p.ProductName,
                    p.Descriptions,
                    pr.Price,
                    (SELECT img.ImgPath 
                     FROM ProductImg pi2 
                     JOIN Image img ON pi2.ImgID = img.ID 
                     WHERE pi2.ProductID = p.ID 
                     LIMIT 1) as ImgPath,
                    tp.TypeName,
                    'NEW' as Badge
                FROM Product p
                LEFT JOIN Price pr ON p.ID = pr.ProductID
                LEFT JOIN TypeProduct tp ON p.TypeID = tp.ID
                WHERE pr.Price IS NOT NULL
                ORDER BY p.ID DESC
                LIMIT ?
            `,
                [limit]
            )
            return rows
        } catch (error) {
            console.error("Error in getNewProducts:", error)
            throw error
        }
    }

    // ===== 3. LẤY SẢN PHẨM BÁN CHẠY =====
    static async getBestSellerProducts(limit = 14) {
        try {
            const [rows] = await db.query(
                `
                SELECT 
                    p.ID,
                    p.ProductName,
                    p.Descriptions,
                    pr.Price,
                    (SELECT img.ImgPath 
                     FROM ProductImg pi2 
                     JOIN Image img ON pi2.ImgID = img.ID 
                     WHERE pi2.ProductID = p.ID 
                     LIMIT 1) as ImgPath,
                    tp.TypeName,
                    COUNT(DISTINCT i.ID) as SoldCount
                FROM Product p
                LEFT JOIN Price pr ON p.ID = pr.ProductID
                LEFT JOIN TypeProduct tp ON p.TypeID = tp.ID
                LEFT JOIN CartItem ci ON p.ID = ci.ProductID
                LEFT JOIN Cart c ON ci.CartID = c.ID
                LEFT JOIN Invoice i ON c.ID = i.CartID
                WHERE pr.Price IS NOT NULL
                GROUP BY p.ID, p.ProductName, p.Descriptions, pr.Price, tp.TypeName
                ORDER BY SoldCount DESC, p.ID DESC
                LIMIT ?
            `,
                [limit]
            )
            return rows
        } catch (error) {
            console.error("Error in getBestSellerProducts:", error)
            throw error
        }
    }

    // ===== 4. LẤY SẢN PHẨM NỔI BẬT =====
    static async getFeaturedProducts(limit = 3) {
        try {
            const [rows] = await db.query(
                `
                SELECT 
                    p.ID,
                    p.ProductName,
                    p.Descriptions,
                    pr.Price,
                    (SELECT img.ImgPath 
                     FROM ProductImg pi2 
                     JOIN Image img ON pi2.ImgID = img.ID 
                     WHERE pi2.ProductID = p.ID 
                     LIMIT 1) as ImgPath,
                    tp.TypeName,
                    GROUP_CONCAT(DISTINCT sp.SizeName ORDER BY sp.SizeName SEPARATOR ' ') as AvailableSizes
                FROM Product p
                LEFT JOIN Price pr ON p.ID = pr.ProductID
                LEFT JOIN TypeProduct tp ON p.TypeID = tp.ID
                LEFT JOIN Quantity q ON p.ID = q.ProductID
                LEFT JOIN SizeProduct sp ON q.SizeID = sp.ID
                WHERE pr.Price IS NOT NULL AND q.QuantityValue > 0
                GROUP BY p.ID, p.ProductName, p.Descriptions, pr.Price, tp.TypeName
                ORDER BY pr.Price DESC
                LIMIT ?
            `,
                [limit]
            )
            return rows
        } catch (error) {
            console.error("Error in getFeaturedProducts:", error)
            throw error
        }
    }

    // ===== 5. LẤY TẤT CẢ SIZES =====
    static async getAllSizes() {
        try {
            const [rows] = await db.query(
                `SELECT * FROM SizeProduct ORDER BY ID`
            )
            return rows
        } catch (error) {
            console.error("Error in getAllSizes:", error)
            throw error
        }
    }

    // ===== 6. LẤY THỐNG KÊ TỔNG QUAN =====
    static async getStatistics() {
        try {
            const [result] = await db.query(`
                SELECT 
                    COUNT(DISTINCT p.ID) as TotalProducts,
                    MIN(pr.Price) as MinPrice,
                    MAX(pr.Price) as MaxPrice
                FROM Product p
                LEFT JOIN Price pr ON p.ID = pr.ProductID
                WHERE pr.Price IS NOT NULL
            `)
            return result[0]
        } catch (error) {
            console.error("Error in getStatistics:", error)
            throw error
        }
    }

    // ===== 7. LẤY ẢNH SLIDER =====
    static async getSliderImages() {
        try {
            return [
                {
                    ImgPath: "banner1_pic1.png",
                    Title: "Restock",
                    Description:
                        "We supply in all the world for entire products",
                },
                {
                    ImgPath: "banner1_pic2.png",
                    Title: "Restock",
                    Description:
                        "We supply in all the world for entire products",
                },
                {
                    ImgPath: "banner1_pic3.png",
                    Title: "Restock",
                    Description:
                        "We supply in all the world for entire products",
                },
                {
                    ImgPath: "banner1_pic4.png",
                    Title: "Restock",
                    Description:
                        "We supply in all the world for entire products",
                },
            ]
        } catch (error) {
            console.error("Error in getSliderImages:", error)
            throw error
        }
    }
}

module.exports = Site
