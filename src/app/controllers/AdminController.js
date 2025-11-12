// src/app/controllers/AuthController.js
const Admin = require("../models/Admin")

class AdminController {
    async index(req, res) {
        res.render("admin/index")
    }

    async register(req, res) {
        res.render("admin/register")
    }

    async users(req, res) {
        res.render("admin/users")
    }
    async show(req, res) {
        res.render("admin/show")
    }
    async invoice(req, res) {
        res.render("admin/invoice")
    }
    async create(req, res) {
        res.render("admin/create")
    }
    async chat(req, res) {
        res.render("admin/chat")
    }
}

module.exports = new AdminController()
