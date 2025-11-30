// src/public/js/user-chat.js

document.addEventListener("DOMContentLoaded", () => {
    const chatDrawer = document.getElementById("chatDrawer")
    const chatOverlay = document.querySelector(".chat-overlay")
    const closeChat = document.getElementById("closeChat")
    const chatInput = document.getElementById("chatInput")
    const sendMessage = document.getElementById("sendMessage")
    const chatMessages = document.getElementById("chatMessages")
    const chatIcon = document.getElementById("chatIcon")

    const hasChatUI =
        chatDrawer &&
        chatOverlay &&
        closeChat &&
        chatInput &&
        sendMessage &&
        chatMessages

    const currentPath =
        typeof window.getCurrentPath === "function"
            ? window.getCurrentPath()
            : window.location.pathname || "/"

    const isLoggedIn =
        typeof window.isUserLoggedIn === "function"
            ? window.isUserLoggedIn()
            : Boolean(window.APP_USER && window.APP_USER.id)

    const requestLogin = () => {
        sessionStorage.setItem("postLoginChat", "1")
        if (typeof window.requireLogin === "function") {
            window.requireLogin({ next: currentPath, intent: "chat" })
        } else {
            window.location.href = `/auth?next=${encodeURIComponent(
                currentPath
            )}`
        }
    }

    if (!chatIcon) {
        console.warn("Chat icon not found in DOM")
    }

    function handleChatRequest(onAuthorized) {
        if (!isLoggedIn) {
            requestLogin()
            return
        }
        if (!hasChatUI) {
            console.warn("Chat UI not available on this page")
            return
        }
        if (typeof onAuthorized === "function") {
            onAuthorized()
        }
    }

    if (chatIcon) {
        chatIcon.addEventListener("click", (e) => {
            e.preventDefault()
            handleChatRequest(() => openChatDrawer())
        })
    }

    document.addEventListener("click", function (e) {
        const consultBtn = e.target.closest(".btn-consult")
        if (!consultBtn) return
        e.preventDefault()
        handleChatRequest(() => {
            openChatDrawer()
            const productCard = consultBtn.closest(".product-detail")
            if (!productCard) return
            const productData = {
                productId: productCard.dataset.productId,
                productName: productCard.dataset.productName,
                productPrice: productCard.dataset.productPrice,
                productImage: productCard.dataset.productImage,
            }
            sendProductMessage(productData)
        })
    })

    if (!isLoggedIn || !hasChatUI) {
        return
    }

    const socket = io()
    let userId = window.APP_USER?.id

    socket.emit("user:join", { userId })

    socket.on("user:joined", (data) => {
        console.log("Joined as:", data.userId)
        userId = data.userId
    })

    let lastMessageDate = null
    let historyLoaded = false

    function openChatDrawer() {
        chatDrawer.classList.add("active")
        chatOverlay.classList.add("active")
        if (!historyLoaded) {
            loadChatHistory()
        }
    }

    function closeChatDrawer() {
        chatDrawer.classList.remove("active")
        chatOverlay.classList.remove("active")
    }

    closeChat.addEventListener("click", closeChatDrawer)
    chatOverlay.addEventListener("click", closeChatDrawer)

    const shouldAutoOpenChat = sessionStorage.getItem("postLoginChat") === "1"
    if (shouldAutoOpenChat) {
        sessionStorage.removeItem("postLoginChat")
        openChatDrawer()
    }

    async function loadChatHistory() {
        try {
            const response = await fetch("/chat/history")
            if (!response.ok) throw new Error("Failed to load history")
            const data = await response.json()
            const messages = Array.isArray(data.messages) ? data.messages : []
            chatMessages.innerHTML = ""
            lastMessageDate = null
            messages.forEach((msg) => {
                const type = msg.AdminID ? "received" : "sent"
                if (msg.ProductID && msg.ProductName) {
                    addProductToChat(
                        {
                            productName: msg.ProductName,
                            productPrice: msg.ProductPrice,
                            productImage: msg.ProductImage,
                        },
                        msg.SendTime,
                        type
                    )
                }
                if (msg.Message && msg.Message.trim() !== "") {
                    addMessageToChat(msg.Message, type, msg.SendTime)
                }
            })
            historyLoaded = true
        } catch (error) {
            console.error("Error loading chat history:", error)
        }
    }

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

    function sendProductMessage(productData) {
        if (!productData || !productData.productName) return
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

        addProductToChat(productData, ts)
    }

    socket.on("user:message-sent", (data) => {
        if (data.productName) {
            addProductToChat(
                {
                    productName: data.productName,
                    productPrice: data.productPrice,
                    productImage: data.productImage,
                },
                data.timestamp,
                "sent"
            )
            return
        }
        addMessageToChat(data.message, "sent", data.timestamp)
    })

    socket.on("user:receive-message", (data) => {
        if (data.productName) {
            addProductToChat(
                {
                    productName: data.productName,
                    productPrice: data.productPrice,
                    productImage: data.productImage,
                },
                data.timestamp,
                "received"
            )
        }
        if (data.message && data.message.trim() !== "") {
            addMessageToChat(data.message, "received", data.timestamp)
        }
    })

    function addMessageToChat(message, type, timestamp) {
        if (shouldShowDateSeparator(timestamp)) {
            addDateSeparator(timestamp)
        }

        const messageDiv = document.createElement("div")
        messageDiv.className = `message ${type}`
        const timeHTML = timestamp
            ? `<div class="message-time" style="font-size: 12px; color: #999; margin-bottom: 3px;">${formatTimestamp(
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

    function addProductToChat(product, timestamp, type = "sent") {
        if (shouldShowDateSeparator(timestamp)) {
            addDateSeparator(timestamp)
        }

        const productDiv = document.createElement("div")
        productDiv.className = `message ${type} product`
        const timeHTML = timestamp
            ? `<div class="message-time">${formatTimestamp(timestamp)}</div>`
            : ""
        productDiv.innerHTML = `
            ${timeHTML}
            <div class="product-message">
                <div class="product-image" style="background-image: url('${escapeHtml(
                    product.productImage || "/img/default.jpg"
                )}');"></div>
                <div class="product-info">
                    <div class="product-name">${escapeHtml(
                        product.productName || "Product"
                    )}</div>
                    <div class="chat-price">${escapeHtml(
                        product.productPrice || "0"
                    )}$</div>
                </div>
            </div>
        `
        chatMessages.appendChild(productDiv)
        scrollToBottom()
    }

    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight
    }
})
