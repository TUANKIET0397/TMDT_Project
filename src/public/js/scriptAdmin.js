// Xử lý xóa đơn hàng
document.querySelectorAll(".section-icon__trash i").forEach((icon) => {
    icon.addEventListener("click", async function () {
        const invoiceID = this.getAttribute("data-invoice-id")
        if (confirm("Delete this order?")) {
            console.log("Deleting order ID:", invoiceID)
            try {
                const response = await fetch(`/admin/invoice/${invoiceID}`, {
                    method: "DELETE",
                })
                const data = await response.json()
                if (data.success) {
                    window.location.reload()
                    
                }

            return
            } catch (error) {
                alert("Error deleting order")
                window.location.reload()
            }
        }
    })
})

// XÓA TẤT CẢ ĐƠN HÀNG
document.getElementById("delete-all-btn").addEventListener("click", async function () {
    if (confirm("Delete ALL orders?")) {
        try {
            const res = await fetch("/admin/invoice/delete/all", {
                method: "DELETE"
            });

            const data = await res.json();

            if (data.success) {
                window.location.reload();
            }
        } catch (error) {
            alert("Error deleting all orders");
            window.location.reload();
        }
    }
});
