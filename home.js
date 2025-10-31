
// Scroll reveal effect
window.addEventListener('scroll', () => {
  document.querySelectorAll('section').forEach(sec => {
    const top = sec.getBoundingClientRect().top;
    if (top < window.innerHeight - 100) {
      sec.classList.add('visible');
    }
  });
});


// === CART FUNCTIONALITY ===
const cartIcon = document.querySelector('.fa-shopping-cart');
const cartSidebar = document.getElementById('cartSidebar');
const cartOverlay = document.querySelector('.cart-overlay');
const closeCart = document.getElementById('closeCart');
const cartItemsContainer = document.getElementById('cartItems');
const cartTotal = document.getElementById('cartTotal');

let cart = JSON.parse(localStorage.getItem('cart')) || [];

// === OPEN / CLOSE CART ===
cartIcon.addEventListener('click', () => {
  cartSidebar.classList.add('active');
  cartOverlay.classList.add('active');
  renderCart();
});

closeCart.addEventListener('click', () => {
  cartSidebar.classList.remove('active');
  cartOverlay.classList.remove('active');
});

cartOverlay.addEventListener('click', () => {
  cartSidebar.classList.remove('active');
  cartOverlay.classList.remove('active');
});

// === ADD TO CART ===
function addToCart(product) {
  const existing = cart.find(item => item.name === product.name);
  if (existing) {
    existing.quantity++;
  } else {
    cart.push({ ...product, quantity: 1 });
  }
  saveCart();
  renderCart();
}

// === SAVE TO LOCALSTORAGE ===
function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

// === RENDER CART ===
function renderCart() {
  cartItemsContainer.innerHTML = '';
  let total = 0;

  cart.forEach((item, index) => {
    const itemDiv = document.createElement('div');
    itemDiv.classList.add('cart-item');
    itemDiv.innerHTML = `
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
    cartItemsContainer.appendChild(itemDiv);
    total += item.price * item.quantity;
  });

  cartTotal.textContent = `$${total.toFixed(2)}`;
}

// === CHANGE QUANTITY ===
function changeQty(index, delta) {
  cart[index].quantity += delta;
  if (cart[index].quantity <= 0) cart.splice(index, 1);
  saveCart();
  renderCart();
}