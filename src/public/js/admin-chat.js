// src/public/js/admin-chat.js

// Kết nối Socket.IO
const socket = io()

// Đăng ký là admin
socket.emit("admin:join")

// DOM Elements
const usersList = document.querySelector(".users-scroll")
const chatMessages = document.querySelector(".chat-messages")
const chatInput = document.querySelector(".chat-input")
const sendButton = document.querySelector(".send-button")
const chatUserName = document.querySelector(".chat-user-name")

// Store
let activeUsers = new Map() // userId -> user data
let currentChatUserId = null
let lastMessageDate = null

// Nhận thông báo có user mới
socket.on("admin:new-user", (data) => {
    console.log("New user:", data)
    // Chỉ thêm user vào danh sách, không set unreadCount
    if (!activeUsers.has(data.userId)) {
        activeUsers.set(data.userId, {
            userId: data.userId,
            name: `User ${data.userId.substring(0, 8)}`,
            lastMessage: "New conversation",
            unreadCount: 0,
        })
        renderUserList()
    }
})

// Nhận tin nhắn từ user
socket.on("admin:receive-message", (data) => {
    console.log("Received message from user:", data)

    // Nếu user chưa có trong danh sách, thêm vào (không set unreadCount)
    if (!activeUsers.has(data.userId)) {
        activeUsers.set(data.userId, {
            userId: data.userId,
            name: `User ${data.userId.substring(0, 8)}`,
            lastMessage: data.productName ? data.productName : data.message,
            unreadCount: 0,
        })
    }

    // Luôn cập nhật lastMessage
    const user = activeUsers.get(data.userId)
    user.lastMessage = data.productName ? data.productName : data.message

    // Nếu admin không đang xem user này, tăng unreadCount
    if (currentChatUserId !== data.userId) {
        user.unreadCount = (user.unreadCount || 0) + 1
        activeUsers.set(data.userId, user)
        renderUserList()
    } else {
        // Nếu đang chat với user này, hiển thị tin nhắn và không tăng unreadCount
        user.unreadCount = 0
        activeUsers.set(data.userId, user)
        renderUserList()
        // Hiển thị sản phẩm nếu có
        if (data.productName) {
            addProductMessage(data, "received")
        }
        // Hiển thị tin nhắn text nếu có
        if (data.message && data.message.trim() !== "") {
            addMessage(data.message, "received", data.timestamp)
        }
    }
})

// Tin nhắn đã gửi
socket.on("admin:message-sent", (data) => {
    addMessage(data.message, "sent", data.timestamp)
})

// Thêm hoặc cập nhật user trong danh sách (không set unreadCount ở đây)
function addOrUpdateUser(userId, lastMessage = "New conversation") {
    if (!activeUsers.has(userId)) {
        activeUsers.set(userId, {
            userId,
            name: `User ${userId.substring(0, 8)}`,
            lastMessage,
            unreadCount: 0,
        })
        renderUserList()
    } else {
        const user = activeUsers.get(userId)
        user.lastMessage = lastMessage
        activeUsers.set(userId, user)
        renderUserList()
    }
}

// Render danh sách user
function renderUserList() {
    usersList.innerHTML = ""

    // Convert Map to array and sort by unreadCount desc, then by name
    const sortedUsers = Array.from(activeUsers.values()).sort((a, b) => {
        if ((b.unreadCount || 0) !== (a.unreadCount || 0)) {
            return (b.unreadCount || 0) - (a.unreadCount || 0)
        }
        // fallback: sort by name
        return a.name.localeCompare(b.name)
    })

    sortedUsers.forEach((user) => {
        const userDiv = document.createElement("div")
        userDiv.className = "user-item"
        if (user.userId === currentChatUserId) {
            userDiv.classList.add("active")
        }

        const badgeHTML =
            user.unreadCount && user.unreadCount > 0
                ? `<div class="user-item-badge" style="background-color: #ff0000; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; position: absolute; right: 10px; top: 10px;">${user.unreadCount}</div>`
                : ""

        userDiv.innerHTML = `
            <div class="user-item-avatar"></div>
            <div class="user-item-info" style="position: relative; flex: 1;">
                <div class="user-item-name">${user.name}</div>
                <div class="user-item-message">${user.lastMessage}</div>
                ${badgeHTML}
            </div>
        `

        userDiv.addEventListener("click", () => {
            switchToUser(user.userId)
        })

        usersList.appendChild(userDiv)
    })
}

// Chuyển sang chat với user khác
async function switchToUser(userId) {
    currentChatUserId = userId
    const user = activeUsers.get(userId)

    chatUserName.textContent = user.name

    // Reset unreadCount khi vào xem user
    user.unreadCount = 0
    activeUsers.set(userId, user)
    renderUserList()

    // Reset date separator tracking
    lastMessageDate = null

    // Load lịch sử chat từ database
    try {
        const response = await fetch(`/admin/chat/history/${userId}`)
        const data = await response.json()

        chatMessages.innerHTML = ""
        data.messages.forEach((msg) => {
            const type = msg.AdminID ? "sent" : "received"
            if (msg.ProductID && msg.ProductName) {
                // Hiển thị sản phẩm (with timestamp)
                addProductMessage(
                    {
                        productName: msg.ProductName,
                        productPrice: msg.ProductPrice,
                        productImage: msg.ProductImage,
                        timestamp: msg.SendTime,
                    },
                    type
                )
            }
            // Chỉ hiển thị message nếu có text
            if (msg.Message && msg.Message.trim() !== "") {
                addMessage(msg.Message, type, msg.SendTime)
            }
        })
    } catch (error) {
        console.error("Error loading chat history:", error)
        chatMessages.innerHTML = ""
    }

    // Cập nhật active state
    renderUserList()
}

// Gửi tin nhắn
sendButton.addEventListener("click", sendMessage)
chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        sendMessage()
    }
})

function sendMessage() {
    const message = chatInput.value.trim()
    if (!message || !currentChatUserId) return

    socket.emit("admin:message", {
        userId: currentChatUserId,
        message: message,
    })

    chatInput.value = ""
}

// Thêm tin nhắn vào chat
function addMessage(message, type, timestamp) {
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
        const d = new Date(ts)
        return d.toLocaleString()
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
function addProductMessage(data, type = "received") {
    // Thêm date separator nếu cần
    if (shouldShowDateSeparator(data.timestamp)) {
        addDateSeparator(data.timestamp)
    }

    const productDiv = document.createElement("div")
    productDiv.className = `message ${type}`
    productDiv.style.width = "100%"
    productDiv.style.maxWidth = "none"
    productDiv.style.padding = "0"
    const timeHTML = data.timestamp
        ? `<div class="message-time" style="font-size: 12px; color: #999; margin-bottom: 10px;">${formatTimestamp(
              data.timestamp
          )}</div>`
        : ""
    productDiv.innerHTML = `
        ${timeHTML}
        <div class="product-message">
            <div class="product-image" style="background-image: url('${escapeHtml(
                data.productImage
            )}'); background-size: cover; background-position: center; background-repeat: no-repeat; border-radius: 8px;"></div>
            <div class="product-info">
                <div class="product-name">${escapeHtml(
                    data.productName || "Product"
                )}</div>
                <div class="chat-price">${escapeHtml(
                    data.productPrice || "0"
                )}$</div>
            </div>
        </div>
    `
    chatMessages.appendChild(productDiv)
    scrollToBottom()
}

// Scroll xuống cuối
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight
}

// Load users khi trang load
window.addEventListener("DOMContentLoaded", async () => {
    try {
        const response = await fetch("/admin/chat/users")
        const data = await response.json()

        data.users.forEach((user) => {
            activeUsers.set(user.userId, user)
        })

        renderUserList()
    } catch (error) {
        console.error("Error loading users:", error)
    }
})
