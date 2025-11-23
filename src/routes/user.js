const express = require('express')
const router = express.Router()
const ProfileController = require('../app/controllers/UserController')

// profile page (GET)
router.get('/profile', ProfileController.show.bind(ProfileController))

// profile update (POST)
router.post('/profile/update', ProfileController.update.bind(ProfileController))

module.exports = router