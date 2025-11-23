// src/app/controllers/SiteController.js
const Site = require("../models/Site")
const { createPayment } = require("../../config/momo")
const Transaction = require("../models/Transaction")
const Invoice = require("../models/Invoice")
const AuthSite = require("../models/AuthSite") // ✅ Thêm import

class SiteController {
    async index(req, res, next) {
        try {
            const [
                categories,
                newProducts,
                bestSellers,
                featuredProducts,
                sizes,
                statistics,
                sliderImages,
            ] = await Promise.all([
                Site.getAllCategories(),
                Site.getNewProducts(14),
                Site.getBestSellerProducts(14),
                Site.getFeaturedProducts(3),
                Site.getAllSizes(),
                Site.getStatistics(),
                Site.getSliderImages(),
            ])

            res.render("site", {
                title: "Home - Shoppmall",
                layout: "main",
                categories: categories,
                newProducts: newProducts,
                bestSellers: bestSellers,
                featuredProducts: featuredProducts,
                sizes: sizes,
                sliderImages: sliderImages,
                totalProducts: statistics.TotalProducts,
                minPrice: statistics.MinPrice,
                maxPrice: statistics.MaxPrice,
                user: req.session?.userId
                    ? await AuthSite.getUserById(req.session.userId)
                    : null,
            })
        } catch (error) {
            console.error("Error in SiteController.index:", error)
            res.status(500).send("Internal Server Error")
        }
    }

    async about(req, res) {
        res.render("about", {
            layout: "main",
            user: req.session?.userId
                ? await AuthSite.getUserById(req.session.userId)
                : null,
        })
    }

    // ✅ FIX: Profile cần load user data từ database
    async profile(req, res) {
        try {
            // requireAuth middleware đã check userId rồi
            const userId = req.session.userId

            if (!userId) {
                return res.redirect("/auth?error=login_required")
            }

            // Load user và account info
            const user = await AuthSite.getUserById(userId)
            const account = await AuthSite.getAccountByUserId(userId)

            if (!user) {
                return res.redirect("/auth?error=user_not_found")
            }

            res.render("profile", {
                layout: "main",
                user: user,
                account: account,
            })
        } catch (error) {
            console.error("Error in profile:", error)
            res.status(500).render("error", {
                layout: "main",
                message: "Failed to load profile",
                error: error.message,
                retryUrl: "/",
            })
        }
    }

    // ✅ FIX: Checkout - dùng req.user từ middleware
    async checkout(req, res) {
        try {
            console.log("=== GET /checkout ===")
            console.log("req.user:", req.user)

            // ✅ Middleware requireCompleteProfile đã set req.user
            res.render("checkout", {
                layout: "payment",
                user: req.user, // ✅ Dùng req.user từ middleware
            })
        } catch (error) {
            console.error("Error in checkout:", error)
            res.status(500).render("error", {
                layout: "payment",
                message: "Failed to load checkout page",
                error: error.message,
                retryUrl: "/",
            })
        }
    }

    async payment(req, res) {
        try {
            const { paymentType, amount, cartData } = req.body

            console.log("=== POST /payment ===")
            console.log("paymentType:", paymentType)
            console.log("amount:", amount)
            console.log("req.user:", req.user)

            // ✅ Validate cartData
            if (!cartData) {
                return res.status(400).render("error", {
                    layout: "payment",
                    message: "Cart is empty",
                    error: "No cart data provided",
                    retryUrl: "/",
                })
            }

            // Parse cartData
            let items = []
            try {
                items = JSON.parse(cartData)
            } catch (err) {
                console.error("Invalid cartData JSON:", err)
                return res.status(400).render("error", {
                    layout: "payment",
                    message: "Invalid cart data",
                    error: "Failed to parse cart data",
                    retryUrl: "/checkout",
                })
            }

            // ✅ Validate cart có items
            if (!items || items.length === 0) {
                return res.status(400).render("error", {
                    layout: "payment",
                    message: "Cart is empty",
                    error: "Please add items to cart before checkout",
                    retryUrl: "/",
                })
            }

            // Normalize cart items
            const cartItems = items.map((it) => ({
                name: it.name || it.ProductName || "",
                price: parseFloat(it.price || it.Price || 0) || 0,
                img: it.img || it.ImgPath || "/img/default.jpg",
                quantity: parseInt(it.quantity || it.qty || 1) || 1,
                size: it.size || it.Size || null,
                productId: it.id || it.ID || null,
            }))

            const subtotal = cartItems.reduce(
                (s, it) => s + it.price * it.quantity,
                0
            )

            console.log("Cart items:", cartItems.length)
            console.log("Subtotal:", subtotal)

            // ✅ If MoMo payment is selected
            if (paymentType === "momo" && amount) {
                try {
                    // ✅ Lấy UserID từ req.user (middleware đã load)
                    const userId = req.user?.id || req.session.userId

                    if (!userId) {
                        throw new Error("User not authenticated. Please login.")
                    }

                    console.log(`✓ User authenticated: UserID=${userId}`)

                    // 2. Tạo Invoice với UserID
                    const invoiceId = await Invoice.createPendingInvoice({
                        UserID: userId,
                        TotalAmount: subtotal,
                        Status: "pending",
                    })

                    console.log("✓ Created Invoice ID:", invoiceId)

                    // 3. Tạo orderId và lưu vào session
                    const orderId = `ORDER_${Date.now()}_${Math.random()
                        .toString(36)
                        .substr(2, 9)}`
                    const parsedAmount = parseInt(amount)

                    // Lưu thông tin vào session để sử dụng sau
                    req.session.pendingPayment = {
                        orderId,
                        invoiceId,
                        amount: parsedAmount,
                        cartItems,
                    }

                    console.log("Creating MoMo payment...")
                    console.log("orderId:", orderId)
                    console.log("invoiceId:", invoiceId)
                    console.log("amount:", parsedAmount)

                    // 4. Tạo URLs
                    const returnUrl = `${req.protocol}://${req.get(
                        "host"
                    )}/return`
                    const ipnUrl = `${req.protocol}://${req.get("host")}/ipn`

                    console.log("returnUrl:", returnUrl)
                    console.log("ipnUrl:", ipnUrl)

                    // 5. Gọi MoMo API
                    const paymentResult = await createPayment(
                        orderId,
                        parsedAmount,
                        returnUrl,
                        ipnUrl
                    )

                    console.log("MoMo response:", paymentResult)

                    // 6. Kiểm tra kết quả
                    if (paymentResult.payUrl) {
                        console.log(
                            "✓ Redirecting to MoMo payUrl:",
                            paymentResult.payUrl
                        )
                        return res.redirect(paymentResult.payUrl)
                    } else {
                        console.error("MoMo payment failed:", paymentResult)
                        return res.status(400).render("error", {
                            layout: "payment",
                            message:
                                "Không thể kết nối với cổng thanh toán MoMo.",
                            error:
                                paymentResult.message ||
                                "Failed to create payment",
                            retryUrl: "/checkout",
                        })
                    }
                } catch (momoError) {
                    console.error("MoMo payment error:", momoError.message)
                    console.error("Error details:", momoError)
                    return res.status(500).render("error", {
                        layout: "payment",
                        message: "Lỗi khi xử lý thanh toán MoMo.",
                        error: momoError.message,
                        retryUrl: "/checkout",
                    })
                }
            }

            // ✅ For COD or other payment methods
            const itemCount = cartItems.reduce((c, it) => c + it.quantity, 0)
            const total = subtotal

            return res.render("checkout", {
                layout: "payment",
                cartItems,
                subtotal: subtotal.toFixed(2),
                total: total.toFixed(2),
                itemCount,
                user: req.user, // ✅ Dùng req.user từ middleware
            })
        } catch (error) {
            console.error("Error in payment:", error)
            return res.status(500).render("error", {
                layout: "payment",
                message: "Lỗi hệ thống. Vui lòng thử lại sau.",
                error: error.message,
                retryUrl: "/checkout",
            })
        }
    }
}

module.exports = new SiteController()
