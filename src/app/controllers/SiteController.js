// src/app/controllers/SiteController.js
const Site = require("../models/Site")
const { createPayment } = require("../../config/momo")
const Transaction = require("../models/Transaction")
const Invoice = require("../models/Invoice")
const AuthSite = require("../models/AuthSite") // ✅ Thêm import
const db = require("../../config/db")

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

    // ✅ Profile page - load full user info, orders & regions
    async profile(req, res) {
        try {
            const userId = req.session.userId

            if (!userId) {
                return res.redirect("/auth?error=login_required")
            }

            const user = await AuthSite.getUserById(userId)
            const account = await AuthSite.getAccountByUserId(userId)

            if (!user) {
                return res.redirect("/auth?error=user_not_found")
            }

            if (account?.UserName) {
                user.UserName = account.UserName
            }

            if (user.BirthDate) {
                const d = new Date(user.BirthDate)
                user.BirthDate = isNaN(d.getTime())
                    ? ""
                    : d.toISOString().slice(0, 10)
            } else {
                user.BirthDate = ""
            }

            const [regions, orders] = await Promise.all([
                AuthSite.getUserRegions(),
                AuthSite.getUserOrders(userId),
            ])

            const regionsWithSelection = regions.map((region) => ({
                ...region,
                selected:
                    String(region.ID) ===
                    String(user.RegionID || user.region || ""),
            }))

            const redirectTo =
                req.query.next || req.query.redirectTo || req.session.returnTo

            const missingParam = req.query.missing || ""
            const missingFieldsDisplay = missingParam
                .split(",")
                .filter(Boolean)
                .map((field) =>
                    field
                        .replace(/([A-Z])/g, " $1")
                        .replace(/_/g, " ")
                        .toLowerCase()
                )

            const noticeMessage =
                req.query.notice ||
                (missingFieldsDisplay.length
                    ? `Vui lòng cập nhật các thông tin còn thiếu: ${missingFieldsDisplay.join(
                          ", "
                      )}.`
                    : null)

            res.render("profile", {
                layout: "main",
                user,
                account,
                orders,
                regions: regionsWithSelection,
                redirectTo: redirectTo || "/profile",
                notice: noticeMessage,
                missingFieldsDisplay,
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

    async updateProfile(req, res) {
        try {
            const userId = req.session?.userId
            if (!userId) {
                return res.status(401).redirect("/auth?error=login_required")
            }

            const payload = {
                FirstName: req.body.FirstName,
                LastName: req.body.LastName,
                BirthDate: req.body.BirthDate,
                Gender: req.body.Gender,
                PhoneNumber: req.body.PhoneNumber,
                Email: req.body.Email,
                Address: req.body.Address,
                RegionID: req.body.RegionID,
                Avt: req.body.Avt,
            }

            const updatedUser = await AuthSite.updateProfile(userId, payload)

            req.session.userFullName =
                updatedUser.fullName ||
                `${updatedUser.FirstName || ""} ${
                    updatedUser.LastName || ""
                }`.trim()
            req.session.userEmail = updatedUser.Email || updatedUser.email

            const redirectTo =
                req.body.redirectTo ||
                req.query.redirectTo ||
                req.query.next ||
                "/profile"

            if (req.xhr || req.headers.accept?.includes("application/json")) {
                return res.json({
                    success: true,
                    data: updatedUser,
                    redirect: redirectTo,
                })
            }

            res.redirect(redirectTo)
        } catch (error) {
            console.error("Error updating profile:", error)
            if (req.xhr || req.headers.accept?.includes("application/json")) {
                return res.status(400).json({
                    success: false,
                    message: error.message || "Update profile failed",
                })
            }

            res.status(400).render("error", {
                layout: "main",
                message: "Update failed",
                error: error.message,
                retryUrl: "/profile",
            })
        }
    }

    async chatHistory(req, res) {
        try {
            const userId = req.session?.userId
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                })
            }

            const [messages] = await db.query(
                `
                SELECT 
                    c.ID,
                    c.Message,
                    c.SendTime,
                    c.AdminID,
                    c.ProductID,
                    p.ProductName,
                    pr.Price AS ProductPrice,
                    COALESCE((
                        SELECT img.ImgPath
                        FROM ProductImg pi
                        LEFT JOIN Image img ON pi.ImgID = img.ID
                        WHERE pi.ProductID = p.ID
                        LIMIT 1
                    ), '/img/default.jpg') AS ProductImage
                FROM Chat c
                LEFT JOIN Product p ON c.ProductID = p.ID
                LEFT JOIN Price pr ON p.ID = pr.ProductID
                WHERE c.UserID = ?
                ORDER BY c.SendTime ASC
            `,
                [userId]
            )

            return res.json({
                success: true,
                messages,
            })
        } catch (error) {
            console.error("Error loading chat history:", error)
            return res.status(500).json({
                success: false,
                message: "Failed to load chat history",
            })
        }
    }

    // ✅ Checkout - preload profile + regions
    async checkout(req, res) {
        try {
            console.log("=== GET /checkout ===")
            console.log("req.user:", req.user)

            const userId = req.session.userId
            const user =
                req.user ||
                (userId ? await AuthSite.getUserById(userId) : null) ||
                {}

            const regions = await AuthSite.getUserRegions()
            const regionsWithSelection = regions.map((region) => ({
                ...region,
                selected:
                    String(region.ID) ===
                    String(user.RegionID || user.region || ""),
            }))

            // 🔧 FIX: Parse cartData từ query parameter (từ cart drawer form)
            let cartItems = []

            // Cách 1: Lấy từ query.cartData (từ cart drawer)
            if (req.query.cartData) {
                try {
                    cartItems = JSON.parse(req.query.cartData)
                    console.log("✓ Loaded cartData from query:", cartItems)
                } catch (err) {
                    console.warn(
                        "⚠️ Failed to parse cartData from query:",
                        err.message
                    )
                    cartItems = []
                }
            }

            // Cách 2: Nếu không có, lấy từ session
            if (cartItems.length === 0 && req.session.cartItems) {
                cartItems = req.session.cartItems
                console.log("✓ Loaded cartItems from session:", cartItems)
            }

            const subtotal = cartItems.reduce(
                (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
                0
            )
            const itemCount = cartItems.reduce(
                (count, item) => count + (item.quantity || 0),
                0
            )

            const cartDataJson = JSON.stringify(cartItems || []).replace(
                /</g,
                "\\u003c"
            )

            res.render("checkout", {
                layout: "payment",
                user,
                regions: regionsWithSelection,
                cartItems,
                subtotal: subtotal.toFixed(2),
                total: subtotal.toFixed(2),
                itemCount,
                cartDataJson,
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

            // Parse cartData
            let items = []
            if (cartData) {
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
            } else if (
                req.session.cartItems &&
                req.session.cartItems.length > 0
            ) {
                items = req.session.cartItems
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

            // Lưu lại cartItems vào session để các lần submit sau vẫn còn dữ liệu
            req.session.cartItems = cartItems

            console.log("Cart items:", cartItems.length)
            console.log("Subtotal:", subtotal)

            const userId = req.user?.id || req.session.userId

            if (!userId) {
                throw new Error("User not authenticated. Please login.")
            }

            console.log(`✓ User authenticated: UserID=${userId}`)

            // ✅ If MoMo payment is selected
            if (paymentType === "momo" && amount) {
                try {
                    // 2. Tạo Invoice với UserID và Payment='Paid' (vì MoMo)
                    const invoiceId = await Invoice.createPendingInvoice({
                        UserID: userId,
                        TotalAmount: subtotal,
                        Status: "prepare",
                        PaymentMethod: "Paid", // MoMo = Paid
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

            // ✅ For COD (Order Now) - paymentType = undefined hoặc "cod"
            if (!paymentType || paymentType === "cod") {
                try {
                    // Tạo Invoice với Payment='Unpaid' cho COD
                    const invoiceId = await Invoice.createPendingInvoice({
                        UserID: userId,
                        TotalAmount: subtotal,
                        Status: "prepare",
                        PaymentMethod: "Unpaid", // COD = Unpaid
                    })

                    console.log("✓ Created COD Invoice ID:", invoiceId)

                    // ✅ Tạo Cart và CartItems
                    try {
                        const cartID = await Invoice.createCartFromItems(
                            userId,
                            cartItems
                        )
                        // Update Invoice with CartID
                        const db = require("../../config/db")
                        await db.query(
                            `UPDATE Invoice SET CartID = ? WHERE ID = ?`,
                            [cartID, invoiceId]
                        )
                        console.log(
                            `✓ Created Cart ${cartID} and linked to Invoice ${invoiceId}`
                        )
                    } catch (cartError) {
                        console.error("Error creating cart:", cartError)
                        // Không block user, vẫn hiển thị success
                    }

                    // Render success page
                    return res.render("paymentSuccess", {
                        layout: "payment",
                        title: "Đơn hàng đã được tạo",
                        orderId: invoiceId,
                        message:
                            "Đơn hàng của bạn đã được tạo. Chúng tôi sẽ liên hệ bạn sớm.",
                    })
                } catch (codError) {
                    console.error("COD order error:", codError.message)
                    return res.status(500).render("error", {
                        layout: "payment",
                        message: "Lỗi khi tạo đơn hàng.",
                        error: codError.message,
                        retryUrl: "/checkout",
                    })
                }
            }

            // Fallback: render checkout lại
            const itemCount = cartItems.reduce((c, it) => c + it.quantity, 0)
            const total = subtotal
            const cartDataJson = JSON.stringify(cartItems || []).replace(
                /</g,
                "\\u003c"
            )

            const regions = await AuthSite.getUserRegions()
            const regionsWithSelection = regions.map((region) => ({
                ...region,
                selected:
                    String(region.ID) ===
                    String(req.user.RegionID || req.user.region || ""),
            }))

            return res.render("checkout", {
                layout: "payment",
                cartItems,
                subtotal: subtotal.toFixed(2),
                total: total.toFixed(2),
                itemCount,
                cartDataJson,
                user: req.user, // ✅ Dùng req.user từ middleware
                regions: regionsWithSelection,
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
