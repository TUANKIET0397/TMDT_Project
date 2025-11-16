document.addEventListener("DOMContentLoaded", () => {
    // Handle sort by status
    const sortSelect = document.getElementById("sort-status")
    if (sortSelect) {
        sortSelect.addEventListener("change", (e) => {
            const status = e.target.value
            const url = status ? `/admin/invoice?sortBy=${status}` : `/admin/invoice`
            window.location.href = url
        })
    }

    // Only handle delete-all behavior here. Per-row deletion uses the existing form POSTs.
    const deleteAllBtn = document.getElementById("delete-all-btn")
    if (!deleteAllBtn) return

    deleteAllBtn.addEventListener("click", async () => {
        const checked = Array.from(
            document.querySelectorAll(".section-checkbox:checked")
        )
        const ids = checked.map((c) => c.value).filter(Boolean)

        // If none selected, confirm delete-all fallback
        if (!ids.length) {
            try {
                const res = await fetch("/admin/invoice/delete/all", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                })
                const data = await res.json()
                if (data.success) window.location.reload()
                else alert(data.message || "Failed to delete all orders")
            } catch (err) {
                console.error(err)
                alert("Please select at least one order to delete.")
            }

            return
        }

        if (!confirm(`Delete ${ids.length} selected order(s)?`)) return

        try {
            const res = await fetch("/admin/invoice/delete/selected", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids }),
            })

            const data = await res.json()
            if (data.success) window.location.reload()
            else alert(data.message || "Failed to delete selected orders")
        } catch (err) {
            console.error(err)
            alert("Error deleting selected orders")
        }
    })
})
