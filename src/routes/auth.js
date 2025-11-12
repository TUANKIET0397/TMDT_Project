const express = require("express")
const router = express.Router()

const authController = require("../app/controllers/AuthController")

// GET /authSite
router.get("/register", authController.register)
router.get("/", authController.index)

module.exports = router
