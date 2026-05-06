let products = [];
let currentProduct = null;
let cart = loadCart();
let activeCat = 'all';
let activeCond = 'all';

// ---- Boot ----
document.addEventListener('DOMContentLoaded', async () => {
    updateBadge();
    await fetchProducts();
    applyFilters();
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

    const count = document.getElementById('productsCount');
    if (count) count.textContent = `${list.length} sản phẩm`; 

    if (list.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--gray-400)">
            <div style="font-size:48px;margin-bottom:16px">🔍</div>
            <h3 style="font-size:20px;font-weight:700;margin-bottom:8px">Không tìm thấy sản phẩm</h3>
            <p>Hãy thay đổi các bộ lọc phía trên.</p>
        </div>`;
        return;
    }

    list.forEach(p => {
        const isUsed = p.condition === 'Used';
        const el = document.createElement('div');
        el.className = 'product-card';
        el.innerHTML = `
            <div class="card-img-wrap">
                ${p.badge ? `<span class="card-badge badge-${p.badge.toLowerCase()}">${p.badge}</span>` : ''}
                <span class="condition-tag condition-${(p.condition||'new').toLowerCase()}">${p.condition === 'Used' ? '✅ Đã Dùng' : '🟢 Mới'}</span>
                <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='https://placehold.co/600x400/f5f5f5/ccc?text=${encodeURIComponent(p.name)}'">
            </div>
            <div class="card-body">
                <p class="card-cat">${p.category}</p>
                <h3 class="card-name">${p.name}</h3>
                <p class="card-desc">${p.description}</p>
                <div class="card-footer">
                    <div class="card-price-wrap">
                        <span class="card-price">${p.price.toLocaleString('vi-VN')}₫</span>
                        ${isUsed ? '<span class="card-condition-note">Chứng Thực Tuyệt Vời</span>' : ''}
                    </div>
                    <button class="card-add" title="Thêm vào giỏ" onclick="quickAdd(event, ${p.id})">+</button>
                </div>
            </div>
        `;
        el.querySelector('.card-img-wrap').addEventListener('click', () => openModal(p.id));
        el.querySelector('.card-name').addEventListener('click', () => openModal(p.id));
        grid.appendChild(el);
    });
}

// ---- Filters ----
function getFiltered() {
    return products.filter(p => {
        const catOk = activeCat === 'all' || p.category === activeCat;
        const condOk = activeCond === 'all' || p.condition === activeCond;
        return catOk && condOk;
    });
}

function applyFilters() {
    const filtered = getFiltered();
    const heading = document.getElementById('productsHeading');
    if (heading) {
        const cat = activeCat === 'all' ? 'Tất Cả Sản Phẩm' : activeCat;
        const cond = activeCond === 'all' ? '' : ` · ${activeCond === 'New' ? 'Mới' : 'Đã Dùng'}`;
        heading.textContent = cat + cond;
    }
    renderGrid(filtered);
}

function setupFilters() {
    document.querySelectorAll('.filter-pill[data-cat]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-pill[data-cat]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeCat = btn.dataset.cat;
            applyFilters();
        });
    });
    document.querySelectorAll('.filter-pill[data-cond]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-pill[data-cond]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeCond = btn.dataset.cond;
            applyFilters();
        });
    });
}

// ---- filterCategory (called from category cards) ----
function filterCategory(cat) {
    document.querySelector('#products').scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => {
        document.querySelectorAll('.filter-pill[data-cat]').forEach(b => {
            b.classList.toggle('active', b.dataset.cat === cat);
        });
        activeCat = cat;
        applyFilters();
    }, 500);
}

// ---- Quick add without modal ----
function quickAdd(e, id) {
    e.stopPropagation();
    const p = products.find(x => x.id === id);
    if (!p) return;
    addToCart(p, 1);
    showToast(`${p.name} đã thêm vào giỏ 🛒`);
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
        showToast(`${currentProduct.name} đã thêm vào giỏ 🛒`);
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

    // show condition
    let condEl = document.getElementById('modalCondition');
    if (!condEl) {
        condEl = document.createElement('div');
        condEl.id = 'modalCondition';
        badge.parentNode.insertBefore(condEl, badge.nextSibling);
    }
    condEl.className = `modal-condition condition-${(p.condition||'new').toLowerCase()}`;
    condEl.textContent = p.condition === 'Used' ? '🟡 Đã Dùng · Chứng Thực Tuyệt Vời' : '🟢 Mới · Hộp Nguyên Seal';
    condEl.style.display = 'flex';

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
