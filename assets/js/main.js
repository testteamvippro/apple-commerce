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
let searchTerm = '';
let sortMode = 'featured';
let priceBand = 'all';
let compareList = loadCompareList();
let catalogSyncTimer = null;

// ===================== BOOT =====================
document.addEventListener('DOMContentLoaded', async () => {
    updateBadge();
    updateOrderLinks();
    await fetchProducts();
    readUrlParams();      // restore filters from URL before rendering
    applyFilters();
    setupFilters();
    setupCatalogTools();
    setupNavSearch();
    setupModal();
    setupCompare();
    setupMobileNav();
    setupStickyNav();
    setupCatalogSync();
    initCarousel();
    initBehavioralTracking();
});

// ===================== ORDER LINK ROUTING =====================
function updateOrderLinks() {
    try {
        const user = JSON.parse(localStorage.getItem('auth-user') || 'null');
        if (!user || !user.id) return;
        // Redirect all "orders.html" links to the API-backed my-orders page for logged-in users
        document.querySelectorAll('a[href="orders.html"]').forEach(a => {
            a.href = 'pages/my-orders.html';
        });
    } catch { /* ignore */ }
}

// ===================== FETCH PRODUCTS =====================
async function fetchProducts() {
    try {
        const result = await window.AppleStoreAPI.getProducts({ limit: 100 });
        products = result.data;
    } catch (e) {
        console.error('Failed to load catalog from API:', e);
        products = [];
    }

    if (currentProduct) {
        currentProduct = products.find(product => String(product.id) === String(currentProduct.id)) || null;
    }

    return products;
}

async function refreshCatalog() {
    await fetchProducts();
    applyFilters();
}

function setupCatalogSync() {
    if (catalogSyncTimer) {
        clearInterval(catalogSyncTimer);
    }

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            refreshCatalog().catch(() => {});
        }
    });

    window.addEventListener('focus', () => {
        refreshCatalog().catch(() => {});
    });

    catalogSyncTimer = window.setInterval(() => {
        if (!document.hidden) {
            refreshCatalog().catch(() => {});
        }
    }, 30000);
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
    const search = params.get('search');
    const sort = params.get('sort');
    const price = params.get('price');
    if (cat)  activeCat  = cat;
    if (cond) activeCond = cond;
    if (search) searchTerm = search;
    if (sort) sortMode = sort;
    if (price) priceBand = price;
}

function updateUrlParams() {
    const params = new URLSearchParams();
    if (activeCat  !== 'all') params.set('cat',  activeCat);
    if (activeCond !== 'all') params.set('cond', activeCond);
    if (searchTerm) params.set('search', searchTerm);
    if (sortMode !== 'featured') params.set('sort', sortMode);
    if (priceBand !== 'all') params.set('price', priceBand);
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

function getInstallmentPrice(salePrice) {
    return Math.round(salePrice / 6 / 100000) * 100000;
}

function getPriceDisplay(p) {
    return formatVND(getMinPrice(p));
}

function escapeAttr(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function createProductFallbackImage(title = 'Apple Store VN', category = 'Apple') {
    const cleanTitle = escapeAttr(title);
    const cleanCategory = escapeAttr(category);
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="900" height="620" viewBox="0 0 900 620">
            <defs>
                <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stop-color="#f8fafc"/>
                    <stop offset="1" stop-color="#dbeafe"/>
                </linearGradient>
                <linearGradient id="device" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stop-color="#111827"/>
                    <stop offset="1" stop-color="#334155"/>
                </linearGradient>
            </defs>
            <rect width="900" height="620" fill="url(#bg)"/>
            <rect x="310" y="86" width="280" height="390" rx="42" fill="url(#device)"/>
            <rect x="331" y="121" width="238" height="308" rx="24" fill="#f8fafc"/>
            <circle cx="450" cy="454" r="10" fill="#64748b"/>
            <text x="450" y="532" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="800" fill="#0f172a">${cleanTitle}</text>
            <text x="450" y="570" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="700" fill="#2563eb">${cleanCategory}</text>
        </svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function getLocalProductImage(product = {}) {
    const name = `${product.name || ''} ${product.category || ''}`.toLowerCase();
    const palette = [
        'iphone-red.svg',
        'iphone-blue.svg',
        'iphone-black.svg',
        'iphone-gold.svg',
        'iphone-green.svg',
        'iphone-purple.svg'
    ];

    if (name.includes('mac')) return 'assets/images/generated/macbook.svg';
    if (name.includes('ipad')) return 'assets/images/generated/ipad.svg';
    if (name.includes('airpod')) return 'assets/images/generated/airpods.svg';
    if (name.includes('watch')) return 'assets/images/generated/watch.svg';

    const seed = String(product.id || product.name || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return `assets/images/generated/${palette[seed % palette.length]}`;
}

function getOfficialAppleIphoneImage(product = {}) {
    const name = String(product.name || '').toLowerCase();
    const officialImages = {
        iphone16pro: 'https://www.apple.com/newsroom/images/2024/09/apple-debuts-iphone-16-pro-and-iphone-16-pro-max/article/Apple-iPhone-16-Pro-hero-geo-240909_inline.jpg.large.jpg',
        iphone16lineup: 'https://www.apple.com/newsroom/images/2024/09/apple-debuts-iphone-16-pro-and-iphone-16-pro-max/article/Apple-iPhone-16-Pro-finish-lineup-240909_big.jpg.large.jpg',
        iphone16camera: 'https://www.apple.com/newsroom/images/2024/09/apple-debuts-iphone-16-pro-and-iphone-16-pro-max/article/Apple-iPhone-16-Pro-camera-system-240909_inline.jpg.large.jpg',
        iphone15hero: 'https://www.apple.com/newsroom/images/2023/09/apple-debuts-iphone-15-and-iphone-15-plus/article/Apple-iPhone-15-lineup-hero-230912_inline.jpg.large.jpg',
        iphone15colors: 'https://www.apple.com/newsroom/images/2023/09/apple-debuts-iphone-15-and-iphone-15-plus/article/Apple-iPhone-15-lineup-color-lineup-230912_big.jpg.large.jpg',
        iphone15blue: 'https://www.apple.com/newsroom/images/2023/09/apple-debuts-iphone-15-and-iphone-15-plus/article/Apple-iPhone-15-lineup-design-230912_big.jpg.large.jpg'
    };

    if (!name.includes('iphone')) return '';
    if (name.includes('16 pro')) return officialImages.iphone16pro;
    if (name.includes('16')) return officialImages.iphone16lineup;
    if (name.includes('15')) return officialImages.iphone15colors;
    if (name.includes('14') || name.includes('13') || name.includes('12')) return officialImages.iphone15blue;

    const pool = [
        officialImages.iphone16pro,
        officialImages.iphone16lineup,
        officialImages.iphone16camera,
        officialImages.iphone15hero,
        officialImages.iphone15colors,
        officialImages.iphone15blue
    ];
    const seed = String(product.id || product.name || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return pool[seed % pool.length];
}

function getProductImage(product = {}) {
    return getOfficialAppleIphoneImage(product) || getLocalProductImage(product) || product.image || createProductFallbackImage(product.name, product.category);
}

function handleImageError(img) {
    if (!img || img.dataset.fallbackApplied === 'true') return;
    img.dataset.fallbackApplied = 'true';
    img.src = createProductFallbackImage(img.alt, img.dataset.category || 'Apple');
    img.removeAttribute('data-src');
    img.classList.add('img-loaded', 'img-fallback');
}

window.handleImageError = handleImageError;

// ===================== LAZY LOADING =====================

function initLazyLoad() {
    const images = document.querySelectorAll('img[data-src]');
    if (!images.length) return;
    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const img = entry.target;
                img.src = img.dataset.src || createProductFallbackImage(img.alt, img.dataset.category || 'Apple');
                img.removeAttribute('data-src');
                img.classList.add('img-loaded');
                obs.unobserve(img);
            });
        }, { rootMargin: '200px 0px' });
        images.forEach(img => io.observe(img));
    } else {
        images.forEach(img => {
            img.src = img.dataset.src || createProductFallbackImage(img.alt, img.dataset.category || 'Apple');
            img.removeAttribute('data-src');
            img.classList.add('img-loaded');
        });
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
                    <img data-src="${escapeAttr(getProductImage(p))}" src="${blank}" alt="${escapeAttr(p.name)}" data-category="${escapeAttr(p.category)}" class="lazy-img"
                         onerror="handleImageError(this)">
                    ${p.badge && p.badge !== 'Sale' ? `<span class="card-badge badge-${p.badge.toLowerCase()}">${p.badge}</span>` : ''}
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
    const groupedIds = new Set();
    const newestIphones = list.filter(p => p.name.includes('iPhone 17') && p.condition === 'New');
    newestIphones.forEach(p => groupedIds.add(p.id));
    const popularIphones = list.filter(p => p.name.includes('iPhone 16') && p.condition === 'New');
    popularIphones.forEach(p => groupedIds.add(p.id));
    const usedDevices = list.filter(p => p.condition === 'Used');
    usedDevices.forEach(p => groupedIds.add(p.id));
    const remaining = list.filter(p => !groupedIds.has(p.id));

    const groups = [
        { key: 'iphone17', label: 'iPhone 17 Series', eyebrow: '🔥 Mới nhất 2025', items: newestIphones },
        { key: 'iphone16', label: 'iPhone 16 Series', eyebrow: '⭐ Bán chạy nhất', items: popularIphones },
        { key: 'used',     label: 'Điện Thoại Đã Dùng', eyebrow: '✅ Đã kiểm tra kỹ • Giá tốt nhất', items: usedDevices },
        { key: 'more',     label: 'Mac, iPad, Watch & Phụ Kiện', eyebrow: 'Thiết bị Apple nổi bật', items: remaining },
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
            else if (g.key === 'more') { activeCond = 'all'; activeCat = 'all'; searchTerm = ''; priceBand = 'all'; }
            else { activeCond = 'New'; activeCat = 'iPhone'; }
            applyFilters();
            document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
        });
    });
    initLazyLoad();
}

function renderCards(list, grid) {
    const blank = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    grid.innerHTML = '';
    list.forEach(p => {
        const isUsed = p.condition === 'Used';
        const minPrice = getMinPrice(p);
        const installment = getInstallmentPrice(minPrice);
        const storageList = p.variants ? [...new Set(p.variants.map(v => v.storage))] : [];
        const isCompared = compareList.includes(p.id);
        const stock = p.quantity ?? p.stock ?? null;
        const outOfStock = stock !== null && stock <= 0;
        const lowStock   = stock !== null && stock > 0 && stock <= 5;
        const el = document.createElement('div');
        el.className = 'product-card' + (outOfStock ? ' oos-card' : '');
        el.innerHTML = `
            <div class="card-img-wrap">
                ${outOfStock ? '<span class="card-badge badge-oos">Hết Hàng</span>' : lowStock ? `<span class="card-badge badge-low">Còn ${stock}</span>` : (p.badge && p.badge !== 'Sale' ? `<span class="card-badge badge-${p.badge.toLowerCase()}">${p.badge}</span>` : '')}
                <span class="condition-tag condition-${(p.condition||'new').toLowerCase()}">${isUsed ? '✅ Đã Dùng' : '🟢 Mới'}</span>
                <img data-src="${escapeAttr(getProductImage(p))}" src="${blank}" alt="${escapeAttr(p.name)}" data-category="${escapeAttr(p.category)}" class="lazy-img"
                     onerror="handleImageError(this)">
            </div>
            <div class="card-body">
                <p class="card-cat">${p.category}</p>
                <h3 class="card-name">${p.name}</h3>
                ${storageList.length > 0 ? `<p class="card-storage-tags">${storageList.map(s => `<span class="storage-tag">${s}</span>`).join('')}</p>` : ''}
                <div class="card-pricing">
                    <div class="price-row">
                        <span class="card-price-sale">${formatVND(minPrice)}</span>
                    </div>
                    <p class="card-installment">Trả trước: <strong>${formatVND(installment)}</strong></p>
                </div>
                <div class="card-benefits">
                    <span>Trả góp 0%</span>
                    <span>Giao nhanh 48h</span>
                </div>
                <div class="card-actions">
                    <button class="card-add-btn" ${outOfStock ? 'disabled' : `onclick="quickAdd(event, ${p.id})"`}>${outOfStock ? '🚫 Hết Hàng' : '🛒 Thêm Vào Giỏ'}</button>
                    <button class="card-compare-btn${isCompared ? ' active' : ''}" onclick="toggleCompare(event, ${p.id})">${isCompared ? 'Đã chọn' : 'So sánh'}</button>
                </div>
            </div>
        `;
        el.querySelector('.card-img-wrap').addEventListener('click', () => openModal(p.id));
        el.querySelector('.card-name').addEventListener('click', () => openModal(p.id));
        grid.appendChild(el);
    });
}

// ===================== FILTERS =====================
function getFiltered() {
    const ranges = {
        budget: [0, 15000000],
        mid: [15000000, 25000000],
        premium: [25000000, Infinity]
    };

    const q = searchTerm.trim().toLowerCase();
    const selectedRange = ranges[priceBand];

    const filtered = products.filter(p => {
        const catOk  = activeCat  === 'all' || p.category  === activeCat;
        const condOk = activeCond === 'all' || p.condition === activeCond;
        const textOk = !q || [p.name, p.category, p.description, ...(p.specs || [])].join(' ').toLowerCase().includes(q);
        const priceOk = !selectedRange || (getMaxPrice(p) >= selectedRange[0] && getMinPrice(p) <= selectedRange[1]);
        return catOk && condOk && textOk && priceOk;
    });

    const sorters = {
        price_asc: (a, b) => getMinPrice(a) - getMinPrice(b),
        price_desc: (a, b) => getMaxPrice(b) - getMaxPrice(a),
        name_asc: (a, b) => a.name.localeCompare(b.name),
        newest: (a, b) => (b.badge === 'New' ? 1 : 0) - (a.badge === 'New' ? 1 : 0),
        featured: (a, b) => {
            const rank = { New: 3, Sale: 2, Popular: 1 };
            return (rank[b.badge] || 0) - (rank[a.badge] || 0);
        }
    };

    return filtered.sort(sorters[sortMode] || sorters.featured);
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
    syncCatalogControls();

    renderGrid(filtered);
    updateUrlParams();
    gaEvent('filter_products', { category: activeCat, condition: activeCond, search: searchTerm, priceBand, sortMode, result_count: filtered.length });
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

function setupCatalogTools() {
    const searchInput = document.getElementById('productSearch');
    const sortSelect = document.getElementById('sortSelect');

    if (searchInput) {
        searchInput.value = searchTerm;
        searchInput.addEventListener('input', () => {
            searchTerm = searchInput.value.trim();
            applyFilters();
        });
    }

    if (sortSelect) {
        sortSelect.value = sortMode;
        sortSelect.addEventListener('change', () => {
            sortMode = sortSelect.value;
            applyFilters();
        });
    }

    document.querySelectorAll('.price-chip[data-price]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.price === priceBand);
        btn.addEventListener('click', () => {
            priceBand = btn.dataset.price;
            document.querySelectorAll('.price-chip[data-price]').forEach(b => b.classList.toggle('active', b.dataset.price === priceBand));
            applyFilters();
        });
    });
}

function syncCatalogControls() {
    const searchInput = document.getElementById('productSearch');
    const sortSelect = document.getElementById('sortSelect');
    const navSearch = document.getElementById('navSearchInput');
    if (searchInput && searchInput.value !== searchTerm) searchInput.value = searchTerm;
    if (navSearch && navSearch.value !== searchTerm) navSearch.value = searchTerm;
    if (sortSelect && sortSelect.value !== sortMode) sortSelect.value = sortMode;
    document.querySelectorAll('.price-chip[data-price]').forEach(b => b.classList.toggle('active', b.dataset.price === priceBand));
}

function setupNavSearch() {
    const navSearch = document.getElementById('navSearchInput');
    const productSearch = document.getElementById('productSearch');
    if (!navSearch) return;

    navSearch.value = searchTerm;
    navSearch.addEventListener('input', () => {
        searchTerm = navSearch.value.trim();
        if (productSearch && productSearch.value !== searchTerm) productSearch.value = searchTerm;
        applyFilters();
    });
    navSearch.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
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
    const stock = p.quantity ?? p.stock ?? null;
    if (stock !== null && stock <= 0) { showToast('Sản phẩm này đã hết hàng'); return; }
    addToCart(p, 1, null);
    trackAddToCart(p, 1);
    showToast(`${p.name} đã thêm vào giỏ 🛒`);
}

// ===================== COMPARE =====================
function loadCompareList() {
    try { return JSON.parse(localStorage.getItem('compareList') || '[]'); } catch { return []; }
}

function saveCompareList() {
    localStorage.setItem('compareList', JSON.stringify(compareList));
    updateCompareDrawer();
}

function setupCompare() {
    const closeBtn = document.getElementById('compareModalClose');
    const overlay = document.getElementById('compareModalOverlay');
    const compareBtn = document.getElementById('btnCompare');
    const clearBtn = document.getElementById('btnClearCompare');

    if (closeBtn) closeBtn.addEventListener('click', closeCompareModal);
    if (overlay) overlay.addEventListener('click', e => { if (e.target === overlay) closeCompareModal(); });
    if (compareBtn) compareBtn.addEventListener('click', openCompareModal);
    if (clearBtn) clearBtn.addEventListener('click', () => {
        compareList = [];
        saveCompareList();
        applyFilters();
    });
    updateCompareDrawer();
}

function toggleCompare(e, id) {
    e.stopPropagation();
    const exists = compareList.includes(id);
    if (exists) {
        compareList = compareList.filter(itemId => itemId !== id);
    } else {
        if (compareList.length >= 3) {
            showToast('Chỉ so sánh tối đa 3 sản phẩm cùng lúc');
            return;
        }
        compareList.push(id);
    }
    saveCompareList();
    applyFilters();
}

function updateCompareDrawer() {
    const drawer = document.getElementById('compareDrawer');
    const itemsEl = document.getElementById('compareItems');
    const countEl = document.getElementById('compareCount');
    const compareBtn = document.getElementById('btnCompare');
    if (!drawer || !itemsEl) return;

    const selected = compareList.map(id => products.find(p => p.id === id)).filter(Boolean);
    drawer.classList.toggle('open', selected.length > 0);
    if (countEl) countEl.textContent = `${selected.length}/3 đã chọn`;
    if (compareBtn) compareBtn.disabled = selected.length < 2;

    itemsEl.innerHTML = selected.map(p => `
        <button class="compare-pill" onclick="toggleCompare(event, ${p.id})" title="Bỏ ${escapeAttr(p.name)}">
            <img src="${escapeAttr(getProductImage(p))}" alt="${escapeAttr(p.name)}" data-category="${escapeAttr(p.category)}" onerror="handleImageError(this)">
            <span>${p.name}</span>
        </button>
    `).join('');
}

function openCompareModal() {
    const selected = compareList.map(id => products.find(p => p.id === id)).filter(Boolean);
    if (selected.length < 2) return;

    const table = document.getElementById('compareTable');
    if (!table) return;

    table.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Tiêu chí</th>
                    ${selected.map(p => `<th>${p.name}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                <tr><td>Giá từ</td>${selected.map(p => `<td>${formatVND(getMinPrice(p))}</td>`).join('')}</tr>
                <tr><td>Tình trạng</td>${selected.map(p => `<td>${p.condition === 'Used' ? 'Đã dùng' : 'Mới'}</td>`).join('')}</tr>
                <tr><td>Dung lượng</td>${selected.map(p => `<td>${getVariantValues(p, 'storage')}</td>`).join('')}</tr>
                <tr><td>Xuất xứ</td>${selected.map(p => `<td>${getVariantValues(p, 'region')}</td>`).join('')}</tr>
                <tr><td>Điểm nổi bật</td>${selected.map(p => `<td>${(p.specs || []).slice(0, 3).join('<br>')}</td>`).join('')}</tr>
            </tbody>
        </table>
    `;

    document.getElementById('compareModalOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
    gaEvent('compare_products', { product_ids: selected.map(p => p.id).join(',') });
}

function closeCompareModal() {
    const overlay = document.getElementById('compareModalOverlay');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
}

function getVariantValues(product, key) {
    if (!product.variants || product.variants.length === 0) return 'Tiêu chuẩn';
    return [...new Set(product.variants.map(v => v[key]).filter(Boolean))].slice(0, 4).join(', ');
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
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            closeModal();
            closeCompareModal();
        }
    });

    document.getElementById('btnAdd').addEventListener('click', () => {
        if (!currentProduct) return;
        const stock = currentProduct.quantity ?? currentProduct.stock ?? null;
        if (stock !== null && stock <= 0) { showToast('Sản phẩm này đã hết hàng'); return; }
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

    const modalImg = document.getElementById('modalImg');
    modalImg.alt = p.name;
    modalImg.dataset.category = p.category;
    modalImg.dataset.fallbackApplied = 'false';
    modalImg.src = getProductImage(p);
    modalImg.onerror = function () { handleImageError(this); };

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
