const express = require("express")
const router = express.Router()
const crypto = require("crypto")

const siteController = require("../app/controllers/SiteController")
const Transaction = require("../app/models/Transaction")

// MoMo Payment Callback Handler
const momoConfig = {
    secretKey: "SetA5RDnLHvt51AULf51DyauxUo3kDU6",
}

// GET /site
router.get("/checkout", siteController.checkout) //lúc làm thêm post
router.post("/payment", siteController.payment)
router.get("/profile", siteController.profile) //lúc làm thêm post
router.get("/about", siteController.about)

// MoMo Return Callback - User is redirected here after payment
router.get("/return", async (req, res) => {
    try {
        const { resultCode, message, orderId, transId } = req.query

        console.log("=== MoMo Return Callback ===")
        console.log("resultCode:", resultCode)
        console.log("message:", message)
        console.log("orderId:", orderId)
        console.log("transId:", transId)

        // Save transaction to database
        try {
            await Transaction.saveTransaction({
                orderId,
                transId,
                resultCode: parseInt(resultCode),
                message,
                payType: "momo",
                responseTime: Date.now(),
                extraData: "",
            })
        } catch (dbError) {
            console.error("Failed to save transaction:", dbError.message)
            // Continue anyway - don't block the user
        }

        if (resultCode === "0") {
            // Payment successful
            console.log("✓ Payment successful")
            res.render("paymentSuccess", {
                layout: "payment",
                title: "Thanh toán thành công",
                orderId: orderId,
                transId: transId,
                message: message || "Thanh toán thành công",
            })
        } else {
            // Payment failed
            console.log("✗ Payment failed with code:", resultCode)
            res.render("paymentFailed", {
                layout: "payment",
                title: "Thanh toán thất bại",
                resultCode: resultCode,
                message: message || "Giao dịch không thể hoàn tất",
            })
        }
    } catch (error) {
        console.error("Error in /return route:", error)
        res.status(500).render("error", {
            layout: "payment",
            message: "Lỗi khi xử lý kết quả thanh toán.",
            error: error.message,
        })
    }
})

// MoMo IPN Callback - Async notification from MoMo server
router.post("/ipn", async (req, res) => {
    try {
        const data = req.body
        const { signature, orderId, resultCode, amount, transId, partnerCode, requestId, responseTime, extraData, orderInfo } = data

        console.log("=== MoMo IPN Callback ===")
        console.log("orderId:", orderId)
        console.log("resultCode:", resultCode)
        console.log("transId:", transId)
        console.log("amount:", amount)

        // Verify signature using the same logic as payment creation
        let rawSignature = `accessKey=${data.accessKey}&amount=${data.amount}&extraData=${data.extraData || ""}&ipnUrl=${data.ipnUrl}&orderId=${data.orderId}&orderInfo=${data.orderInfo}&partnerCode=${data.partnerCode}&requestId=${data.requestId}&responseTime=${data.responseTime}&resultCode=${data.resultCode}&transId=${data.transId}`

        const calculatedSignature = crypto
            .createHmac("sha256", momoConfig.secretKey)
            .update(rawSignature)
            .digest("hex")

        // Verify signature
        if (signature !== calculatedSignature) {
            console.warn("✗ Invalid MoMo IPN signature")
            return res.status(400).json({
                resultCode: 1,
                message: "Invalid signature",
            })
        }

        console.log("✓ Signature verified")

        // Save transaction to database
        try {
            const existingTrans = await Transaction.getTransactionByTransId(transId)
            if (!existingTrans) {
                // Only save if transaction doesn't already exist
                await Transaction.saveTransaction({
                    orderId,
                    requestId,
                    partnerCode,
                    transId,
                    amount: parseInt(amount),
                    resultCode: parseInt(resultCode),
                    message: data.message || "OK",
                    payType: "momo",
                    responseTime: parseInt(responseTime),
                    extraData: extraData || "",
                })
                console.log(`✓ Transaction saved from IPN: transId=${transId}`)
            } else {
                console.log(`ℹ Transaction already exists: transId=${transId}`)
            }
        } catch (dbError) {
            console.error("Failed to save transaction from IPN:", dbError.message)
            // Still return success to MoMo to acknowledge receipt
        }

        // Always return 200 to acknowledge receipt
        res.status(200).json({
            resultCode: 0,
            message: "IPN received",
        })
    } catch (error) {
        console.error("Error in /ipn route:", error)
        res.status(500).json({
            resultCode: 1,
            message: "Server error processing IPN",
        })
    }
})

router.get("/", (req, res, next) => {
    siteController.index(req, res, next)
})

module.exports = router
