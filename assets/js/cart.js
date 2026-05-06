let cart = [];

document.addEventListener('DOMContentLoaded', () => {
    loadCart();
    displayCart();
});

// Load cart from localStorage
function loadCart() {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
}

// Display cart items
function displayCart() {
    const cartItemsDiv = document.getElementById('cartItems');
    const cartEmptyDiv = document.getElementById('cartEmpty');
    const cartSummaryDiv = document.getElementById('cartSummary');

    if (cart.length === 0) {
        cartItemsDiv.style.display = 'none';
        cartSummaryDiv.style.display = 'none';
        cartEmptyDiv.style.display = 'block';
        return;
    }

    cartItemsDiv.style.display = 'flex';
    cartSummaryDiv.style.display = 'block';
    cartEmptyDiv.style.display = 'none';

    cartItemsDiv.innerHTML = '';
    cart.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'cart-item';
        itemDiv.innerHTML = `
            <img src="${item.image}" alt="${item.name}" class="cart-item-image">
            <div class="cart-item-details">
                <h3>${item.name}</h3>
                <p>$${item.price.toLocaleString()}</p>
            </div>
            <div class="cart-item-quantity">
                <button onclick="updateQuantity(${index}, -1)">−</button>
                <input type="number" value="${item.quantity}" min="1" onchange="updateQuantityDirect(${index}, this.value)">
                <button onclick="updateQuantity(${index}, 1)">+</button>
            </div>
            <div class="cart-item-price">$${(item.price * item.quantity).toLocaleString()}</div>
            <button class="cart-item-remove" onclick="removeFromCart(${index})">Remove</button>
        `;
        cartItemsDiv.appendChild(itemDiv);
    });

    updateSummary();
}

// Update quantity
function updateQuantity(index, change) {
    cart[index].quantity += change;
    if (cart[index].quantity <= 0) {
        removeFromCart(index);
        return;
    }
    saveCart();
    displayCart();
}

// Update quantity directly
function updateQuantityDirect(index, value) {
    const quantity = parseInt(value) || 1;
    if (quantity <= 0) {
        removeFromCart(index);
        return;
    }
    cart[index].quantity = quantity;
    saveCart();
    displayCart();
}

// Remove from cart
function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    updateNavbarCount();
    displayCart();
}

// Update summary
function updateSummary() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    document.getElementById('subtotal').textContent = `$${subtotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    document.getElementById('tax').textContent = `$${tax.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    document.getElementById('total').textContent = `$${total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}

// Save cart
function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateNavbarCount();
}

// Update navbar cart count
function updateNavbarCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCountEl = document.querySelector('.cart-count');
    if (cartCountEl) {
        cartCountEl.textContent = count;
    }
}

// Navigate to checkout
function goToCheckout() {
    if (cart.length === 0) {
        alert('Your cart is empty');
        return;
    }
    window.location.href = 'checkout.html';
}
