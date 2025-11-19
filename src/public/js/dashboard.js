// Sidebar dropdown (Dashboard)
const dashboardBtn = document.querySelector('.dashboard-btn');
const dashboardMenu = document.querySelector('.dashboard_menu');
const dashboardIcon = document.querySelector('.dashboard-icon');
const dashboardItem = document.querySelector('.dashboard_item');
const menuItems = document.querySelectorAll('.menu-item');

dashboardMenu.style.maxHeight = '0';
dashboardMenu.style.opacity = '0';
dashboardMenu.style.overflow = 'hidden';
dashboardMenu.style.transition = 'max-height 0.5s ease, opacity 0.5s ease';

let isMenuOpen = false;
dashboardBtn.addEventListener('click', function () {
  isMenuOpen = !isMenuOpen;
  if (isMenuOpen) {
    dashboardMenu.style.maxHeight = dashboardMenu.scrollHeight + 'px';
    dashboardMenu.style.opacity = '1';
    dashboardIcon.style.transform = 'rotate(90deg)';
    dashboardIcon.style.transition = 'transform 0.3s ease';
  } else {
    dashboardMenu.style.maxHeight = '0';
    dashboardMenu.style.opacity = '0';
    dashboardIcon.style.transform = 'rotate(0deg)';
  }
});

// dashboard item click: add active class, persist state, and navigate
const dashboardItems = document.querySelectorAll('.dashboard_item');
dashboardItems.forEach((item) => {
  item.addEventListener('click', function (e) {
    e.stopPropagation();
    // Remove active from all dashboard items
    dashboardItems.forEach((i) => i.classList.remove('dashboard_item--active'));
    // Add active to clicked item
    this.classList.add('dashboard_item--active');
    // Persist to localStorage
    const text = this.textContent.trim();
    if (text) localStorage.setItem('sidebarActive', `dashboard:${text}`);
    // Navigate to the route if data-route exists
    const route = this.getAttribute('data-route');
    if (route) {
      window.location.href = route;
    }
  });
});

// logo click: clear sidebar active state
const sidebarLogo = document.getElementById('sidebarLogo');
if (sidebarLogo) {
  sidebarLogo.addEventListener('click', function (e) {
    // clear active state from localStorage
    localStorage.removeItem('sidebarActive');
    // remove all active classes
    menuItems.forEach((i) => {
      const c = i.querySelector('.item_container');
      if (c) c.classList.remove('menu-item--active');
    });
    dashboardItems.forEach((item) =>
      item.classList.remove('dashboard_item--active')
    );
    // collapse dashboard menu
    if (dashboardMenu) {
      dashboardMenu.style.maxHeight = '0';
      dashboardMenu.style.opacity = '0';
    }
    if (dashboardIcon) dashboardIcon.style.transform = 'rotate(0deg)';
  });
}

// restore active dashboard item from localStorage on page load
window.addEventListener('load', () => {
  const savedActive = localStorage.getItem('sidebarActive');
  if (savedActive && savedActive.startsWith('dashboard:')) {
    const itemText = savedActive.split(':')[1];
    dashboardItems.forEach((item) => {
      if (item.textContent.trim() === itemText) {
        item.classList.add('dashboard_item--active');
        // ensure menu is open when item is active
        if (dashboardMenu) {
          dashboardMenu.style.maxHeight = dashboardMenu.scrollHeight + 'px';
          dashboardMenu.style.opacity = '1';
        }
        if (dashboardIcon) dashboardIcon.style.transform = 'rotate(90deg)';
        isMenuOpen = true;
      }
    });
  }
});

// Active menu item
menuItems.forEach((item) => {
  const container = item.querySelector('.item_container');
  if (!container) return;
  item.addEventListener('click', function (e) {
    e.stopPropagation();
    const isActive = container.classList.contains('menu-item--active');
    menuItems.forEach((i) => {
      const c = i.querySelector('.item_container');
      if (c) c.classList.remove('menu-item--active');
    });
    if (!isActive) container.classList.add('menu-item--active');
  });
});

// === Chart.js setup ===
// ===== Chart handling =====
// We'll keep references so we can destroy charts if re-rendering
let revenueChartInstance = null;
let clothesChartInstance = null;
let productChartInstance = null;

// helper: safely get canvas and context
function getCanvasContext(id) {
  const el = document.getElementById(id);
  if (!el) return null;
  try {
    return el.getContext('2d');
  } catch (err) {
    console.warn('Cannot get canvas context for', id, err);
    return null;
  }
}

// helper: destroy chart instance if exists
function safeDestroy(chartInstance) {
  if (chartInstance && typeof chartInstance.destroy === 'function') {
    chartInstance.destroy();
  }
}

// Hàm vẽ charts với dữ liệu đã format
function renderCharts({ monthlyRevenue = [], productsByType = {} } = {}) {
  // --- revenue chart ---
  const revenueCtx = getCanvasContext('revenueChart');
  if (revenueCtx) {
    safeDestroy(revenueChartInstance);
    const monthLabels = monthlyRevenue.map((m) =>
      new Date(0, m.month - 1).toLocaleString('en', { month: 'short' })
    );
    const revenueValues = monthlyRevenue.map((m) => Number(m.amount || 0));

    // Plugin to display tooltip on chart with date and value - only for selected date
    const tooltipPlugin = {
      id: 'customTooltip',
      afterDatasetsDraw(chart) {
        const { ctx, data, chartArea } = chart;
        const meta = chart.getDatasetMeta(0);
        const points = meta.data;

        // Get selected date from date picker
        const datePicker = document.getElementById('revenueDatePicker');
        let selectedMonth = null;

        if (datePicker && datePicker.value) {
          const selectedDate = new Date(datePicker.value);
          selectedMonth = selectedDate.getMonth(); // 0-11
        }

        points.forEach((point, index) => {
          // Only draw tooltip for selected month
          if (selectedMonth !== null && index !== selectedMonth) {
            return;
          }

          const x = point.x;
          const y = point.y;
          const value = data.datasets[0].data[index];
          const label = data.labels[index];

          // Get today's date to construct full date for display
          const currentYear = new Date().getFullYear();
          const monthIndex = index;
          const fullDate = new Date(currentYear, monthIndex, 1);
          const dateStr = fullDate.toLocaleString('en', {
            month: 'short',
            year: 'numeric',
          });

          // Format value
          let formattedValue;
          if (value > 1000000) {
            formattedValue = `$${(value / 1000000).toFixed(1)}M`;
          } else if (value > 1000) {
            formattedValue = `$${(value / 1000).toFixed(1)}K`;
          } else {
            formattedValue = `$${value.toLocaleString()}`;
          }

          // Draw box background
          const boxWidth = 80;
          const boxHeight = 40;
          const boxX = x - boxWidth / 2;
          const boxY = y - boxHeight - 15;

          ctx.fillStyle = 'rgba(20, 30, 50, 0.9)';
          ctx.strokeStyle = '#CB3CFF';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(boxX + 5, boxY);
          ctx.lineTo(boxX + boxWidth - 5, boxY);
          ctx.quadraticCurveTo(
            boxX + boxWidth,
            boxY,
            boxX + boxWidth,
            boxY + 5
          );
          ctx.lineTo(boxX + boxWidth, boxY + boxHeight - 5);
          ctx.quadraticCurveTo(
            boxX + boxWidth,
            boxY + boxHeight,
            boxX + boxWidth - 5,
            boxY + boxHeight
          );
          ctx.lineTo(boxX + 5, boxY + boxHeight);
          ctx.quadraticCurveTo(
            boxX,
            boxY + boxHeight,
            boxX,
            boxY + boxHeight - 5
          );
          ctx.lineTo(boxX, boxY + 5);
          ctx.quadraticCurveTo(boxX, boxY, boxX + 5, boxY);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Draw text
          ctx.font = 'bold 12px Arial';
          ctx.fillStyle = '#fff';
          ctx.textAlign = 'center';
          ctx.fillText(formattedValue, x, boxY + 18);

          ctx.font = '10px Arial';
          ctx.fillStyle = '#a0aec0';
          ctx.fillText(dateStr, x, boxY + 32);
        });
      },
    };

    revenueChartInstance = new Chart(revenueCtx, {
      type: 'line',
      data: {
        labels: monthLabels,
        datasets: [
          {
            label: 'Revenue',
            data: revenueValues,
            borderColor: '#CB3CFF',
            backgroundColor: 'rgba(128,90,213,0.3)',
            tension: 0.4,
            fill: true,
            pointRadius: 6,
            pointBackgroundColor: '#CB3CFF',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
          },
        ],
      },
      options: {
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { ticks: { color: '#a0aec0' }, grid: { color: '#2d3748' } },
          y: { ticks: { color: '#a0aec0' }, grid: { color: '#2d3748' } },
        },
        interaction: {
          intersect: false,
          mode: 'index',
        },
      },
      plugins: [tooltipPlugin],
    });
  }

  // --- products by type (bar) ---
  const clothesCtx = getCanvasContext('clothesChart');
  if (clothesCtx) {
    safeDestroy(clothesChartInstance);
    const entries = Object.entries(productsByType);
    // if too many types, take top 8 for readability
    entries.sort((a, b) => b[1] - a[1]);
    const top = entries.slice(0, 8);
    const labels = top.map((e) => e[0]);
    const values = top.map((e) => e[1]);

    // Alternating colors: purple and cyan
    const colors = values.map((_, idx) =>
      idx % 2 === 0 ? '#CB3CFF' : '#00D4FF'
    );

    clothesChartInstance = new Chart(clothesCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Products',
            data: values,
            backgroundColor: colors,
            borderRadius: 6,
            borderSkipped: false,
          },
        ],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: {
            ticks: {
              color: '#a0aec0',
              font: { size: 8 },
              maxRotation: 0,
              minRotation: 0,
            },
            grid: { color: '#2d3748' },
          },
          y: {
            ticks: { color: '#a0aec0' },
            grid: { color: '#2d3748' },
          },
        },
      },
    });
  }

  // --- productChart (doanh thu sản phẩm - line chart) ---
  const productCtx = getCanvasContext('productChart');
  if (productCtx) {
    safeDestroy(productChartInstance);
    // Lấy top 5 product types và tính tổng doanh thu cho mỗi loại
    const entries = Object.entries(productsByType);
    entries.sort((a, b) => b[1] - a[1]);
    const top = entries.slice(0, 5);

    // Mock data: simulate revenue by type (tính từ quantity * average price)
    const revenueByType = top.map((e, idx) => ({
      type: e[0],
      values: Array.from({ length: 12 }, (_, m) => {
        const baseRevenue = e[1] * 50 + m * 10; // base calculation
        return Math.max(50, baseRevenue - Math.abs(Math.sin(m * 0.5) * 100));
      }),
    }));

    const monthLabels = Array.from({ length: 12 }, (_, i) =>
      new Date(0, i).toLocaleString('en', { month: 'short' })
    );

    // For display, use first product type
    const displayData = revenueByType[0]?.values || Array(12).fill(0);

    productChartInstance = new Chart(productCtx, {
      type: 'line',
      data: {
        labels: monthLabels,
        datasets: [
          {
            label: 'Revenue',
            data: displayData,
            borderColor: '#CB3CFF',
            backgroundColor: 'rgba(128,90,213,0.2)',
            tension: 0.4,
            fill: true,
            pointRadius: 5,
            pointBackgroundColor: '#CB3CFF',
          },
        ],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#a0aec0' }, grid: { color: '#2d3748' } },
          y: { ticks: { color: '#a0aec0' }, grid: { color: '#2d3748' } },
        },
      },
    });
  }
}

// ===== Fetch data from backend and init charts =====
async function initCharts() {
  try {
    // fetch API từ route bạn sẽ thêm: /admin/dashboard/data
    const res = await fetch('/admin/dashboard/data');
    if (!res.ok) {
      console.error('Dashboard data fetch failed', res.status, res.statusText);
      return;
    }
    const json = await res.json();
    if (!json.success) {
      console.error('Dashboard API error:', json.error || json);
      return;
    }

    // Nếu backend trả monthlyRevenue và productsByType theo format đã thảo luận
    const monthlyRevenue = Array.isArray(json.monthlyRevenue)
      ? json.monthlyRevenue
      : Array.from({ length: 12 }, (_, i) => ({ month: i + 1, amount: 0 }));

    const productsByType = json.productsByType || {};

    // Render charts
    renderCharts({ monthlyRevenue, productsByType });

    // Update stats cards with real data
    if (json.stats) {
      // Update Total invoices card (4th card)
      const cards = document.querySelectorAll('.card-value');
      const growthElements = document.querySelectorAll('.card-growth');

      const formatNumber = (num) => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toLocaleString();
      };

      const statsMap = [
        { key: 'TotalPageViews', growthKey: 'PageViewsGrowth' },
        { key: 'MonthlyUsers', growthKey: 'MonthlyUsersGrowth' },
        { key: 'NewSignUps', growthKey: 'NewSignUpsGrowth' },
        { key: 'TotalInvoices', growthKey: 'TotalInvoicesGrowth' },
        // Nếu bạn có card cho Clothes riêng, thêm ở đây:
        // { key: 'ClothesSold', growthKey: 'ClothesGrowth' },
      ];

      statsMap.forEach((stat, idx) => {
        if (cards[idx]) {
          cards[idx].textContent =
            stat.key === 'TotalInvoices'
              ? (json.stats[stat.key] || 0).toLocaleString()
              : formatNumber(json.stats[stat.key] || 0);
        }

        if (stat.growthKey && growthElements[idx]) {
          const growth = json.stats[stat.growthKey] || 0;
          const span = growthElements[idx].querySelector('span');
          const icon = growthElements[idx].querySelector('i');

          if (span) span.textContent = `${Math.abs(growth).toFixed(1)}%`;

          growthElements[idx].classList.remove('positive', 'negative');
          if (growth >= 0) {
            growthElements[idx].classList.add('positive');
            if (icon) icon.className = 'fa-solid fa-arrow-trend-up';
          } else {
            growthElements[idx].classList.add('negative');
            if (icon) icon.className = 'fa-solid fa-arrow-trend-down';
          }
        }
      });

      // Update chart header values
      const chartValues = document.querySelectorAll('.chart-value');
      if (chartValues[0]) {
        const currentYear = new Date().getFullYear(); // Năm hiện tại

        let totalRevenue = 0;

        // Ưu tiên: lấy từ backend (đã tính trong AdminSite)
        if (json.stats && typeof json.stats.TotalRevenue !== 'undefined') {
          totalRevenue = Number(json.stats.TotalRevenue) || 0;
        } else {
          // Fallback: tự tính từ invoices
          const invoicesThisYear = (json.invoices || []).filter((invoice) => {
            if (!invoice.DateCreated) return false;
            return new Date(invoice.DateCreated).getFullYear() === currentYear;
          });

          totalRevenue = invoicesThisYear.reduce((sum, invoice) => {
            return sum + (Number(invoice.TotalAmount) || 0);
          }, 0);
        }

        // Format hiển thị: $xxx, $xK, $xM
        const formatMoney = (value) => {
          if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`; // Triệu
          if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`; // Nghìn
          return `$${value.toLocaleString()}`; // Số nhỏ
        };

        chartValues[0].textContent = formatMoney(totalRevenue);
        if (
          chartPercents[0] &&
          json.stats.TotalRevenueGrowthYoY !== undefined
        ) {
          const growth = Number(json.stats.TotalRevenueGrowthYoY);

          chartPercents[0].textContent =
            growth > 0 ? `+${growth}%` : `${growth}%`;
          chartPercents[0].style.color = growth >= 0 ? '#4caf50' : '#f44336'; // xanh / đỏ
        }

        console.log('Total Revenue:', totalRevenue);
      }
      if (chartValues[1]) {
        // Clothes category - sum of products
        const totalProducts = Object.values(json.productsByType || {}).reduce(
          (a, b) => a + b,
          0
        );
        chartValues[1].textContent = (totalProducts || 0).toLocaleString();
      }
    }

    // optional: update recent invoices list if you keep one
    // (you can add code here to render json.recentInvoices into the DOM)
  } catch (err) {
    console.error('initCharts error:', err);
  }
}

// ===== DATE PICKER EVENT HANDLER =====
function setupDatePicker() {
  const datePicker = document.getElementById('revenueDatePicker');
  const dateDisplay = document.getElementById('chartDateDisplay');

  if (!datePicker || !dateDisplay) return;

  // Function to format and display the date range
  function updateDateDisplay(selectedDate) {
    const date = new Date(selectedDate);
    const year = date.getFullYear();
    const month = date.toLocaleString('en', { month: 'long' });
    const day = date.getDate();

    // Format: "June 21, 2023"
    const formattedDate = `${month} ${day}, ${year}`;
    dateDisplay.textContent = formattedDate;

    // Redraw chart to update tooltip position
    if (revenueChartInstance) {
      revenueChartInstance.draw();
    }
  }

  // Set initial date display
  updateDateDisplay(datePicker.value);

  // Listen for date changes
  datePicker.addEventListener('change', (e) => {
    updateDateDisplay(e.target.value);
  });

  // Also update on input (real-time)
  datePicker.addEventListener('input', (e) => {
    updateDateDisplay(e.target.value);
  });
}

// Khởi tạo charts sau khi window load (DOM chắc chắn đã có)
window.addEventListener('load', () => {
  initCharts();
  setupDatePicker();
});
