const Product = require("../models/Product")

class ProductController {
    // Trang danh sách sản phẩm
    // ...existing code...
    async index(req, res) {
        try {
            const { price, category, size } = req.query
            let products = await Product.getAllProducts()

            // prepare categories array
            const categories = category
                ? Array.isArray(category)
                    ? category
                    : [category]
                : []

            // ánh xạ tên hiển thị -> tên lưu trong DB (fix typos)
            const categoryMap = {
                "t-shirts": "t-shirts",
                tshirts: "t-shirts",
                shirts: "shirts",
                knitwear: "knitwear",
                sweatshirts: "sweatshirts", 
                pants: "pants",
                outerwear: "outerwear", 
                shoes: "shoes",
            }

            const categoriesMapped = categories.map((c) => {
                // chuẩn hoá: lowercase, remove spaces, keep hyphen
                const key = String(c)
                    .toLowerCase()
                    .replace(/\s+/g, "")
                    .replace(/[^a-z0-9-]/g, "")
                return categoryMap[key] || key
            })

            // Lọc theo category (nếu có) - so sánh với p.TypeName từ DB
            if (categoriesMapped.length > 0) {
                products = products.filter((p) => {
                    const type = (p.TypeName || "").toLowerCase()
                    return categoriesMapped.includes(type)
                })
            }

            // Sắp xếp theo giá
            if (price === "low-high") {
                products.sort(
                    (a, b) => parseFloat(a.Price) - parseFloat(b.Price)
                )
            } else if (price === "high-low") {
                products.sort(
                    (a, b) => parseFloat(b.Price) - parseFloat(a.Price)
                )
            }

            // Lọc theo size (nếu cần) ...
            res.render("products/index", {
                products,
                count: products.length,
                filters: { price, category, size },
            })
        } catch (error) {
            console.error("Error:", error.message)
            res.render("products/index", {
                products: [],
                count: 0,
                filters: {},
            })
        }
    }

    // Sản phẩm theo category
    async knitwear(req, res) {
        try {
            const { price, size } = req.query
            let products = await Product.getProductsByType("Knitwear")

            // Sort by price
            if (price === "low-high") {
                products.sort(
                    (a, b) => parseFloat(a.Price) - parseFloat(b.Price)
                )
            } else if (price === "high-low") {
                products.sort(
                    (a, b) => parseFloat(b.Price) - parseFloat(a.Price)
                )
            }

            // Filter by size (if implemented in DB)
            // For now, we just pass the filter

            res.render("products/knitwear", {
                products: products,
                count: products.length,
                filters: { price, size },
            })
        } catch (error) {
            console.log(error)
            res.render("products/knitwear", {
                products: [],
                count: 0,
                filters: {},
            })
        }
    }

    async outerwear(req, res) {
        try {
            const { price, size } = req.query
            let products = await Product.getProductsByType("Outerwear")

            // Sort by price
            if (price === "low-high") {
                products.sort(
                    (a, b) => parseFloat(a.Price) - parseFloat(b.Price)
                )
            } else if (price === "high-low") {
                products.sort(
                    (a, b) => parseFloat(b.Price) - parseFloat(a.Price)
                )
            }

            // Filter by size (if implemented in DB)
            // For now, we just pass the filter

            res.render("products/outerwear", {
                products: products,
                count: products.length,
                filters: { price, size },
            })
        } catch (error) {
            console.log(error)
            res.render("products/outerwear", {
                products: [],
                count: 0,
                filters: {},
            })
        }
    }

    async pants(req, res) {
        try {
            const { price, size } = req.query
            let products = await Product.getProductsByType("Pants")
            // Sort by price
            if (price === "low-high") {
                products.sort(
                    (a, b) => parseFloat(a.Price) - parseFloat(b.Price)
                )
            } else if (price === "high-low") {
                products.sort(
                    (a, b) => parseFloat(b.Price) - parseFloat(a.Price)
                )
            }

            // Filter by size (if implemented in DB)
            // For now, we just pass the filter

            res.render("products/pants", {
                products: products,
                count: products.length,
                filters: { price, size },
            })
        } catch (error) {
            console.log(error)
            res.render("products/pants", { products: [], count: 0, filters: {} })
        }
    }

    async shirts(req, res) {
        try {
            const { price, size } = req.query
            let products = await Product.getProductsByType("Shirts")

            // Sort by price
            if (price === "low-high") {
                products.sort(
                    (a, b) => parseFloat(a.Price) - parseFloat(b.Price)
                )
            } else if (price === "high-low") {
                products.sort(
                    (a, b) => parseFloat(b.Price) - parseFloat(a.Price)
                )
            }

            // Filter by size (if implemented in DB)
            // For now, we just pass the filter

            res.render("products/shirts", {
                products: products,
                count: products.length,
                filters: { price, size },
            })
        } catch (error) {
            console.log(error)
            res.render("products/shirts", { products: [], count: 0, filters: {} })
        }
    }

    async shoes(req, res) {
        try {
            const products = await Product.getProductsByType("Shoes")
            res.render("products/shoes", {
                products: products,
                count: products.length,
            })
        } catch (error) {
            console.log(error)
            res.render("products/shoes", { products: [], count: 0 })
        }
    }

    async sweatshirts(req, res) {
        try {
            const { price, size } = req.query
            let products = await Product.getProductsByType("Sweatshirts")

            // Sort by price
            if (price === "low-high") {
                products.sort(
                    (a, b) => parseFloat(a.Price) - parseFloat(b.Price)
                )
            } else if (price === "high-low") {
                products.sort(
                    (a, b) => parseFloat(b.Price) - parseFloat(a.Price)
                )
            }

            // Filter by size (if implemented in DB)
            // For now, we just pass the filter

            res.render("products/sweatshirts", {
                products: products,
                count: products.length,
                filters: { price, size },
            })
        } catch (error) {
            console.log(error)
            res.render("products/sweatshirts", {
                products: [],
                count: 0,
                filters: {},
            })
        }
    }

    async tShirts(req, res) {
        try {
            const { price, size } = req.query
            let products = await Product.getProductsByType("T-Shirts")

            // Sort by price
            if (price === "low-high") {
                products.sort(
                    (a, b) => parseFloat(a.Price) - parseFloat(b.Price)
                )
            } else if (price === "high-low") {
                products.sort(
                    (a, b) => parseFloat(b.Price) - parseFloat(a.Price)
                )
            }

            // Filter by size (if implemented in DB)
            // For now, we just pass the filter

            res.render("products/t_shirts", {
                products: products,
                count: products.length,
                filters: { price, size },
            })
        } catch (error) {
            console.log(error)
            res.render("products/t_shirts", { products: [], count: 0, filters: {} })
        }
    }

    // Chi tiết sản phẩm
    async detail(req, res) {
        try {
            const productId = req.params.id
            const product = await Product.getProductById(productId)
            const relatedProducts = await Product.getRelatedProducts(
                product.TypeID,
                4
            )

            res.render("products/detail", {
                product: product,
                relatedProducts: relatedProducts,
            })
        } catch (error) {
            console.log(error)
            res.status(404).render("404")
        }
    }
}

module.exports = new ProductController()
