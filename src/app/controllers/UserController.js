// ...existing code...
const User = require("../models/User")

class ProfileController {
  // GET /profile
  async show(req, res) {
    try {
      const userId = (req.session && req.session.userId) || (req.user && req.user.ID)
      if (!userId) return res.status(401).redirect('/auth')

      const user = await User.getUserById(userId)
      if (!user) return res.status(404).render('profile', { user: null, orders: [] })

      // format BirthDate for <input type="date">
      if (user.BirthDate) {
        const d = new Date(user.BirthDate)
        user.BirthDate = isNaN(d.getTime()) ? '' : d.toISOString().slice(0,10)
      } else {
        user.BirthDate = ''
      }

      // load all regions (63 tỉnh) and mark selected one
      const regions = await User.getUserRegions()
      const matched = regions.find(r => String(r.ID) === String(user.RegionID))
      user.RegionName = matched ? matched.RegionName : ''
      // add selected flag so template dễ render
      const regionsWithFlag = regions.map(r => ({
        ...r,
        selected: String(r.ID) === String(user.RegionID)
      }))

      const orders = await User.getUserOrders(userId)

      return res.render('profile', { user, orders, regions: regionsWithFlag })
    } catch (err) {
      console.error('ProfileController.show error:', err)
      return res.status(500).send('Error loading profile')
    }
  }

  // POST /profile/update
  async update(req, res) {
    try {
      const userId = (req.session && req.session.userId) || (req.user && req.user.ID)
      if (!userId) return res.status(401).redirect('/login')

      const payload = {
        FirstName: req.body.FirstName,
        LastName: req.body.LastName,
        BirthDate: req.body.BirthDate,
        Gender: req.body.Gender,
        PhoneNumber: req.body.PhoneNumber,
        Email: req.body.Email,
        Address: req.body.Address,
        RegionID: req.body.RegionID // <-- gửi RegionID từ select
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
// ...existing code...