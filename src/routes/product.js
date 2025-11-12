const express = require("express")
const router = express.Router()

const productController = require("../app/controllers/ProductController")

// GET /ProductSite

router.get("/detail", productController.detail)

router.get("/", productController.index)

module.exports = router
