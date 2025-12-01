// src/public/js/admin-chat.js

// Kết nối Socket.IO
const socket = io()

// Đăng ký là admin
socket.emit("admin:join")

// DOM Elements
const usersList = document.getElementById("adminUserList")
const chatMessages = document.querySelector(".chat-messages")
const chatInput = document.querySelector(".chat-input")
const sendButton = document.querySelector(".send-button")
const chatUserName = document.querySelector(".chat-user-name")
const searchInput = document.querySelector(".user-search-input")

// Store
let activeUsers = new Map() // userId -> user data
let currentChatUserId = null
let lastMessageDate = null
let currentSearchTerm = ""

const PLACEHOLDER_DEFAULT = "Select a conversation to get started"

const showChatPlaceholder = (
    message = PLACEHOLDER_DEFAULT,
    subtext = "Customer messages will appear here."
) => {
    if (!chatMessages) return
    chatMessages.innerHTML = `
        <div class="chat-empty-state">
            <p>${message}</p>
            <span>${subtext}</span>
        </div>
    `
}

showChatPlaceholder()

if (searchInput) {
    searchInput.addEventListener("input", (e) => {
        currentSearchTerm = e.target.value.trim().toLowerCase()
        renderUserList()
    })
}

// Nhận thông báo có user mới
socket.on("admin:new-user", (data) => {
    console.log("New user:", data)
    const displayName =
        data.name || `User ${String(data.userId).substring(0, 8)}`
    if (!activeUsers.has(data.userId)) {
        activeUsers.set(data.userId, {
            userId: data.userId,
            name: displayName,
            lastMessage: "New conversation",
            unreadCount: 0,
            lastActivity: data.timestamp || new Date().toISOString(),
        })
    } else {
        const user = activeUsers.get(data.userId)
        user.name = displayName
        user.lastActivity = data.timestamp || user.lastActivity
        activeUsers.set(data.userId, user)
    }
    renderUserList()
})

// Nhận tin nhắn từ user
socket.on("admin:receive-message", (data) => {
    console.log("Received message from user:", data)

    const displayName =
        data.userName || `User ${String(data.userId).substring(0, 8)}`

    if (!activeUsers.has(data.userId)) {
        activeUsers.set(data.userId, {
            userId: data.userId,
            name: displayName,
            lastMessage: data.productName ? data.productName : data.message,
            unreadCount: 0,
            lastActivity: data.timestamp || new Date().toISOString(),
        })
    }

    const user = activeUsers.get(data.userId)
    user.name = displayName
    user.lastMessage = data.productName ? data.productName : data.message
    user.lastActivity = data.timestamp || new Date().toISOString()

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
function addOrUpdateUser(userId, lastMessage = "New conversation", meta = {}) {
    const name = meta.name || `User ${String(userId).substring(0, 8)}`
    if (!activeUsers.has(userId)) {
        activeUsers.set(userId, {
            userId,
            name,
            lastMessage,
            unreadCount: 0,
            lastActivity: meta.lastActivity || new Date().toISOString(),
        })
    } else {
        const user = activeUsers.get(userId)
        user.name = name
        user.lastMessage = lastMessage
        user.lastActivity = meta.lastActivity || user.lastActivity
        activeUsers.set(userId, user)
    }
    renderUserList()
}

// Render danh sách user
function renderUserList() {
    if (!usersList) return
    usersList.innerHTML = ""

    // Convert Map to array and sort by unreadCount desc, then by name
    const sortedUsers = Array.from(activeUsers.values()).sort((a, b) => {
        if ((b.unreadCount || 0) !== (a.unreadCount || 0)) {
            return (b.unreadCount || 0) - (a.unreadCount || 0)
        }
        const aTime = new Date(a.lastActivity || 0).getTime()
        const bTime = new Date(b.lastActivity || 0).getTime()
        if (bTime !== aTime) {
            return bTime - aTime
        }
        return a.name.localeCompare(b.name)
    })

    const filteredUsers = sortedUsers.filter((user) => {
        if (!currentSearchTerm) return true
        const haystack = `${user.name || ""} ${user.email || ""}`.toLowerCase()
        return haystack.includes(currentSearchTerm)
    })

    if (filteredUsers.length === 0) {
        usersList.innerHTML = `<div class="user-empty-state"><p>No conversations found.</p></div>`
        return
    }

    filteredUsers.forEach((user) => {
        const userDiv = document.createElement("div")
        userDiv.className = "user-item"
        if (user.userId === currentChatUserId) {
            userDiv.classList.add("active")
        }

        const badgeHTML =
            user.unreadCount && user.unreadCount > 0
                ? `<div class="user-item-badge">${user.unreadCount}</div>`
                : ""

        userDiv.innerHTML = `
            <div class="user-item-avatar">
                <span>${(user.name || "U").charAt(0).toUpperCase()}</span>
            </div>
            <div class="user-item-info">
                <div class="user-item-name">${user.name}</div>
                <div class="user-item-meta">
                    <span class="user-item-time">${formatRelativeTime(
                        user.lastActivity
                    )}</span>
                </div>
                ${badgeHTML}
            </div>
        `

        // <span class="user-item-message">${escapeHtml(
        //     user.lastMessage || "New conversation"
        // )}</span>

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
    showChatPlaceholder("Loading conversation...")

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
        if (!data.messages || data.messages.length === 0) {
            showChatPlaceholder("No messages yet.", user.name)
            return
        }

        data.messages.forEach((msg) => {
            const type = msg.AdminID ? "sent" : "received"
            if (msg.ProductID && msg.ProductName) {
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
            if (msg.Message && msg.Message.trim() !== "") {
                addMessage(msg.Message, type, msg.SendTime)
            }
        })
    } catch (error) {
        console.error("Error loading chat history:", error)
        showChatPlaceholder("Unable to load conversation.")
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

    if (activeUsers.has(currentChatUserId)) {
        const user = activeUsers.get(currentChatUserId)
        user.lastMessage = message
        user.lastActivity = new Date().toISOString()
        user.unreadCount = 0
        activeUsers.set(currentChatUserId, user)
        renderUserList()
    }
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
        ? `<div class="message-time">${formatTimestamp(timestamp)}</div>`
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
    productDiv.className = `message ${type} product`
    productDiv.style.width = "100%"
    productDiv.style.maxWidth = "none"
    const timeHTML = data.timestamp
        ? `<div class="message-time">${formatTimestamp(data.timestamp)}</div>`
        : ""
    productDiv.innerHTML = `
        ${timeHTML}
        <div class="product-message">
            <div class="product-image" style="background-image: url('${escapeHtml(
                data.productImage
            )}');"></div>
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
            activeUsers.set(user.userId, {
                userId: user.userId,
                name:
                    user.name || `User ${String(user.userId).substring(0, 8)}`,
                email: user.email || null,
                lastMessage: user.lastMessage || "New conversation",
                unreadCount: 0,
                lastActivity: user.lastActivity,
            })
        })

        renderUserList()
    } catch (error) {
        console.error("Error loading users:", error)
    }
})

function formatRelativeTime(input) {
    if (!input) return ""
    const date = new Date(input)
    if (Number.isNaN(date.getTime())) return ""
    const now = Date.now()
    const diffMs = now - date.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)
    if (diffMinutes < 1) return "just now"
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
    })
}
