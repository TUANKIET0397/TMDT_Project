// src/app/models/Product.js
const db = require("../../config/db")

class ProductSite {

    // LẤY TẤT CẢ PRODUCT
    static async all() {
        const connection = await db.connect()
        const [rows] = await connection.execute("SELECT * FROM Product")
        return rows
    }

    // THÊM PRODUCT MỚI (HÀM BẠN CẦN)
    static async addProduct(data) {
        const {
            ProductName,
            Descriptions,
            TypeID,
            Price,
            Images = [],
            Colors = [],
            Sizes = [],
            Stock = []
        } = data

        const connection = await db.connect()
        await connection.beginTransaction()

        try {
            // 1. Insert Product (Bắt buộc phải tuần tự để lấy productId)
            const [productResult] = await connection.execute(
                `INSERT INTO Product (ProductName, Descriptions, TypeID)
                VALUES (?, ?, ?)`,
                [ProductName, Descriptions, TypeID]
            )
            const productId = productResult.insertId

            const allConcurrentPromises = []

            allConcurrentPromises.push(
                connection.execute(
                    `INSERT INTO Price (ProductID, Price)
                    VALUES (?, ?)`,
                    [productId, Price]
                )
            )

            const imageAndLinkPromises = []
            for (let img of Images) {
                const singleImagePromise = connection.execute(
                    `INSERT INTO Image (ImgPath) VALUES (?)`,
                    [img]
                ).then(([imgRes]) => {
                    const imgID = imgRes.insertId
                    return connection.execute(
                        `INSERT INTO ProductImg (ProductID, ImgID)
                        VALUES (?, ?)`,
                        [productId, imgID]
                    ).then(() => imgID) 
                })
                imageAndLinkPromises.push(singleImagePromise)
            }
            
            const imageIDsPromise = Promise.all(imageAndLinkPromises)
            allConcurrentPromises.push(imageIDsPromise)

            const colorAndQuantityPromise = imageIDsPromise.then((imageIDs) => {
                const colorPromises = []
                for (let i = 0; i < Colors.length; i++) {
                    const color = Colors[i]
                    const imgID = imageIDs[color.ImgIndex] || null
                    
                    const colorInsertPromise = connection.execute(
                        `INSERT INTO ColorProduct (ProductID, ImgID)
                        VALUES (?, ?)`,
                        [productId, imgID]
                    ).then(([colorRes]) => colorRes.insertId) 
                    
                    colorPromises.push(colorInsertPromise)
                }
                
                return Promise.all(colorPromises).then((colorIDs) => {
                    const quantityPromises = []
                    for (let st of Stock) {
                        // Tạo promise chèn số lượng
                        const quantityInsertPromise = connection.execute(
                            `INSERT INTO Quantity (QuantityValue, SizeID, ColorID, ProductID)
                            VALUES (?, ?, ?, ?)`,
                            [
                                st.Quantity,
                                st.SizeID,
                                colorIDs[st.ColorIndex],
                                productId
                            ]
                        )
                        quantityPromises.push(quantityInsertPromise)
                    }
                    return Promise.all(quantityPromises)
                })
            })

            allConcurrentPromises.push(colorAndQuantityPromise)

            await Promise.all(allConcurrentPromises)

            // Commit Transaction
            await connection.commit()

            return {
                message: "Tạo sản phẩm thành công",
                productId
            }

        } catch (err) {
            // Rollback nếu có lỗi
            await connection.rollback()
            throw err
        }
    }
}

module.exports = ProductSite
