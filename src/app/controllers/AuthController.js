// src/app/controllers/AuthController.js
const AuthSite = require("../models/AuthSite")

class AuthController {
    // ===== [GET] /auth - Trang chủ auth (index) =====
    async index(req, res) {
        res.render("auth/index", { layout: "Auth" })
    }

    // ===== [GET] /auth/register - Hiển thị trang đăng ký =====
    async register(req, res) {
        res.render("auth/register", { layout: "Auth" })
    }

    // ===== [POST] /auth/register - Xử lý đăng ký =====
    async registerPost(req, res) {
        try {
            console.log("📝 Register request received:", req.body)

            const result = await AuthSite.register(req.body)

            console.log("✅ Registration successful:", result.data.user.id)

            // ✅ TỰ ĐỘNG LOGIN SAU KHI ĐĂNG KÝ THÀNH CÔNG
            req.session.userId = result.data.user.id
            req.session.userName = result.data.account.userName
            req.session.userEmail = result.data.user.email
            req.session.userFullName = result.data.user.fullName
            req.session.userAvt = result.data.user.avt

            console.log("✅ Session created for user:", req.session.userId)

            res.status(201).json({
                success: true,
                message: "Registration successful! Redirecting...",
                redirect: "/", // Redirect về trang chủ
            })
        } catch (error) {
            console.error("❌ Register error:", error)
            console.error("Error details:", {
                message: error.message,
                code: error.code,
                sqlMessage: error.sqlMessage,
            })

            res.status(400).json({
                success: false,
                message: error.message || "Registration failed",
            })
        }
    }

    // ===== [GET] /auth/login - Hiển thị trang đăng nhập =====
    async login(req, res) {
        res.render("auth/login", { layout: "Auth" })
    }

    // ===== [POST] /auth/login - Xử lý đăng nhập =====
    async loginPost(req, res) {
        try {
            // ✅ FIX: Đổi từ username sang email
            const { email, password } = req.body

            console.log("🔐 Login attempt:", email)

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: "Email and password are required",
                })
            }

            // 1. Kiểm tra admin (vẫn dùng username cho admin)
            const admin = await AuthSite.loginAdmin(email, password)
            if (admin) {
                req.session.adminId = admin.ID
                req.session.adminName = admin.AdminName
                req.session.adminRole = admin.Roles

                console.log("✅ Admin login successful:", admin.ID)

                return res.json({
                    success: true,
                    message: "Admin login successful",
                    redirect: "/admin",
                })
            }

            // 2. Kiểm tra user - ✅ Dùng email thay vì username
            const userResult = await AuthSite.loginUser(email, password)

            req.session.userId = userResult.data.user.id
            req.session.userName = userResult.data.account.userName
            req.session.userEmail = userResult.data.user.email
            req.session.userFullName = userResult.data.user.fullName
            req.session.userAvt = userResult.data.user.avt

            console.log("✅ User login successful:", userResult.data.user.id)

            // ✅ Cập nhật LastLogin
            await AuthSite.updateLastLogin(userResult.data.user.id)

            // ✅ Redirect về returnTo nếu có, không thì về trang chủ
            const redirectUrl = req.session.returnTo || "/"
            delete req.session.returnTo

            res.json({
                success: true,
                message: userResult.message,
                redirect: redirectUrl,
            })
        } catch (error) {
            console.error("❌ Login error:", error)
            res.status(401).json({
                success: false,
                message: error.message || "Login failed",
            })
        }
    }

    // ===== [GET] /auth/logout - Đăng xuất =====
    logout(req, res) {
        const userId = req.session.userId

        req.session.destroy((err) => {
            if (err) {
                console.error("❌ Logout error:", err)
            } else {
                console.log("✅ User logged out:", userId)
            }
            res.redirect("/auth")
        })
    }

    // ===== [GET] /auth/profile - Xem profile =====
    async profile(req, res) {
        try {
            if (!req.session.userId) {
                return res.redirect("/auth")
            }

            const user = await AuthSite.getUserById(req.session.userId)
            const account = await AuthSite.getAccountByUserId(
                req.session.userId
            )

            if (!user) {
                return res.redirect("/auth")
            }

            // ✅ FIX: Render đúng view, không có folder auth/
            res.render("profile", {
                layout: "main", // hoặc layout phù hợp
                user: user,
                account: account,
            })
        } catch (error) {
            console.error("❌ Get profile error:", error)
            res.status(500).render("error", {
                layout: "main",
                message: "Failed to load profile",
            })
        }
    }

    // ===== [POST] /auth/profile/update - Cập nhật profile =====
    async updateProfile(req, res) {
        try {
            if (!req.session.userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                })
            }

            const updatedUser = await AuthSite.updateProfile(
                req.session.userId,
                req.body
            )

            // Update session info
            req.session.userFullName = updatedUser.fullName
            req.session.userEmail = updatedUser.email

            res.json({
                success: true,
                message: "Profile updated successfully",
                data: updatedUser,
            })
        } catch (error) {
            console.error("❌ Update profile error:", error)
            res.status(400).json({
                success: false,
                message: error.message || "Update failed",
            })
        }
    }

    // ===== [POST] /auth/change-password - Đổi mật khẩu =====
    async changePassword(req, res) {
        try {
            if (!req.session.userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                })
            }

            const { oldPassword, newPassword, confirmPassword } = req.body

            if (!oldPassword || !newPassword || !confirmPassword) {
                return res.status(400).json({
                    success: false,
                    message: "All password fields are required",
                })
            }

            if (newPassword !== confirmPassword) {
                return res.status(400).json({
                    success: false,
                    message: "New passwords do not match",
                })
            }

            const result = await AuthSite.changePassword(
                req.session.userId,
                oldPassword,
                newPassword
            )

            res.json(result)
        } catch (error) {
            console.error("❌ Change password error:", error)
            res.status(400).json({
                success: false,
                message: error.message || "Change password failed",
            })
        }
    }

    // ===== [POST] /auth/update-username - Đổi username =====
    async updateUsername(req, res) {
        try {
            if (!req.session.userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                })
            }

            const { newUsername } = req.body

            if (!newUsername) {
                return res.status(400).json({
                    success: false,
                    message: "New username is required",
                })
            }

            const result = await AuthSite.updateUsername(
                req.session.userId,
                newUsername
            )

            // Update session
            req.session.userName = newUsername

            res.json(result)
        } catch (error) {
            console.error("❌ Update username error:", error)
            res.status(400).json({
                success: false,
                message: error.message || "Update username failed",
            })
        }
    }
}

module.exports = new AuthController()
