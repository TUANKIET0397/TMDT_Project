// src/middlewares/requireAuth.js

/**
 * Middleware: Bắt buộc user phải đăng nhập
 */
function requireAuth(req, res, next) {
    // ✅ Check cả userId (từ AuthController) và user (nếu có)
    if (!req.session || (!req.session.userId && !req.session.user)) {
        console.warn("⚠️ Unauthorized access attempt to:", req.originalUrl)

        // Lưu URL người dùng muốn truy cập để redirect sau khi login
        req.session.returnTo = req.originalUrl

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

            // Kiểm tra các trường bắt buộc
            const requiredFields = {
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phoneNumber: user.phoneNumber,
                address: user.address,
                region: user.region,
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

                // Redirect về trang profile để bổ sung thông tin
                return res.redirect(
                    `/auth/profile?error=incomplete_profile&missing=${missingFields.join(
                        ","
                    )}`
                )
            }

            // ✅ Thông tin đầy đủ, lưu vào req để dùng trong controller
            req.user = user
            next()
        })
        .catch((error) => {
            console.error("Error checking user profile:", error)
            res.redirect("/auth?error=system_error")
        })
}

module.exports = {
    requireAuth,
    requireCompleteProfile,
}

// src/middlewares/requireAuth.js

/**
 * Middleware: Bắt buộc user phải đăng nhập
 */
// function requireAuth(req, res, next) {
//     // ✅ Check cả userId (từ AuthController) và user (nếu có)
//     if (!req.session || (!req.session.userId && !req.session.user)) {
//         console.warn("⚠️ Unauthorized access attempt to:", req.originalUrl)

//         // Lưu URL người dùng muốn truy cập để redirect sau khi login
//         req.session.returnTo = req.originalUrl

//         // ✅ Redirect về đúng route /auth (không phải /auth/login)
//         return res.redirect("/auth?error=login_required")
//     }

//     // User đã đăng nhập
//     next()
// }

// /**
//  * Middleware: Kiểm tra thông tin user có đầy đủ không
//  */
// function requireCompleteProfile(req, res, next) {
//     // ✅ Lấy userId từ session
//     const userId = req.session.userId

//     if (!userId) {
//         return res.redirect("/auth?error=login_required")
//     }

//     // ✅ Load thông tin user từ database để kiểm tra
//     const AuthSite = require("../app/models/AuthSite")

//     AuthSite.getUserById(userId)
//         .then((user) => {
//             if (!user) {
//                 return res.redirect("/auth?error=user_not_found")
//             }

//             // Kiểm tra các trường bắt buộc
//             const requiredFields = {
//                 firstName: user.firstName,
//                 lastName: user.lastName,
//                 email: user.email,
//                 phoneNumber: user.phoneNumber,
//                 address: user.address,
//                 region: user.region,
//             }

//             const missingFields = []

//             for (const [field, value] of Object.entries(requiredFields)) {
//                 if (!value || value.toString().trim() === "") {
//                     missingFields.push(field)
//                 }
//             }

//             if (missingFields.length > 0) {
//                 console.warn(
//                     `⚠️ User ${userId} missing required fields:`,
//                     missingFields
//                 )

//                 // ✅ Hiển thị lỗi thay vì redirect về profile
//                 return res.status(400).render("error", {
//                     layout: "payment",
//                     message: "Please complete your profile before checkout",
//                     error: `Missing fields: ${missingFields.join(", ")}`,
//                     retryUrl: "/auth/profile",
//                 })
//             }

//             // ✅ Thông tin đầy đủ, lưu vào req để dùng trong controller
//             req.user = user
//             next()
//         })
//         .catch((error) => {
//             console.error("Error checking user profile:", error)
//             res.redirect("/auth?error=system_error")
//         })
// }

// module.exports = {
//     requireAuth,
//     requireCompleteProfile,
// }
