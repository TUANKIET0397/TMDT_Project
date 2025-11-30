// src/app/models/Invoice.js
const db = require("../../config/db")

class Invoice {
    /**
     * Lấy StatusID từ tên status
     * @param {string} statusName - Tên status (Prepare, Done, Delivered, Cancelled)
     * @returns {Promise<number>} - StatusID
     */
    static async getStatusID(statusName) {
        try {
            // Map status names
            const statusMap = {
                pending: "Prepare",
                completed: "Done",
                success: "Done",
                failed: "Cancelled",
                prepare: "Prepare",
                done: "Done",
                delivered: "Delivered",
                cancelled: "Cancelled",
            }

            // Normalize status name
            const normalizedStatus =
                statusMap[statusName?.toLowerCase()] || statusName

            // Thử tìm status trong bảng StatusInvoice
            const [rows] = await db.query(
                `SELECT ID FROM StatusInvoice WHERE StatusName = ? LIMIT 1`,
                [normalizedStatus]
            )

            if (rows.length > 0) {
                return rows[0].ID
            }

            // Nếu không tìm thấy, dùng default "Prepare" (ID = 1)
            console.warn(
                `⚠️ Status "${statusName}" not found, using default "Prepare" (ID = 1)`
            )
            return 1 // Default: Prepare
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
     * @param {string} data.Status - Trạng thái ('prepare', 'done', 'delivered', 'cancelled')
     * @param {string} data.PaymentMethod - Phương thức thanh toán ('Paid' cho MoMo, 'Unpaid' cho COD)
     * @returns {Promise<number>} - Invoice ID
     */
    static async createPendingInvoice({
        UserID,
        TotalAmount,
        Status = "prepare",
        PaymentMethod = "Unpaid",
    }) {
        try {
            // Lấy StatusID từ tên status
            const statusID = await this.getStatusID(Status)

            const query = `
                INSERT INTO Invoice (UserID, CartID, StatusID, DateCreated, Payment, States, TotalCost)
                VALUES (?, NULL, ?, NOW(), ?, ?, ?)
            `

            const [result] = await db.query(query, [
                UserID || null,
                statusID,
                PaymentMethod, // 'Paid' hoặc 'Unpaid'
                "Ongoing", // Trạng thái ban đầu luôn là Ongoing
                TotalAmount || 0,
            ])

            console.log(
                `✓ Created pending invoice: ID=${result.insertId}, Status=${Status}, Payment=${PaymentMethod}, TotalCost=${TotalAmount}`
            )
            return result.insertId
        } catch (error) {
            console.error("Error in createPendingInvoice:", error)
            throw error
        }
    }

    /**
     * Cập nhật trạng thái thanh toán Invoice
     * @param {number} invoiceId - Invoice ID
     * @param {string} paymentStatus - 'Paid' hoặc 'Unpaid'
     */
    static async updateInvoicePayment(invoiceId, paymentStatus) {
        try {
            const validPayment = ["Paid", "Unpaid"]
            if (!validPayment.includes(paymentStatus)) {
                throw new Error(`Invalid payment status: ${paymentStatus}`)
            }

            const query = `UPDATE Invoice SET Payment = ? WHERE ID = ?`
            const [result] = await db.query(query, [paymentStatus, invoiceId])

            console.log(
                `✓ Updated Invoice ${invoiceId} payment to: ${paymentStatus}`
            )
            return result.affectedRows > 0
        } catch (error) {
            console.error("Error in updateInvoicePayment:", error)
            throw error
        }
    }

    /**
     * Cập nhật trạng thái Invoice
     * @param {number} invoiceId - Invoice ID
     * @param {string} statusName - Tên status ('Prepare', 'Done', 'Delivered', 'Cancelled')
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

    /**
     * Tạo Cart và CartItems từ cartData
     * @param {number} userID - User ID
     * @param {Array} cartItems - Mảng items: [{productId, name, quantity, price, size, ...}]
     * @returns {Promise<number>} - Cart ID
     */
    static async createCartFromItems(userID, cartItems) {
        let connection
        try {
            // Lấy connection từ pool
            connection = await db.getConnection()

            // 1. Tạo Cart
            const [cartResult] = await connection.query(
                `INSERT INTO Cart (UserID, CreatedTime, Statuses) VALUES (?, NOW(), 0)`,
                [userID]
            )
            const cartID = cartResult.insertId
            console.log(`✓ Created Cart ID: ${cartID}`)

            // 2. Thêm CartItems
            if (Array.isArray(cartItems) && cartItems.length > 0) {
                for (const item of cartItems) {
                    const productId = item.productId || item.id
                    const quantity = parseInt(item.quantity || 1)
                    const price = parseFloat(item.price || 0)

                    if (!productId) {
                        console.warn("⚠️ Skipping item without productId")
                        continue
                    }

                    const totalPrice = price * quantity

                    // Tìm SizeID nếu có, nếu không dùng size mặc định
                    let sizeID = 1 // Default to first size
                    if (item.size) {
                        try {
                            const [sizes] = await connection.query(
                                `SELECT ID FROM SizeProduct WHERE SizeName = ? LIMIT 1`,
                                [item.size]
                            )
                            if (sizes.length > 0) {
                                sizeID = sizes[0].ID
                            }
                        } catch (sizeErr) {
                            console.warn(
                                `⚠️ Could not find size ${item.size}, using default`
                            )
                        }
                    }

                    // Lấy ColorProduct ID - nếu không có, lấy default color của product
                    let colorID = 1 // Default
                    try {
                        const [colors] = await connection.query(
                            `SELECT ID FROM ColorProduct WHERE ProductID = ? LIMIT 1`,
                            [productId]
                        )
                        if (colors.length > 0) {
                            colorID = colors[0].ID
                        }
                    } catch (colorErr) {
                        console.warn(
                            `⚠️ Could not find color for product ${productId}, using default`
                        )
                    }

                    // Insert CartItem
                    try {
                        await connection.query(
                            `INSERT INTO CartItem (CartID, SizeID, ColorID, ProductID, Volume, UnitPrice, TotalPrice)
                             VALUES (?, ?, ?, ?, ?, ?, ?)`,
                            [
                                cartID,
                                sizeID,
                                colorID,
                                productId,
                                quantity,
                                price,
                                totalPrice,
                            ]
                        )
                        console.log(`✓ Added CartItem for Product ${productId}`)
                    } catch (insertErr) {
                        console.error(
                            `Error inserting CartItem for product ${productId}:`,
                            insertErr.message
                        )
                        // Continue to next item
                    }
                }
            }

            console.log(`✓ Cart and CartItems created successfully`)
            return cartID
        } catch (error) {
            console.error("Error in createCartFromItems:", error)
            throw error
        } finally {
            if (connection) {
                connection.release()
            }
        }
    }
}

module.exports = Invoice
