const db = require("../../config/db")

class User {
  static async getUserById(userId) {
    const [rows] = await db.query(
      `SELECT ID, FirstName, LastName, BirthDate, Gender, PhoneNumber, Email, Avt, Address, RegionID
       FROM Users WHERE ID = ? LIMIT 1`,
      [userId]
    )
    return rows[0] || null
  }

  static async getUserRegions() {
    const [rows] = await db.query(
      `SELECT ID, RegionName FROM Region`
    )
    return rows
  }

  static async updateUser(userId, data) {
    try {
      const fields = []
      const params = []

      // chỉ cập nhật những trường cho phép (không cập nhật ID và UserName)
      const allowed = ['FirstName','LastName','BirthDate','Gender','PhoneNumber','Email','Avt','Address','RegionID']
      for (const k of allowed) {
        if (Object.prototype.hasOwnProperty.call(data, k)) {
          fields.push(`${k} = ?`)
          params.push(data[k] === '' ? null : data[k])
        }
      }

      if (fields.length === 0) return false

      params.push(userId)
      const sql = `UPDATE Users SET ${fields.join(', ')} WHERE ID = ?`
      const [result] = await db.query(sql, params)
      return result && result.affectedRows > 0
    } catch (err) {
      console.error('User.updateUser error:', err)
      throw err
    }
  }

   static async getUserOrders(userId) {
    // Lấy invoices (mỗi invoice = 1 order). Nếu invoice.CartID != NULL => load items.
    const [invoices] = await db.query(
      `SELECT ID, DateCreated, QuantityTypes, StatusID,
              COALESCE(Payment,'Unpaid') AS Payment,
              COALESCE(States,'Done') AS States,
              COALESCE(TotalCost,0.00) AS TotalCost,
              CartID
       FROM Invoice
       WHERE UserID = ?
       ORDER BY DateCreated DESC`,
      [userId]
    )

    const orders = []
    for (const inv of invoices) {
      let items = []
      if (inv.CartID) {
        const [rows] = await db.query(
          `
          SELECT ci.ID as CartItemID, ci.Volume, ci.UnitPrice, ci.TotalPrice,
                 p.ID as ProductID, p.ProductName,
                 (SELECT i.ImgPath FROM ProductImg pi JOIN Image i ON pi.ImgID = i.ID WHERE pi.ProductID = p.ID LIMIT 1) as ImgPath
          FROM CartItem ci
          JOIN Product p ON ci.ProductID = p.ID
          WHERE ci.CartID = ?
          `,
          [inv.CartID]
        )

        items = rows.map(it => ({
          id: it.CartItemID,
          productId: it.ProductID,
          productName: it.ProductName,
          qty: it.Volume,
          unitPrice: Number(it.UnitPrice || 0),
          totalPrice: Number(it.TotalPrice || (it.UnitPrice || 0) * (it.Volume || 0)),
          img: it.ImgPath ? (`/uploads/products/${String(it.ImgPath).trim()}`) : '/img/default.jpg'
        }))
      }

      // nếu không có items vẫn push invoice (không ép phải có Cart)
      orders.push({
        id: inv.ID,
        createdAt: (new Date(inv.DateCreated)).toLocaleString(),
        payment: inv.Payment,
        states: inv.States,
        totalCost: Number(inv.TotalCost) || 0,
        quantityTypes: Number(inv.QuantityTypes) || (items.length || 0),
        items
      })
    }

    return orders
  }
}

module.exports = User
