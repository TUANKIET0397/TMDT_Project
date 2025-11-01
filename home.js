
// Scroll reveal effect
window.addEventListener('scroll', () => {
  document.querySelectorAll('section').forEach(sec => {
    const top = sec.getBoundingClientRect().top;
    if (top < window.innerHeight - 100) {
      sec.classList.add('visible');
    }
  });
});


// === CART SYSTEM ===
const cartIcon = document.querySelector('.fa-shopping-cart');
const cartDrawer = document.getElementById('cartDrawer');
const cartOverlay = document.querySelector('.cart-overlay');
const closeCart = document.getElementById('closeCart');
const cartItemsContainer = document.getElementById('cartItems');
const cartTotal = document.getElementById('cartTotal');

let cart = JSON.parse(localStorage.getItem('cart')) || [];

// === OPEN / CLOSE CART ===
cartIcon.addEventListener('click', () => {
  cartDrawer.classList.toggle('active');
  cartOverlay.classList.toggle('active');
  renderCart();
});

closeCart.addEventListener('click', () => {
  cartDrawer.classList.remove('active');
  cartOverlay.classList.remove('active');
});

cartOverlay.addEventListener('click', () => {
  cartDrawer.classList.remove('active');
  cartOverlay.classList.remove('active');
});

// === ADD TO CART FUNCTION ===
function addToCart(product) {
  event.preventDefault();

  const found = cart.find(item => item.name === product.name);
  if (found) {
    found.quantity++;
  } else {
    cart.push({ ...product, quantity: 1 });
  }
  saveCart();
  renderCart();
  // Hiển thị giỏ hàng ngay
  cartDrawer.classList.add('active');
  cartOverlay.classList.add('active');
}

// === SAVE CART TO LOCAL STORAGE ===
function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

// === RENDER CART ===
function renderCart() {
  cartItemsContainer.innerHTML = '';
  let total = 0;

  cart.forEach((item, index) => {
    const div = document.createElement('div');
    div.classList.add('cart-item');
    div.innerHTML = `
      <img src="${item.img}" alt="${item.name}">
      <div class="cart-item-details">
        <h4>${item.name}</h4>
        <p>$${item.price.toFixed(2)}</p>
        <div class="quantity">
          <button onclick="changeQty(${index}, -1)">-</button>
          <span>${item.quantity}</span>
          <button onclick="changeQty(${index}, 1)">+</button>
        </div>
      </div>
    `;
    cartItemsContainer.appendChild(div);
    total += item.price * item.quantity;
  });

  cartTotal.textContent = `$${total.toFixed(2)}`;
}

// CHANGE QTY
function changeQty(index, delta) {
  cart[index].quantity += delta;
  if (cart[index].quantity <= 0) cart.splice(index, 1);
  saveCart();
  renderCart();
}

// khoi dong
renderCart();
