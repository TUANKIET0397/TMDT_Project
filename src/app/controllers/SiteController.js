// src/app/controllers/SiteController.js
const Site = require("../models/Site")

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
        })
    }

    async payment(req, res) {
        try {
            // cartData is a JSON string posted from the cart form
            const cartData = req.body && req.body.cartData
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
            const total = subtotal // extendable: add tax/shipping if needed

            return res.render("checkout", {
                layout: "payment",
                cartItems,
                subtotal: subtotal.toFixed(2),
                total: total.toFixed(2),
                itemCount,
            })
        } catch (error) {
            console.error("Error in postCheckout:", error)
            return res.status(500).send("Internal Server Error")
        }
    }
}

module.exports = new SiteController()
