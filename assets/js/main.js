let products = [];
let currentProduct = null;
let cart = loadCart();

// ---- Boot ----
document.addEventListener('DOMContentLoaded', async () => {
    updateBadge();
    await fetchProducts();
    renderGrid(products);
    setupFilters();
    setupModal();
    setupMobileNav();
});

// ---- Fetch products ----
async function fetchProducts() {
    const res = await fetch('products.json');
    products = await res.json();
}

// ---- Render grid ----
function renderGrid(list) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    grid.innerHTML = '';
    list.forEach(p => {
        const el = document.createElement('div');
        el.className = 'product-card';
        el.innerHTML = `
            <div class="card-img-wrap">
                ${p.badge ? `<span class="card-badge badge-${p.badge.toLowerCase()}">${p.badge}</span>` : ''}
                <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='https://placehold.co/600x400/f2f2f7/999?text=${encodeURIComponent(p.name)}'">
            </div>
            <div class="card-body">
                <p class="card-cat">${p.category}</p>
                <h3 class="card-name">${p.name}</h3>
                <p class="card-desc">${p.description}</p>
                <div class="card-footer">
                    <span class="card-price">$${p.price.toLocaleString()}</span>
                    <button class="card-add" title="Add to cart" onclick="quickAdd(event, ${p.id})">+</button>
                </div>
            </div>
        `;
        el.querySelector('.card-img-wrap').addEventListener('click', () => openModal(p.id));
        el.querySelector('.card-name').addEventListener('click', () => openModal(p.id));
        grid.appendChild(el);
    });
}

// ---- Filters ----
function setupFilters() {
    document.querySelectorAll('.filter-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const cat = btn.dataset.cat;
            const filtered = cat === 'all' ? products : products.filter(p => p.category === cat);
            const heading = document.getElementById('productsHeading');
            if (heading) heading.textContent = cat === 'all' ? 'All Products' : cat;
            renderGrid(filtered);
        });
    });
}

// ---- filterCategory (called from category cards) ----
function filterCategory(cat) {
    document.querySelector('#products').scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => {
        document.querySelectorAll('.filter-pill').forEach(b => {
            b.classList.toggle('active', b.dataset.cat === cat);
        });
        const filtered = products.filter(p => p.category === cat);
        const heading = document.getElementById('productsHeading');
        if (heading) heading.textContent = cat;
        renderGrid(filtered);
    }, 500);
}

// ---- Quick add without modal ----
function quickAdd(e, id) {
    e.stopPropagation();
    const p = products.find(x => x.id === id);
    if (!p) return;
    addToCart(p, 1);
    showToast(`${p.name} added to cart 🛒`);
}

// ---- Modal ----
function setupModal() {
    const overlay = document.getElementById('modalOverlay');
    const btnClose = document.getElementById('modalClose');
    if (!overlay) return;

    btnClose.addEventListener('click', closeModal);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

    document.getElementById('btnAdd').addEventListener('click', () => {
        if (!currentProduct) return;
        const qty = parseInt(document.getElementById('modalQty').value) || 1;
        addToCart(currentProduct, qty);
        showToast(`${currentProduct.name} added to cart 🛒`);
        closeModal();
    });
}

function openModal(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    currentProduct = p;

    document.getElementById('modalImg').src = p.image;
    document.getElementById('modalImg').onerror = function() {
        this.src = `https://placehold.co/600x400/f2f2f7/999?text=${encodeURIComponent(p.name)}`;
    };

    const badge = document.getElementById('modalBadge');
    badge.textContent = p.badge || '';
    badge.className = 'modal-badge' + (p.badge ? ` badge-${p.badge.toLowerCase()}` : '');
    badge.style.display = p.badge ? 'inline-block' : 'none';

    document.getElementById('modalCat').textContent = p.category;
    document.getElementById('modalTitle').textContent = p.name;
    document.getElementById('modalDesc').textContent = p.description;
    document.getElementById('modalPrice').textContent = `$${p.price.toLocaleString()}`;
    document.getElementById('modalQty').value = 1;

    const specsList = document.getElementById('modalSpecs');
    specsList.innerHTML = p.specs.map(s => `<li>${s}</li>`).join('');

    const overlay = document.getElementById('modalOverlay');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
    currentProduct = null;
}

function changeQty(delta) {
    const input = document.getElementById('modalQty');
    const val = Math.max(1, Math.min(10, (parseInt(input.value) || 1) + delta));
    input.value = val;
}

// ---- Cart ----
function loadCart() {
    try { return JSON.parse(localStorage.getItem('cart') || '[]'); } catch { return []; }
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateBadge();
}

function addToCart(product, qty) {
    const existing = cart.find(i => i.id === product.id);
    if (existing) existing.quantity += qty;
    else cart.push({ ...product, quantity: qty });
    saveCart();
}

function updateBadge() {
    const count = cart.reduce((s, i) => s + i.quantity, 0);
    const badge = document.getElementById('cartBadge');
    if (!badge) return;
    badge.textContent = count;
    badge.classList.toggle('hidden', count === 0);
}

// ---- Mobile Nav ----
function setupMobileNav() {
    const burger = document.getElementById('navBurger');
    const mobile = document.getElementById('navMobile');
    if (!burger || !mobile) return;
    burger.addEventListener('click', () => mobile.classList.toggle('open'));
}

// ---- Toast ----
function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
}
