// Sidebar dropdown (Dashboard)
const dashboardBtn = document.querySelector(".dashboard-btn")
const dashboardMenu = document.querySelector(".dashboard_menu")
const dashboardIcon = document.querySelector(".dashboard-icon")
const menuItems = document.querySelectorAll(".menu-item")

dashboardMenu.style.maxHeight = "0"
dashboardMenu.style.opacity = "0"
dashboardMenu.style.overflow = "hidden"
dashboardMenu.style.transition = "max-height 0.5s ease, opacity 0.5s ease"

let isMenuOpen = false
dashboardBtn.addEventListener("click", function () {
    isMenuOpen = !isMenuOpen
    if (isMenuOpen) {
        dashboardMenu.style.maxHeight = dashboardMenu.scrollHeight + "px"
        dashboardMenu.style.opacity = "1"
        dashboardIcon.style.transform = "rotate(90deg)"
        dashboardIcon.style.transition = "transform 0.3s ease"
    } else {
        dashboardMenu.style.maxHeight = "0"
        dashboardMenu.style.opacity = "0"
        dashboardIcon.style.transform = "rotate(0deg)"
    }
})

// Active menu item
menuItems.forEach((item) => {
    const container = item.querySelector(".item_container")
    if (!container) return
    item.addEventListener("click", function (e) {
        e.stopPropagation()
        const isActive = container.classList.contains("menu-item--active")
        menuItems.forEach((i) => {
            const c = i.querySelector(".item_container")
            if (c) c.classList.remove("menu-item--active")
        })
        if (!isActive) container.classList.add("menu-item--active")
    })
})

// === Chart.js setup ===
const revenueCtx = document.getElementById("revenueChart")
new Chart(revenueCtx, {
    type: "line",
    data: {
        labels: [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
        ],
        datasets: [
            {
                label: "Revenue",
                data: [
                    0, 5000, 12000, 12500, 15000, 20000, 25000, 27000, 31000,
                    35000, 38000, 40000,
                ],
                borderColor: "#CB3CFF",
                backgroundColor: "rgba(128,90,213,0.3)",
                tension: 0.4,
                fill: true,
            },
        ],
    },
    options: {
        plugins: { legend: { display: false } },
        scales: {
            x: { ticks: { color: "#a0aec0" }, grid: { color: "#2d3748" } },
            y: { ticks: { color: "#a0aec0" }, grid: { color: "#2d3748" } },
        },
    },
})

const clothesCtx = document.getElementById("clothesChart")
new Chart(clothesCtx, {
    type: "bar",
    data: {
        labels: [
            "T-shirt",
            "Shirt",
            "Shoes",
            "Knitwear",
            "Pants",
            "Socks",
            "Shorts",
            "Outerwear",
        ],
        datasets: [
            {
                label: "Men",
                data: [350, 500, 280, 430, 210, 150, 240, 330],
                backgroundColor: "#CB3CFF",
            },
            {
                label: "Women",
                data: [250, 400, 220, 310, 260, 180, 200, 280],
                backgroundColor: "#63b3ed",
            },
        ],
    },
    options: {
        plugins: {
            legend: {
                labels: { color: "#a0aec0", font: { size: 9, weight: "200" } },
            },
        },
        scales: {
            x: {
                ticks: {
                    color: "#a0aec0",
                    font: { size: 7, weight: "200" },
                    maxRotation: 0,
                    minRotation: 0,
                },
            },
            y: { ticks: { color: "#a0aec0" }, grid: { color: "#2d3748" } },
        },
    },
})

const productCtx = document.getElementById("productChart")
new Chart(productCtx, {
    type: "line",
    data: {
        labels: [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
        ],
        datasets: [
            {
                label: "Outerwear",
                data: [
                    80, 120, 160, 150, 180, 220, 300, 270, 310, 250, 200, 220,
                ],
                borderColor: "#CB3CFF",
                backgroundColor: "rgba(99,179,237,0.2)",
                tension: 0.4,
                fill: true,
            },
        ],
    },
    options: {
        plugins: { legend: { display: false } },
        scales: {
            x: {
                ticks: {
                    color: "#a0aec0",
                    font: { size: 7, weight: "200" },
                    maxRotation: 0,
                    minRotation: 0,
                },
            },
            y: { ticks: { color: "#a0aec0" }, grid: { color: "#2d3748" } },
        },
    },
})

// check all
const checkAll = document.getElementById("checkAll")
const checkboxes = document.querySelectorAll(".checkItem")
const rows = document.querySelectorAll(".invoice-table tbody tr")

checkAll.addEventListener("change", () => {
    checkboxes.forEach((cb, i) => {
        cb.checked = checkAll.checked
        rows[i].classList.toggle("selected", checkAll.checked)
    })
})

checkboxes.forEach((cb, i) => {
    cb.addEventListener("change", () => {
        rows[i].classList.toggle("selected", cb.checked)
        if (!cb.checked) checkAll.checked = false
        else if ([...checkboxes].every((c) => c.checked))
            checkAll.checked = true
    })
})
