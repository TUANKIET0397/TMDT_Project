// src/config/momo.js
const axios = require("axios")
const crypto = require("crypto")

const partnerCode = "MOMOLRJZ20181206"
const accessKey = "mTCKt9W3eU1m39TW"
const secretKey = "SetA5RDnLHvt51AULf51DyauxUo3kDU6"
const momoEndpoint = "https://test-payment.momo.vn/v2/gateway/api/create"

async function createPayment(orderId, amount, returnUrl, ipnUrl) {
    try {
        const requestId = Date.now().toString()
        const orderInfo = `Order ${orderId}`
        const requestType = "captureWallet"
        const extraData = ""

        const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${returnUrl}&requestId=${requestId}&requestType=${requestType}`
        const signature = crypto
            .createHmac("sha256", secretKey)
            .update(rawSignature)
            .digest("hex")

        const requestBody = {
            partnerCode,
            accessKey,
            requestId,
            amount,
            orderId,
            orderInfo,
            redirectUrl: returnUrl,
            ipnUrl,
            requestType,
            extraData,
            signature,
            lang: "vi",
        }

        const response = await axios.post(momoEndpoint, requestBody)
        return response.data
    } catch (error) {
        console.error("MoMo Payment Error:", error.message)
        throw error
    }
}

module.exports = { createPayment }

//“Trong môi trường test, tiền không thực sự đi đâu cả, chỉ giả lập để kiểm thử.”
//“Trong môi trường thật, tiền sẽ đi từ ví MoMo của khách hàng về tài khoản Merchant đã đăng ký.”
