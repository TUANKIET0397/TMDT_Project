document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('registerForm');

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    // Lấy dữ liệu từ form
    const formData = {
      firstname: document.getElementById('firstname').value.trim(),
      lastname: document.getElementById('lastname').value.trim(),
      Gender: document.getElementById('Gender').value,
      birthday: document.getElementById('birthday').value,
      address: document.getElementById('address').value.trim(),
      email: document.getElementById('email').value.trim(),
      password: document.getElementById('password').value,
      repassword: document.getElementById('repassword').value,
    };

    // Validate phía client
    if (
      !formData.firstname ||
      !formData.lastname ||
      !formData.Gender ||
      !formData.birthday ||
      !formData.address ||
      !formData.email ||
      !formData.password ||
      !formData.repassword
    ) {
      alert('Please fill in all fields!');
      return;
    }

    if (formData.password !== formData.repassword) {
      alert('Passwords do not match!');
      return;
    }

    if (formData.password.length < 6) {
      alert('Password must be at least 6 characters!');
      return;
    }

    // Disable button để tránh submit nhiều lần
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Processing...';

    try {
      // Gửi request đến server
      const response = await fetch('/authSite/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        alert('Registration successful! Redirecting to login...');
        // Redirect đến trang login
        window.location.href = data.redirect || '/authSite';
      } else {
        alert(data.message || 'Registration failed!');
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred. Please try again!');
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  });

  // Validate email real-time
  const emailInput = document.getElementById('email');
  emailInput.addEventListener('blur', function () {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (this.value && !emailRegex.test(this.value)) {
      this.setCustomValidity('Please enter a valid email address');
      this.reportValidity();
    } else {
      this.setCustomValidity('');
    }
  });

  // Validate password match real-time
  const passwordInput = document.getElementById('password');
  const repasswordInput = document.getElementById('repassword');

  repasswordInput.addEventListener('input', function () {
    if (this.value && this.value !== passwordInput.value) {
      this.setCustomValidity('Passwords do not match');
      this.reportValidity();
    } else {
      this.setCustomValidity('');
    }
  });
});
