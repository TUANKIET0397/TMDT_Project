// public/js/login.js

document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("loginForm")
    const emailInput = document.getElementById("email") // ✅ Đổi từ username sang email
    const passwordInput = document.getElementById("password")
    const rememberMeCheckbox = document.getElementById("rememberMe")

    // ✅ Load saved email if "Remember me" was checked
    const savedEmail = localStorage.getItem("rememberedEmail")
    if (savedEmail) {
        emailInput.value = savedEmail
        rememberMeCheckbox.checked = true
    }

    form.addEventListener("submit", async function (e) {
        e.preventDefault()

        // ✅ Lấy dữ liệu từ form - đổi username thành email
        const formData = {
            email: emailInput.value.trim(),
            password: passwordInput.value,
        }

        // ✅ Validate phía client
        if (!formData.email || !formData.password) {
            alert("Please enter both email and password!")
            return
        }

        // ✅ Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(formData.email)) {
            alert("Please enter a valid email address!")
            emailInput.focus()
            return
        }

        // Disable button để tránh submit nhiều lần
        const submitButton = form.querySelector('button[type="submit"]')
        const originalText = submitButton.textContent
        submitButton.disabled = true
        submitButton.textContent = "Logging in..."

        try {
            // Gửi request đến server
            const response = await fetch("/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            })

            const data = await response.json()

            if (data.success) {
                // ✅ Save email if "Remember me" is checked
                if (rememberMeCheckbox.checked) {
                    localStorage.setItem("rememberedEmail", formData.email)
                } else {
                    localStorage.removeItem("rememberedEmail")
                }

                // Redirect đến trang chủ
                window.location.href = data.redirect || "/"
            } else {
                alert(data.message || "Login failed!")
                submitButton.disabled = false
                submitButton.textContent = originalText

                // Clear password field on failed login
                passwordInput.value = ""
                passwordInput.focus()
            }
        } catch (error) {
            console.error("Error:", error)
            alert("An error occurred. Please try again!")
            submitButton.disabled = false
            submitButton.textContent = originalText
        }
    })

    // Enter key support
    ;[emailInput, passwordInput].forEach((input) => {
        input.addEventListener("keypress", function (e) {
            if (e.key === "Enter") {
                form.dispatchEvent(new Event("submit"))
            }
        })
    })

    // ✅ Focus on email field on page load
    emailInput.focus()
})
