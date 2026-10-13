/* store.js - Royal Watch MTY Storefront Controller — Premium Edition */

let storeProducts = [];
let activeCurrency = "MXN";
const EXCHANGE_RATE = 17.80;
let activeBrandFilter = "Todos";
let searchQuery = "";
let activeSort = "default";
let selectedWatch = null;
let modalImages = [];
let modalImgIndex = 0;
let modalReturnFocus = null;

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
    initHeroCarousel();

    // Reflect inventory changes made in another tab of this browser.
    window.addEventListener("storage", (event) => {
        if (["rw_custom_products", "rw_deleted_products", "rw_product_statuses"].includes(event.key)) {
            loadStoreCatalog();
            renderStoreGrid();
        }
    });
});

// ========================
// SAFE DATA AND PRICE HELPERS
// ========================
function readStoredJSON(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
    } catch {
        return fallback;
    }
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
    })[char]);
}

function safeCatalogImage(value) {
    const source = String(value || "").trim();
    if (/^https:\/\//i.test(source)) return source;
    if (/^relojes\/[\w .()%-]+\.(?:jpe?g|png|webp)$/i.test(source)) return source;
    if (source === "royalwatch logo hd sin fondo.png") return source;
    return "royalwatch logo hd sin fondo.png";
}

function getPriceInCurrency(priceMXN, currency = activeCurrency) {
    const amount = Number(priceMXN);
    if (!Number.isFinite(amount)) return null;
    return currency === "USD" ? amount / EXCHANGE_RATE : amount;
}

function formatPrice(priceMXN, currency = activeCurrency) {
    const amount = getPriceInCurrency(priceMXN, currency);
    if (amount === null) return "Consultar precio";
    return `$${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })} ${currency}`;
}

// ========================
// CATALOG LOADING
// ========================
function loadStoreCatalog() {
    migrateStoredCatalogPrices();
    let baseCatalog = [];
    if (typeof WATCHES_PRODUCTS !== 'undefined' && WATCHES_PRODUCTS.length > 0) {
        baseCatalog = WATCHES_PRODUCTS;
    }

    const customValue = readStoredJSON("rw_custom_products", []);
    const deletedValue = readStoredJSON("rw_deleted_products", []);
    const customProds = Array.isArray(customValue) ? customValue : [];
    const deletedRefs = Array.isArray(deletedValue) ? deletedValue : [];
    const deletedSet = new Set(deletedRefs.filter(Boolean));

    let merged = baseCatalog.filter(p => !p.referencia || !deletedSet.has(p.referencia));
    merged = [...merged, ...customProds];

    const statusValue = readStoredJSON("rw_product_statuses", {});
    const statusOverrides = statusValue && typeof statusValue === "object" && !Array.isArray(statusValue) ? statusValue : {};
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
// PARTICLE CANVAS (GOLD DUST)
// ========================
function initParticleCanvas() {
    const canvas = document.getElementById("hero-canvas");
    if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

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
            brandTags.forEach(button => button.setAttribute("aria-pressed", String(button === tag)));
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
            buttons.forEach(button => button.setAttribute("aria-pressed", String(button === btn)));
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
    const prevBtn = document.getElementById("modal-gallery-prev");
    const nextBtn = document.getElementById("modal-gallery-next");

    closeBtn.addEventListener("click", closeModal);

    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
    });

    if (prevBtn) {
        prevBtn.addEventListener("click", () => {
            if (modalImages.length <= 1) return;
            const newIdx = (modalImgIndex - 1 + modalImages.length) % modalImages.length;
            changeModalImage(newIdx);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            if (modalImages.length <= 1) return;
            const newIdx = (modalImgIndex + 1) % modalImages.length;
            changeModalImage(newIdx);
        });
    }

    document.addEventListener("keydown", (e) => {
        if (!modal.classList.contains("active")) return;
        if (e.key === "Escape") {
            closeModal();
            return;
        }
        if (e.key === "Tab") {
            const focusable = [...modal.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')]
                .filter(element => element.offsetParent !== null);
            if (!focusable.length) {
                e.preventDefault();
                modal.querySelector(".modal-container").focus();
            } else if (e.shiftKey && document.activeElement === focusable[0]) {
                e.preventDefault();
                focusable[focusable.length - 1].focus();
            } else if (!e.shiftKey && document.activeElement === focusable[focusable.length - 1]) {
                e.preventDefault();
                focusable[0].focus();
            }
            return;
        }
        if (modalImages.length > 1) {
            if (e.key === "ArrowLeft") {
                const newIdx = (modalImgIndex - 1 + modalImages.length) % modalImages.length;
                changeModalImage(newIdx);
            } else if (e.key === "ArrowRight") {
                const newIdx = (modalImgIndex + 1) % modalImages.length;
                changeModalImage(newIdx);
            }
        }
    });

    waActionBtn.addEventListener("click", () => {
        if (!selectedWatch) return;
        const priceText = formatPrice(selectedWatch.precio);
        const msg = `Hola, estoy interesado en el reloj *${selectedWatch.marca} ${selectedWatch.modelo}* (Ref: *${selectedWatch.referencia || 'S/R'}*) por *${priceText}* que vi en stock en su vitrina web. ¿Sigue disponible?`;
        const waUrl = `https://api.whatsapp.com/send?phone=528121980008&text=${encodeURIComponent(msg)}`;
        window.open(waUrl, "_blank", "noopener,noreferrer");
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
        const card = document.createElement("article");
        card.className = "watch-card"; // starts hidden, revealed by IntersectionObserver

        let currentStatus = p.status || "Disponible";
        let statusClass = "status-disponible";
        if (currentStatus === "Apartado") statusClass = "status-apartado";
        else if (currentStatus === "Consignado") statusClass = "status-consignado";
        else if (currentStatus === "Vendido") statusClass = "status-vendido";
        else if (p.precioAnterior) {
            currentStatus = "Oportunidad";
            statusClass = "status-promocion";
        }

        let priceHTML = "";
        const rawPrice = Number(p.precio);
        const rawOriginal = Number(p.precioAnterior) || null;
        if (rawOriginal) priceHTML += `<span class="card-price-original">${escapeHTML(formatPrice(rawOriginal))}</span>`;
        priceHTML += `<span class="card-price">${escapeHTML(formatPrice(rawPrice))}</span>`;

        const imgPath = escapeHTML(safeCatalogImage(p.imagen));
        const brand = escapeHTML(p.marca);
        const model = escapeHTML(p.modelo);
        const reference = escapeHTML(p.referencia || "S/R");
        const statusLabel = escapeHTML(currentStatus);
        const size = escapeHTML(p.medida || "");
        const material = escapeHTML(p.material || "");
        const dial = escapeHTML(p.caratula || "");

        card.innerHTML = `
            <div class="card-image-wrapper">
                <span class="card-badge ${statusClass}">${statusLabel}</span>
                <img src="${imgPath}" alt="${brand} ${model}" class="card-img" loading="lazy">
                <div class="card-img-overlay">
                    <button type="button" class="overlay-btn" aria-label="Ver detalles de ${brand} ${model}">Ver Pieza</button>
                </div>
            </div>
            <div class="card-info">
                <span class="card-brand">${brand}</span>
                <h4 class="card-model" title="${model}">${model}</h4>
                <p class="card-ref">Ref: ${reference}</p>
                <div class="card-specs">
                    ${size ? `<span class="card-spec-tag">${size}</span>` : ''}
                    ${material ? `<span class="card-spec-tag">${material}</span>` : ''}
                    ${dial ? `<span class="card-spec-tag">${dial}</span>` : ''}
                </div>
                <div class="card-footer">
                    <div style="display:flex; align-items:baseline;">${priceHTML}</div>
                    <button type="button" class="card-btn" aria-label="Ver detalles de ${brand} ${model}">Ver Detalles</button>
                </div>
            </div>
        `;

        card.querySelectorAll(".overlay-btn, .card-btn").forEach(button => {
            button.addEventListener("click", () => openModalDetails(p));
        });
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
    modalReturnFocus = document.activeElement;

    // Populate images array
    modalImages = [watch.imagen];
    if (Array.isArray(watch.galeria)) {
        modalImages.push(...watch.galeria);
    }
    modalImages = modalImages.filter(Boolean);
    modalImgIndex = 0;

    // Reset main image display
    const imgEl = document.getElementById("modal-img");
    if (imgEl) {
        imgEl.src = safeCatalogImage(watch.imagen);
        imgEl.alt = `${watch.marca} ${watch.modelo}`;
    }

    // Reset viewport fade
    const viewport = document.querySelector(".modal-img-viewport");
    if (viewport) {
        viewport.classList.remove("fade-out");
    }

    // Configure display of arrows and thumbnails wrapper
    const prevBtn = document.getElementById("modal-gallery-prev");
    const nextBtn = document.getElementById("modal-gallery-next");
    const thumbWrapper = document.getElementById("modal-thumbnails-wrapper");
    const track = document.getElementById("modal-thumbnails-track");

    if (modalImages.length > 1) {
        if (prevBtn) prevBtn.style.display = "flex";
        if (nextBtn) nextBtn.style.display = "flex";
        if (thumbWrapper) thumbWrapper.style.display = "block";

        if (track) {
            track.innerHTML = "";
            modalImages.forEach((imgSrc, idx) => {
                const thumb = document.createElement("button");
                thumb.type = "button";
                thumb.className = `modal-thumb ${idx === 0 ? 'active' : ''}`;
                thumb.setAttribute("aria-label", `Ver foto ${idx + 1}`);
                thumb.setAttribute("aria-current", String(idx === 0));
                thumb.innerHTML = `<img src="${escapeHTML(safeCatalogImage(imgSrc))}" alt="">`;
                thumb.addEventListener("click", () => {
                    if (modalImgIndex !== idx) {
                        changeModalImage(idx);
                    }
                });
                track.appendChild(thumb);
            });
        }
    } else {
        if (prevBtn) prevBtn.style.display = "none";
        if (nextBtn) nextBtn.style.display = "none";
        if (thumbWrapper) thumbWrapper.style.display = "none";
        if (track) track.innerHTML = "";
    }

    document.getElementById("modal-brand").textContent = watch.marca;
    document.getElementById("modal-model").textContent = watch.modelo;
    document.getElementById("modal-ref").textContent = watch.referencia || "S/R";

    // Catalog prices are stored in USD (same unit as the admin form).
    const rawOriginal = Number(watch.precioAnterior) || null;
    const priceText = formatPrice(watch.precio);
    const originalPriceText = rawOriginal ? formatPrice(rawOriginal) : "";

    document.getElementById("modal-price").textContent = priceText;
    const modalOriginalEl = document.getElementById("modal-price-original");
    if (modalOriginalEl) {
        if (rawOriginal) {
            modalOriginalEl.textContent = originalPriceText;
            modalOriginalEl.style.display = "inline-block";
        } else {
            modalOriginalEl.style.display = "none";
        }
    }

    // Set Premium Pricing label
    const modalPriceLabel = document.getElementById("modal-price-label");
    if (modalPriceLabel) {
        modalPriceLabel.textContent = rawOriginal ? "Inversión Especial (Promo)" : "Inversión Especial";
    }

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

    const availabilityNote = document.getElementById("modal-availability-note");
    if (availabilityNote) {
        const notes = {
            "Disponible": "La disponibilidad puede cambiar. Confirma la pieza antes de tu visita.",
            "Consignado": "Pieza en consignación. Consulta su disponibilidad con nuestro equipo.",
            "Apartado": "Esta pieza está apartada. Escríbenos para conocer alternativas.",
            "Vendido": "Esta pieza ya fue vendida. Podemos ayudarte a encontrar una similar."
        };
        availabilityNote.textContent = notes[currentStatus] || "Consulta con nuestro equipo el estado actual de esta pieza.";
    }

    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    document.getElementById("modal-close").focus();
    initIcons();
}

function closeModal() {
    const modal = document.getElementById("product-modal");
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    selectedWatch = null;
    modalImages = [];
    modalImgIndex = 0;
    if (modalReturnFocus && typeof modalReturnFocus.focus === "function") modalReturnFocus.focus();
    modalReturnFocus = null;
}

function changeModalImage(index) {
    if (index < 0 || index >= modalImages.length) return;
    modalImgIndex = index;

    const viewport = document.querySelector(".modal-img-viewport");
    const imgEl = document.getElementById("modal-img");
    if (!viewport || !imgEl) return;

    viewport.classList.add("fade-out");

    setTimeout(() => {
        imgEl.src = safeCatalogImage(modalImages[modalImgIndex]);
        viewport.classList.remove("fade-out");

        // Update active thumbnail
        const track = document.getElementById("modal-thumbnails-track");
        if (track) {
            const thumbs = track.querySelectorAll(".modal-thumb");
            thumbs.forEach((thumb, idx) => {
                if (idx === modalImgIndex) {
                    thumb.classList.add("active");
                    thumb.setAttribute("aria-current", "true");
                } else {
                    thumb.classList.remove("active");
                    thumb.setAttribute("aria-current", "false");
                }
            });

            // Smooth scroll active thumbnail into view
            const activeThumb = track.querySelector(".modal-thumb.active");
            if (activeThumb) {
                activeThumb.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
            }
        }
    }, 250);
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
        dots.forEach((dot, dotIndex) => {
            dot.classList.toggle("active", dotIndex === index);
            dot.setAttribute("aria-pressed", String(dotIndex === index));
        });

        slides[index].classList.add("active");

        currentSlide = index;
    }

    function nextSlide() {
        showSlide(currentSlide + 1);
    }

    function prevSlide() {
        showSlide(currentSlide - 1);
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function startTimer() {
        stopTimer();
        if (!reducedMotion) timer = setInterval(nextSlide, slideInterval);
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
    section.addEventListener("focusin", stopTimer);
    section.addEventListener("focusout", (event) => {
        if (!section.contains(event.relatedTarget)) startTimer();
    });
}

