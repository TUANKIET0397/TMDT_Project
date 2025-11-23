const User = require("../models/User")

class ProfileController {
  // GET /profile
  async show(req, res) {
    try {
      // lấy user id từ session / req.user; nếu test local dùng 1
      const userId = (req.session && req.session.userId) || (req.user && req.user.ID) || 1

      const user = await User.getUserById(userId)
      if (!user) return res.status(404).render('profile', { user: null, orders: [] })

      const orders = await User.getUserOrders(userId)

      return res.render('profile', { user, orders })
    } catch (err) {
      console.error('ProfileController.show error:', err)
      return res.status(500).send('Error loading profile')
    }
  }

  // POST /profile/update
  async update(req, res) {
    try {
      // lấy user id từ session / req.user
      const userId = (req.session && req.session.userId) || (req.user && req.user.ID)
      if (!userId) return res.status(401).redirect('/login')

      // lấy dữ liệu từ form — chỉ lấy các trường cho phép
      const payload = {
        FirstName: req.body.FirstName,
        LastName: req.body.LastName,
        BirthDate: req.body.BirthDate,
        Gender: req.body.Gender,
        PhoneNumber: req.body.PhoneNumber,
        Email: req.body.Email,
        Address: req.body.Address,
        Region: req.body.Region
      }

      await User.updateUser(userId, payload)
      return res.redirect('/profile')
    } catch (err) {
      console.error('ProfileController.update error:', err)
      return res.status(500).send('Update failed')
    }
  }
}

module.exports = new ProfileController()
