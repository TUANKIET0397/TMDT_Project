// src/app/controllers/SiteController.js
const Site = require("../models/Site")

class SiteController {
    async index(req, res, next) {
        try {
            const users = await Site.all() // kết hợp hai mảng dữ liệu
            res.render("site", { users }) // truyền dữ liệu vào view
        } catch (err) {
            next(err)
        }
    }

    async about(req, res) {
        res.render("about")
    }

    async profile(req, res) {
        res.render("profile")
    }

    async checkout(req, res) {
        res.render("checkout")
    }
}

module.exports = new SiteController()
