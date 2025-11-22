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
