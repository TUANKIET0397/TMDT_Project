(function authHelpers() {
  function getCurrentPath() {
    const path = window.location.pathname || '/';
    const search = window.location.search || '';
    return `${path}${search}` || '/';
  }

  function sanitizeNext(next) {
    if (typeof next === 'string' && next.startsWith('/')) {
      return next;
    }
    return getCurrentPath();
  }

  function isLoggedIn() {
    const user = window.APP_USER;
    return Boolean(user && user.id);
  }

  function ensureLoggedIn(options = {}) {
    if (isLoggedIn()) return true;

    if (options.cartItem) {
      try {
        sessionStorage.setItem(
          'pendingCartItem',
          JSON.stringify(options.cartItem)
        );
      } catch (err) {
        console.warn('Unable to cache cart item for login resume', err);
      }
    }

    if (options.openCart) {
      sessionStorage.setItem('openCartAfterLogin', '1');
    }

    if (options.intent === 'chat') {
      sessionStorage.setItem('postLoginChat', '1');
    }

    const nextUrl = sanitizeNext(options.next);
    window.location.href = `/auth?next=${encodeURIComponent(nextUrl)}`;
    return false;
  }

  window.requireLogin = ensureLoggedIn;
  window.isUserLoggedIn = isLoggedIn;
  window.getCurrentPath = getCurrentPath;
})();

// Scroll reveal effect
window.addEventListener('scroll', () => {
  document.querySelectorAll('section').forEach((sec) => {
    const top = sec.getBoundingClientRect().top;
    if (top < window.innerHeight - 100) {
      sec.classList.add('visible');
    }
  });
});

// === CART SYSTEM ===
document.addEventListener('DOMContentLoaded', () => {
  const cartIcon = document.querySelector('.fa-shopping-cart');
  const cartDrawer = document.getElementById('cartDrawer');
  const cartOverlay = document.querySelector('.cart-overlay');
  const closeCart = document.getElementById('closeCart');
  const cartItemsContainer = document.getElementById('cartItems');
  const cartTotal = document.getElementById('cartTotal');
  const searchIcon = document.getElementById('headerSearchIcon');
  const quickInput = document.getElementById('headerQuickSearchInput');
  const quickDropdown = document.getElementById('headerQuickSearchDropdown');
  let debounceTimer = null;
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  let addToCartLock = false;

  function closeQuickDropdown() {
    if (quickDropdown) {
      quickDropdown.innerHTML = '';
      quickDropdown.style.display = 'none';
      quickDropdown.setAttribute('aria-hidden', 'true');
    }
  }

  function openQuickInput() {
    if (!quickInput) return;
    quickInput.style.display = 'inline-block';
    quickInput.focus();
  }

  if (searchIcon) {
    searchIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      // toggle input visibility
      if (quickInput.style.display === 'inline-block') {
        quickInput.style.display = 'none';
        closeQuickDropdown();
      } else {
        openQuickInput();
      }
    });
  }

  // hide dropdown and input on outside click
  document.addEventListener('click', (ev) => {
    if (!quickInput) return;
    if (
      ev.target === quickInput ||
      ev.target === searchIcon ||
      quickInput.contains(ev.target) ||
      searchIcon.contains(ev.target)
    ) {
      return;
    }
    quickInput.style.display = 'none';
    closeQuickDropdown();
  });

  // render results
  function renderQuickResults(items) {
    if (!quickDropdown) return;
    quickDropdown.innerHTML = '';
    if (!items || items.length === 0) {
      quickDropdown.innerHTML = '<div class="qs-empty">No results</div>';
      quickDropdown.style.display = 'block';
      quickDropdown.setAttribute('aria-hidden', 'false');
      return;
    }

    const ul = document.createElement('ul');
    ul.className = 'qs-list';
    items.forEach((it) => {
      const li = document.createElement('li');
      li.className = 'qs-item';
      li.innerHTML = `
                <a href="/products/detail/${it.id}" class="qs-link">
                    <img src="${it.img || '/img/default.jpg'}" alt="${
        it.name
      }" class="qs-img" />
                    <div class="qs-body">
                        <div class="qs-name">${it.name}</div>
                        <div class="qs-price">${
                          it.price ? '$' + Number(it.price).toFixed(2) : ''
                        }</div>
                    </div>
                </a>
            `;
      ul.appendChild(li);
    });
    quickDropdown.appendChild(ul);
    quickDropdown.style.display = 'block';
    quickDropdown.setAttribute('aria-hidden', 'false');
  }

  async function doSearch(q) {
    if (!q || q.trim().length === 0) {
      closeQuickDropdown();
      return;
    }
    try {
      const res = await fetch(`/products/search?q=${encodeURIComponent(q)}`, {
        credentials: 'same-origin',
      });
      if (!res.ok) {
        renderQuickResults([]);
        return;
      }
      const json = await res.json();
      renderQuickResults(json.data || []);
    } catch (err) {
      console.warn('Search fetch error', err);
      renderQuickResults([]);
    }
  }

  if (quickInput) {
    quickInput.style.display = 'none'; // default hidden
    quickInput.addEventListener('input', function (e) {
      const q = this.value || '';
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        doSearch(q.trim());
      }, 300);
    });
    quickInput.addEventListener('keydown', function (e) {
      // ESC closes
      if (e.key === 'Escape') {
        quickInput.value = '';
        quickInput.style.display = 'none';
        closeQuickDropdown();
      }
    });
  }

  if (!cartDrawer || !cartOverlay || !cartItemsContainer || !cartTotal) {
    console.warn('Cart elements not found in DOM');
    return;
  }

  const defaultNext = () =>
    window.getCurrentPath ? window.getCurrentPath() : '/';

  function toggleCart() {
    cartDrawer.classList.toggle('active');
    cartOverlay.classList.toggle('active');
    if (cartDrawer.classList.contains('active')) {
      renderCart();
    }
  }

  function openCartDrawer() {
    if (!cartDrawer.classList.contains('active')) {
      cartDrawer.classList.add('active');
      cartOverlay.classList.add('active');
    }
    renderCart();
  }

  function closeCartDrawer() {
    cartDrawer.classList.remove('active');
    cartOverlay.classList.remove('active');
  }

  if (cartIcon) {
    cartIcon.addEventListener('click', () => {
      if (
        !window.requireLogin({
          next: defaultNext(),
          openCart: true,
        })
      ) {
        return;
      }
      toggleCart();
    });
  }

  if (closeCart) {
    closeCart.addEventListener('click', closeCartDrawer);
  }

  cartOverlay.addEventListener('click', closeCartDrawer);

  function normalizeProduct(product) {
    if (!product) return null;
    const normalized = {
      id: product.id ?? product.ID ?? product.productId ?? null,
      name: product.name ?? product.ProductName ?? '',
      price: Number(product.price ?? product.Price ?? 0) || 0,
      img: product.img ?? product.ImgPath ?? '/img/default.jpg',
      size: product.size ?? product.Size ?? null,
      color: product.color ?? product.Color ?? null,
    };
    return normalized.name ? normalized : null;
  }

  window.addToCart = function (product) {
    if (addToCartLock) return;
    const releaseLock = () => {
      addToCartLock = false;
    };
    addToCartLock = true;

    const normalized = normalizeProduct(product);
    if (!normalized) {
      releaseLock();
      return;
    }

    const nextUrl = defaultNext();
    if (
      !window.requireLogin({
        next: nextUrl,
        cartItem: normalized,
        openCart: true,
      })
    ) {
      releaseLock();
      return;
    }

    const found = cart.find(
      (item) =>
        item.name === normalized.name &&
        item.size === normalized.size &&
        item.color === normalized.color
    );

    if (found) {
      found.quantity += 1;
    } else {
      cart.push({
        ...normalized,
        quantity: product.quantity ? Number(product.quantity) || 1 : 1,
      });
    }

    saveCart();
    openCartDrawer();
    releaseLock();
  };

  // Before submitting cart form, build URL with cartData query parameter
  const cartForm = document.getElementById('cartForm');
  const cartDataInput = document.getElementById('cartData');
  if (cartForm && cartDataInput) {
    cartForm.addEventListener('submit', function (e) {
      e.preventDefault();
      try {
        const cartData = JSON.stringify(cart || []);
        const encodedCartData = encodeURIComponent(cartData);
        window.location.href = `/checkout?cartData=${encodedCartData}`;
      } catch (err) {
        console.error('Failed to serialize cart for checkout', err);
        window.location.href = '/checkout?cartData=[]';
      }
    });
  }

  function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
  }

  function renderCart() {
    cartItemsContainer.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
      cartItemsContainer.innerHTML =
        '<p style="padding:16px;color:#666">Your cart is empty.</p>';
      cartTotal.textContent = `$0.00`;
      return;
    }

    cart.forEach((item, index) => {
      const div = document.createElement('div');
      div.classList.add('cart-item');
      div.innerHTML = `
                <img src="${item.img || '/img/default.jpg'}" alt="${item.name}">
                <div class="cart-item-details">
                    <h4>${item.name}</h4>
                    <p>$${Number(item.price || 0).toFixed(2)}</p>
                    <div class="quantity">
                        <button type="button" onclick="changeQty(${index}, -1)">-</button>
                        <span>${item.quantity}</span>
                        <button type="button" onclick="changeQty(${index}, 1)">+</button>
                    </div>
                </div>
            `;
      cartItemsContainer.appendChild(div);
      total += (item.price || 0) * item.quantity;
    });

    cartTotal.textContent = `$${total.toFixed(2)}`;
  }

  window.changeQty = function (index, delta) {
    if (!cart[index]) return;
    cart[index].quantity += delta;
    if (cart[index].quantity <= 0) cart.splice(index, 1);
    saveCart();
    renderCart();
  };

   // === HANDLE YOUTUBE SHORT THUMBNAILS ===
  const ytThumbs = document.querySelectorAll('.youtube-short');

  ytThumbs.forEach(function (thumb) {
    const videoId = thumb.getAttribute('data-video-id');
    const img = thumb.querySelector('img');

    // Gán thumbnail tự động từ YouTube
    if (videoId && img) {
      img.src = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    }

    // Click -> đổi thành iframe YouTube
    thumb.addEventListener('click', function () {
      if (!videoId) return;

      const iframe = document.createElement('iframe');
      iframe.setAttribute(
        'src',
        'https://www.youtube.com/embed/' +
          videoId +
          '?autoplay=1&mute=0&playsinline=1'
      );
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute(
        'allow',
        'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
      );
      iframe.setAttribute('allowfullscreen', 'allowfullscreen');
      iframe.style.width = '100%';
      iframe.style.height = '100%';

      thumb.innerHTML = '';
      thumb.appendChild(iframe);
    });
  });

    document.addEventListener("DOMContentLoaded", function () {
        const ytThumbs = document.querySelectorAll(".youtube-short");

        ytThumbs.forEach(function (thumb) {
            thumb.addEventListener("click", function () {
                const videoId = thumb.getAttribute("data-video-id");
                const iframe = document.createElement("iframe");

                iframe.setAttribute(
                    "src",
                    "https://www.youtube.com/embed/" +
                    videoId +
                    "?autoplay=1&mute=0&playsinline=1"
                );
                iframe.setAttribute("frameborder", "0");
                iframe.setAttribute(
                    "allow",
                    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                );
                iframe.setAttribute("allowfullscreen", "allowfullscreen");
                iframe.style.width = "100%";
                iframe.style.height = "100%";

                // xoá thumbnail + nút play, thay bằng iframe
                thumb.innerHTML = "";
                thumb.appendChild(iframe);
            });
        });
    });


  function resumePendingCartActions() {
    if (!window.isUserLoggedIn || !window.isUserLoggedIn()) return;

    const pendingItemRaw = sessionStorage.getItem('pendingCartItem');
    if (pendingItemRaw) {
      try {
        const pendingItem = JSON.parse(pendingItemRaw);
        sessionStorage.removeItem('pendingCartItem');
        if (pendingItem) {
          window.addToCart(pendingItem);
        }
      } catch (err) {
        console.warn('Failed to restore pending cart item', err);
        sessionStorage.removeItem('pendingCartItem');
      }
    }

    if (sessionStorage.getItem('openCartAfterLogin') === '1') {
      sessionStorage.removeItem('openCartAfterLogin');
      openCartDrawer();
    }
  }

  renderCart();
  resumePendingCartActions();
});
