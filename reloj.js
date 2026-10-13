(() => {
    "use strict";
    const EXCHANGE_RATE = 17.8;
    const WHATSAPP = "528121980008";
    let product = null;
    let photos = [];
    let photoIndex = 0;
    let currency = "MXN";
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
        const promo = month === "9" && (brand === "rolex" || brand === "cartier");
        return { price: promo ? Math.round(listed * .9) : listed, original: promo ? listed : (Number(product?.precioAnterior) || 0), promo };
    };
    const money = (amount) => {
        const displayed = currency === "USD" ? amount / EXCHANGE_RATE : amount;
        return `$${displayed.toLocaleString("en-US", { maximumFractionDigits: 0 })} ${currency}`;
    };
    const whatsappUrl = () => {
        const value = pricing();
        const intents = {
            Disponible: "¿Me confirman existencia, condición y opciones de entrega?",
            Consignado: "¿Me confirman si sigue disponible y cómo puedo conocerlo?",
            Apartado: "¿Tienen alguna pieza similar disponible?",
            Vendido: "¿Podrían ayudarme a encontrar una pieza similar?"
        };
        const message = `Hola, me interesa el reloj *${product.marca} ${product.modelo}* (Ref: *${product.referencia || "S/R"}*). Precio mostrado: *${money(value.price)}*.${value.promo ? " Incluye el 10% de descuento de septiembre." : ""} ${intents[product.status] || intents.Disponible}`;
        return `https://api.whatsapp.com/send?phone=${WHATSAPP}&text=${encodeURIComponent(message)}`;
    };
    function findProduct() {
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
        const slug = new URLSearchParams(location.search).get("pieza");
        return list.find((item) => makeSlug(item) === slug) || null;
    }
    function setMeta() {
        const title = `${product.marca} ${product.modelo}${product.referencia ? ` · ${product.referencia}` : ""} | Royal Watch MTY`;
        const description = `Conoce ${product.marca} ${product.modelo}${product.referencia ? `, referencia ${product.referencia}` : ""}. Consulta disponibilidad, precio y detalles con Royal Watch MTY en Monterrey.`;
        document.title = title;
        byId("page-description").content = description;
        byId("og-title").content = title;
        byId("og-description").content = description;
        byId("og-image").content = new URL(safeImage(product.imagen), location.href).href;
        byId("canonical-link").href = location.href;
        const value = pricing();
        const schema = { "@context": "https://schema.org", "@type": "Product", name: `${product.marca} ${product.modelo}`, sku: product.referencia || undefined,
            image: photos.map((photo) => new URL(photo, location.href).href), description,
            brand: { "@type": "Brand", name: product.marca }, offers: { "@type": "Offer", url: location.href, priceCurrency: "MXN", price: String(value.price),
                availability: product.status === "Disponible" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" } };
        byId("product-jsonld").textContent = JSON.stringify(schema);
    }
    function renderStatusAndPrice() {
        const status = clean(product.status) || "Disponible";
        const badge = byId("status-badge");
        badge.textContent = status;
        badge.dataset.status = status.toLowerCase();
        const value = pricing();
        byId("current-price").textContent = money(value.price);
        byId("old-price").hidden = !value.original;
        byId("old-price").textContent = value.original ? money(value.original) : "";
        byId("price-title").textContent = value.promo ? "Precio de septiembre" : (value.original ? "Precio de oportunidad" : "Precio publicado");
        byId("promo-badge").hidden = !value.promo;
        byId("promo-copy").hidden = !value.promo;
        byId("promo-copy").textContent = value.promo ? `10% de descuento aplicado al precio publicado. Ahorras ${money(value.original - value.price)} durante septiembre.` : "";
        const availability = { Disponible: "Existencia por confirmar", Consignado: "Consignación · confirma disponibilidad", Apartado: "Pieza apartada · consulta alternativas", Vendido: "Pieza vendida · podemos buscar otra" };
        byId("availability-copy").textContent = availability[status] || "Existencia por confirmar";
        const wa = whatsappUrl();
        byId("whatsapp-action").href = wa;
        byId("mobile-whatsapp").href = wa;
        byId("mobile-price").textContent = money(value.price);
        byId("mobile-contact").hidden = false;
        byId("mobile-contact").classList.toggle("is-unavailable", ["Apartado", "Vendido"].includes(status));
        byId("action-caption").textContent = ["Disponible", "Consignado"].includes(status) ? "Un asesor confirma existencia, condición y opciones de entrega antes de tu visita." : "Consulta piezas similares con nuestro equipo de asesores.";
    }
    function renderPhotos() {
        photos = [...new Set([safeImage(product.imagen), ...(Array.isArray(product.galeria) ? product.galeria.map(safeImage) : [])])];
        const thumbs = byId("photo-thumbnails");
        thumbs.replaceChildren();
        photos.forEach((photo, index) => {
            const button = document.createElement("button");
            button.type = "button"; button.className = "photo-thumb";
            button.setAttribute("aria-label", `Ver foto ${index + 1}`); button.setAttribute("aria-current", String(index === 0));
            const image = document.createElement("img"); image.src = photo; image.alt = ""; image.loading = "lazy"; button.append(image);
            button.addEventListener("click", () => showPhoto(index)); thumbs.append(button);
        });
        [byId("photo-prev"), byId("photo-next")].forEach((button) => { button.hidden = photos.length < 2; });
        showPhoto(0);
    }
    function showPhoto(index) {
        photoIndex = (index + photos.length) % photos.length;
        const current = photos[photoIndex];
        const alt = `${product.marca} ${product.modelo}${product.referencia ? `, referencia ${product.referencia}` : ""} — fotografía ${photoIndex + 1}`;
        byId("main-photo").src = current; byId("main-photo").alt = alt;
        byId("photo-count").textContent = `${String(photoIndex + 1).padStart(2, "0")} / ${String(photos.length).padStart(2, "0")}`;
        [...byId("photo-thumbnails").children].forEach((thumb, i) => thumb.setAttribute("aria-current", String(i === photoIndex)));
        byId("lightbox-image").src = current; byId("lightbox-image").alt = alt; byId("lightbox-count").textContent = byId("photo-count").textContent;
    }
    function renderSpecs() {
        const values = [["Diámetro de caja", product.medida], ["Material", product.material], ["Carátula / bisel", product.caratula], ["Movimiento", product.movimiento]].filter(([, value]) => clean(value));
        const target = byId("spec-grid"); target.replaceChildren();
        values.forEach(([label, value]) => { const group = document.createElement("div"); const term = document.createElement("dt"); const description = document.createElement("dd"); term.textContent = label; description.textContent = value; group.append(term, description); target.append(group); });
        byId("specifications").hidden = values.length === 0;
    }
    function renderRelated() {
        const siblings = catalog().filter((item) => item.marca === product.marca && makeSlug(item) !== makeSlug(product)).slice(0, 3);
        const grid = byId("related-grid"); grid.replaceChildren();
        if (!siblings.length) { byId("related-section").hidden = true; return; }
        siblings.forEach((item) => {
            const link = document.createElement("a"); link.className = "related-card"; link.href = `reloj.html?pieza=${encodeURIComponent(makeSlug(item))}`;
            const image = document.createElement("img"); image.src = safeImage(item.imagen); image.alt = `${item.marca} ${item.modelo}`; image.loading = "lazy";
            const brand = document.createElement("span"); brand.textContent = item.marca;
            const name = document.createElement("strong"); name.textContent = item.modelo;
            const price = document.createElement("small"); let listedPrice = Number(item.precio) || 0; const month = new Intl.DateTimeFormat("en-US", { timeZone: "America/Monterrey", month: "numeric" }).format(new Date()); if (month === "9" && ["rolex", "cartier"].includes(clean(item.marca).toLowerCase())) listedPrice = Math.round(listedPrice * .9); const amount = currency === "USD" ? listedPrice / EXCHANGE_RATE : listedPrice; price.textContent = `$${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })} ${currency}`;
            link.append(image, brand, name, price); grid.append(link);
        });
        byId("related-section").hidden = false;
    }
    function wireActions() {
        document.querySelectorAll(".currency").forEach((button) => button.addEventListener("click", () => {
            currency = button.dataset.currency;
            document.querySelectorAll(".currency").forEach((option) => { const active = option === button; option.classList.toggle("active", active); option.setAttribute("aria-pressed", String(active)); });
            renderStatusAndPrice(); renderRelated();
        }));
        const dialog = byId("photo-dialog");
        byId("photo-open").addEventListener("click", () => dialog.showModal());
        byId("photo-prev").addEventListener("click", () => showPhoto(photoIndex - 1));
        byId("photo-next").addEventListener("click", () => showPhoto(photoIndex + 1));
        byId("lightbox-close").addEventListener("click", () => dialog.close());
        byId("lightbox-prev").addEventListener("click", () => showPhoto(photoIndex - 1));
        byId("lightbox-next").addEventListener("click", () => showPhoto(photoIndex + 1));
        dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
        document.addEventListener("keydown", (event) => { if (dialog.open && event.key === "ArrowLeft") showPhoto(photoIndex - 1); if (dialog.open && event.key === "ArrowRight") showPhoto(photoIndex + 1); });
        byId("share-action").addEventListener("click", async () => {
            const button = byId("share-action"); const label = " Enlace copiado";
            try { if (navigator.share) await navigator.share({ title: document.title, text: `Mira ${product.marca} ${product.modelo} en Royal Watch MTY`, url: location.href });
                else { await navigator.clipboard.writeText(location.href); button.lastChild.textContent = label; } }
            catch (error) { if (error?.name !== "AbortError") { try { await navigator.clipboard.writeText(location.href); button.lastChild.textContent = label; } catch { /* sharing unavailable */ } } }
        });
        byId("main-photo").addEventListener("error", () => { byId("main-photo").src = "royalwatch logo hd sin fondo.png"; });
    }
    document.addEventListener("DOMContentLoaded", () => {
        product = findProduct();
        if (!product) { byId("not-found").hidden = false; return; }
        byId("watch-detail").hidden = false;
        byId("crumb-brand").textContent = product.marca;
        byId("product-brand").textContent = product.marca.toUpperCase();
        byId("product-model").textContent = product.modelo;
        byId("product-reference").textContent = product.referencia || "Sin referencia";
        renderPhotos(); renderSpecs(); renderStatusAndPrice(); setMeta(); renderRelated(); wireActions();
        if (window.lucide) window.lucide.createIcons();
    });
})();