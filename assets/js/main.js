/* =====================================================================
   Apple Store VN — Main JS
   Features: Swiper carousel · URL filter params · Lazy loading ·
   GA4 + GTM + Facebook Pixel tracking · Dynamic pricing · Product
   variants · Behavioral tracking · Mobile optimized
   ===================================================================== */

let products = [];
let currentProduct = null;
let selectedVariant = null;
let cart = loadCart();
let activeCat = 'all';
let activeCond = 'all';

// ===================== BOOT =====================
document.addEventListener('DOMContentLoaded', async () => {
    updateBadge();
    await fetchProducts();
    readUrlParams();      // restore filters from URL before rendering
    applyFilters();
    setupFilters();
    setupModal();
    setupMobileNav();
    setupStickyNav();
    initCarousel();
    initBehavioralTracking();
});

// ===================== FETCH PRODUCTS =====================
async function fetchProducts() {
    try {
        const result = await window.AppleStoreAPI.getProducts({ limit: 100 });
        products = result.data;
    } catch (e) {
        // Hard fallback to raw JSON
        try {
            const res = await fetch('products.json');
            products = await res.json();
        } catch { products = []; }
    }
}

// ===================== TRACKING HELPERS =====================

/** Fire a GA4 custom event */
function gaEvent(name, params) {
    if (typeof gtag !== 'undefined') {
        gtag('event', name, params || {});
    }
    if (typeof dataLayer !== 'undefined') {
        dataLayer.push({ event: name, ...(params || {}) });
    }
    // Also persist to backend behavioral endpoint
    if (window.AppleStoreAPI) {
        window.AppleStoreAPI.track(name, params || {});
    }
}

/** Fire a Facebook Pixel event */
function fbEvent(name, params) {
    if (typeof fbq !== 'undefined') {
        fbq('track', name, params || {});
    }
}

function trackViewItem(p) {
    const price = getMinPrice(p);
    gaEvent('view_item', {
        currency: 'VND', value: price,
        items: [{ item_id: String(p.id), item_name: p.name, item_category: p.category, item_variant: p.condition, price }]
    });
    fbEvent('ViewContent', { content_ids: [String(p.id)], content_name: p.name, content_type: 'product', value: price, currency: 'VND' });
}

function trackAddToCart(p, qty) {
    const price = selectedVariant ? selectedVariant.price : getMinPrice(p);
    const variantLabel = selectedVariant ? `${selectedVariant.storage} ${selectedVariant.color}` : p.condition;
    gaEvent('add_to_cart', {
        currency: 'VND', value: price * qty,
        items: [{ item_id: String(p.id), item_name: p.name, item_category: p.category, item_variant: variantLabel, price, quantity: qty }]
    });
    fbEvent('AddToCart', { content_ids: [String(p.id)], content_name: p.name, value: price * qty, currency: 'VND', num_items: qty });
}

// ===================== URL PARAMS =====================

function readUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const cat  = params.get('cat');
    const cond = params.get('cond');
    if (cat)  activeCat  = cat;
    if (cond) activeCond = cond;
}

function updateUrlParams() {
    const params = new URLSearchParams();
    if (activeCat  !== 'all') params.set('cat',  activeCat);
    if (activeCond !== 'all') params.set('cond', activeCond);
    const qs = params.toString();
    history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : ''));
}

// ===================== DYNAMIC PRICING =====================

function getMinPrice(p) {
    if (p.variants && p.variants.length > 0) return Math.min(...p.variants.map(v => v.price));
    return p.price;
}

function getMaxPrice(p) {
    if (p.variants && p.variants.length > 0) return Math.max(...p.variants.map(v => v.price));
    return p.price;
}

function formatVND(price) {
    return price.toLocaleString('vi-VN') + '₫';
}

function getOriginalPrice(salePrice) {
    return Math.round(salePrice * 1.25 / 500000) * 500000;
}

function getInstallmentPrice(salePrice) {
    return Math.round(salePrice / 6 / 100000) * 100000;
}

function getPromoEnd(badge) {
    const hours = badge === 'Sale' ? 48 : 24;
    return Date.now() + hours * 3600000;
}

function getPriceDisplay(p) {
    return formatVND(getMinPrice(p));
}

// ===================== LAZY LOADING =====================

function initLazyLoad() {
    const images = document.querySelectorAll('img[data-src]');
    if (!images.length) return;
    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                img.classList.add('img-loaded');
                obs.unobserve(img);
            });
        }, { rootMargin: '200px 0px' });
        images.forEach(img => io.observe(img));
    } else {
        images.forEach(img => { img.src = img.dataset.src; img.removeAttribute('data-src'); });
    }
}

// ===================== SWIPER CAROUSEL =====================

function initCarousel() {
    const wrapper = document.getElementById('featuredSwiperWrapper');
    if (!wrapper) return;

    const featured = products.filter(p => p.badge === 'New' || p.badge === 'Popular' || p.badge === 'Sale').slice(0, 12);
    if (!featured.length) {
        const sec = document.getElementById('featured');
        if (sec) sec.style.display = 'none';
        return;
    }

    const blank = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

    featured.forEach(p => {
        const slide = document.createElement('div');
        slide.className = 'swiper-slide';
        slide.innerHTML = `
            <div class="feat-card" role="button" tabindex="0"
                 onclick="openModal(${p.id})"
                 onkeydown="if(event.key==='Enter')openModal(${p.id})">
                <div class="feat-img-wrap">
                    <img data-src="${p.image}" src="${blank}" alt="${p.name}" class="lazy-img"
                         onerror="this.src='https://placehold.co/320x240/f5f5f5/ccc?text=${encodeURIComponent(p.name)}'">
                    ${p.badge ? `<span class="card-badge badge-${p.badge.toLowerCase()}">${p.badge}</span>` : ''}
                    <span class="condition-tag condition-${(p.condition || 'new').toLowerCase()}">${p.condition === 'Used' ? '✅ Cũ' : '🟢 Mới'}</span>
                </div>
                <div class="feat-info">
                    <p class="card-cat">${p.category}</p>
                    <h3 class="feat-name">${p.name}</h3>
                    <p class="feat-price">${getPriceDisplay(p)}</p>
                </div>
            </div>`;
        wrapper.appendChild(slide);
    });

    if (typeof Swiper !== 'undefined') {
        new Swiper('#featuredSwiper', {
            slidesPerView: 1.3, spaceBetween: 16,
            grabCursor: true,
            freeMode: { enabled: true, momentum: true },
            navigation: { nextEl: '#featNext', prevEl: '#featPrev' },
            breakpoints: {
                480:  { slidesPerView: 2.2, spaceBetween: 16 },
                768:  { slidesPerView: 3.2, spaceBetween: 20 },
                1024: { slidesPerView: 4.2, spaceBetween: 20 },
                1280: { slidesPerView: 5,   spaceBetween: 24 }
            }
        });
    }
    initLazyLoad();
}

// ===================== RENDER GRID =====================
function renderGrid(list) {
    const grid = document.getElementById('productsGrid');
    const container = document.getElementById('productsContainer');
    const count = document.getElementById('productsCount');
    if (count) count.textContent = `${list.length} sản phẩm`;

    const emptyHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--gray-400)">
        <div style="font-size:48px;margin-bottom:16px">🔍</div>
        <h3 style="font-size:20px;font-weight:700;margin-bottom:8px">Không tìm thấy sản phẩm</h3>
        <p>Hãy thay đổi các bộ lọc phía trên.</p>
    </div>`;

    const isAllView = activeCat === 'all' && activeCond === 'all';
    if (isAllView) {
        if (grid) grid.style.display = 'none';
        if (container) {
            container.style.display = 'block';
            if (list.length === 0) { container.innerHTML = emptyHTML; return; }
            renderSections(list, container);
        }
    } else {
        if (container) container.style.display = 'none';
        if (grid) {
            grid.style.display = 'grid';
            if (list.length === 0) { grid.innerHTML = emptyHTML; return; }
            renderCards(list, grid);
        }
    }
}

function renderSections(list, container) {
    container.innerHTML = '';
    const groups = [
        { key: 'iphone17', label: 'iPhone 17 Series', eyebrow: '🔥 Mới nhất 2025', items: list.filter(p => p.name.includes('iPhone 17') && p.condition === 'New') },
        { key: 'iphone16', label: 'iPhone 16 Series', eyebrow: '⭐ Bán chạy nhất', items: list.filter(p => p.name.includes('iPhone 16') && p.condition === 'New') },
        { key: 'used',     label: 'Điện Thoại Đã Dùng', eyebrow: '✅ Đã kiểm tra kỹ • Giá tốt nhất', items: list.filter(p => p.condition === 'Used') },
    ];

    groups.filter(g => g.items.length > 0).forEach(g => {
        const sec = document.createElement('div');
        sec.className = 'product-section-group';
        sec.innerHTML = `
            <div class="section-header-row">
                <div>
                    <p class="section-eyebrow">${g.eyebrow}</p>
                    <h2 class="section-title-sm">${g.label}</h2>
                </div>
                <a href="#" class="section-view-all" data-group="${g.key}">Xem tất cả <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></a>
            </div>
            <div class="products-grid" id="grid-${g.key}"></div>
        `;
        container.appendChild(sec);
        renderCards(g.items, sec.querySelector('.products-grid'));
        sec.querySelector('.section-view-all').addEventListener('click', e => {
            e.preventDefault();
            if (g.key === 'used') { activeCond = 'Used'; activeCat = 'all'; }
            else { activeCond = 'New'; activeCat = 'iPhone'; }
            applyFilters();
            document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
        });
    });
    startCountdowns();
    initLazyLoad();
}

function renderCards(list, grid) {
    const blank = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    grid.innerHTML = '';
    list.forEach(p => {
        const isUsed = p.condition === 'Used';
        const minPrice = getMinPrice(p);
        const originalPrice = getOriginalPrice(minPrice);
        const installment = getInstallmentPrice(minPrice);
        const storageList = p.variants ? [...new Set(p.variants.map(v => v.storage))] : [];
        const hasCountdown = p.badge === 'New' || p.badge === 'Sale';
        const el = document.createElement('div');
        el.className = 'product-card';
        el.innerHTML = `
            <div class="card-img-wrap">
                ${hasCountdown ? `<div class="countdown-badge"><span class="countdown-label">${p.badge === 'Sale' ? '🔥 SALE' : '🆕 HOT'}</span><span class="countdown-time" data-end="${getPromoEnd(p.badge)}"></span></div>` : ''}
                ${p.badge && !hasCountdown ? `<span class="card-badge badge-${p.badge.toLowerCase()}">${p.badge}</span>` : ''}
                <span class="condition-tag condition-${(p.condition||'new').toLowerCase()}">${isUsed ? '✅ Đã Dùng' : '🟢 Mới'}</span>
                <img data-src="${p.image}" src="${blank}" alt="${p.name}" class="lazy-img"
                     onerror="this.src='https://placehold.co/600x400/f5f5f5/ccc?text=${encodeURIComponent(p.name)}'">
            </div>
            <div class="card-body">
                <p class="card-cat">${p.category}</p>
                <h3 class="card-name">${p.name}</h3>
                ${storageList.length > 0 ? `<p class="card-storage-tags">${storageList.map(s => `<span class="storage-tag">${s}</span>`).join('')}</p>` : ''}
                <div class="card-pricing">
                    <div class="price-row">
                        <span class="card-price-sale">${formatVND(minPrice)}</span>
                        <span class="card-price-original">${formatVND(originalPrice)}</span>
                    </div>
                    <p class="card-installment">Trả trước: <strong>${formatVND(installment)}</strong></p>
                </div>
                <button class="card-add-btn" onclick="quickAdd(event, ${p.id})">🛒 Thêm Vào Giỏ</button>
            </div>
        `;
        el.querySelector('.card-img-wrap').addEventListener('click', () => openModal(p.id));
        el.querySelector('.card-name').addEventListener('click', () => openModal(p.id));
        grid.appendChild(el);
    });
}

function startCountdowns() {
    function tick() {
        const now = Date.now();
        document.querySelectorAll('.countdown-time[data-end]').forEach(el => {
            const end = parseInt(el.dataset.end);
            const diff = Math.max(0, end - now);
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        });
    }
    tick();
    clearInterval(window._countdownInterval);
    window._countdownInterval = setInterval(tick, 1000);
}

// ===================== FILTERS =====================
function getFiltered() {
    return products.filter(p => {
        const catOk  = activeCat  === 'all' || p.category  === activeCat;
        const condOk = activeCond === 'all' || p.condition === activeCond;
        return catOk && condOk;
    });
}

function applyFilters() {
    const filtered = getFiltered();
    const heading = document.getElementById('productsHeading');
    if (heading) {
        const cat  = activeCat  === 'all' ? 'Tất Cả Sản Phẩm' : activeCat;
        const cond = activeCond === 'all' ? '' : ` · ${activeCond === 'New' ? 'Mới' : 'Đã Dùng'}`;
        heading.textContent = cat + cond;
    }
    // Sync pills
    document.querySelectorAll('.filter-pill[data-cat]').forEach(b  => b.classList.toggle('active', b.dataset.cat  === activeCat));
    document.querySelectorAll('.filter-pill[data-cond]').forEach(b => b.classList.toggle('active', b.dataset.cond === activeCond));

    renderGrid(filtered);
    updateUrlParams();
    gaEvent('filter_products', { category: activeCat, condition: activeCond, result_count: filtered.length });
}

function setupFilters() {
    document.querySelectorAll('.filter-pill[data-cat]').forEach(btn => {
        btn.addEventListener('click', () => {
            activeCat = btn.dataset.cat;
            applyFilters();
        });
    });
    document.querySelectorAll('.filter-pill[data-cond]').forEach(btn => {
        btn.addEventListener('click', () => {
            activeCond = btn.dataset.cond;
            applyFilters();
        });
    });
}
// ===================== FILTER CATEGORY (from category cards) =====================
function filterCategory(cat) {
    document.querySelector('#products').scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => {
        activeCat = cat;
        applyFilters();
    }, 400);
}

// ===================== QUICK ADD =====================
function quickAdd(e, id) {
    e.stopPropagation();
    const p = products.find(x => x.id === id);
    if (!p) return;
    addToCart(p, 1, null);
    trackAddToCart(p, 1);
    showToast(`${p.name} đã thêm vào giỏ 🛒`);
}

// ===================== VARIANT SELECTOR =====================

function renderVariantSelector(p) {
    const container = document.getElementById('variantSelector');
    if (!container) return;

    selectedVariant = null;
    if (!p.variants || p.variants.length === 0) { container.innerHTML = ''; return; }

    selectedVariant = p.variants[0];

    const storages = [...new Set(p.variants.map(v => v.storage))];
    const colors   = [...new Set(p.variants.map(v => v.color))];
    const regions  = [...new Set(p.variants.map(v => v.region))];

    let html = '<div class="variant-wrapper">';

    if (storages.length > 1) {
        html += `<div class="variant-group">
            <label class="variant-label">Dung Lượng <span class="variant-selected-val" id="selStorage">${selectedVariant.storage}</span></label>
            <div class="variant-options" data-vtype="storage">
                ${storages.map(s => `<button class="variant-btn${s === selectedVariant.storage ? ' active' : ''}" data-value="${s}">${s}</button>`).join('')}
            </div></div>`;
    }
    if (colors.length > 1) {
        html += `<div class="variant-group">
            <label class="variant-label">Màu Sắc <span class="variant-selected-val" id="selColor">${selectedVariant.color}</span></label>
            <div class="variant-options" data-vtype="color">
                ${colors.map(c => `<button class="variant-btn${c === selectedVariant.color ? ' active' : ''}" data-value="${c}">${c}</button>`).join('')}
            </div></div>`;
    }
    if (regions.length > 1) {
        html += `<div class="variant-group">
            <label class="variant-label">Xuất Xứ <span class="variant-selected-val" id="selRegion">${selectedVariant.region}</span></label>
            <div class="variant-options" data-vtype="region">
                ${regions.map(r => `<button class="variant-btn${r === selectedVariant.region ? ' active' : ''}" data-value="${r}">${r}</button>`).join('')}
            </div></div>`;
    }
    html += '</div>';
    container.innerHTML = html;

    container.addEventListener('click', e => {
        const btn = e.target.closest('.variant-btn');
        if (!btn) return;
        const group = btn.closest('.variant-options');
        const vtype = group.dataset.vtype;
        group.querySelectorAll('.variant-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const labelEl = container.querySelector(`#sel${vtype.charAt(0).toUpperCase() + vtype.slice(1)}`);
        if (labelEl) labelEl.textContent = btn.dataset.value;

        const curStorage = container.querySelector('[data-vtype="storage"] .active')?.dataset.value || selectedVariant.storage;
        const curColor   = container.querySelector('[data-vtype="color"] .active')?.dataset.value   || selectedVariant.color;
        const curRegion  = container.querySelector('[data-vtype="region"] .active')?.dataset.value  || selectedVariant.region;

        const match =
            p.variants.find(v => v.storage === curStorage && v.color === curColor && v.region === curRegion) ||
            p.variants.find(v => v.storage === curStorage && v.color === curColor) ||
            p.variants.find(v => v.storage === curStorage) ||
            p.variants[0];

        selectedVariant = match;
        const priceEl = document.getElementById('modalPrice');
        if (priceEl) {
            priceEl.classList.add('price-flash');
            priceEl.textContent = formatVND(match.price);
            setTimeout(() => priceEl.classList.remove('price-flash'), 400);
        }
    });

    const priceEl = document.getElementById('modalPrice');
    if (priceEl) priceEl.textContent = formatVND(selectedVariant.price);
}

// ===================== MODAL =====================
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
        addToCart(currentProduct, qty, selectedVariant);
        trackAddToCart(currentProduct, qty);
        showToast(`${currentProduct.name} đã thêm vào giỏ 🛒`);
        closeModal();
    });
}

function openModal(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    currentProduct = p;
    selectedVariant = null;

    document.getElementById('modalImg').src = p.image;
    document.getElementById('modalImg').onerror = function () {
        this.src = `https://placehold.co/600x400/f2f2f7/999?text=${encodeURIComponent(p.name)}`;
    };

    const badge = document.getElementById('modalBadge');
    badge.textContent = p.badge || '';
    badge.className = 'modal-badge' + (p.badge ? ` badge-${p.badge.toLowerCase()}` : '');
    badge.style.display = p.badge ? 'inline-block' : 'none';

    let condEl = document.getElementById('modalCondition');
    if (!condEl) {
        condEl = document.createElement('div');
        condEl.id = 'modalCondition';
        badge.parentNode.insertBefore(condEl, badge.nextSibling);
    }
    condEl.className = `modal-condition condition-${(p.condition || 'new').toLowerCase()}`;
    condEl.textContent = p.condition === 'Used' ? '🟡 Đã Dùng · Chứng Thực Tuyệt Vời' : '🟢 Mới · Hộp Nguyên Seal';
    condEl.style.display = 'flex';

    document.getElementById('modalCat').textContent = p.category;
    document.getElementById('modalTitle').textContent = p.name;
    document.getElementById('modalDesc').textContent = p.description;
    document.getElementById('modalQty').value = 1;
    document.getElementById('modalSpecs').innerHTML = p.specs.map(s => `<li>${s}</li>`).join('');

    renderVariantSelector(p);
    if (!p.variants || p.variants.length === 0) {
        document.getElementById('modalPrice').textContent = formatVND(p.price);
    }

    document.getElementById('modalOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
    trackViewItem(p);
}

function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
    currentProduct = null;
    selectedVariant = null;
}

function changeQty(delta) {
    const input = document.getElementById('modalQty');
    input.value = Math.max(1, Math.min(10, (parseInt(input.value) || 1) + delta));
}

// ===================== CART =====================
function loadCart() {
    try { return JSON.parse(localStorage.getItem('cart') || '[]'); } catch { return []; }
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateBadge();
}

function addToCart(product, qty, variant) {
    const itemPrice = variant ? variant.price : product.price;
    const variantKey = variant ? `_${variant.storage || ''}-${variant.color || ''}-${variant.region || ''}` : '';
    const uniqueKey = `${product.id}${variantKey}`;
    const existing = cart.find(i => i._key === uniqueKey);
    if (existing) {
        existing.quantity += qty;
    } else {
        cart.push({ ...product, price: itemPrice, _key: uniqueKey, _variant: variant || null, quantity: qty });
    }
    saveCart();
}

function updateBadge() {
    const count = cart.reduce((s, i) => s + i.quantity, 0);
    const badge = document.getElementById('cartBadge');
    if (!badge) return;
    badge.textContent = count;
    badge.classList.toggle('hidden', count === 0);
}

// ===================== MOBILE NAV =====================
function setupMobileNav() {
    const burger = document.getElementById('navBurger');
    const mobile = document.getElementById('navMobile');
    if (!burger || !mobile) return;
    burger.addEventListener('click', () => {
        const open = mobile.classList.toggle('open');
        burger.setAttribute('aria-expanded', open);
    });
    mobile.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobile.classList.remove('open')));
}

// ===================== STICKY NAV =====================
function setupStickyNav() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
        const cur = window.scrollY;
        navbar.classList.toggle('scrolled', cur > 80);
        if (cur > lastScroll + 5 && cur > 200) navbar.classList.add('nav-hidden');
        else if (cur < lastScroll - 5) navbar.classList.remove('nav-hidden');
        lastScroll = cur;
    }, { passive: true });
}

// ===================== BEHAVIORAL TRACKING =====================
function initBehavioralTracking() {
    // Scroll depth (25 / 50 / 75 / 100 %)
    const depths = [25, 50, 75, 100];
    const depthTracked = new Set();
    window.addEventListener('scroll', () => {
        const docH = document.body.scrollHeight - window.innerHeight;
        if (docH <= 0) return;
        const pct = Math.round((window.scrollY / docH) * 100);
        depths.forEach(d => {
            if (pct >= d && !depthTracked.has(d)) {
                depthTracked.add(d);
                gaEvent('scroll_depth', { percent_scrolled: d });
            }
        });
    }, { passive: true });

    // Time on page milestones
    [30, 60, 120, 300].forEach(sec => setTimeout(() => gaEvent('time_on_page', { seconds: sec }), sec * 1000));

    // Call button click tracking
    document.addEventListener('click', e => {
        const tel = e.target.closest('a[href^="tel:"]');
        if (tel) {
            fbEvent('Contact', { content_name: 'Call Button' });
            gaEvent('click_call', { phone: tel.href });
        }
    });

    // Floating call button — show after scrolling 400px
    const callFab = document.getElementById('callFab');
    if (callFab) {
        window.addEventListener('scroll', () => {
            callFab.classList.toggle('call-fab--visible', window.scrollY > 400);
        }, { passive: true });
    }
}

// ===================== TOAST =====================
function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
}
