// src/app/models/Invoice.js
const db = require("../../config/db")

class Invoice {
    /**
     * Lấy hoặc tạo StatusID từ tên status
     * @param {string} statusName - Tên status (pending, completed, failed)
     * @returns {Promise<number>} - StatusID
     */
    static async getStatusID(statusName) {
        try {
            // Thử tìm status trong bảng StatusInvoice
            const [rows] = await db.query(
                `SELECT ID FROM StatusInvoice WHERE StatusName = ? LIMIT 1`,
                [statusName]
            )

            if (rows.length > 0) {
                return rows[0].ID
            }

            // Nếu không tìm thấy, tạo mới (hoặc dùng default ID = 1)
            console.warn(
                `⚠️ Status "${statusName}" not found, using default StatusID = 1`
            )
            return 1 // Default: pending
        } catch (error) {
            console.error("Error in getStatusID:", error)
            return 1 // Fallback to default
        }
    }

    /**
     * Tạo Invoice tạm thời (pending) trước khi thanh toán
     * @param {Object} data
     * @param {number} data.UserID - User ID (nullable)
     * @param {number} data.TotalAmount - Tổng tiền (không lưu trong Invoice, chỉ dùng cho Transaction)
     * @param {string} data.Status - Trạng thái ('pending', 'completed', 'failed')
     * @returns {Promise<number>} - Invoice ID
     */
    static async createPendingInvoice({
        UserID,
        TotalAmount,
        Status = "pending",
    }) {
        try {
            // Lấy StatusID từ tên status
            const statusID = await this.getStatusID(Status)

            const query = `
                INSERT INTO Invoice (UserID, CartID, StatusID, DateCreated)
                VALUES (?, NULL, ?, NOW())
            `

            const [result] = await db.query(query, [UserID || null, statusID])

            console.log(
                `✓ Created pending invoice: ID=${result.insertId}, StatusID=${statusID}`
            )
            return result.insertId
        } catch (error) {
            console.error("Error in createPendingInvoice:", error)
            throw error
        }
    }

    /**
     * Cập nhật trạng thái Invoice
     * @param {number} invoiceId - Invoice ID
     * @param {string} statusName - Tên status ('pending', 'completed', 'failed')
     */
    static async updateInvoiceStatus(invoiceId, statusName) {
        try {
            const statusID = await this.getStatusID(statusName)

            const query = `UPDATE Invoice SET StatusID = ? WHERE ID = ?`
            const [result] = await db.query(query, [statusID, invoiceId])

            console.log(
                `✓ Updated Invoice ${invoiceId} to status: ${statusName} (StatusID=${statusID})`
            )
            return result.affectedRows > 0
        } catch (error) {
            console.error("Error in updateInvoiceStatus:", error)
            throw error
        }
    }

    /**
     * Lấy Invoice theo ID
     */
    static async getInvoiceById(invoiceId) {
        try {
            const [rows] = await db.query(
                `SELECT i.*, s.StatusName 
                 FROM Invoice i
                 LEFT JOIN StatusInvoice s ON i.StatusID = s.ID
                 WHERE i.ID = ? LIMIT 1`,
                [invoiceId]
            )
            return rows.length > 0 ? rows[0] : null
        } catch (error) {
            console.error("Error in getInvoiceById:", error)
            throw error
        }
    }
}

module.exports = Invoice
