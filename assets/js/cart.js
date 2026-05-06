let cart = [];

document.addEventListener('DOMContentLoaded', () => {
    cart = loadCart();
    renderCart();
    updateBadge();
});

function loadCart() {
    try { return JSON.parse(localStorage.getItem('cart') || '[]'); } catch { return []; }
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateBadge();
}

function updateBadge() {
    const count = cart.reduce((s, i) => s + i.quantity, 0);
    const b = document.getElementById('cartBadge');
    if (b) { b.textContent = count; b.classList.toggle('hidden', count === 0); }
}

function renderCart() {
    const itemsEl = document.getElementById('cartItems');
    const emptyEl = document.getElementById('cartEmpty');
    const summaryEl = document.getElementById('cartSummary');
    if (!itemsEl) return;

    if (cart.length === 0) {
        itemsEl.style.display = 'none';
        if (emptyEl) emptyEl.style.display = 'flex';
        if (summaryEl) summaryEl.style.display = 'none';
        return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    if (summaryEl) summaryEl.style.display = 'block';
    itemsEl.style.display = 'flex';

    itemsEl.innerHTML = '';
    cart.forEach((item, i) => {
        const el = document.createElement('div');
        el.className = 'cart-item';
        el.innerHTML = `
            <img class="cart-item-img" src="${item.image}" alt="${item.name}"
                 onerror="this.src='https://placehold.co/120x90/f2f2f7/999?text=Product'">
            <div class="cart-item-info">
                <p class="cart-item-cat">${item.category}</p>
                <h3>${item.name}</h3>
                <div class="cart-qty" style="margin-top:8px">
                    <button onclick="changeQty(${i}, -1)">−</button>
                    <input type="number" value="${item.quantity}" min="1" max="10"
                           onchange="setQty(${i}, this.value)">
                    <button onclick="changeQty(${i}, 1)">+</button>
                </div>
            </div>
            <div class="cart-item-right">
                <span class="cart-item-total">$${(item.price * item.quantity).toLocaleString()}</span>
                <button class="cart-item-remove" onclick="removeItem(${i})">Remove</button>
            </div>
        `;
        itemsEl.appendChild(el);
    });

    updateSummary();
}

function changeQty(i, delta) {
    cart[i].quantity = Math.max(1, cart[i].quantity + delta);
    saveCart();
    renderCart();
}

function setQty(i, val) {
    const q = Math.max(1, parseInt(val) || 1);
    cart[i].quantity = q;
    saveCart();
    renderCart();
}

function removeItem(i) {
    cart.splice(i, 1);
    saveCart();
    renderCart();
}

function updateSummary() {
    const sub = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const tax = sub * 0.1;
    const total = sub + tax;
    const fmt = n => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    document.getElementById('subtotal').textContent = fmt(sub);
    document.getElementById('tax').textContent = fmt(tax);
    document.getElementById('total').textContent = fmt(total);
}

function goToCheckout() {
    if (cart.length === 0) { alert('Your cart is empty.'); return; }
    window.location.href = 'checkout.html';
}
