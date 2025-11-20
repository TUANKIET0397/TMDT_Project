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

// Mở chat khi click "Tư vấn ngay" (từ trang detail)
document.addEventListener("click", function (e) {
    if (e.target.closest(".btn-consult")) {
        e.preventDefault()
        openChat()

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

// Mở chat từ header
document.addEventListener("click", function (e) {
    if (e.target.closest(".chat-icon")) {
        e.preventDefault()
        openChat()
    }
})

// Đóng chat
closeChat.addEventListener("click", () => {
    chatDrawer.classList.remove("open")
    chatOverlay.classList.remove("active")
})

chatOverlay.addEventListener("click", () => {
    chatDrawer.classList.remove("open")
    chatOverlay.classList.remove("active")
})

// Mở chat
function openChat() {
    chatDrawer.classList.add("open")
    chatOverlay.classList.add("active")
    scrollToBottom()
}

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

    socket.emit("user:message", {
        message: productMessage,
        productId: productData.productId,
        productName: productData.productName,
        productPrice: productData.productPrice,
        productImage: productData.productImage,
        userId: userId,
    })

    // Hiển thị sản phẩm trong chat
    addProductToChat(productData)
}

// Hiển thị tin nhắn đã gửi
socket.on("user:message-sent", (data) => {
    addMessageToChat(data.message, "sent")
})

// Nhận tin nhắn từ admin
socket.on("user:receive-message", (data) => {
    addMessageToChat(data.message, "received")
})

// Thêm tin nhắn vào chat
function addMessageToChat(message, type) {
    const messageDiv = document.createElement("div")
    messageDiv.className = `message ${type}`
    messageDiv.innerHTML = `<div class="message-content">${message}</div>`
    chatMessages.appendChild(messageDiv)
    scrollToBottom()
}

// Thêm sản phẩm vào chat
function addProductToChat(product) {
    const productDiv = document.createElement("div")
    productDiv.className = "message sent"
    productDiv.style.width = "100%"
    productDiv.style.maxWidth = "100%"
    productDiv.innerHTML = `
        <div class="product-message">
            <div class="product-image" style="background-image: url('${product.productImage}')"></div>
            <div class="product-info">
                <div class="product-name">${product.productName}
                    <br /><br />
                    <div class="chat-price">${product.productPrice}</div>
                </div>
            </div>
            <button class="Buy">Buy now</button>
        </div>
    `
    chatMessages.appendChild(productDiv)
    scrollToBottom()
}

// Scroll xuống cuối
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight
}
