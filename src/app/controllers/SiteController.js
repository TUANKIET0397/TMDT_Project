// src/app/controllers/SiteController.js
const Site = require("../models/Site")
const { createPayment } = require("../../config/momo")

class SiteController {
    async index(req, res, next) {
        try {
            // Lấy tất cả dữ liệu cần thiết từ Model
            const [
                categories,
                newProducts,
                bestSellers,
                featuredProducts,
                sizes,
                statistics,
                sliderImages,
            ] = await Promise.all([
                Site.getAllCategories(), // Danh mục
                Site.getNewProducts(14), // Sản phẩm mới (2 hàng x 7 sản phẩm)
                Site.getBestSellerProducts(14), // Sản phẩm bán chạy
                Site.getFeaturedProducts(3), // 3 sản phẩm cho banner
                Site.getAllSizes(), // Danh sách size
                Site.getStatistics(), // Thống kê
                Site.getSliderImages(), // Ảnh slider
            ])

            // Render view với tất cả dữ liệu
            res.render("site", {
                title: "Home - Shoppmall",
                layout: "main",

                // Dữ liệu từ database
                categories: categories,
                newProducts: newProducts,
                bestSellers: bestSellers,
                featuredProducts: featuredProducts,
                sizes: sizes,
                sliderImages: sliderImages,

                // Thống kê
                totalProducts: statistics.TotalProducts,
                minPrice: statistics.MinPrice,
                maxPrice: statistics.MaxPrice,

                // User info (nếu đã đăng nhập)
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

            // If MoMo payment is selected, initiate payment
            if (paymentType === "momo" && amount) {
                try {
                    // Generate a unique order ID (timestamp + random)
                    const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                    const parsedAmount = parseInt(amount)

                    console.log("Creating MoMo payment...")
                    console.log("orderId:", orderId)
                    console.log("amount:", parsedAmount)

                    // Callback URLs (adjust domain if in production)
                    const returnUrl = `${req.protocol}://${req.get("host")}/return`
                    const ipnUrl = `${req.protocol}://${req.get("host")}/ipn`

                    console.log("returnUrl:", returnUrl)
                    console.log("ipnUrl:", ipnUrl)

                    // Call MoMo payment service
                    const paymentResult = await createPayment(
                        orderId,
                        parsedAmount,
                        returnUrl,
                        ipnUrl
                    )

                    console.log("MoMo response:", paymentResult)

                    // If payUrl exists, redirect to MoMo gateway
                    if (paymentResult.payUrl) {
                        console.log("✓ Redirecting to MoMo payUrl:", paymentResult.payUrl)
                        return res.redirect(paymentResult.payUrl)
                    } else {
                        console.error("MoMo payment failed:", paymentResult)
                        return res.status(400).render("error", {
                            layout: "payment",
                            message: "Lỗi cổng thanh toán. Vui lòng thử lại.",
                            error: paymentResult.message || "Failed to create payment",
                        })
                    }
                } catch (momoError) {
                    console.error("MoMo payment error:", momoError.message)
                    console.error("Error details:", momoError)
                    return res.status(500).render("error", {
                        layout: "payment",
                        message: "Lỗi khi xử lý thanh toán.",
                        error: momoError.message,
                    })
                }
            }

            // For non-MoMo payment (future implementations) or default checkout view
            // Parse cartData if present
            let items = []
            if (cartData) {
                try {
                    items = JSON.parse(cartData)
                } catch (err) {
                    console.error("Invalid cartData JSON:", err)
                    items = []
                }
            }

            // Normalize item fields and compute totals
            const cartItems = (items || []).map((it) => ({
                name: it.name || it.ProductName || "",
                price: parseFloat(it.price || it.Price || 0) || 0,
                img: it.img || it.ImgPath || "/img/default.jpg",
                quantity: parseInt(it.quantity || it.qty || 1) || 1,
                size: it.size || it.Size || null,
            }))

            const subtotal = cartItems.reduce(
                (s, it) => s + it.price * it.quantity,
                0
            )
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
            return res.status(500).send("Internal Server Error")
        }
    }
}

module.exports = new SiteController()
