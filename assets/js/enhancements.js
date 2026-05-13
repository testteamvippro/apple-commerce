/* ======================================================================
   Apple Store VN — Enhancements JS
   Features: Promo banner carousel · Flash sale countdown · Celebrity
   testimonial scroll · Scroll-to-top · Chat widget · Flash product row
   ====================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    initPromoBannerCarousel();
    initFlashSaleCountdown();
    initCelebAutoScroll();
    initScrollToTop();
    initChatWidget();
    // Flash products are populated after catalog loads — hook into main.js
    if (typeof products !== 'undefined' && products.length) {
        renderFlashProducts(products);
    } else {
        document.addEventListener('catalogLoaded', e => renderFlashProducts(e.detail || []));
    }
});

// Expose for main.js to call after catalog fetch
window.onCatalogReady = function(prods) {
    renderFlashProducts(prods);
};

/* ─────────────────────────────────────────────
   PROMO BANNER CAROUSEL
   ───────────────────────────────────────────── */
function initPromoBannerCarousel() {
    const track   = document.getElementById('pbTrack');
    const viewport = document.getElementById('pbViewport');
    const prevBtn = document.getElementById('pbPrev');
    const nextBtn = document.getElementById('pbNext');
    const dotsWrap = document.getElementById('pbDots');
    if (!track || !prevBtn || !nextBtn) return;

    const slides = track.querySelectorAll('.pb-slide');
    const total  = slides.length;
    if (!total) return;

    let current = 0;
    let autoTimer = null;

    // Build dots
    slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'pb-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', `Slide ${i + 1}`);
        dot.addEventListener('click', () => goTo(i));
        dotsWrap.appendChild(dot);
    });

    function goTo(index) {
        current = (index + total) % total;
        const slideW = slides[0].offsetWidth + 16; // gap
        track.style.transform = `translateX(-${current * slideW}px)`;
        dotsWrap.querySelectorAll('.pb-dot').forEach((d, i) => d.classList.toggle('active', i === current));
    }

    prevBtn.addEventListener('click', () => { goTo(current - 1); resetAuto(); });
    nextBtn.addEventListener('click', () => { goTo(current + 1); resetAuto(); });

    function startAuto() {
        autoTimer = setInterval(() => goTo(current + 1), 4000);
    }
    function resetAuto() {
        clearInterval(autoTimer);
        startAuto();
    }

    startAuto();

    // Recalculate on resize
    window.addEventListener('resize', () => goTo(current), { passive: true });
}

/* ─────────────────────────────────────────────
   FLASH SALE COUNTDOWN TIMER
   ───────────────────────────────────────────── */
function initFlashSaleCountdown() {
    const dEl = document.getElementById('cdDays');
    const hEl = document.getElementById('cdHours');
    const mEl = document.getElementById('cdMins');
    const sEl = document.getElementById('cdSecs');
    if (!dEl) return;

    // Target: next midnight + 12h (next "golden hour" at noon tomorrow)
    const now = new Date();
    const target = new Date(now);
    target.setHours(23, 59, 59, 0);
    if (now >= target) target.setDate(target.getDate() + 1);

    function pad(n) { return String(n).padStart(2, '0'); }

    function tick() {
        const diff = target - Date.now();
        if (diff <= 0) { clearInterval(timer); return; }
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);

        // Flip animation
        [dEl, hEl, mEl, sEl].forEach((el, i) => {
            const val = pad([d, h, m, s][i]);
            if (el.textContent !== val) {
                el.classList.add('cd-flip');
                el.textContent = val;
                setTimeout(() => el.classList.remove('cd-flip'), 300);
            }
        });
    }

    tick();
    const timer = setInterval(tick, 1000);
}

/* ─────────────────────────────────────────────
   FLASH SALE PRODUCT ROW
   ───────────────────────────────────────────── */
function renderFlashProducts(prods) {
    const row = document.getElementById('flashProductsRow');
    if (!row || !prods || !prods.length) return;
    if (row.dataset.populated) return;
    row.dataset.populated = '1';

    // Pick products with a discount — fall back to badge=Sale, then any top products
    let flashItems = prods.filter(p => (p.discount || 0) > 0).slice(0, 6);
    if (flashItems.length < 3) flashItems = prods.filter(p => p.badge === 'Sale').slice(0, 6);
    if (flashItems.length < 3) flashItems = prods.slice(0, 6);

    const blank = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

    row.innerHTML = '';
    flashItems.forEach(p => {
        const minPrice = typeof getMinPrice === 'function' ? getMinPrice(p) : (p.price || 0);
        const discount = p.discount || 0;
        const origPrice = discount > 0 ? Math.round(minPrice / (1 - discount / 100) / 1000) * 1000 : 0;
        const fmtVND = v => v.toLocaleString('vi-VN') + '₫';
        const img = typeof getProductImage === 'function' ? getProductImage(p) : (p.image || blank);

        const card = document.createElement('div');
        card.className = 'flash-card';
        card.innerHTML = `
            <div class="flash-card-img-wrap">
                ${discount > 0 ? `<span class="flash-discount-badge">-${discount}%</span>` : ''}
                <img src="${blank}" data-src="${img}" alt="${p.name || ''}" class="lazy-img" onerror="if(typeof handleImageError==='function')handleImageError(this)">
            </div>
            <div class="flash-card-body">
                <p class="flash-card-name">${p.name || ''}</p>
                <div class="flash-card-price-row">
                    <span class="flash-sale-price">${fmtVND(minPrice)}</span>
                    ${origPrice > 0 ? `<span class="flash-orig-price">${fmtVND(origPrice)}</span>` : ''}
                </div>
                ${discount > 0 ? `<div class="flash-save-label">Tiết kiệm ${fmtVND(origPrice - minPrice)}</div>` : ''}
                <div class="flash-stock-bar"><div class="flash-stock-fill" style="width:${30 + Math.random()*50|0}%"></div></div>
                <button class="flash-buy-btn" onclick="if(typeof openModal==='function')openModal(${p.id})">Mua ngay</button>
            </div>
        `;
        row.appendChild(card);
    });

    // Trigger lazy load if available
    if (typeof initLazyLoad === 'function') initLazyLoad();
}

/* ─────────────────────────────────────────────
   CELEBRITY AUTO-SCROLL
   ───────────────────────────────────────────── */
function initCelebAutoScroll() {
    const track = document.getElementById('celebTrack');
    if (!track) return;

    // Clone cards for infinite scroll
    const cards = [...track.querySelectorAll('.celeb-card')];
    cards.forEach(c => track.appendChild(c.cloneNode(true)));

    let pos = 0;
    const speed = 0.5; // px per frame
    let paused = false;

    track.addEventListener('mouseenter', () => { paused = true; });
    track.addEventListener('mouseleave', () => { paused = false; });

    function animate() {
        if (!paused) {
            pos += speed;
            const cardW = 220; // approx card width + gap
            const resetAt = cardW * cards.length;
            if (pos >= resetAt) pos = 0;
            track.style.transform = `translateX(-${pos}px)`;
        }
        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
}

/* ─────────────────────────────────────────────
   SCROLL TO TOP
   ───────────────────────────────────────────── */
function initScrollToTop() {
    const btn = document.getElementById('scrollTopBtn');
    if (!btn) return;

    window.addEventListener('scroll', () => {
        btn.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });

    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

/* ─────────────────────────────────────────────
   CHAT WIDGET
   ───────────────────────────────────────────── */
function initChatWidget() {
    const toggle  = document.getElementById('chatToggle');
    const panel   = document.getElementById('chatPanel');
    const iconDef = toggle && toggle.querySelector('.chat-icon-default');
    const iconClose = toggle && toggle.querySelector('.chat-icon-close');
    const badge   = toggle && toggle.querySelector('.chat-badge');
    if (!toggle || !panel) return;

    let open = false;

    toggle.addEventListener('click', () => {
        open = !open;
        panel.classList.toggle('open', open);
        if (iconDef) iconDef.style.display = open ? 'none' : '';
        if (iconClose) iconClose.style.display = open ? '' : 'none';
        if (badge && open) badge.style.display = 'none';
    });

    // Close on outside click
    document.addEventListener('click', e => {
        if (open && !toggle.contains(e.target) && !panel.contains(e.target)) {
            open = false;
            panel.classList.remove('open');
            if (iconDef) iconDef.style.display = '';
            if (iconClose) iconClose.style.display = 'none';
        }
    });
}
