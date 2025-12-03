// src/routes/site.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const siteController = require('../app/controllers/SiteController');
const Transaction = require('../app/models/Transaction');
const Invoice = require('../app/models/Invoice');
const db = require('../config/db');
const {
  requireAuth,
  requireCompleteProfile,
} = require('../middlewares/requireAuth');

// MoMo Payment Callback Handler
const momoConfig = {
  secretKey: 'SetA5RDnLHvt51AULf51DyauxUo3kDU6',
};

// ✅ Trang chủ - không cần auth
router.get('/', (req, res, next) => {
  siteController.index(req, res, next);
});

// ✅ About - không cần auth
router.get('/about', siteController.about);

// ✅ FIX: Profile - CẦN requireAuth
router.get('/profile', requireAuth, siteController.profile);

// ✅ Protected routes - Bắt buộc đăng nhập + thông tin đầy đủ
router.post('/profile/update', requireAuth, siteController.updateProfile);

router.get(
  '/checkout',
  requireAuth,
  requireCompleteProfile,
  siteController.checkout
);

router.post(
  '/payment',
  requireAuth,
  requireCompleteProfile,
  siteController.payment
);

router.get('/chat/history', requireAuth, siteController.chatHistory);

// ✅ MoMo Return Callback - User is redirected here after payment
router.get('/return', async (req, res) => {
  try {
    const { resultCode, message, orderId, transId } = req.query;

    console.log('=== MoMo Return Callback ===');
    console.log('resultCode:', resultCode);
    console.log('message:', message);
    console.log('orderId:', orderId);
    console.log('transId:', transId);

    // Lấy thông tin pending payment từ session
    const pendingPayment = req.session.pendingPayment;

    if (!pendingPayment) {
      console.warn('⚠️ No pending payment found in session');
      return res.render('error', {
        layout: 'payment',
        message: 'Không tìm thấy thông tin thanh toán.',
        error: 'Session expired or invalid payment',
        retryUrl: '/checkout',
      });
    }

    const { invoiceId, amount } = pendingPayment;

    // ✅ Lưu transaction vào database với InvoiceID
    try {
      await Transaction.saveTransaction({
        InvoiceID: invoiceId,
        orderId,
        transId: transId || `TRANS_${Date.now()}`,
        amount: parseInt(amount),
        resultCode: parseInt(resultCode),
        message: message || 'OK',
        payType: 'momo',
        partnerCode: 'MOMOLRJZ20181206',
        requestId: orderId,
        responseTime: Date.now(),
        extraData: '',
      });

      console.log('✓ Transaction saved to database');

      // Cập nhật trạng thái Invoice
      if (resultCode === '0') {
        // ✅ Payment successful - create Cart and CartItems
        const pendingPayment = req.session.pendingPayment;
        if (
          pendingPayment &&
          pendingPayment.cartItems &&
          pendingPayment.cartItems.length > 0
        ) {
          try {
            const cartID = await Invoice.createCartFromItems(
              req.user?.id || req.session.userId,
              pendingPayment.cartItems
            );
            // Update Invoice with CartID
            await db.query(`UPDATE Invoice SET CartID = ? WHERE ID = ?`, [
              cartID,
              invoiceId,
            ]);
            console.log(
              `✓ Created Cart ${cartID} and linked to Invoice ${invoiceId}`
            );

            // 🆕 TRỪ SỐ LƯỢNG SẢN PHẨM TRONG KHO SAU KHI THANH TOÁN THÀNH CÔNG
            try {
              await Invoice.decreaseProductStock(pendingPayment.cartItems);
              console.log('✅ Stock decreased successfully after MoMo payment');
            } catch (stockError) {
              console.error(
                '❌ Error decreasing stock after MoMo payment:',
                stockError
              );
              // Log lỗi nhưng vẫn cho phép đơn hàng được lưu
            }
          } catch (cartError) {
            console.error('Error creating cart:', cartError);
          }
        }

        // Payment successful - giữ lại status Prepare, chỉ cập nhật Payment
        await Invoice.updateInvoicePayment(invoiceId, 'Paid'); // ✅ Đánh dấu là đã thanh toán
        console.log(
          '✓ Invoice payment successful, kept Prepare status with Paid payment'
        );
      } else {
        // Payment failed - giữ lại status Prepare, Payment = Unpaid
        await Invoice.updateInvoicePayment(invoiceId, 'Unpaid');
        console.log('✗ Invoice payment failed, kept Prepare status');
      }
    } catch (dbError) {
      console.error('Failed to save transaction:', dbError.message);
      // Không block user, vẫn hiển thị kết quả
    }

    // Xóa pending payment khỏi session
    delete req.session.pendingPayment;

    if (resultCode === '0') {
      // ✅ Payment successful
      console.log('✓ Payment successful');
      res.render('paymentSuccess', {
        layout: 'status',
        title: 'Thanh toán thành công',
        orderId: orderId,
        transId: transId,
        message: message || 'Thanh toán thành công',
      });
    } else {
      // ❌ Payment failed
      console.log('✗ Payment failed with code:', resultCode);
      res.render('paymentFailed', {
        layout: 'status',
        title: 'Thanh toán thất bại',
        resultCode: resultCode,
        message: message || 'Giao dịch không thể hoàn tất',
      });
    }
  } catch (error) {
    console.error('Error in /return route:', error);
    res.status(500).render('error', {
      layout: 'status',
      message: 'Lỗi khi xử lý kết quả thanh toán.',
      error: error.message,
      retryUrl: '/checkout',
    });
  }
});

// ✅ MoMo IPN Callback - Async notification from MoMo server
router.post('/ipn', async (req, res) => {
  try {
    const data = req.body;
    const {
      signature,
      orderId,
      resultCode,
      amount,
      transId,
      partnerCode,
      requestId,
      responseTime,
      extraData,
    } = data;

    console.log('=== MoMo IPN Callback ===');
    console.log('orderId:', orderId);
    console.log('resultCode:', resultCode);
    console.log('transId:', transId);
    console.log('amount:', amount);

    // Verify signature
    let rawSignature = `accessKey=${data.accessKey}&amount=${
      data.amount
    }&extraData=${data.extraData || ''}&message=${data.message}&orderId=${
      data.orderId
    }&orderInfo=${data.orderInfo}&orderType=${data.orderType}&partnerCode=${
      data.partnerCode
    }&payType=${data.payType}&requestId=${data.requestId}&responseTime=${
      data.responseTime
    }&resultCode=${data.resultCode}&transId=${data.transId}`;

    const calculatedSignature = crypto
      .createHmac('sha256', momoConfig.secretKey)
      .update(rawSignature)
      .digest('hex');

    if (signature !== calculatedSignature) {
      console.warn('✗ Invalid MoMo IPN signature');
      return res.status(200).json({
        resultCode: 0,
        message: 'Signature verification failed',
      });
    }

    console.log('✓ Signature verified');

    // Kiểm tra xem transaction đã tồn tại chưa
    const existingTrans = await Transaction.getTransactionByTransId(transId);

    if (!existingTrans) {
      console.log('ℹ Transaction not found in DB, will save from IPN');

      await Transaction.saveTransaction({
        InvoiceID: null,
        orderId,
        requestId,
        partnerCode,
        transId,
        amount: parseInt(amount),
        resultCode: parseInt(resultCode),
        message: data.message || 'OK',
        payType: data.payType || 'momo',
        responseTime: parseInt(responseTime),
        extraData: extraData || '',
      });

      console.log(`✓ Transaction saved from IPN: transId=${transId}`);
    } else {
      console.log(`ℹ Transaction already exists: transId=${transId}`);
    }

    // Luôn trả về success cho MoMo
    res.status(200).json({
      resultCode: 0,
      message: 'IPN received successfully',
    });
  } catch (error) {
    console.error('Error in /ipn route:', error);
    // Vẫn trả về success để MoMo không retry
    res.status(200).json({
      resultCode: 0,
      message: 'IPN processed with errors',
    });
  }
});

router.post(
  '/cart/validate-stock',
  siteController.validateCartStock.bind(siteController)
);

module.exports = router;
