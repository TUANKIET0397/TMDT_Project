// src/app/models/Transaction.js
const db = require("../../config/db")

class Transaction {
    /**
     * Save a transaction record
     * @param {Object} transactionData - Transaction data
     * @param {number} transactionData.InvoiceID - Invoice ID
     * @param {string} transactionData.partnerCode - MoMo partner code
     * @param {string} transactionData.orderId - Order ID from MoMo
     * @param {string} transactionData.requestId - Request ID
     * @param {number} transactionData.amount - Transaction amount
     * @param {string} transactionData.transId - Transaction ID from MoMo
     * @param {number} transactionData.resultCode - Result code (0 = success)
     * @param {string} transactionData.message - MoMo message
     * @param {string} transactionData.payType - Payment type
     * @param {number} transactionData.responseTime - Response time
     * @param {string} transactionData.extraData - Extra data
     * @returns {Promise<number>} - Inserted transaction ID
     */
    static async saveTransaction(transactionData) {
        try {
            const {
                InvoiceID,
                partnerCode,
                orderId,
                requestId,
                amount,
                transId,
                resultCode,
                message,
                payType,
                responseTime,
                extraData,
            } = transactionData

            const query = `
                INSERT INTO Transactions (
                    InvoiceID,
                    partnerCode,
                    orderId,
                    requestId,
                    amount,
                    transId,
                    resultCode,
                    message,
                    payType,
                    responseTime,
                    extraData,
                    Status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `

            const status = resultCode === 0 ? "success" : "failed"

            const [result] = await db.query(query, [
                InvoiceID || null,
                partnerCode,
                orderId,
                requestId,
                amount,
                transId,
                resultCode,
                message,
                payType,
                responseTime,
                extraData,
                status,
            ])

            console.log(
                `✓ Transaction saved: orderId=${orderId}, transId=${transId}, status=${status}`
            )
            return result.insertId
        } catch (error) {
            console.error("Error in saveTransaction:", error)
            throw error
        }
    }

    /**
     * Get transaction by orderId
     * @param {string} orderId - Order ID
     * @returns {Promise<Object>} - Transaction record
     */
    static async getTransactionByOrderId(orderId) {
        try {
            const [rows] = await db.query(
                `SELECT * FROM Transactions WHERE orderId = ? ORDER BY createdAt DESC LIMIT 1`,
                [orderId]
            )
            return rows.length > 0 ? rows[0] : null
        } catch (error) {
            console.error("Error in getTransactionByOrderId:", error)
            throw error
        }
    }

    /**
     * Get transaction by transId
     * @param {string} transId - Transaction ID
     * @returns {Promise<Object>} - Transaction record
     */
    static async getTransactionByTransId(transId) {
        try {
            const [rows] = await db.query(
                `SELECT * FROM Transactions WHERE transId = ? LIMIT 1`,
                [transId]
            )
            return rows.length > 0 ? rows[0] : null
        } catch (error) {
            console.error("Error in getTransactionByTransId:", error)
            throw error
        }
    }

    /**
     * Update transaction status
     * @param {string} orderId - Order ID
     * @param {string} status - New status (pending, success, failed)
     * @returns {Promise<boolean>} - Success status
     */
    static async updateTransactionStatus(orderId, status) {
        try {
            const query = `UPDATE Transactions SET Status = ? WHERE orderId = ?`
            const [result] = await db.query(query, [status, orderId])
            return result.affectedRows > 0
        } catch (error) {
            console.error("Error in updateTransactionStatus:", error)
            throw error
        }
    }

    /**
     * Get all transactions for an invoice
     * @param {number} InvoiceID - Invoice ID
     * @returns {Promise<Array>} - Transaction records
     */
    static async getTransactionsByInvoiceId(InvoiceID) {
        try {
            const [rows] = await db.query(
                `SELECT * FROM Transactions WHERE InvoiceID = ? ORDER BY createdAt DESC`,
                [InvoiceID]
            )
            return rows
        } catch (error) {
            console.error("Error in getTransactionsByInvoiceId:", error)
            throw error
        }
    }
}

module.exports = Transaction
