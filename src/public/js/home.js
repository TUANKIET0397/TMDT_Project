;(function authHelpers() {
    function getCurrentPath() {
        const path = window.location.pathname || "/"
        const search = window.location.search || ""
        return `${path}${search}` || "/"
    }

    function sanitizeNext(next) {
        if (typeof next === "string" && next.startsWith("/")) {
            return next
        }
        return getCurrentPath()
    }

    function isLoggedIn() {
        const user = window.APP_USER
        return Boolean(user && user.id)
    }

    function ensureLoggedIn(options = {}) {
        if (isLoggedIn()) return true

        if (options.cartItem) {
            try {
                sessionStorage.setItem(
                    "pendingCartItem",
                    JSON.stringify(options.cartItem)
                )
            } catch (err) {
                console.warn("Unable to cache cart item for login resume", err)
            }
        }

        if (options.openCart) {
            sessionStorage.setItem("openCartAfterLogin", "1")
        }

        if (options.intent === "chat") {
            sessionStorage.setItem("postLoginChat", "1")
        }

        const nextUrl = sanitizeNext(options.next)
        window.location.href = `/auth?next=${encodeURIComponent(nextUrl)}`
        return false
    }

    window.requireLogin = ensureLoggedIn
    window.isUserLoggedIn = isLoggedIn
    window.getCurrentPath = getCurrentPath
})()

// Scroll reveal effect
window.addEventListener("scroll", () => {
    document.querySelectorAll("section").forEach((sec) => {
        const top = sec.getBoundingClientRect().top
        if (top < window.innerHeight - 100) {
            sec.classList.add("visible")
        }
    })
})

// === CART SYSTEM ===
document.addEventListener("DOMContentLoaded", () => {
    const cartIcon = document.querySelector(".fa-shopping-cart")
    const cartDrawer = document.getElementById("cartDrawer")
    const cartOverlay = document.querySelector(".cart-overlay")
    const closeCart = document.getElementById("closeCart")
    const cartItemsContainer = document.getElementById("cartItems")
    const cartTotal = document.getElementById("cartTotal")

    let cart = JSON.parse(localStorage.getItem("cart")) || []
    let addToCartLock = false

    if (!cartDrawer || !cartOverlay || !cartItemsContainer || !cartTotal) {
        console.warn("Cart elements not found in DOM")
        return
    }

    const defaultNext = () =>
        window.getCurrentPath ? window.getCurrentPath() : "/"

    function toggleCart() {
        cartDrawer.classList.toggle("active")
        cartOverlay.classList.toggle("active")
        if (cartDrawer.classList.contains("active")) {
            renderCart()
        }
    }

    function openCartDrawer() {
        if (!cartDrawer.classList.contains("active")) {
            cartDrawer.classList.add("active")
            cartOverlay.classList.add("active")
        }
        renderCart()
    }

    function closeCartDrawer() {
        cartDrawer.classList.remove("active")
        cartOverlay.classList.remove("active")
    }

    if (cartIcon) {
        cartIcon.addEventListener("click", () => {
            if (
                !window.requireLogin({
                    next: defaultNext(),
                    openCart: true,
                })
            ) {
                return
            }
            toggleCart()
        })
    }

    if (closeCart) {
        closeCart.addEventListener("click", closeCartDrawer)
    }

    cartOverlay.addEventListener("click", closeCartDrawer)

    function normalizeProduct(product) {
        if (!product) return null
        const normalized = {
            id: product.id ?? product.ID ?? product.productId ?? null,
            name: product.name ?? product.ProductName ?? "",
            price: Number(product.price ?? product.Price ?? 0) || 0,
            img: product.img ?? product.ImgPath ?? "/img/default.jpg",
            size: product.size ?? product.Size ?? null,
            color: product.color ?? product.Color ?? null,
        }
        return normalized.name ? normalized : null
    }

    window.addToCart = function (product) {
        if (addToCartLock) return
        const releaseLock = () => {
            addToCartLock = false
        }
        addToCartLock = true

        const normalized = normalizeProduct(product)
        if (!normalized) {
            releaseLock()
            return
        }

        const nextUrl = defaultNext()
        if (
            !window.requireLogin({
                next: nextUrl,
                cartItem: normalized,
                openCart: true,
            })
        ) {
            releaseLock()
            return
        }

        const found = cart.find(
            (item) =>
                item.name === normalized.name &&
                item.size === normalized.size &&
                item.color === normalized.color
        )

        if (found) {
            found.quantity += 1
        } else {
            cart.push({
                ...normalized,
                quantity: product.quantity ? Number(product.quantity) || 1 : 1,
            })
        }

        saveCart()
        openCartDrawer()
        releaseLock()
    }

    // Before submitting cart form, attach cart JSON to hidden input
    const cartForm = document.getElementById("cartForm")
    const cartDataInput = document.getElementById("cartData")
    if (cartForm && cartDataInput) {
        cartForm.addEventListener("submit", function () {
            try {
                cartDataInput.value = JSON.stringify(cart || [])
            } catch (err) {
                console.error("Failed to serialize cart for checkout", err)
                cartDataInput.value = "[]"
            }
        })
    }

    function saveCart() {
        localStorage.setItem("cart", JSON.stringify(cart))
    }

    function renderCart() {
        cartItemsContainer.innerHTML = ""
        let total = 0

        if (cart.length === 0) {
            cartItemsContainer.innerHTML =
                '<p style="padding:16px;color:#666">Your cart is empty.</p>'
            cartTotal.textContent = `$0.00`
            return
        }

        cart.forEach((item, index) => {
            const div = document.createElement("div")
            div.classList.add("cart-item")
            div.innerHTML = `
                <img src="${item.img || "/img/default.jpg"}" alt="${item.name}">
                <div class="cart-item-details">
                    <h4>${item.name}</h4>
                    <p>$${Number(item.price || 0).toFixed(2)}</p>
                    <div class="quantity">
                        <button type="button" onclick="changeQty(${index}, -1)">-</button>
                        <span>${item.quantity}</span>
                        <button type="button" onclick="changeQty(${index}, 1)">+</button>
                    </div>
                </div>
            `
            cartItemsContainer.appendChild(div)
            total += (item.price || 0) * item.quantity
        })

        cartTotal.textContent = `$${total.toFixed(2)}`
    }

    window.changeQty = function (index, delta) {
        if (!cart[index]) return
        cart[index].quantity += delta
        if (cart[index].quantity <= 0) cart.splice(index, 1)
        saveCart()
        renderCart()
    }

    function resumePendingCartActions() {
        if (!window.isUserLoggedIn || !window.isUserLoggedIn()) return

        const pendingItemRaw = sessionStorage.getItem("pendingCartItem")
        if (pendingItemRaw) {
            try {
                const pendingItem = JSON.parse(pendingItemRaw)
                sessionStorage.removeItem("pendingCartItem")
                if (pendingItem) {
                    window.addToCart(pendingItem)
                }
            } catch (err) {
                console.warn("Failed to restore pending cart item", err)
                sessionStorage.removeItem("pendingCartItem")
            }
        }

        if (sessionStorage.getItem("openCartAfterLogin") === "1") {
            sessionStorage.removeItem("openCartAfterLogin")
            openCartDrawer()
        }
    }

    renderCart()
    resumePendingCartActions()
})
