const express = require("express")
const router = express.Router()

const productController = require("../app/controllers/ProductController")

// GET /ProductSite

router.get("/t_shirts", productController.t_shirts)
router.get("/sweatshirts", productController.sweatshirts)
router.get("/shoes", productController.shoes)
router.get("/shirts", productController.shirts)
router.get("/pants", productController.pants)
router.get("/outerwear", productController.outerwear)
router.get("/knitwear", productController.knitwear)
router.get("/detail", productController.detail)

router.get("/", productController.index)

router.post("/product/add", productController.create)

module.exports = router

