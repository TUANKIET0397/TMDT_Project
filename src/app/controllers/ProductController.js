// src/app/controllers/ProductController.js
const Product = require("../models/Product")

class ProductController {
    async index(req, res) {
        res.render("products/index")
    }

    async detail(req, res) {
        res.render("products/detail")
    }

    // TẠO SẢN PHẨM MỚI
    async create(req, res) {
        try {
            // Nhận data từ client (body)
            const newProduct = await Product.addProduct(req.body)

            return res.status(201).json({
                status: "success",
                message: "Thêm sản phẩm thành công!",
                product: newProduct
            })
        } catch (error) {
            return res.status(500).json({
                status: "error",
                message: error.message
            })
        }
    }
}

module.exports = new ProductController()
