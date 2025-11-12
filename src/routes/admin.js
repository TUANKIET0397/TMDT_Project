const express = require("express")
const router = express.Router()

const adminController = require("../app/controllers/AdminController")

// GET /adminSite
router.get("/users", adminController.users)
router.get("/show", adminController.show)
router.get("/invoice", adminController.invoice)
router.get("/create", adminController.create)
router.get("/chat", adminController.chat)
router.get("/", adminController.index)

module.exports = router
