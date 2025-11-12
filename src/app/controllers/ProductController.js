// src/app/controllers/ProductController.js
const Product = require("../models/Product")

class ProductController {
    async index(req, res) {
        res.render("products/index")
    }

    async detail(req, res) {
        res.render("products/detail")
    }
}

module.exports = new ProductController()
