const express = require("express")
const productController = require('../app/controllers/ProductController');

const router = express.Router();

router.get('/', productController.index);
router.get('/knitwear', productController.knitwear);
router.get('/outerwear', productController.outerwear);
router.get('/pants', productController.pants);
router.get('/shirts', productController.shirts);
router.get('/shoes', productController.shoes);
router.get('/sweatshirts', productController.sweatshirts);
router.get('/t_shirts', productController.tShirts);
router.get('/detail/:id', productController.detail);

module.exports = router;