document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('loginForm');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const rememberMeCheckbox = document.getElementById('rememberMe');

  // Load saved username if "Remember me" was checked
  const savedUsername = localStorage.getItem('rememberedUsername');
  if (savedUsername) {
    usernameInput.value = savedUsername;
    rememberMeCheckbox.checked = true;
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    // Lấy dữ liệu từ form
    const formData = {
      username: usernameInput.value.trim(),
      password: passwordInput.value,
    };

    // Validate phía client
    if (!formData.username || !formData.password) {
      alert('Please enter both username and password!');
      return;
    }

    // Disable button để tránh submit nhiều lần
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.disabled = true;

    try {
      // Gửi request đến server
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        // Save username if "Remember me" is checked
        if (rememberMeCheckbox.checked) {
          localStorage.setItem('rememberedUsername', formData.username);
        } else {
          localStorage.removeItem('rememberedUsername');
        }

        // Redirect đến trang chủ
        window.location.href = data.redirect || '/';
      } else {
        alert(data.message || 'Login failed!');
        submitButton.disabled = false;
        submitButton.textContent = originalText;

        // Clear password field on failed login
        passwordInput.value = '';
        passwordInput.focus();
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred. Please try again!');
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  });

  // Enter key support
  [usernameInput, passwordInput].forEach((input) => {
    input.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') {
        form.dispatchEvent(new Event('submit'));
      }
    });
  });

  // Focus on username field on page load
  usernameInput.focus();
});
