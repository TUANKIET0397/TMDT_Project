// src/app/controllers/AuthController.js
const Auth = require("../models/Auth")

class AuthController {
    async index(req, res) {
        res.render("auth/index")
    }

    async register(req, res) {
        res.render("auth/register")
    }
}

module.exports = new AuthController()
