// src/public/js/user-chat.js

// Kết nối Socket.IO
const socket = io()

// Lấy userId từ localStorage hoặc tạo mới
let userId = localStorage.getItem("chatUserId")
if (!userId) {
    userId = "user_" + Date.now()
    localStorage.setItem("chatUserId", userId)
}

// Đăng ký userId với server
socket.emit("user:join", { userId })

// Nhận userId từ server
socket.on("user:joined", (data) => {
    console.log("Joined as:", data.userId)
    userId = data.userId
    localStorage.setItem("chatUserId", userId)
})

// DOM Elements
const chatDrawer = document.getElementById("chatDrawer")
const chatOverlay = document.querySelector(".chat-overlay")
const closeChat = document.getElementById("closeChat")
const chatInput = document.getElementById("chatInput")
const sendMessage = document.getElementById("sendMessage")
const chatMessages = document.getElementById("chatMessages")
  const chatIcon = document.getElementById('chatIcon')


// Track last date to show separator
let lastMessageDate = null

// Mở chat khi click "Tư vấn ngay" (từ trang detail)
document.addEventListener("click", function (e) {
    if (e.target.closest(".btn-consult")) {
        e.preventDefault()
        chatDrawer.classList.toggle('active')
        chatOverlay.classList.toggle('active')

        // Lấy thông tin sản phẩm
        const productCard = e.target.closest(".product-detail")
        if (productCard) {
            const productData = {
                productId: productCard.dataset.productId,
                productName: productCard.dataset.productName,
                productPrice: productCard.dataset.productPrice,
                productImage: productCard.dataset.productImage,
            }

            // Gửi tin nhắn với thông tin sản phẩm
            sendProductMessage(productData)
        }
    }
})

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

// Gửi tin nhắn thông thường
sendMessage.addEventListener("click", sendTextMessage)
chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        sendTextMessage()
    }
})

function sendTextMessage() {
    const message = chatInput.value.trim()
    if (!message) return

    socket.emit("user:message", {
        message: message,
        userId: userId,
    })

    chatInput.value = ""
}

// Gửi tin nhắn kèm sản phẩm
function sendProductMessage(productData) {
    const productMessage = `Tôi muốn hỏi về sản phẩm: ${productData.productName}`
    const ts = new Date().toISOString()

    socket.emit("user:message", {
        message: productMessage,
        productId: productData.productId,
        productName: productData.productName,
        productPrice: productData.productPrice,
        productImage: productData.productImage,
        userId: userId,
    })

    // Hiển thị sản phẩm trong chat (optimistic)
    addProductToChat(productData, ts)
}

// Hiển thị tin nhắn đã gửi
socket.on("user:message-sent", (data) => {
    // If server echoes a product message, we avoid duplicating (optimistic already shown)
    if (data.productName) {
        // update timestamp on last product message if present
        updateLastProductMessageTimestamp(data.timestamp)
        return
    }
    addMessageToChat(data.message, "sent", data.timestamp)
})

// Nhận tin nhắn từ admin
socket.on("user:receive-message", (data) => {
    addMessageToChat(data.message, "received", data.timestamp)
})

// Thêm tin nhắn vào chat
function addMessageToChat(message, type, timestamp) {
    // Thêm date separator nếu cần
    if (shouldShowDateSeparator(timestamp)) {
        addDateSeparator(timestamp)
    }

    const messageDiv = document.createElement("div")
    messageDiv.className = `message ${type}`
    const timeHTML = timestamp
        ? `<div class="message-time" style="font-size: 12px; color: #999; margin-bottom: 5px;">${formatTimestamp(
              timestamp
          )}</div>`
        : ""
    messageDiv.innerHTML = `${timeHTML}<div class="message-content">${escapeHtml(
        message
    )}</div>`
    chatMessages.appendChild(messageDiv)
    scrollToBottom()
}

function formatTimestamp(ts) {
    try {
        return new Date(ts).toLocaleString()
    } catch (e) {
        return ts
    }
}

function formatDateOnly(ts) {
    try {
        const d = new Date(ts)
        return d.toLocaleDateString("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        })
    } catch (e) {
        return ""
    }
}

function shouldShowDateSeparator(timestamp) {
    if (!timestamp) return false
    const currentDate = formatDateOnly(timestamp)
    if (currentDate !== lastMessageDate) {
        lastMessageDate = currentDate
        return true
    }
    return false
}

function addDateSeparator(timestamp) {
    const dateDiv = document.createElement("div")
    dateDiv.style.cssText =
        "text-align: center; color: #999; font-size: 12px; margin: 15px 0 10px 0; padding: 0 20px;"
    dateDiv.textContent = formatDateOnly(timestamp)
    chatMessages.appendChild(dateDiv)
}

function escapeHtml(text) {
    if (!text) return ""
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;")
}

// Thêm sản phẩm vào chat
function addProductToChat(product, timestamp) {
    // Thêm date separator nếu cần
    if (shouldShowDateSeparator(timestamp)) {
        addDateSeparator(timestamp)
    }

    const productDiv = document.createElement("div")
    productDiv.className = "message sent"
    productDiv.style.width = "100%"
    productDiv.style.maxWidth = "none"
    productDiv.style.padding = "0"
    const timeHTML = timestamp
        ? `<div class="message-time" style="font-size: 12px; color: #999; margin-bottom: 10px; text-align: right;">${formatTimestamp(
              timestamp
          )}</div>`
        : ""
    productDiv.innerHTML = `
        ${timeHTML}
        <div class="product-message" style="width: 100%; display: flex; gap: 10px; padding: 10px 0; background-color: #f5f5f5; border-radius: 8px; padding: 10px;">
            <div class="product-image" style="width: 100px; height: 100px; flex-shrink: 0; background-image: url('${escapeHtml(
                product.productImage
            )}'); background-size: cover; background-position: center; background-repeat: no-repeat; border-radius: 8px;"></div>
            <div class="product-info" style="flex: 1; height: 100%; display: flex; flex-direction: column; justify-content: center;">
                <div class="product-name" style="font-weight: bold; flex: 1; margin-bottom: 5px; font-size: 20px; display: -webkit-box;
  -webkit-line-clamp: 3; /* số dòng tối đa */
  -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 15px;">${escapeHtml(
                    product.productName
                )}</div>
                <div class="chat-price" style="color: #e74c3c; font-weight: bold; font-size: 20px; margin-bottom: 8px;">${escapeHtml(
                    product.productPrice
                )}$</div>
                <button class="Buy" style="; padding: 6px; background-color: #000; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 20px;">Buy now</button>
            </div>
        </div>
    `
    chatMessages.appendChild(productDiv)
    scrollToBottom()
}

function updateLastProductMessageTimestamp(timestamp) {
    // find last .message.sent that contains .product-message
    const messages = chatMessages.querySelectorAll(".message.sent")
    for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i]
        if (m.querySelector(".product-message")) {
            if (!m.querySelector(".message-time")) {
                const timeDiv = document.createElement("div")
                timeDiv.className = "message-time"
                timeDiv.textContent = formatTimestamp(timestamp)
                m.appendChild(timeDiv)
            }
            break
        }
    }
}

// Scroll xuống cuối
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight
}
