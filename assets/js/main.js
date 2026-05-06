let products = [];
let filteredProducts = [];
let cart = [];
let currentModal = null;
let currentProduct = null;

// Load products from JSON
async function loadProducts() {
    try {
        const response = await fetch('products.json');
        products = await response.json();
        filteredProducts = [...products];
        displayProducts(filteredProducts);
        updateCartCount();
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Display products in grid
function displayProducts(productsToDisplay) {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = '';

    productsToDisplay.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${product.image}" alt="${product.name}" class="product-image">
            <div class="product-info">
                <p class="product-category">${product.category}</p>
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description}</p>
                <p class="product-price">$${product.price.toLocaleString()}</p>
                <button class="btn-view" onclick="openModal(${product.id})">View Details</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Open product details modal
function openModal(productId) {
    currentProduct = products.find(p => p.id === productId);
    if (!currentProduct) return;

    document.getElementById('modalImage').src = currentProduct.image;
    document.getElementById('modalTitle').textContent = currentProduct.name;
    document.getElementById('modalDescription').textContent = currentProduct.description;
    document.getElementById('modalPrice').textContent = `$${currentProduct.price.toLocaleString()}`;
    document.getElementById('quantity').value = 1;

    const specsDiv = document.getElementById('modalSpecs');
    specsDiv.innerHTML = '<strong>Specifications:</strong><ul>' +
        currentProduct.specs.map(spec => `<li>${spec}</li>`).join('') +
        '</ul>';

    const modal = document.getElementById('productModal');
    modal.style.display = 'block';
}

// Close modal
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('productModal');
    const closeBtn = document.querySelector('.close');

    closeBtn.onclick = () => {
        modal.style.display = 'none';
    };

    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };

    // Load cart from localStorage
    loadCart();
    loadProducts();

    // Setup filter buttons
    setupFilterButtons();
});

// Add product to cart from modal
function addToCartFromModal() {
    if (!currentProduct) return;

    const quantity = parseInt(document.getElementById('quantity').value) || 1;
    addToCart(currentProduct, quantity);

    // Close modal
    document.getElementById('productModal').style.display = 'none';
    
    // Show notification
    showNotification('Added to cart!');
}

// Add to cart
function addToCart(product, quantity = 1) {
    const existingItem = cart.find(item => item.id === product.id);

    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            ...product,
            quantity: quantity
        });
    }

    saveCart();
    updateCartCount();
}

// Update cart count in navbar
function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.querySelector('.cart-count').textContent = count;
}

// Save cart to localStorage
function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// Load cart from localStorage
function loadCart() {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        updateCartCount();
    }
}

// Setup filter buttons
function setupFilterButtons() {
    const filterBtns = document.querySelectorAll('.filter-btn');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            filterBtns.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');

            const category = btn.getAttribute('data-category');
            filterByCategory(category);
        });
    });
}

// Filter products by category
function filterByCategory(category) {
    if (category === 'all') {
        filteredProducts = [...products];
    } else {
        filteredProducts = products.filter(p => p.category === category);
    }
    displayProducts(filteredProducts);
}

// Show notification
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'success-message';
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.top = '100px';
    notification.style.right = '20px';
    notification.style.zIndex = '1001';
    notification.style.minWidth = '300px';
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Navigate to cart
function goToCart() {
    window.location.href = 'cart.html';
}
