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
// ✅ Đợi DOM load xong mới chạy
document.addEventListener("DOMContentLoaded", () => {
    const cartIcon = document.querySelector(".fa-shopping-cart")
    const cartDrawer = document.getElementById("cartDrawer")
    const cartOverlay = document.querySelector(".cart-overlay")
    const closeCart = document.getElementById("closeCart")
    const cartItemsContainer = document.getElementById("cartItems")
    const cartTotal = document.getElementById("cartTotal")

    let cart = JSON.parse(localStorage.getItem("cart")) || []

    // guard check phần tử tồn tại
    if (!cartIcon || !cartDrawer || !cartOverlay || !closeCart || !cartItemsContainer || !cartTotal) {
        console.warn("Cart elements not found in DOM")
        return
    }

    // === OPEN / CLOSE CART ===
    cartIcon.addEventListener("click", () => {
        cartDrawer.classList.toggle("active")
        cartOverlay.classList.toggle("active")
        renderCart()
    })

    closeCart.addEventListener("click", () => {
        cartDrawer.classList.remove("active")
        cartOverlay.classList.remove("active")
    })

    cartOverlay.addEventListener("click", () => {
        cartDrawer.classList.remove("active")
        cartOverlay.classList.remove("active")
    })

    // === ADD TO CART FUNCTION ===
    window.addToCart = function(product) {
        // ✅ Không dùng event.preventDefault() vì function này không nhận event
        if (!product || !product.name) return

        const found = cart.find((item) => item.name === product.name)
        if (found) {
            found.quantity++
        } else {
            cart.push({ ...product, quantity: 1 })
        }
        saveCart()
        renderCart()
        // Hiển thị giỏ hàng ngay
        cartDrawer.classList.add("active")
        cartOverlay.classList.add("active")
    }

    // === SAVE CART TO LOCAL STORAGE ===
    function saveCart() {
        localStorage.setItem("cart", JSON.stringify(cart))
    }

    // === RENDER CART ===
    function renderCart() {
        cartItemsContainer.innerHTML = ""
        let total = 0

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p style="padding:16px;color:#666">Your cart is empty.</p>'
            cartTotal.textContent = `$0.00`
            return
        }

        cart.forEach((item, index) => {
            const div = document.createElement("div")
            div.classList.add("cart-item")
            div.innerHTML = `
                <img src="${item.img || '/img/default.jpg'}" alt="${item.name}">
                <div class="cart-item-details">
                    <h4>${item.name}</h4>
                    <p>$${Number(item.price || 0).toFixed(2)}</p>
                    <div class="quantity">
                        <button onclick="changeQty(${index}, -1)">-</button>
                        <span>${item.quantity}</span>
                        <button onclick="changeQty(${index}, 1)">+</button>
                    </div>
                </div>
            `
            cartItemsContainer.appendChild(div)
            total += (item.price || 0) * item.quantity
        })

        cartTotal.textContent = `$${total.toFixed(2)}`
    }

    // CHANGE QTY
    window.changeQty = function(index, delta) {
        if (!cart[index]) return
        cart[index].quantity += delta
        if (cart[index].quantity <= 0) cart.splice(index, 1)
        saveCart()
        renderCart()
    }

    // khoi dong
    renderCart()
}) // ✅ đóng DOMContentLoaded

// === CHAT WIDGET ===

// === CHAT SYSTEM - ẩn/hiện ===
document.addEventListener('DOMContentLoaded', () => {
  const chatIcon = document.getElementById('chatIcon')
  const chatDrawer = document.getElementById('chatDrawer')
  const chatOverlay = document.querySelector('.chat-overlay')
  const closeChat = document.getElementById('closeChat')

  if (!chatIcon || !chatDrawer || !chatOverlay || !closeChat) return

  // Mở/đóng chat
  chatIcon.addEventListener('click', () => {
    chatDrawer.classList.toggle('active')
    chatOverlay.classList.toggle('active')
  })

  closeChat.addEventListener('click', () => {
    chatDrawer.classList.remove('active')
    chatOverlay.classList.remove('active')
  })

  chatOverlay.addEventListener('click', () => {
    chatDrawer.classList.remove('active')
    chatOverlay.classList.remove('active')
  })
})