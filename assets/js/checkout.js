let cart = [];

document.addEventListener('DOMContentLoaded', () => {
    loadCart();
    displayOrderSummary();
    setupForm();
});

// Load cart from localStorage
function loadCart() {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
}

// Display order summary
function displayOrderSummary() {
    const summaryItemsDiv = document.getElementById('summaryItems');
    summaryItemsDiv.innerHTML = '';

    cart.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'summary-item';
        itemDiv.innerHTML = `
            <span>${item.name} x ${item.quantity}</span>
            <span>$${(item.price * item.quantity).toLocaleString()}</span>
        `;
        summaryItemsDiv.appendChild(itemDiv);
    });

    updateCheckoutSummary();
}

// Update checkout summary totals
function updateCheckoutSummary() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    document.getElementById('checkoutSubtotal').textContent = `$${subtotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    document.getElementById('checkoutTax').textContent = `$${tax.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    document.getElementById('checkoutTotal').textContent = `$${total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}

// Setup form submission
function setupForm() {
    const form = document.getElementById('checkoutForm');
    form.addEventListener('submit', submitOrder);
}

// Submit order
function submitOrder(e) {
    e.preventDefault();

    if (cart.length === 0) {
        alert('Your cart is empty');
        return;
    }

    // Prepare order data
    const formData = new FormData(document.getElementById('checkoutForm'));
    const orderData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        address: formData.get('address'),
        city: formData.get('city'),
        state: formData.get('state'),
        postal: formData.get('postal'),
        country: formData.get('country'),
        notes: formData.get('notes'),
        items: cart,
        subtotal: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        tax: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) * 0.1,
        total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) * 1.1,
        orderDate: new Date().toLocaleString(),
        orderNumber: generateOrderNumber()
    };

    // Save order to localStorage
    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    orders.push(orderData);
    localStorage.setItem('orders', JSON.stringify(orders));

    // Clear cart and show success
    localStorage.removeItem('cart');
    showOrderSuccess(orderData.orderNumber);
}

// Generate order number
function generateOrderNumber() {
    return 'ORD-' + Date.now();
}

// Show order success message
function showOrderSuccess(orderNumber) {
    const checkoutSection = document.querySelector('.checkout-section');
    checkoutSection.innerHTML = `
        <div class="container">
            <div class="success-message" style="max-width: 600px; margin: 60px auto; padding: 40px; text-align: center; background-color: #d4edda; color: #155724;">
                <h2 style="margin-bottom: 20px;">✓ Order Placed Successfully!</h2>
                <p style="font-size: 16px; margin-bottom: 10px;">Thank you for your order.</p>
                <p style="font-size: 18px; font-weight: bold; margin: 20px 0;">Order Number: ${orderNumber}</p>
                <p style="margin-bottom: 20px; color: #155724;">We'll contact you shortly to confirm payment details and process your order.</p>
                <a href="index.html" class="btn-primary" style="display: inline-block; padding: 12px 24px; background-color: #28a745; text-decoration: none; color: white; border-radius: 8px; margin-top: 20px;">Continue Shopping</a>
            </div>
        </div>
    `;
}
