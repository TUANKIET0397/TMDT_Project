// src/public/js/register.js

document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("registerForm")

    if (!form) {
        console.error("Register form not found")
        return
    }

    form.addEventListener("submit", async function (e) {
        e.preventDefault()

        // Lấy dữ liệu từ form
        const formData = {
            firstname: document.getElementById("firstname").value.trim(),
            lastname: document.getElementById("lastname").value.trim(),
            Gender: document.getElementById("Gender").value,
            birthday: document.getElementById("birthday").value,
            address: document.getElementById("address").value.trim(),
            email: document.getElementById("email").value.trim(),
            password: document.getElementById("password").value,
            repassword: document.getElementById("repassword").value,
        }

        console.log("📝 Form data:", formData)

        // Validate client-side
        if (!formData.firstname || !formData.lastname) {
            alert("Please enter your first name and last name")
            return
        }

        if (!formData.Gender) {
            alert("Please select your gender")
            return
        }

        if (!formData.birthday) {
            alert("Please select your birthday")
            return
        }

        if (!formData.address) {
            alert("Please enter your address")
            return
        }

        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(formData.email)) {
            alert("Please enter a valid email address")
            return
        }

        // Validate password
        if (formData.password.length < 8) {
            alert("Password must be at least 8 characters long")
            return
        }

        if (formData.password !== formData.repassword) {
            alert("Passwords do not match")
            return
        }

        // Disable submit button
        const submitBtn = form.querySelector('button[type="submit"]')
        const originalText = submitBtn.textContent
        submitBtn.disabled = true
        submitBtn.textContent = "Registering..."

        try {
            console.log("🚀 Sending registration request...")

            const response = await fetch("/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            })

            console.log("📥 Response status:", response.status)

            const result = await response.json()
            console.log("📥 Response data:", result)

            if (response.ok && result.success) {
                alert("✅ " + result.message)
                console.log("✅ Redirecting to:", result.redirect)
                window.location.href = result.redirect || "/"
            } else {
                alert(
                    "❌ Registration failed: " +
                        (result.message || "Unknown error")
                )
                console.error("Registration failed:", result)
            }
        } catch (error) {
            console.error("❌ Registration error:", error)
            alert("❌ Error: " + error.message)
        } finally {
            // Re-enable submit button
            submitBtn.disabled = false
            submitBtn.textContent = originalText
        }
    })
})
