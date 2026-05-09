// ============================================================
// PRODUCT MANAGEMENT & FILTERING SYSTEM
// Based on taoxinh.vn technical architecture
// ============================================================

let products = [];
let cart = [];
const PRODUCTS_URL = 'products-enhanced.json';

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    await loadProducts();
    initializeApp();
    setupEventListeners();
    displayProducts(products);
});

// ============================================================
// LOAD PRODUCTS (with variants)
// ============================================================

async function loadProducts() {
    try {
        const response = await fetch(PRODUCTS_URL);
        if (!response.ok) throw new Error('Failed to load products');
        products = await response.json();
        console.log(`✓ Loaded ${products.length} products with variants`);
    } catch (error) {
        console.error('Error loading products:', error);
        showError('Failed to load products. Please refresh the page.');
    }
}

// ============================================================
// INITIALIZE APP
// ============================================================

function initializeApp() {
    // Load cart from localStorage
    const savedCart = localStorage.getItem('cart');
    if (savedCart) cart = JSON.parse(savedCart);
    updateCartBadge();
    
    // Populate filters
    populateFilters();
}

// ============================================================
// POPULATE FILTERS
// ============================================================

function populateFilters() {
    // Categories
    const categories = [...new Set(products.map(p => p.category))];
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categories.forEach(cat => {
            const label = document.createElement('label');
            label.className = 'filter-option';
            label.innerHTML = `
                <input type="checkbox" value="${cat}" data-filter="category">
                <span>${cat}</span>
            `;
            categoryFilter.appendChild(label);
        });
    }

    // Conditions
    const conditions = new Set();
    products.forEach(p => p.variants.forEach(v => conditions.add(v.condition)));
    const conditionFilter = document.getElementById('conditionFilter');
    if (conditionFilter) {
        Array.from(conditions).forEach(cond => {
            const label = document.createElement('label');
            label.className = 'filter-option';
            label.innerHTML = `
                <input type="checkbox" value="${cond}" data-filter="condition">
                <span>${cond}</span>
            `;
            conditionFilter.appendChild(label);
        });
    }

    // Price range
    const prices = products.flatMap(p => p.variants.map(v => v.price));
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    const priceFilter = document.getElementById('priceRange');
    if (priceFilter) {
        priceFilter.min = minPrice;
        priceFilter.max = maxPrice;
        priceFilter.value = maxPrice;
        document.getElementById('maxPriceDisplay').textContent = `$${maxPrice.toLocaleString()}`;
    }
}

// ============================================================
// SETUP EVENT LISTENERS
// ============================================================

function setupEventListeners() {
    // Filters
    const filters = document.querySelectorAll('[data-filter]');
    filters.forEach(filter => {
        filter.addEventListener('change', applyFilters);
    });

    // Price range
    const priceRange = document.getElementById('priceRange');
    if (priceRange) {
        priceRange.addEventListener('input', (e) => {
            document.getElementById('maxPriceDisplay').textContent = `$${parseInt(e.target.value).toLocaleString()}`;
            applyFilters();
        });
    }

    // Sort dropdown
    const sortDropdown = document.getElementById('sortDropdown');
    if (sortDropdown) {
        sortDropdown.addEventListener('change', applyFilters);
    }

    // Mobile navbar
    const navBurger = document.getElementById('navBurger');
    const navMobile = document.getElementById('navMobile');
    if (navBurger) {
        navBurger.addEventListener('click', () => {
            navMobile.style.display = navMobile.style.display === 'flex' ? 'none' : 'flex';
        });
    }

    // Cart
    const cartLink = document.querySelector('a[href="cart.html"]');
    if (cartLink) {
        cartLink.parentElement.addEventListener('click', () => {
            if (event.target.closest('.nav-cart')) {
                window.location.href = 'cart.html';
            }
        });
    }
}

// ============================================================
// APPLY FILTERS (AJAX-like)
// ============================================================

function applyFilters() {
    const selectedCategories = Array.from(document.querySelectorAll('[data-filter="category"]:checked'))
        .map(el => el.value);
    
    const selectedConditions = Array.from(document.querySelectorAll('[data-filter="condition"]:checked'))
        .map(el => el.value);
    
    const maxPrice = parseInt(document.getElementById('priceRange')?.value || 999999);
    const sortBy = document.getElementById('sortDropdown')?.value || 'newest';

    // Filter products
    let filtered = products.filter(product => {
        // Category filter
        if (selectedCategories.length > 0 && !selectedCategories.includes(product.category)) {
            return false;
        }

        // Condition & Price filter (via variants)
        const hasVariant = product.variants.some(v => {
            const conditionMatch = selectedConditions.length === 0 || selectedConditions.includes(v.condition);
            const priceMatch = v.price <= maxPrice;
            return conditionMatch && priceMatch;
        });

        return hasVariant;
    });

    // Sort
    filtered = sortProducts(filtered, sortBy);

    // Display
    displayProducts(filtered);
    updateResultsInfo(filtered);
}

// ============================================================
// SORT PRODUCTS
// ============================================================

function sortProducts(productsToSort, sortBy) {
    const sorted = [...productsToSort];

    switch (sortBy) {
        case 'price-low':
            sorted.sort((a, b) => a.priceRange.min - b.priceRange.min);
            break;
        case 'price-high':
            sorted.sort((a, b) => b.priceRange.max - a.priceRange.max);
            break;
        case 'rating':
            sorted.sort((a, b) => b.rating - a.rating);
            break;
        case 'newest':
        default:
            // Keep original order (newest first)
            break;
    }

    return sorted;
}

// ============================================================
// DISPLAY PRODUCTS
// ============================================================

function displayProducts(productsToDisplay) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    if (productsToDisplay.length === 0) {
        grid.innerHTML = '<div class="no-results" style="grid-column: 1/-1;">No products found. Try adjusting your filters.</div>';
        return;
    }

    grid.innerHTML = productsToDisplay.map(product => `
        <div class="product-card" onclick="openProductDetail(${product.id})">
            <div class="product-image">
                <img src="${product.image}" alt="${product.name}" loading="lazy">
                ${product.badge ? `<div class="product-badge">${product.badge}</div>` : ''}
            </div>
            <div class="product-info">
                <div class="product-category">${product.category}</div>
                <div class="product-name">${product.name}</div>
                
                <div class="product-rating">
                    <span class="stars">${'★'.repeat(Math.floor(product.rating))}${'☆'.repeat(5 - Math.floor(product.rating))}</span>
                    <span class="review-count">${product.reviewCount} reviews</span>
                </div>

                ${product.priceRange ? `
                    <div class="product-price">$${product.priceRange.min.toLocaleString()} - $${product.priceRange.max.toLocaleString()}</div>
                ` : ''}

                <button class="btn-add-to-cart" onclick="addToCart(event, ${product.id})">Add to Cart</button>
            </div>
        </div>
    `).join('');
}

// ============================================================
// UPDATE RESULTS INFO
// ============================================================

function updateResultsInfo(filtered) {
    const resultsInfo = document.getElementById('resultsInfo');
    if (resultsInfo) {
        resultsInfo.textContent = `Showing ${filtered.length} of ${products.length} results`;
    }
}

// ============================================================
// PRODUCT DETAIL MODAL
// ============================================================

function openProductDetail(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
        <div class="modal-content">
            <button class="modal-close" onclick="this.closest('.modal').remove()">✕</button>
            
            <div class="modal-body">
                <div class="modal-image">
                    <img src="${product.image}" alt="${product.name}">
                </div>
                
                <div class="modal-details">
                    <h2>${product.name}</h2>
                    <p class="modal-description">${product.description}</p>
                    
                    <div class="modal-rating">
                        <span class="stars">${'★'.repeat(Math.floor(product.rating))}${'☆'.repeat(5 - Math.floor(product.rating))}</span>
                        <span>(${product.reviewCount} reviews)</span>
                    </div>

                    <div class="modal-specs">
                        <h3>Specifications</h3>
                        <ul>
                            ${product.specs.map(spec => `<li>${spec}</li>`).join('')}
                        </ul>
                    </div>

                    <!-- VARIANT SELECTOR -->
                    <div class="variant-selector">
                        ${renderVariantSelectors(product)}
                    </div>

                    <div class="modal-price" id="modalPrice">
                        Starting from: <strong>$${product.priceRange.min.toLocaleString()}</strong>
                    </div>

                    <button class="btn-primary" onclick="addToCart(event, ${product.id}, true)" style="width: 100%;">
                        Add to Cart
                    </button>

                    ${product.tradeInValue ? `
                        <p class="trade-in-info">💱 Trade-in value up to $${product.tradeInValue}</p>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    setupVariantListeners(product, modal);
}

// ============================================================
// RENDER VARIANT SELECTORS
// ============================================================

function renderVariantSelectors(product) {
    const variantFields = {};

    product.variants.forEach(variant => {
        Object.keys(variant).forEach(key => {
            if (!['id', 'price', 'stock', 'sku'].includes(key)) {
                if (!variantFields[key]) variantFields[key] = new Set();
                if (variant[key]) variantFields[key].add(variant[key]);
            }
        });
    });

    return Object.entries(variantFields).map(([field, values]) => `
        <div class="variant-group">
            <label>${field.charAt(0).toUpperCase() + field.slice(1)}:</label>
            <select data-variant-field="${field}" class="variant-select">
                <option value="">Select ${field}...</option>
                ${Array.from(values).map(v => `<option value="${v}">${v}</option>`).join('')}
            </select>
        </div>
    `).join('');
}

// ============================================================
// SETUP VARIANT LISTENERS
// ============================================================

function setupVariantListeners(product, modal) {
    const selects = modal.querySelectorAll('.variant-select');
    
    selects.forEach(select => {
        select.addEventListener('change', () => {
            updateVariantPrice(product, modal);
        });
    });
}

// ============================================================
// UPDATE VARIANT PRICE
// ============================================================

function updateVariantPrice(product, modal) {
    const selects = modal.querySelectorAll('.variant-select');
    const selectedValues = {};

    selects.forEach(select => {
        if (select.value) {
            selectedValues[select.dataset.variantField] = select.value;
        }
    });

    // Find matching variant
    const variant = product.variants.find(v => {
        return Object.entries(selectedValues).every(([field, value]) => v[field] === value);
    });

    if (variant) {
        const priceDisplay = modal.querySelector('#modalPrice');
        priceDisplay.innerHTML = `
            Price: <strong>$${variant.price.toLocaleString()}</strong>
            ${variant.stock > 0 ? `<span style="color: green;"> (${variant.stock} in stock)</span>` : `<span style="color: red;"> (Out of stock)</span>`}
        `;
    }
}

// ============================================================
// ADD TO CART
// ============================================================

function addToCart(event, productId, isFromModal = false) {
    event.stopPropagation();
    
    const product = products.find(p => p.id === productId);
    if (!product) return;

    let selectedVariant = null;

    if (isFromModal) {
        const modal = event.target.closest('.modal');
        const selects = modal.querySelectorAll('.variant-select');
        const selectedValues = {};

        selects.forEach(select => {
            if (select.value) {
                selectedValues[select.dataset.variantField] = select.value;
            }
        });

        selectedVariant = product.variants.find(v => {
            return Object.entries(selectedValues).every(([field, value]) => v[field] === value);
        });

        if (!selectedVariant) {
            alert('Please select all variant options');
            return;
        }
    } else {
        // Use cheapest variant if not selected
        selectedVariant = product.variants[0];
    }

    // Add to cart
    cart.push({
        productId: product.id,
        productName: product.name,
        variantId: selectedVariant.id,
        variantDetails: selectedVariant,
        price: selectedVariant.price,
        quantity: 1
    });

    // Save cart
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartBadge();

    // Close modal if open
    const modal = document.querySelector('.modal');
    if (modal && isFromModal) modal.remove();

    // Show confirmation
    showNotification(`${product.name} added to cart!`);
}

// ============================================================
// UPDATE CART BADGE
// ============================================================

function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    if (badge) badge.textContent = cart.length;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: #E61E8A;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function showError(message) {
    console.error(message);
    const error = document.createElement('div');
    error.style.cssText = `
        background: #ef4444;
        color: white;
        padding: 20px;
        border-radius: 8px;
        margin: 20px;
        text-align: center;
    `;
    error.textContent = message;
    document.body.insertBefore(error, document.body.firstChild);
}

function filterCategory(category) {
    // Reset filters
    document.querySelectorAll('[data-filter]').forEach(el => el.checked = false);
    
    // Set selected category
    const categoryCheckbox = document.querySelector(`[data-filter="category"][value="${category}"]`);
    if (categoryCheckbox) {
        categoryCheckbox.checked = true;
        applyFilters();
    }
}
