const express = require("express")
const router = express.Router()

const siteController = require("../app/controllers/SiteController")

// GET /site
router.get("/checkout", siteController.checkout) //lúc làm thêm post
router.post("/payment", siteController.payment)
router.get("/profile", siteController.profile) //lúc làm thêm post
router.get("/about", siteController.about)
router.get("/", (req, res, next) => {
    siteController.index(req, res, next)
})

module.exports = router
