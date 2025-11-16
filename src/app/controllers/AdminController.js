// src/app/controllers/AuthController.js
const Admin = require("../models/Admin")

class AdminController {
    async index(req, res) {
        res.render("admin/index", { layout: "admin" })
    }

    async register(req, res) {
        res.render("admin/register", { layout: "admin" })
    }

    async users(req, res) {
        res.render("admin/users", { layout: "admin" })
    }
    async show(req, res) {
        res.render("admin/show", { layout: "admin" })
    }
    async invoice(req, res) {
        res.render("admin/invoice", { layout: "admin" })
    }
    async create(req, res) {
        res.render("admin/create", { layout: "admin" })
    }
    async chat(req, res) {
        res.render("admin/chat", { layout: "admin" })
    }
}

module.exports = new AdminController()
