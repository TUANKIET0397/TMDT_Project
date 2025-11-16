// src/app/controllers/ProductController.js
const Product = require("../models/Product")

class ProductController {
    async index(req, res) {
        res.render("products/index")
    }

    async detail(req, res) {
        res.render("products/detail")
    }

    async t_shirts(req, res) {
        res.render("products/t_shirts")
    }

    async sweatshirts(req, res) {
        res.render("products/sweatshirts")
    }

    async shoes(req, res) {
        res.render("products/shoes")
    }

    async shirts(req, res) {
        res.render("products/shirts")
    }

    async pants(req, res) {
        res.render("products/pants")
    }

    async outerwear(req, res) {
        res.render("products/outerwear")
    }

    async knitwear(req, res) {
        res.render("products/knitwear")
    }
}

module.exports = new ProductController()
