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

    // Remove any menu-item active so sidebar highlights only dashboard section
    menuItems.forEach((i) => {
      const c = i.querySelector('.item_container');
      if (c) c.classList.remove('menu-item--active');
    });

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
  } else if (savedActive && savedActive.startsWith('menu:')) {
    const itemText = savedActive.split(':')[1];
    menuItems.forEach((item) => {
      const container = item.querySelector('.item_container');
      const titleEl = container?.querySelector('.item_title');
      if (titleEl && titleEl.textContent.trim() === itemText) {
        container.classList.add('menu-item--active');
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

    // Nếu click vào 1 menu-item bình thường (không phải Dashboard header),
    // thì xóa active của dashboard items, đóng dropdown
    if (!item.classList.contains('dashboard-btn')) {
      dashboardItems.forEach((di) =>
        di.classList.remove('dashboard_item--active')
      );
      if (dashboardMenu) {
        dashboardMenu.style.maxHeight = '0';
        dashboardMenu.style.opacity = '0';
      }
      if (dashboardIcon) dashboardIcon.style.transform = 'rotate(0deg)';

      // Lưu state active cho menu bình thường (Chat/Users)
      const titleEl = container.querySelector('.item_title');
      if (titleEl)
        localStorage.setItem(
          'sidebarActive',
          `menu:${titleEl.textContent.trim()}`
        );
    }
  });
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

// === Chart.js setup ===
const revenueCtx = document.getElementById('revenueChart');
if (revenueCtx) {
  new Chart(revenueCtx, {
    type: 'line',
    data: {
      labels: [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ],
      datasets: [
        {
          label: 'Revenue',
          data: [
            0, 5000, 12000, 12500, 15000, 20000, 25000, 27000, 31000, 35000,
            38000, 40000,
          ],
          borderColor: '#CB3CFF',
          backgroundColor: 'rgba(128,90,213,0.3)',
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
}

const clothesCtx = document.getElementById('clothesChart');
if (clothesCtx) {
  new Chart(clothesCtx, {
    type: 'bar',
    data: {
      labels: [
        'T-shirt',
        'Shirt',
        'Shoes',
        'Knitwear',
        'Pants',
        'Socks',
        'Shorts',
        'Outerwear',
      ],
      datasets: [
        {
          label: 'Men',
          data: [350, 500, 280, 430, 210, 150, 240, 330],
          backgroundColor: '#CB3CFF',
        },
        {
          label: 'Women',
          data: [250, 400, 220, 310, 260, 180, 200, 280],
          backgroundColor: '#63b3ed',
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          labels: { color: '#a0aec0', font: { size: 9, weight: '200' } },
        },
      },
      scales: {
        x: {
          ticks: {
            color: '#a0aec0',
            font: { size: 7, weight: '200' },
            maxRotation: 0,
            minRotation: 0,
          },
        },
        y: { ticks: { color: '#a0aec0' }, grid: { color: '#2d3748' } },
      },
    },
  });
}

const productCtx = document.getElementById('productChart');
if (productCtx) {
  new Chart(productCtx, {
    type: 'line',
    data: {
      labels: [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ],
      datasets: [
        {
          label: 'Outerwear',
          data: [80, 120, 160, 150, 180, 220, 300, 270, 310, 250, 200, 220],
          borderColor: '#CB3CFF',
          backgroundColor: 'rgba(99,179,237,0.2)',
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
            color: '#a0aec0',
            font: { size: 7, weight: '200' },
            maxRotation: 0,
            minRotation: 0,
          },
        },
        y: { ticks: { color: '#a0aec0' }, grid: { color: '#2d3748' } },
      },
    },
  });
}

// check all
const checkAll = document.getElementById('checkAll');
const checkboxes = document.querySelectorAll('.checkItem');
const rows = document.querySelectorAll('.invoice-table tbody tr');

if (checkAll && checkboxes.length > 0) {
  checkAll.addEventListener('change', () => {
    checkboxes.forEach((cb, i) => {
      cb.checked = checkAll.checked;
      if (rows[i]) rows[i].classList.toggle('selected', checkAll.checked);
    });
  });

  checkboxes.forEach((cb, i) => {
    cb.addEventListener('change', () => {
      if (rows[i]) rows[i].classList.toggle('selected', cb.checked);
      if (!cb.checked) checkAll.checked = false;
      else if ([...checkboxes].every((c) => c.checked)) checkAll.checked = true;
    });
  });
}

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
  changePasswordModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

// Close modal function
function closeChangePasswordModal() {
  changePasswordModal.classList.remove('active');
  document.body.style.overflow = '';
  changePasswordForm.reset();
  // Reset requirements
  [reqLength, reqUppercase, reqLowercase, reqNumber].forEach((req) => {
    req.classList.remove('valid');
  });
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
  if (e.key === 'Escape' && changePasswordModal.classList.contains('active')) {
    closeChangePasswordModal();
  }
});

// Password validation on input
if (newPasswordInput) {
  newPasswordInput.addEventListener('input', function () {
    const password = this.value;

    // Check length
    if (password.length >= 8) {
      reqLength.classList.add('valid');
    } else {
      reqLength.classList.remove('valid');
    }

    // Check uppercase
    if (/[A-Z]/.test(password)) {
      reqUppercase.classList.add('valid');
    } else {
      reqUppercase.classList.remove('valid');
    }

    // Check lowercase
    if (/[a-z]/.test(password)) {
      reqLowercase.classList.add('valid');
    } else {
      reqLowercase.classList.remove('valid');
    }

    // Check number
    if (/[0-9]/.test(password)) {
      reqNumber.classList.add('valid');
    } else {
      reqNumber.classList.remove('valid');
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
    submitBtn.disabled = true;
    submitBtn.innerHTML =
      '<i class="fa-solid fa-spinner fa-spin"></i> Changing...';

    // Send to backend - ✅ THÊM credentials: 'include'
    fetch('/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // ← THÊM DÒNG NÀY
      body: JSON.stringify({
        oldPassword: currentPassword,
        newPassword: newPassword,
        confirmPassword: confirmPassword,
      }),
    })
      .then((response) => {
        console.log('Response status:', response.status); // Debug
        return response.json();
      })
      .then((data) => {
        console.log('Response data:', data); // Debug
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
          submitBtn.disabled = false;
          submitBtn.innerHTML =
            '<i class="fa-solid fa-check"></i> Change Password';
        }
      })
      .catch((error) => {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.innerHTML =
          '<i class="fa-solid fa-check"></i> Change Password';
      });
  });
}
