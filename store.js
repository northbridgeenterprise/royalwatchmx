/* store.js - Royal Watch MTY Storefront Controller — Premium Edition */

let storeProducts = [];
let activeCurrency = "MXN";
const EXCHANGE_RATE = 17.80;
let activeBrandFilter = "Todos";
let searchQuery = "";
let activeSort = "default";
let selectedWatch = null;

// ========================
// INIT
// ========================
function initIcons() {
    if (window.lucide) window.lucide.createIcons();
}

document.addEventListener("DOMContentLoaded", () => {
    loadStoreCatalog();
    setupStoreNavigation();
    setupStoreFilters();
    setupCurrencySwitcher();
    setupModalEvents();
    renderStoreGrid();
    initIcons();

    // Premium features
    setupScrollHeader();
    setupScrollReveal();
    initParticleCanvas();
    animateCounters();
    initHeroCarousel();
});

// ========================
// CATALOG LOADING
// ========================
function loadStoreCatalog() {
    let baseCatalog = [];
    if (typeof WATCHES_PRODUCTS !== 'undefined' && WATCHES_PRODUCTS.length > 0) {
        baseCatalog = WATCHES_PRODUCTS;
    }

    const customProds = JSON.parse(localStorage.getItem("rw_custom_products") || "[]");
    const deletedRefs = JSON.parse(localStorage.getItem("rw_deleted_products") || "[]");
    const deletedSet = new Set(deletedRefs.filter(Boolean));

    let merged = baseCatalog.filter(p => !p.referencia || !deletedSet.has(p.referencia));
    merged = [...merged, ...customProds];

    const statusOverrides = JSON.parse(localStorage.getItem("rw_product_statuses") || "{}");
    merged.forEach(p => {
        const key = p.referencia || `${p.marca}_${p.modelo}`;
        p.status = statusOverrides[key] || p.status || "Disponible";
    });

    storeProducts = merged;
}

// ========================
// NAVIGATION
// ========================
function setupStoreNavigation() {
    document.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", (e) => {
            const targetId = link.getAttribute("href");
            if (targetId.startsWith("#")) {
                e.preventDefault();
                const targetEl = document.querySelector(targetId);
                if (targetEl) {
                    const headerHeight = document.querySelector(".store-header").offsetHeight;
                    window.scrollTo({
                        top: targetEl.offsetTop - headerHeight,
                        behavior: "smooth"
                    });
                }
            }
        });
    });
}

// ========================
// SCROLL HEADER EFFECT
// ========================
function setupScrollHeader() {
    const header = document.getElementById("store-header");
    window.addEventListener("scroll", () => {
        if (window.scrollY > 60) {
            header.classList.add("scrolled");
        } else {
            header.classList.remove("scrolled");
        }
    }, { passive: true });
}

// ========================
// SCROLL REVEAL
// ========================
function setupScrollReveal() {
    const revealEls = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                // Stagger reveal by index
                setTimeout(() => {
                    entry.target.classList.add("is-visible");
                }, i * 80);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

    revealEls.forEach(el => observer.observe(el));
}

// Card scroll reveal (called after cards render)
function observeCards() {
    const cards = document.querySelectorAll(".watch-card:not(.revealed)");
    const cardObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add("revealed");
                }, i * 60);
                cardObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08, rootMargin: "0px 0px -30px 0px" });

    cards.forEach(card => cardObserver.observe(card));
}

// ========================
// ANIMATED STAT COUNTERS
// ========================
function animateCounters() {
    const statsSection = document.querySelector(".hero-stats");
    if (!statsSection) return;

    const counters = [
        { el: document.getElementById("stat-relojes"), target: 500, suffix: "+" },
        { el: document.getElementById("stat-autenticidad"), target: 100, suffix: "%" },
        { el: document.getElementById("stat-anos"), target: 10, suffix: "+" },
    ];

    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            counters.forEach(c => animateSingleCounter(c.el, c.target, c.suffix));
            observer.disconnect();
        }
    }, { threshold: 0.5 });

    observer.observe(statsSection);
}

function animateSingleCounter(el, target, suffix = "") {
    if (!el) return;
    const duration = 1800;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.round(eased * target);
        el.textContent = value + suffix;
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

// ========================
// PARTICLE CANVAS (GOLD DUST)
// ========================
function initParticleCanvas() {
    const canvas = document.getElementById("hero-canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let particles = [];
    let animationId;

    function resize() {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener("resize", () => { resize(); }, { passive: true });

    // Create particles
    const PARTICLE_COUNT = 55;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(createParticle(canvas));
    }

    function createParticle(canvas, born = false) {
        const x = born ? canvas.width / 2 + (Math.random() - 0.5) * 300 : Math.random() * canvas.width;
        const y = born ? canvas.height * 0.6 : Math.random() * canvas.height;
        return {
            x,
            y,
            size: Math.random() * 1.8 + 0.3,
            speedX: (Math.random() - 0.5) * 0.4,
            speedY: -(Math.random() * 0.6 + 0.1),
            opacity: Math.random() * 0.6 + 0.1,
            opacityDir: Math.random() > 0.5 ? 1 : -1,
            life: Math.random() * 0.7 + 0.3,
        };
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach((p, i) => {
            p.x += p.speedX;
            p.y += p.speedY;
            p.opacity += 0.004 * p.opacityDir;

            if (p.opacity > p.life) p.opacityDir = -1;
            if (p.opacity < 0.05) p.opacityDir = 1;

            // Reset if out of bounds
            if (p.y < -10 || p.x < -10 || p.x > canvas.width + 10) {
                particles[i] = createParticle(canvas, true);
                return;
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(197, 160, 89, ${p.opacity})`;
            ctx.fill();
        });

        animationId = requestAnimationFrame(draw);
    }

    draw();

    // Pause when tab is hidden
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            cancelAnimationFrame(animationId);
        } else {
            draw();
        }
    });
}

// ========================
// FILTERS & SORTING
// ========================
function setupStoreFilters() {
    const searchInput = document.getElementById("store-search");
    const sortSelect = document.getElementById("store-sort");
    const brandTags = document.querySelectorAll(".brand-tag");

    searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        renderStoreGrid();
    });

    sortSelect.addEventListener("change", (e) => {
        activeSort = e.target.value;
        renderStoreGrid();
    });

    brandTags.forEach(tag => {
        tag.addEventListener("click", () => {
            brandTags.forEach(t => t.classList.remove("active"));
            tag.classList.add("active");
            activeBrandFilter = tag.getAttribute("data-brand");
            renderStoreGrid();
        });
    });
}

// ========================
// CURRENCY SWITCHER
// ========================
function setupCurrencySwitcher() {
    const switcher = document.getElementById("currency-switch");
    const buttons = switcher.querySelectorAll(".currency-btn");

    buttons.forEach(btn => {
        btn.addEventListener("click", () => {
            buttons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            activeCurrency = btn.getAttribute("data-currency");
            renderStoreGrid();
        });
    });
}

// ========================
// MODAL EVENTS
// ========================
function setupModalEvents() {
    const modal = document.getElementById("product-modal");
    const closeBtn = document.getElementById("modal-close");
    const waActionBtn = document.getElementById("modal-btn-wa");

    closeBtn.addEventListener("click", closeModal);

    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal.classList.contains("active")) closeModal();
    });

    waActionBtn.addEventListener("click", () => {
        if (!selectedWatch) return;
        const finalPrice = activeCurrency === "MXN"
            ? selectedWatch.precio
            : selectedWatch.precio / EXCHANGE_RATE;
        const currency = activeCurrency === "MXN" ? "MXN" : "USD";
        const priceText = `$${finalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
        const msg = `Hola, estoy interesado en el reloj *${selectedWatch.marca} ${selectedWatch.modelo}* (Ref: *${selectedWatch.referencia || 'S/R'}*) por *${priceText}* que vi en stock en su vitrina web. ¿Sigue disponible?`;
        const waUrl = `https://api.whatsapp.com/send?phone=528121980008&text=${encodeURIComponent(msg)}`;
        window.open(waUrl, "_blank");
    });
}

// ========================
// RENDER PRODUCTS GRID
// ========================
function renderStoreGrid() {
    const grid = document.getElementById("store-grid");
    const countSpan = document.getElementById("catalog-count");
    grid.innerHTML = "";

    // 1. Filter
    let filtered = storeProducts.filter(p => {
        let brandMatch = true;
        if (activeBrandFilter !== "Todos") {
            if (activeBrandFilter === "Otros") {
                const knownBrands = ["rolex", "audemars piguet", "patek philippe", "cartier", "omega", "tag heuer"];
                brandMatch = !knownBrands.includes((p.marca || "").toLowerCase());
            } else {
                brandMatch = (p.marca || "").toLowerCase() === activeBrandFilter.toLowerCase();
            }
        }
        let queryMatch = true;
        if (searchQuery) {
            queryMatch = (p.marca || "").toLowerCase().includes(searchQuery) ||
                         (p.modelo || "").toLowerCase().includes(searchQuery) ||
                         (p.referencia || "").toLowerCase().includes(searchQuery) ||
                         (p.material || "").toLowerCase().includes(searchQuery);
        }
        return brandMatch && queryMatch;
    });

    // 2. Sort
    if (activeSort === "price-asc") filtered.sort((a, b) => a.precio - b.precio);
    else if (activeSort === "price-desc") filtered.sort((a, b) => b.precio - a.precio);
    else if (activeSort === "brand-asc") filtered.sort((a, b) => (a.marca || "").localeCompare(b.marca || ""));

    countSpan.textContent = filtered.length;

    // Empty state
    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-catalog-msg">
                <i data-lucide="search-x"></i>
                <h4>Sin Resultados</h4>
                <p>No se encontraron piezas que coincidan con la búsqueda o filtros seleccionados.</p>
            </div>
        `;
        initIcons();
        return;
    }

    // Render cards
    filtered.forEach(p => {
        const card = document.createElement("div");
        card.className = "watch-card"; // starts hidden, revealed by IntersectionObserver

        const currentStatus = p.status || "Disponible";
        let statusClass = "status-disponible";
        if (currentStatus === "Apartado") statusClass = "status-apartado";
        if (currentStatus === "Consignado") statusClass = "status-consignado";
        if (currentStatus === "Vendido") statusClass = "status-vendido";

        let priceText = "";
        const rawPrice = p.precio;
        if (activeCurrency === "MXN") {
            priceText = `$${rawPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} MXN`;
        } else {
            const usdVal = rawPrice / EXCHANGE_RATE;
            priceText = `$${usdVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} USD`;
        }

        const imgPath = p.imagen || "royalwatch logo hd sin fondo.png";

        card.innerHTML = `
            <div class="card-image-wrapper">
                <span class="card-badge ${statusClass}">${currentStatus}</span>
                <img src="${imgPath}" alt="${p.marca} ${p.modelo}" class="card-img" loading="lazy">
                <div class="card-img-overlay">
                    <button class="overlay-btn">Ver Pieza</button>
                </div>
            </div>
            <div class="card-info">
                <span class="card-brand">${p.marca}</span>
                <h4 class="card-model" title="${p.modelo}">${p.modelo}</h4>
                <p class="card-ref">Ref: ${p.referencia || 'S/R'}</p>
                <div class="card-specs">
                    ${p.medida ? `<span class="card-spec-tag">${p.medida}</span>` : ''}
                    ${p.material ? `<span class="card-spec-tag">${p.material}</span>` : ''}
                    ${p.caratula ? `<span class="card-spec-tag">${p.caratula}</span>` : ''}
                </div>
                <div class="card-footer">
                    <span class="card-price">${priceText}</span>
                    <button class="card-btn">Ver Detalles</button>
                </div>
            </div>
        `;

        card.addEventListener("click", () => openModalDetails(p));
        grid.appendChild(card);
    });

    initIcons();

    // Trigger scroll reveal for newly rendered cards
    // Use rAF to ensure DOM is painted first
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            observeCards();
        });
    });
}

// ========================
// MODAL OPEN / CLOSE
// ========================
function openModalDetails(watch) {
    selectedWatch = watch;
    const modal = document.getElementById("product-modal");

    // Populate image — wrap in the new wrapper
    const imgEl = document.getElementById("modal-img");
    imgEl.src = watch.imagen || "royalwatch logo hd sin fondo.png";
    imgEl.alt = `${watch.marca} ${watch.modelo}`;

    document.getElementById("modal-brand").textContent = watch.marca;
    document.getElementById("modal-model").textContent = watch.modelo;
    document.getElementById("modal-ref").textContent = watch.referencia || "S/R";

    let priceText = "";
    if (activeCurrency === "MXN") {
        priceText = `$${watch.precio.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} MXN`;
    } else {
        const usdVal = watch.precio / EXCHANGE_RATE;
        priceText = `$${usdVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} USD`;
    }
    document.getElementById("modal-price").textContent = priceText;

    document.getElementById("modal-spec-medida").textContent = watch.medida || "--";
    document.getElementById("modal-spec-material").textContent = watch.material || "--";
    document.getElementById("modal-spec-caratula").textContent = watch.caratula || "--";
    document.getElementById("modal-spec-movimiento").textContent = watch.movimiento || "Automático";

    const statusEl = document.getElementById("modal-spec-status");
    const currentStatus = watch.status || "Disponible";
    statusEl.textContent = currentStatus;
    statusEl.className = "modal-status-badge";
    if (currentStatus === "Disponible") statusEl.classList.add("status-disponible");
    else if (currentStatus === "Apartado") statusEl.classList.add("status-apartado");
    else if (currentStatus === "Consignado") statusEl.classList.add("status-consignado");
    else if (currentStatus === "Vendido") statusEl.classList.add("status-vendido");

    modal.classList.add("active");
    document.body.style.overflow = "hidden";
    initIcons();
}

function closeModal() {
    const modal = document.getElementById("product-modal");
    modal.classList.remove("active");
    document.body.style.overflow = "";
    selectedWatch = null;
}

// ========================
// HERO CAROUSEL LOGIC
// ========================
function initHeroCarousel() {
    const section = document.getElementById("hero-section");
    if (!section) return;

    const slides = section.querySelectorAll(".carousel-slide");
    const dots = section.querySelectorAll(".carousel-dots .dot");
    const prevBtn = document.getElementById("hero-prev");
    const nextBtn = document.getElementById("hero-next");

    let currentSlide = 0;
    const slideInterval = 6000; // 6 seconds auto rotation
    let timer = null;

    function showSlide(index) {
        if (index >= slides.length) index = 0;
        if (index < 0) index = slides.length - 1;

        slides.forEach(s => s.classList.remove("active"));
        dots.forEach(d => d.classList.remove("active"));

        slides[index].classList.add("active");
        dots[index].classList.add("active");

        currentSlide = index;
    }

    function nextSlide() {
        showSlide(currentSlide + 1);
    }

    function prevSlide() {
        showSlide(currentSlide - 1);
    }

    function startTimer() {
        stopTimer();
        timer = setInterval(nextSlide, slideInterval);
    }

    function stopTimer() {
        if (timer) clearInterval(timer);
    }

    if (prevBtn) {
        prevBtn.addEventListener("click", () => {
            prevSlide();
            startTimer();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            nextSlide();
            startTimer();
        });
    }

    dots.forEach(dot => {
        dot.addEventListener("click", () => {
            const index = parseInt(dot.getAttribute("data-slide"));
            showSlide(index);
            startTimer();
        });
    });

    startTimer();

    section.addEventListener("mouseenter", stopTimer);
    section.addEventListener("mouseleave", startTimer);
}

