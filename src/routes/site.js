const express = require("express")
const router = express.Router()

const siteController = require("../app/controllers/SiteController")

// GET /site
router.get("/checkout", siteController.checkout) //lúc làm đổi post
router.get("/profile", siteController.profile) //lúc làm đổi post
router.get("/about", siteController.about)
router.get("/", siteController.index)

module.exports = router
