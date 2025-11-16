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
            `)
            return rows
        } catch (error) {
            console.error("Error in getAllInvoices:", error)
            throw error
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
            )

            if (!invoice || !invoice[0]) {
                return []
            }

            const cartID = invoice[0].CartID

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
            )

            return products
        } catch (error) {
            console.error("Error in getInvoiceProducts:", error)
            throw error
        }
    }

    // ===== LẤY ĐƠN HÀNG KÈM SẢN PHẨM =====
    static async getInvoicesWithProducts() {
        try {
            const invoices = await this.getAllInvoices()

            // Lấy sản phẩm cho từng invoice
            for (let invoice of invoices) {
                invoice.Products = await this.getInvoiceProducts(
                    invoice.InvoiceID
                )
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
}

module.exports = AdminSite
