// src/middlewares/requireAuth.js

/**
 * Middleware: Bắt buộc user phải đăng nhập
 */
function requireAuth(req, res, next) {
    // ✅ Check cả userId (từ AuthController) và user (nếu có)
    if (!req.session || (!req.session.userId && !req.session.user)) {
        console.warn("⚠️ Unauthorized access attempt to:", req.originalUrl)

        // Lưu URL người dùng muốn truy cập để redirect sau khi login
        if (req.session) {
            const isGetRequest =
                req.method && req.method.toUpperCase() === "GET"
            req.session.returnTo = isGetRequest ? req.originalUrl : "/checkout"
        }

        // ✅ Redirect về đúng route /auth (không phải /auth/login)
        return res.redirect("/auth?error=login_required")
    }

    // User đã đăng nhập
    next()
}

/**
 * Middleware: Kiểm tra thông tin user có đầy đủ không
 */
function requireCompleteProfile(req, res, next) {
    // ✅ Lấy userId từ session
    const userId = req.session.userId

    if (!userId) {
        return res.redirect("/auth?error=login_required")
    }

    // ✅ Load thông tin user từ database để kiểm tra
    const AuthSite = require("../app/models/AuthSite")

    AuthSite.getUserById(userId)
        .then((user) => {
            if (!user) {
                return res.redirect("/auth?error=user_not_found")
            }

            // Kiểm tra các trường bắt buộc (hỗ trợ cả FirstName và firstName ...)
            const getFieldValue = (...keys) => {
                for (const key of keys) {
                    const value = user[key]
                    if (
                        value !== undefined &&
                        value !== null &&
                        value.toString().trim() !== ""
                    ) {
                        return value
                    }
                }
                return null
            }

            const requiredFields = {
                firstName: getFieldValue("FirstName", "firstName"),
                lastName: getFieldValue("LastName", "lastName"),
                email: getFieldValue("Email", "email"),
                phoneNumber: getFieldValue("PhoneNumber", "phoneNumber"),
                address: getFieldValue("Address", "address"),
                region: getFieldValue("RegionID", "Region", "region"),
            }

            const missingFields = []

            for (const [field, value] of Object.entries(requiredFields)) {
                if (!value || value.toString().trim() === "") {
                    missingFields.push(field)
                }
            }

            if (missingFields.length > 0) {
                console.warn(
                    `⚠️ User ${userId} missing required fields:`,
                    missingFields
                )

                const query = new URLSearchParams({
                    next: req.originalUrl || "/checkout",
                    missing: missingFields.join(","),
                    notice: "Vui lòng hoàn tất hồ sơ trước khi tiếp tục thanh toán.",
                }).toString()

                return res.redirect(`/profile?${query}`)
            }

            // ✅ Thông tin đầy đủ, lưu vào req để dùng trong controller
            req.user = user
            next()
        })
        .catch((error) => {
            console.error("Error checking user profile:", error)
            res.status(500).render("error", {
                layout: "payment",
                message: "System error occurred",
                error: error.message,
                retryUrl: "/",
            })
        })
}

module.exports = {
    requireAuth,
    requireCompleteProfile,
}
