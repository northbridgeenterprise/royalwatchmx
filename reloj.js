(() => {
    "use strict";
    const EXCHANGE_RATE = 17.8;
    const WHATSAPP = "528121980008";
    let product = null;
    let photos = [];
    let photoIndex = 0;
    let currency = "MXN";
    let photoTouchStart = null;
    let suppressPhotoOpen = false;
    const byId = (id) => document.getElementById(id);
    const catalog = () => typeof WATCHES_PRODUCTS !== "undefined" && Array.isArray(WATCHES_PRODUCTS) ? WATCHES_PRODUCTS : [];
    const safeRead = (key, fallback) => {
        try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; }
        catch { return fallback; }
    };
    const makeSlug = (watch) => [watch.marca, watch.modelo, watch.referencia || "sin-referencia"].join(" ")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
        .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const safeImage = (value) => {
        const image = String(value || "").trim();
        if (/^https:\/\//i.test(image)) return image;
        if (/^relojes\/[\w .()%-]+\.(?:jpe?g|png|webp)$/i.test(image)) return image;
        return "royalwatch logo hd sin fondo.png";
    };
    const clean = (value) => String(value ?? "").trim();
    const pricing = () => {
        const listed = Number(product?.precio) || 0;
        const month = new Intl.DateTimeFormat("en-US", { timeZone: "America/Monterrey", month: "numeric" }).format(new Date());
        const brand = clean(product?.marca).toLowerCase();
        const promo = listed > 0 && month === "9" && (brand === "rolex" || brand === "cartier");
        return { price: promo ? Math.round(listed * .9) : listed, original: promo ? listed : (Number(product?.precioAnterior) || 0), promo };
    };
    const money = (amount) => {
        const displayed = currency === "USD" ? amount / EXCHANGE_RATE : amount;
        return amount > 0 ? `$${displayed.toLocaleString("en-US", { maximumFractionDigits: 0 })} ${currency}` : "Consultar precio";
    };
    const whatsappUrl = () => {
        const value = pricing();
        const intents = {
            Disponible: "¿Me confirman existencia, condición y opciones de entrega?",
            Consignado: "¿Me confirman si sigue disponible y cómo puedo conocerlo?",
            Apartado: "¿Tienen alguna pieza similar disponible?",
            Vendido: "¿Podrían ayudarme a encontrar una pieza similar?"
        };
        const message = `Hola, me interesa el reloj *${product.marca} ${product.modelo}* (Ref: *${product.referencia || "S/R"}*). Precio mostrado: *${value.price > 0 ? money(value.price) : "Consultar precio"}*.${value.promo ? " Incluye el 10% de descuento de septiembre." : ""} ${intents[product.status] || intents.Disponible}`;
        return `https://api.whatsapp.com/send?phone=${WHATSAPP}&text=${encodeURIComponent(message)}`;
    };
    async function copyText(value) {
        if (navigator.clipboard?.writeText && window.isSecureContext) { await navigator.clipboard.writeText(value); return; }
        const field = document.createElement("textarea");
        field.value = value; field.setAttribute("readonly", "");
        field.style.position = "fixed"; field.style.opacity = "0";
        document.body.append(field); field.select();
        const copied = document.execCommand("copy"); field.remove();
        if (!copied) throw new Error("Clipboard unavailable");
    }
    function setProductImage(image, source) {
        const fallback = new URL("royalwatch logo hd sin fondo.png", location.href).href;
        image.onerror = () => {
            image.onerror = null;
            if (new URL(image.src, location.href).href !== fallback) image.src = fallback;
        };
        image.src = safeImage(source);
    }
    function getProductList() {
        if (typeof migrateStoredCatalogPrices === "function") migrateStoredCatalogPrices();
        const base = catalog();
        const custom = safeRead("rw_custom_products", []);
        const deleted = safeRead("rw_deleted_products", []);
        const deletedRefs = new Set(Array.isArray(deleted) ? deleted : []);
        const statuses = safeRead("rw_product_statuses", {});
        const list = [...base.filter((item) => !item.referencia || !deletedRefs.has(item.referencia)), ...(Array.isArray(custom) ? custom : [])];
        list.forEach((item) => {
            const key = item.referencia || `${item.marca}_${item.modelo}`;
            item.status = statuses?.[key] || item.status || "Disponible";
        });
        return list;
    }
    function findProduct() {
        const slug = new URLSearchParams(location.search).get("pieza");
        return getProductList().find((item) => makeSlug(item) === slug) || null;
    }
    function setMeta() {
        const title = `${product.marca} ${product.modelo}${product.referencia ? ` · ${product.referencia}` : ""} | Royal Watch MTY`;
        const productFacts = [product.medida && `caja ${product.medida}`, product.material, product.caratula && `carátula ${product.caratula}`].filter(Boolean).join(" · ");
        const description = `Conoce ${product.marca} ${product.modelo}${product.referencia ? `, referencia ${product.referencia}` : ""}${productFacts ? `: ${productFacts}` : ""}. Consulta disponibilidad y precio con Royal Watch MTY en Monterrey.`;
        document.title = title;
        byId("page-description").content = description;
        byId("og-title").content = title;
        byId("og-description").content = description;
        byId("og-image").content = new URL(safeImage(product.imagen), location.href).href;
        byId("canonical-link").href = location.href;
        const value = pricing();
        const schema = { "@context": "https://schema.org", "@type": "Product", name: `${product.marca} ${product.modelo}`, sku: product.referencia || undefined,
            image: photos.map((photo) => new URL(photo, location.href).href), description,
            brand: { "@type": "Brand", name: product.marca }, offers: value.price > 0 ? { "@type": "Offer", url: location.href, priceCurrency: "MXN", price: String(value.price),
                availability: product.status === "Disponible" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" } : undefined };
        byId("product-jsonld").textContent = JSON.stringify(schema);
    }
    function renderStatusAndPrice() {
        const status = clean(product.status) || "Disponible";
        const badge = byId("status-badge");
        badge.textContent = status;
        badge.dataset.status = status.toLowerCase();
        const availabilityLabel = byId("availability-label");
        availabilityLabel.dataset.status = status.toLowerCase();
        const value = pricing();
        byId("current-price").textContent = money(value.price);
        byId("old-price").hidden = !(value.original > 0);
        byId("old-price").textContent = value.original > 0 ? money(value.original) : "";
        byId("price-title").textContent = value.promo ? "Precio de septiembre" : (value.original ? "Precio de oportunidad" : "Precio publicado");
        byId("promo-badge").hidden = !value.promo;
        byId("promo-copy").hidden = !value.promo;
        byId("promo-copy").textContent = value.promo ? `10% de descuento aplicado al precio publicado. Ahorras ${money(value.original - value.price)} durante septiembre.` : "";
        byId("price-disclaimer").textContent = currency === "USD"
            ? "Precio en USD referencial al tipo de cambio de $17.80 MXN por USD; confirma precio y disponibilidad con un asesor."
            : "Precio en MXN; confirma vigencia y disponibilidad con un asesor.";
        const availability = { Disponible: "Existencia por confirmar", Consignado: "Consignación · confirma disponibilidad", Apartado: "Pieza apartada · consulta alternativas", Vendido: "Pieza vendida · podemos buscar otra" };
        byId("availability-copy").textContent = availability[status] || "Existencia por confirmar";
        const actionLabel = { Disponible: "Confirmar existencia", Consignado: "Preguntar por esta pieza", Apartado: "Buscar una pieza similar", Vendido: "Buscar una pieza similar" };
        byId("whatsapp-label").textContent = actionLabel[status] || "Consultar por WhatsApp";
        const wa = whatsappUrl();
        byId("whatsapp-action").href = wa;
        byId("mobile-whatsapp").href = wa;
        byId("mobile-price").textContent = money(value.price);
        byId("mobile-contact").hidden = false;
        byId("mobile-contact").classList.toggle("is-unavailable", ["Apartado", "Vendido"].includes(status));
        byId("action-caption").textContent = ["Disponible", "Consignado"].includes(status)
            ? "Un asesor confirma existencia, condición y opciones de entrega antes de tu visita."
            : "Consulta alternativas con el equipo; esta pieza no aparece como disponible.";
    }
    function renderPhotos() {
        photos = [...new Set([safeImage(product.imagen), ...(Array.isArray(product.galeria) ? product.galeria.map(safeImage) : [])])];
        const thumbs = byId("photo-thumbnails");
        thumbs.replaceChildren();
        photos.forEach((photo, index) => {
            const button = document.createElement("button");
            button.type = "button"; button.className = "photo-thumb";
            button.setAttribute("aria-label", `Ver foto ${index + 1}`); button.setAttribute("aria-current", String(index === 0));
            const image = document.createElement("img"); setProductImage(image, photo); image.alt = ""; image.loading = "lazy"; button.append(image);
            button.addEventListener("click", () => showPhoto(index)); thumbs.append(button);
        });
        [byId("photo-prev"), byId("photo-next")].forEach((button) => { button.hidden = photos.length < 2; });
        thumbs.hidden = photos.length < 2;
        byId("photo-count").hidden = photos.length < 2;
        showPhoto(0);
    }
    function showPhoto(index) {
        photoIndex = (index + photos.length) % photos.length;
        const current = photos[photoIndex];
        const alt = `${product.marca} ${product.modelo}${product.referencia ? `, referencia ${product.referencia}` : ""} — fotografía ${photoIndex + 1}`;
        setProductImage(byId("main-photo"), current); byId("main-photo").alt = alt;
        byId("photo-count").textContent = `${String(photoIndex + 1).padStart(2, "0")} / ${String(photos.length).padStart(2, "0")}`;
        [...byId("photo-thumbnails").children].forEach((thumb, i) => thumb.setAttribute("aria-current", String(i === photoIndex)));
        setProductImage(byId("lightbox-image"), current); byId("lightbox-image").alt = alt; byId("lightbox-count").textContent = byId("photo-count").textContent;
    }
    function renderSpecs() {
        const values = [["Diámetro de caja", product.medida], ["Material", product.material], ["Carátula / bisel", product.caratula], ["Movimiento", product.movimiento]].filter(([, value]) => clean(value));
        const target = byId("spec-grid"); target.replaceChildren();
        values.forEach(([label, value]) => { const group = document.createElement("div"); const term = document.createElement("dt"); const description = document.createElement("dd"); term.textContent = label; description.textContent = value; group.append(term, description); target.append(group); });
        byId("specifications").hidden = values.length === 0;
    }
    function effectivePrice(item) {
        const listed = Number(item?.precio) || 0;
        const month = new Intl.DateTimeFormat("en-US", { timeZone: "America/Monterrey", month: "numeric" }).format(new Date());
        return listed > 0 && month === "9" && ["rolex", "cartier"].includes(clean(item?.marca).toLowerCase()) ? Math.round(listed * .9) : listed;
    }
    function renderRelated() {
        const products = getProductList();
        const siblings = products.filter((item) => clean(item.marca).toLowerCase() === clean(product.marca).toLowerCase() && makeSlug(item) !== makeSlug(product) && ["Disponible", "Consignado"].includes(item.status)).slice(0, 3);
        const grid = byId("related-grid");
        grid.replaceChildren();
        if (!siblings.length) { byId("related-section").hidden = true; return; }
        siblings.forEach((item) => {
            const link = document.createElement("a");
            link.className = "related-card";
            link.href = `reloj.html?pieza=${encodeURIComponent(makeSlug(item))}`;
            const image = document.createElement("img");
            setProductImage(image, item.imagen);
            image.alt = `${item.marca} ${item.modelo}`;
            image.loading = "lazy";
            const brand = document.createElement("span");
            brand.textContent = item.marca;
            const name = document.createElement("strong");
            name.textContent = item.modelo;
            const status = document.createElement("small");
            status.className = "related-status";
            status.textContent = item.status || "Disponible";
            const price = document.createElement("small");
            price.className = "related-price";
            const amount = currency === "USD" ? effectivePrice(item) / EXCHANGE_RATE : effectivePrice(item);
            price.textContent = money(amount);
            link.append(image, brand, name, status, price);
            grid.append(link);
        });
        byId("related-section").hidden = false;
    }
    function favoriteSlugs() {
        const saved = safeRead("rw_watch_favorites", []);
        return Array.isArray(saved) ? saved : [];
    }
    function updateFavoriteButton() {
        const slug = makeSlug(product);
        const active = favoriteSlugs().includes(slug);
        const button = byId("favorite-toggle");
        button.setAttribute("aria-pressed", String(active));
        button.classList.toggle("is-saved", active);
        button.querySelector("span").textContent = active ? "Guardada aquí" : "Guardar pieza";
        button.setAttribute("aria-label", active ? "Quitar pieza de guardadas en este dispositivo" : "Guardar pieza en este dispositivo");
    }
    function renderSavedList() {
        const available = getProductList();
        const entries = favoriteSlugs().map((slug) => available.find((item) => makeSlug(item) === slug)).filter(Boolean);
        const activeSlugs = entries.map(makeSlug);
        try { localStorage.setItem("rw_watch_favorites", JSON.stringify(activeSlugs)); } catch { /* saved items remain readable */ }
        byId("saved-count").textContent = String(entries.length);
        const list = byId("saved-list");
        list.replaceChildren();
        if (!entries.length) {
            const empty = document.createElement("p");
            empty.className = "saved-empty";
            empty.textContent = "Aún no guardas piezas. Usa “Guardar pieza” en cualquier ficha para volver a encontrarla aquí.";
            list.append(empty);
            return;
        }
        entries.forEach((item) => {
            const row = document.createElement("article");
            row.className = "saved-item";
            const image = document.createElement("img");
            setProductImage(image, item.imagen);
            image.alt = `${item.marca} ${item.modelo}`;
            const link = document.createElement("a");
            link.href = `reloj.html?pieza=${encodeURIComponent(makeSlug(item))}`;
            const brand = document.createElement("span"); brand.textContent = item.marca;
            const model = document.createElement("strong"); model.textContent = item.modelo;
            const status = document.createElement("small"); status.className = "saved-status"; status.textContent = item.status || "Disponible";
            const price = document.createElement("small"); price.className = "saved-price"; price.textContent = money(currency === "USD" ? effectivePrice(item) / EXCHANGE_RATE : effectivePrice(item));
            link.append(brand, model, status, price);
            const remove = document.createElement("button");
            remove.type = "button"; remove.className = "saved-remove"; remove.textContent = "Quitar";
            remove.setAttribute("aria-label", `Quitar ${item.marca} ${item.modelo} de guardadas`);
            remove.addEventListener("click", () => {
                const next = favoriteSlugs().filter((slug) => slug !== makeSlug(item));
                try { localStorage.setItem("rw_watch_favorites", JSON.stringify(next)); } catch { /* keep current view */ }
                updateFavoriteButton(); renderSavedList();
            });
            row.append(image, link, remove);
            list.append(row);
        });
    }
    function wireActions() {
        document.querySelectorAll(".currency").forEach((button) => button.addEventListener("click", () => {
            currency = button.dataset.currency;
            document.querySelectorAll(".currency").forEach((option) => { const active = option === button; option.classList.toggle("active", active); option.setAttribute("aria-pressed", String(active)); });
            renderStatusAndPrice(); renderRelated();
            if (byId("saved-dialog").open) renderSavedList();
        }));
        const favoriteButton = byId("favorite-toggle");
        const savedDialog = byId("saved-dialog");
        updateFavoriteButton();
        renderSavedList();
        favoriteButton.addEventListener("click", () => {
            const favorites = new Set(favoriteSlugs());
            const slug = makeSlug(product);
            if (favorites.has(slug)) favorites.delete(slug); else favorites.add(slug);
            try { localStorage.setItem("rw_watch_favorites", JSON.stringify([...favorites])); updateFavoriteButton(); renderSavedList(); }
            catch { byId("action-caption").textContent = "No pudimos guardar esta pieza en este dispositivo."; }
        });
        byId("saved-open").addEventListener("click", () => { renderSavedList(); savedDialog.showModal(); });
        byId("saved-close").addEventListener("click", () => savedDialog.close());
        savedDialog.addEventListener("click", (event) => { if (event.target === savedDialog) savedDialog.close(); });
        byId("copy-reference").addEventListener("click", async () => {
            const reference = clean(product.referencia);
            if (!reference) return;
            const label = byId("copy-reference").querySelector("span");
            try { await copyText(reference); label.textContent = "Referencia copiada"; window.setTimeout(() => { label.textContent = "Copiar ref."; }, 1800); }
            catch { byId("action-caption").textContent = "No pudimos copiar la referencia; puedes seleccionarla manualmente."; }
        });
        const dialog = byId("photo-dialog");
        const photoOpen = byId("photo-open");
        photoOpen.addEventListener("touchstart", (event) => {
            const point = event.changedTouches[0];
            photoTouchStart = point ? { x: point.clientX, y: point.clientY } : null;
        }, { passive: true });
        photoOpen.addEventListener("touchend", (event) => {
            const point = event.changedTouches[0];
            if (!photoTouchStart || !point || photos.length < 2) return;
            const deltaX = point.clientX - photoTouchStart.x;
            const deltaY = point.clientY - photoTouchStart.y;
            photoTouchStart = null;
            if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY)) {
                suppressPhotoOpen = true;
                showPhoto(photoIndex + (deltaX < 0 ? 1 : -1));
                window.setTimeout(() => { suppressPhotoOpen = false; }, 450);
            }
        }, { passive: true });
        photoOpen.addEventListener("click", () => { if (suppressPhotoOpen) { suppressPhotoOpen = false; return; } dialog.showModal(); });
        byId("photo-prev").addEventListener("click", () => showPhoto(photoIndex - 1));
        byId("photo-next").addEventListener("click", () => showPhoto(photoIndex + 1));
        byId("lightbox-close").addEventListener("click", () => dialog.close());
        byId("lightbox-prev").addEventListener("click", () => showPhoto(photoIndex - 1));
        byId("lightbox-next").addEventListener("click", () => showPhoto(photoIndex + 1));
        dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
        document.addEventListener("keydown", (event) => {
            if (savedDialog.open && event.key === "Escape") savedDialog.close();
            if (dialog.open && event.key === "ArrowLeft") showPhoto(photoIndex - 1);
            if (dialog.open && event.key === "ArrowRight") showPhoto(photoIndex + 1);
        });
        byId("share-action").addEventListener("click", async () => {
            try {
                if (navigator.share) await navigator.share({ title: document.title, text: `Mira ${product.marca} ${product.modelo} en Royal Watch MTY`, url: location.href });
                else { await copyText(location.href); byId("action-caption").textContent = "Enlace de la pieza copiado."; }
            } catch (error) {
                if (error?.name === "AbortError") return;
                try { await copyText(location.href); byId("action-caption").textContent = "Enlace de la pieza copiado."; }
                catch { byId("action-caption").textContent = "No se pudo compartir el enlace desde este dispositivo."; }
            }
        });
    }
    document.addEventListener("DOMContentLoaded", () => {
        product = findProduct();
        if (!product) { byId("not-found").hidden = false; byId("saved-open").hidden = true; return; }
        byId("watch-detail").hidden = false;
        byId("crumb-brand").textContent = product.marca;
        byId("product-brand").textContent = product.marca.toUpperCase();
        byId("product-model").textContent = product.modelo;
        byId("product-reference").textContent = product.referencia || "Sin referencia";
        byId("crumb-brand").textContent = `${product.marca} · ${product.modelo}`;
        const factList = [["caja", product.medida], ["material", product.material], ["carátula", product.caratula], ["movimiento", product.movimiento]]
            .filter(([, value]) => clean(value)).map(([label, value]) => `${label}: ${clean(value)}`);
        byId("product-intro").textContent = factList.length
            ? `Datos publicados para esta pieza: ${factList.join(" · ")}. Confirma condición, accesorios y entrega con un asesor.`
            : "Solicita al asesor las características, condición y accesorios de esta pieza antes de coordinar tu visita.";
        renderPhotos(); renderSpecs(); renderStatusAndPrice(); setMeta(); renderRelated(); wireActions();
        if (window.lucide) window.lucide.createIcons();
    });
})();