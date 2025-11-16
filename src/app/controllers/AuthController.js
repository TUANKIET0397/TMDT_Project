// src/app/controllers/AuthController.js
const Auth = require("../models/Auth")

class AuthController {
    async index(req, res) {
        res.render("auth/index", { layout: "Auth" })
    }

    async register(req, res) {
        res.render("auth/register", { layout: "Auth" })
    }
}

module.exports = new AuthController()
