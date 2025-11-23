// src/app/controllers/SiteController.js
const Site = require("../models/Site")
const { createPayment } = require("../../config/momo")
const Transaction = require("../models/Transaction")
const Invoice = require("../models/Invoice") // ← Thêm model Invoice

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
                user: req.session?.user || null,
            })
        } catch (error) {
            console.error("Error in SiteController.index:", error)
            res.status(500).send("Internal Server Error")
        }
    }

    async about(req, res) {
        res.render("about")
    }

    async profile(req, res) {
        res.render("profile")
    }

    async checkout(req, res) {
        res.render("checkout", {
            layout: "payment",
            user: req.session?.user || null,
        })
    }

    async payment(req, res) {
        try {
            const { paymentType, amount, cartData } = req.body

            console.log("=== POST /payment ===")
            console.log("paymentType:", paymentType)
            console.log("amount:", amount)

            // Parse cartData
            let items = []
            if (cartData) {
                try {
                    items = JSON.parse(cartData)
                } catch (err) {
                    console.error("Invalid cartData JSON:", err)
                    items = []
                }
            }

            // Normalize cart items
            const cartItems = (items || []).map((it) => ({
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

            // ✅ If MoMo payment is selected
            if (paymentType === "momo" && amount) {
                try {
                    // 1. Lấy UserID từ session hoặc từ req.user (đã được middleware load)
                    const userId = req.session.userId || req.user?.id

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

                    // 2. Tạo orderId và lưu vào session
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

                    // 3. Tạo URLs
                    const returnUrl = `${req.protocol}://${req.get(
                        "host"
                    )}/return`
                    const ipnUrl = `${req.protocol}://${req.get("host")}/ipn`

                    console.log("returnUrl:", returnUrl)
                    console.log("ipnUrl:", ipnUrl)

                    // 4. Gọi MoMo API
                    const paymentResult = await createPayment(
                        orderId,
                        parsedAmount,
                        returnUrl,
                        ipnUrl
                    )

                    console.log("MoMo response:", paymentResult)

                    // 5. Kiểm tra kết quả
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

            // ✅ For non-MoMo payment (default checkout view)
            const itemCount = cartItems.reduce((c, it) => c + it.quantity, 0)
            const total = subtotal

            return res.render("checkout", {
                layout: "payment",
                cartItems,
                subtotal: subtotal.toFixed(2),
                total: total.toFixed(2),
                itemCount,
                user: req.session?.user || null,
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
