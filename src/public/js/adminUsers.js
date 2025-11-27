// public/js/adminUsers.js
document.addEventListener("DOMContentLoaded", () => {
  const root = document.querySelector("[data-user-base]");
  const BASE_PATH = root?.dataset.userBase || "/admin/users";

  const deleteAllBtn = document.getElementById("delete-all-btn");
  if (!deleteAllBtn) return;

  deleteAllBtn.addEventListener("click", async () => {
    const checked = Array.from(
      document.querySelectorAll(".section-checkbox:checked")
    );
    const ids = checked.map((c) => c.value).filter(Boolean);

    if (!ids.length) {
      alert("Please select at least one user to delete.");
      return;
    }

    if (!confirm(`Delete ${ids.length} selected user(s)?`)) return;

    try {
      const res = await fetch(`${BASE_PATH}/delete/selected`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });

      const data = await res.json();
      if (data.success) {
        window.location.reload();
      } else {
        alert(data.message || "Failed to delete selected users");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting selected users");
    }
  });
});


// src/public/js/adminUsers.js

document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.querySelector(".user-search-box input")
    const userRows = Array.from(
        document.querySelectorAll(".section__inner-label")
    )

    // Nếu không có input hoặc không có row thì thôi
    if (!searchInput || userRows.length === 0) return

    const NO_RESULTS_ID = "users-no-results-row"
    let noResultsRow = null

    // Hàm bỏ dấu tiếng Việt
    function removeAccent(str) {
        if (!str) return ""
        return str
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d")
            .replace(/Đ/g, "D")
    }

    // Lấy text dùng để search của từng dòng
    function getRowSearchText(row) {
        const idText =
            row.querySelector(".section-checkmark")?.textContent || ""
        const nameText =
            row.querySelector(".section__info-name")?.textContent || ""
        const emailText =
            row.querySelector(".section__info-mail")?.textContent || ""
        // .section-item__date: phone & invoice; querySelector lấy cái đầu (phone)
        const phoneText =
            row.querySelector(".section-item__date")?.textContent || ""
        const countryText =
            row.querySelector(".section-item__location")?.textContent || ""
        const totalText =
            row.querySelector(".section-item__total")?.textContent || ""

        const all = [
            idText,
            nameText,
            emailText,
            phoneText,
            countryText,
            totalText,
        ]
            .join(" ")
            .toLowerCase()

        return removeAccent(all)
    }

    // Cache sẵn text search cho từng row
    const rowSearchMap = new Map()
    userRows.forEach((row) => {
        rowSearchMap.set(row, getRowSearchText(row))
    })

    // Tạo row "No matching users" (chỉ tạo khi cần)
    function ensureNoResultsRow() {
        if (noResultsRow) return noResultsRow

        noResultsRow = document.createElement("div")
        noResultsRow.id = NO_RESULTS_ID
        noResultsRow.className = "section__inner-label"
        noResultsRow.style.display = "none"
        noResultsRow.innerHTML =
            '<p style="text-align: center; padding: 20px; grid-column: 1 / -1;">No matching users</p>'

        // Gắn sau các row hiện có
        const parent = userRows[0].parentElement
        parent.appendChild(noResultsRow)
        return noResultsRow
    }

    function hideNoResultsRow() {
        if (noResultsRow) {
            noResultsRow.style.display = "none"
        }
    }

    function showNoResultsRow() {
        const row = ensureNoResultsRow()
        row.style.display = ""
    }

    // Lọc user theo từ khóa
    function filterUsers(term) {
        const keyword = removeAccent(term.trim().toLowerCase())
        let visibleCount = 0

        userRows.forEach((row) => {
            // Nếu trong DB không có user (chỉ có dòng "No users found" gốc)
            // thì rowSearchMap vẫn có text "No users found" -> cứ xử lý bình thường.
            if (!keyword) {
                // Không nhập gì -> hiện tất cả
                row.style.display = ""
                visibleCount++
                return
            }

            const rowText = rowSearchMap.get(row) || ""
            const matched = rowText.includes(keyword)

            row.style.display = matched ? "" : "none"
            if (matched) visibleCount++
        })

        if (visibleCount === 0) {
            showNoResultsRow()
        } else {
            hideNoResultsRow()
        }
    }

    // Lắng nghe sự kiện gõ trong ô search
    searchInput.addEventListener("input", (e) => {
        filterUsers(e.target.value)
    })
})
