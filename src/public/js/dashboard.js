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

// dashboard item click
const dashboardItems = document.querySelectorAll('.dashboard_item');
dashboardItems.forEach((item) => {
  item.addEventListener('click', function (e) {
    e.stopPropagation();
    dashboardItems.forEach((i) => i.classList.remove('dashboard_item--active'));
    this.classList.add('dashboard_item--active');
    const text = this.textContent.trim();
    if (text) localStorage.setItem('sidebarActive', `dashboard:${text}`);
    const route = this.getAttribute('data-route');
    if (route) window.location.href = route;
  });
});

// logo click
const sidebarLogo = document.getElementById('sidebarLogo');
if (sidebarLogo) {
  sidebarLogo.addEventListener('click', function (e) {
    localStorage.removeItem('sidebarActive');
    menuItems.forEach((i) => {
      const c = i.querySelector('.item_container');
      if (c) c.classList.remove('menu-item--active');
    });
    dashboardItems.forEach((item) =>
      item.classList.remove('dashboard_item--active')
    );
    if (dashboardMenu) {
      dashboardMenu.style.maxHeight = '0';
      dashboardMenu.style.opacity = '0';
    }
    if (dashboardIcon) dashboardIcon.style.transform = 'rotate(0deg)';
  });
}

// restore active dashboard item
window.addEventListener('load', () => {
  const savedActive = localStorage.getItem('sidebarActive');
  if (savedActive && savedActive.startsWith('dashboard:')) {
    const itemText = savedActive.split(':')[1];
    dashboardItems.forEach((item) => {
      if (item.textContent.trim() === itemText) {
        item.classList.add('dashboard_item--active');
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

// Chart instances
let revenueChartInstance = null;
let clothesChartInstance = null;
let productChartInstance = null;

// Helper functions
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

function safeDestroy(chartInstance) {
  if (chartInstance && typeof chartInstance.destroy === 'function') {
    chartInstance.destroy();
  }
}

function formatNumber(num) {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

function formatMoney(value) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toLocaleString()}`;
}

// Render charts function
function renderCharts({ monthlyRevenue = [], productsByType = {} } = {}) {
  // Revenue chart
  const revenueCtx = getCanvasContext('revenueChart');
  if (revenueCtx) {
    safeDestroy(revenueChartInstance);
    const monthLabels = monthlyRevenue.map((m) =>
      new Date(0, m.month - 1).toLocaleString('en', { month: 'short' })
    );
    const revenueValues = monthlyRevenue.map((m) => Number(m.amount || 0));

    const tooltipPlugin = {
      id: 'customTooltip',
      afterDatasetsDraw(chart) {
        const { ctx, data } = chart;
        const meta = chart.getDatasetMeta(0);
        const points = meta.data;

        const datePicker = document.getElementById('revenueDatePicker');
        let selectedMonth = null;

        if (datePicker && datePicker.value) {
          const selectedDate = new Date(datePicker.value);
          selectedMonth = selectedDate.getMonth();
        }

        points.forEach((point, index) => {
          if (selectedMonth !== null && index !== selectedMonth) return;

          const x = point.x;
          const y = point.y;
          const value = data.datasets[0].data[index];

          const currentYear = new Date().getFullYear();
          const monthIndex = index;
          const fullDate = new Date(currentYear, monthIndex, 1);
          const dateStr = fullDate.toLocaleString('en', {
            month: 'short',
            year: 'numeric',
          });

          let formattedValue = formatMoney(value);

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
        interaction: { intersect: false, mode: 'index' },
      },
      plugins: [tooltipPlugin],
    });
  }

  // Clothes chart (products by type)
  const clothesCtx = getCanvasContext('clothesChart');
  if (clothesCtx) {
    safeDestroy(clothesChartInstance);
    const entries = Object.entries(productsByType);
    const labels = entries.map((e) => e[0]);
    const values = entries.map((e) => e[1]);
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
          y: { ticks: { color: '#a0aec0' }, grid: { color: '#2d3748' } },
        },
      },
    });
  }
}

// Render product revenue chart by type
async function renderProductChart(typeName) {
  const productCtx = getCanvasContext('productChart');
  if (!productCtx) return;

  safeDestroy(productChartInstance);

  if (!typeName) {
    // Show placeholder when no type selected
    productChartInstance = new Chart(productCtx, {
      type: 'line',
      data: {
        labels: Array.from({ length: 12 }, (_, i) =>
          new Date(0, i).toLocaleString('en', { month: 'short' })
        ),
        datasets: [
          {
            label: 'Revenue',
            data: Array(12).fill(0),
            borderColor: '#CB3CFF',
            backgroundColor: 'rgba(128,90,213,0.2)',
            tension: 0.4,
            fill: true,
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

    // Update chart value and growth
    const chartValues = document.querySelectorAll('.chart-value');
    if (chartValues[2]) chartValues[2].textContent = '$0';

    const growthPercentElem = document.querySelector(
      '.chart-small .growth-percent'
    );
    if (growthPercentElem) growthPercentElem.textContent = '0%';

    return;
  }

  try {
    const year = new Date().getFullYear();
    const res = await fetch(
      `/admin/dashboard/revenue-by-type?type=${encodeURIComponent(
        typeName
      )}&year=${year}`
    );

    if (!res.ok) {
      console.error('Failed to fetch revenue by type');
      return;
    }

    const json = await res.json();
    if (!json.success) {
      console.error('API error:', json.error);
      return;
    }

    const monthlyRevenue = json.monthlyRevenue || [];
    const totalRevenue = json.totalRevenue || 0;

    const monthLabels = monthlyRevenue.map((m) =>
      new Date(0, m.month - 1).toLocaleString('en', { month: 'short' })
    );
    const revenueValues = monthlyRevenue.map((m) => Number(m.amount || 0));

    productChartInstance = new Chart(productCtx, {
      type: 'line',
      data: {
        labels: monthLabels,
        datasets: [
          {
            label: 'Revenue',
            data: revenueValues,
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

    // Update chart value
    const chartValues = document.querySelectorAll('.chart-value');
    if (chartValues[2]) {
      chartValues[2].textContent = formatMoney(totalRevenue);
    }

    // Update growth indicator with percentage
    const growthElem = document.querySelector('.chart-small .growth');
    const growthPercentElem = document.querySelector(
      '.chart-small .growth-percent'
    );

    if (growthElem && growthPercentElem && revenueValues.length >= 2) {
      const lastMonth = revenueValues[revenueValues.length - 1];
      const prevMonth = revenueValues[revenueValues.length - 2];
      const growth =
        prevMonth > 0 ? ((lastMonth - prevMonth) / prevMonth) * 100 : 0;

      // Update percentage text
      growthPercentElem.textContent = `${Math.abs(growth).toFixed(1)}%`;

      // Update classes and icon
      growthElem.classList.remove('positive', 'negative');
      const icon = growthElem.querySelector('i');

      if (growth >= 0) {
        growthElem.classList.add('positive');
        if (icon) icon.className = 'fa-solid fa-arrow-trend-up';
      } else {
        growthElem.classList.add('negative');
        if (icon) icon.className = 'fa-solid fa-arrow-trend-down';
      }
    }
  } catch (err) {
    console.error('Error rendering product chart:', err);
  }
}

// Setup product type select
function setupProductTypeSelect(productsByType) {
  const select = document.getElementById('productTypeSelect');
  if (!select) return;

  // Clear existing options except first
  while (select.options.length > 1) {
    select.remove(1);
  }

  // Populate with product types
  Object.keys(productsByType).forEach((type) => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type;
    select.appendChild(option);
  });

  // Handle selection change
  select.addEventListener('change', (e) => {
    const selectedType = e.target.value;
    renderProductChart(selectedType);
  });

  // Load first type by default if available
  const types = Object.keys(productsByType);
  if (types.length > 0) {
    select.value = types[0];
    renderProductChart(types[0]);
  }
}

// Date picker setup
function setupDatePicker() {
  const datePicker = document.getElementById('revenueDatePicker');
  const dateDisplay = document.getElementById('chartDateDisplay');

  if (!datePicker || !dateDisplay) return;

  function updateDateDisplay(selectedDate) {
    const date = new Date(selectedDate);
    const year = date.getFullYear();
    const month = date.toLocaleString('en', { month: 'long' });
    const day = date.getDate();

    const formattedDate = `${month} ${day}, ${year}`;
    dateDisplay.textContent = formattedDate;

    if (revenueChartInstance) {
      revenueChartInstance.draw();
    }
  }

  updateDateDisplay(datePicker.value);

  datePicker.addEventListener('change', (e) => {
    updateDateDisplay(e.target.value);
  });

  datePicker.addEventListener('input', (e) => {
    updateDateDisplay(e.target.value);
  });
}

// Initialize charts
async function initCharts() {
  try {
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

    const monthlyRevenue = Array.isArray(json.monthlyRevenue)
      ? json.monthlyRevenue
      : Array.from({ length: 12 }, (_, i) => ({ month: i + 1, amount: 0 }));

    const productsByType = json.productsByType || {};

    // Render main charts
    renderCharts({ monthlyRevenue, productsByType });

    // Setup product type select and render product chart
    setupProductTypeSelect(productsByType);

    // Update stats cards
    if (json.stats) {
      const cards = document.querySelectorAll('.card-value');
      const growthElements = document.querySelectorAll('.card-growth');

      const statsMap = [
        { key: 'TotalPageViews', growthKey: 'PageViewsGrowth' },
        { key: 'MonthlyUsers', growthKey: 'MonthlyUsersGrowth' },
        { key: 'NewSignUps', growthKey: 'NewSignUpsGrowth' },
        { key: 'TotalInvoices', growthKey: 'TotalInvoicesGrowth' },
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

      // Update total revenue chart value
      const chartValues = document.querySelectorAll('.chart-value');
      if (chartValues[0]) {
        const currentYear = new Date().getFullYear();
        let totalRevenue = 0;

        if (json.stats && typeof json.stats.TotalRevenue !== 'undefined') {
          totalRevenue = Number(json.stats.TotalRevenue) || 0;
        }

        chartValues[0].textContent = formatMoney(totalRevenue);

        const chartPercents = document.querySelectorAll('.chart-percent');
        if (
          chartPercents[0] &&
          json.stats.TotalRevenueGrowthYoY !== undefined
        ) {
          const growth = Number(json.stats.TotalRevenueGrowthYoY);
          chartPercents[0].textContent =
            growth > 0 ? `+${growth}%` : `${growth}%`;
          chartPercents[0].style.color = growth >= 0 ? '#4caf50' : '#f44336';
        }
      }

      // Update clothes sold value
      if (chartValues[1]) {
        const clothesSold = json.stats?.ClothesSold || 0;
        chartValues[1].textContent = formatNumber(clothesSold);
      }
    }
  } catch (err) {
    console.error('initCharts error:', err);
  }
}

// Export functionality
(function () {
  const exportBtn = document.getElementById('exportBtn');
  const exportDropdown = document.getElementById('exportDropdown');
  const exportOptions = document.querySelectorAll('.export-option');

  if (!exportBtn || !exportDropdown) return;

  // Toggle dropdown
  exportBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    exportDropdown.classList.toggle('active');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    exportDropdown.classList.remove('active');
  });

  // Prevent dropdown from closing when clicking inside
  exportDropdown.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // Handle export options
  exportOptions.forEach((option) => {
    option.addEventListener('click', async () => {
      const format = option.dataset.format;
      await handleExport(format);
      exportDropdown.classList.remove('active');
    });
  });

  // Export handler
  async function handleExport(format) {
    try {
      // Show loading state
      exportBtn.classList.add('loading');
      const icon = exportBtn.querySelector('i');
      const originalIcon = icon.className;
      icon.className = 'fa-solid fa-spinner';

      // Get current year
      const year = new Date().getFullYear();

      // Make request
      const response = await fetch(`/admin/export/${format}?year=${year}`);

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `dashboard_export_${format}_${Date.now()}`;

      if (contentDisposition) {
        const matches = /filename="([^"]+)"/.exec(contentDisposition);
        if (matches) filename = matches[1];
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Show success message (optional)
      showNotification('Export successful!', 'success');
    } catch (error) {
      console.error('Export error:', error);
      showNotification('Export failed. Please try again.', 'error');
    } finally {
      // Remove loading state
      exportBtn.classList.remove('loading');
      const icon = exportBtn.querySelector('i');
      icon.className = 'fa-solid fa-download';
    }
  }

  // Simple notification function
  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === 'success' ? '#10b981' : '#ef4444'};
      color: white;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Add CSS animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
})();

// Initialize on page load
window.addEventListener('load', () => {
  initCharts();
  setupDatePicker();
});

// === User dropup menu ===
const userInfoBtn = document.getElementById('userInfoBtn');
const userDropup = document.querySelector('.user-dropup');
const userArrow = document.querySelector('.user-arrow');
let isUserMenuOpen = false;

if (userInfoBtn && userDropup && userArrow) {
  console.log('✅ User menu elements found!');

  userInfoBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    e.preventDefault();

    isUserMenuOpen = !isUserMenuOpen;
    console.log('👆 User menu clicked! isOpen:', isUserMenuOpen);

    if (isUserMenuOpen) {
      userDropup.style.maxHeight = '200px';
      userDropup.style.opacity = '1';
      userArrow.style.transform = 'rotate(-90deg)';
    } else {
      userDropup.style.maxHeight = '0';
      userDropup.style.opacity = '0';
      userArrow.style.transform = 'rotate(0deg)';
    }
  });

  // Handle dropup item clicks
  const dropupItems = document.querySelectorAll('.dropup-item');
  console.log('📋 Dropup items found:', dropupItems.length);

  dropupItems.forEach((item) => {
    item.addEventListener('click', function (e) {
      e.stopPropagation();
      e.preventDefault();

      const action = this.getAttribute('data-action');
      console.log('🎯 Dropup item clicked:', action);

      if (action === 'logout') {
        if (confirm('Are you sure you want to logout?')) {
          // Gửi POST request đến /auth/logout
          fetch('/auth/logout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          })
            .then((response) => response.json())
            .then((data) => {
              if (data.success) {
                window.location.href = data.redirect || '/auth';
              } else {
                alert('Logout failed. Please try again.');
              }
            })
            .catch((error) => {
              console.error('Logout error:', error);
              alert('An error occurred. Please try again.');
            });
        }
      } else if (action === 'change-password') {
        openChangePasswordModal();
      }

      // Close menu
      userDropup.style.maxHeight = '0';
      userDropup.style.opacity = '0';
      userArrow.style.transform = 'rotate(0deg)';
      isUserMenuOpen = false;
    });
  });
} else {
  console.error('❌ User menu elements NOT found!', {
    userInfoBtn,
    userDropup,
    userArrow,
  });
}

// Click outside sidebar to reset state
document.addEventListener('click', function (e) {
  const sidebar = document.querySelector('.Listproduct_sidebar');

  if (sidebar && !sidebar.contains(e.target)) {
    // Collapse dashboard menu
    if (dashboardMenu) {
      dashboardMenu.style.maxHeight = '0';
      dashboardMenu.style.opacity = '0';
    }
    if (dashboardIcon) dashboardIcon.style.transform = 'rotate(0deg)';
    isMenuOpen = false;

    // Remove active from all menu items
    menuItems.forEach((item) => {
      const c = item.querySelector('.item_container');
      if (c) c.classList.remove('menu-item--active');
    });
    dashboardItems.forEach((item) => {
      item.classList.remove('dashboard_item--active');
    });

    // Close user dropup
    if (userDropup && userArrow) {
      userDropup.style.maxHeight = '0';
      userDropup.style.opacity = '0';
      userArrow.style.transform = 'rotate(0deg)';
      isUserMenuOpen = false;
    }
  }
});

// === Change Password Modal ===
const changePasswordModal = document.getElementById('changePasswordModal');
const closeModalBtn = document.getElementById('closeModal');
const cancelBtn = document.getElementById('cancelBtn');
const changePasswordForm = document.getElementById('changePasswordForm');
const newPasswordInput = document.getElementById('newPassword');

// Password requirements elements
const reqLength = document.getElementById('req-length');
const reqUppercase = document.getElementById('req-uppercase');
const reqLowercase = document.getElementById('req-lowercase');
const reqNumber = document.getElementById('req-number');

// Open modal function
function openChangePasswordModal() {
  if (changePasswordModal) {
    changePasswordModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

// Close modal function
function closeChangePasswordModal() {
  if (changePasswordModal) {
    changePasswordModal.classList.remove('active');
    document.body.style.overflow = '';
  }
  if (changePasswordForm) {
    changePasswordForm.reset();
  }
  // Reset requirements
  if (reqLength && reqUppercase && reqLowercase && reqNumber) {
    [reqLength, reqUppercase, reqLowercase, reqNumber].forEach((req) => {
      req.classList.remove('valid');
    });
  }
}

// Close modal events
if (closeModalBtn) {
  closeModalBtn.addEventListener('click', closeChangePasswordModal);
}

if (cancelBtn) {
  cancelBtn.addEventListener('click', closeChangePasswordModal);
}

// Close modal when clicking outside
if (changePasswordModal) {
  changePasswordModal.addEventListener('click', function (e) {
    if (e.target === changePasswordModal) {
      closeChangePasswordModal();
    }
  });
}

// Close modal with Escape key
document.addEventListener('keydown', function (e) {
  if (
    e.key === 'Escape' &&
    changePasswordModal &&
    changePasswordModal.classList.contains('active')
  ) {
    closeChangePasswordModal();
  }
});

// Password validation on input
if (newPasswordInput) {
  newPasswordInput.addEventListener('input', function () {
    const password = this.value;

    // Check length
    if (reqLength) {
      if (password.length >= 8) {
        reqLength.classList.add('valid');
      } else {
        reqLength.classList.remove('valid');
      }
    }

    // Check uppercase
    if (reqUppercase) {
      if (/[A-Z]/.test(password)) {
        reqUppercase.classList.add('valid');
      } else {
        reqUppercase.classList.remove('valid');
      }
    }

    // Check lowercase
    if (reqLowercase) {
      if (/[a-z]/.test(password)) {
        reqLowercase.classList.add('valid');
      } else {
        reqLowercase.classList.remove('valid');
      }
    }

    // Check number
    if (reqNumber) {
      if (/[0-9]/.test(password)) {
        reqNumber.classList.add('valid');
      } else {
        reqNumber.classList.remove('valid');
      }
    }
  });
}

// Form submission
if (changePasswordForm) {
  changePasswordForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      alert('New passwords do not match!');
      return;
    }

    // Validate password requirements
    if (
      newPassword.length < 8 ||
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword)
    ) {
      alert('Password does not meet requirements!');
      return;
    }

    // Disable submit button
    const submitBtn = this.querySelector('.btn-submit');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> Changing...';
    }

    // Send to backend
    fetch('/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        oldPassword: currentPassword,
        newPassword: newPassword,
        confirmPassword: confirmPassword,
      }),
    })
      .then((response) => {
        console.log('Response status:', response.status);
        return response.json();
      })
      .then((data) => {
        console.log('Response data:', data);
        if (data.success) {
          alert('Password changed successfully!');
          closeChangePasswordModal();

          // Optional: Logout after password change
          setTimeout(() => {
            window.location.href = '/auth/logout';
          }, 1000);
        } else {
          alert('Error: ' + data.message);
          // Re-enable submit button
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML =
              '<i class="fa-solid fa-check"></i> Change Password';
          }
        }
      })
      .catch((error) => {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
        // Re-enable submit button
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML =
            '<i class="fa-solid fa-check"></i> Change Password';
        }
      });
  });
}
