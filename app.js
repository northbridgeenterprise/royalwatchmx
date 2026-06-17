// App State - Royal Watch MTY
let products = [];
let clients = [];
let quotes = [];
let vendors = [];
let currentVendorEditIndex = -1;
let currentPartidaCount = 0;

// Default Clients
const DEFAULT_CLIENTS = [
    { empresa: "Coleccionista Privado MTY", contacto: "Dr. Roberto Garza", email: "r.garza@gmail.com", tel: "81 8300 1234" },
    { empresa: "Particular", contacto: "Ing. Mauricio Anaya", email: "m.anaya@outlook.com", tel: "81 1500 5678" }
];

// Default Vendor Profile (Royal Watch Representative)
const DEFAULT_VENDORS = [
    {
        nombre: "Alejandro Luna",
        tel: "81 2198 0008",
        email: "a.luna@royalwatchmty.com",
        banco: "Banco Nu México\nBeneficiario: Alejandro Luna\nCLABE: 638180010141018767",
        notifPago: "pagos@royalwatchmty.com"
    }
];

// Document legal footers based on type
const DOCUMENT_TEMPLATES = {
    cotizacion: {
        titulo: "Cotización de Venta",
        alerta: "* Precios sujetos a cambios de acuerdo al mercado internacional y tipo de cambio *",
        observaciones: "Piezas sujetas a disponibilidad previa venta. Garantía de autenticidad de por vida. Envío asegurado sin costo a todo México.",
        legal: ""
    },
    anticipo_pedido: {
        titulo: "Anticipo de Pago y Solicitud de Pedido",
        alerta: "* Documento de anticipo de pago para solicitud de pedido especial *",
        observaciones: "El anticipo no es reembolsable en caso de cancelación por parte del cliente. La pieza solicitada se entregará según los tiempos acordados.",
        legal: "El presente documento formaliza la solicitud del pedido de la pieza descrita mediante un anticipo. Dicha cantidad será abonada al costo total del reloj al liquidar su saldo para proceder a la entrega física de la pieza."
    },
    consignacion: {
        titulo: "Contrato de Consignación",
        alerta: "* Documento de recepción de pieza para consignación de venta *",
        observaciones: "El reloj se resguarda en bóveda de seguridad. El periodo de consignación mínimo es de 30 días naturales.",
        legal: "El cliente certifica bajo protesta de decir verdad que la pieza descrita es de su legítima propiedad, adquirida de forma lícita, y autoriza a Royal Watch MTY a ofrecerla para su venta al precio acordado. Royal Watch MTY se compromete a mantener la pieza bajo estrictas condiciones de seguridad y responder por ella en caso de siniestro."
    },
    avaluo: {
        titulo: "Oferta de Compra / Avalúo",
        alerta: "* Oferta de compra sujeta a inspección física del mecanismo *",
        observaciones: "Esta oferta tiene una vigencia máxima de 3 días hábiles a partir de la fecha de emisión.",
        legal: "La presente valuación es una propuesta económica de compra. Para concretar la transacción, la pieza deberá ser abierta y validada físicamente por el maestro relojero de Royal Watch MTY para confirmar el estado de conservación e integridad de la maquinaria interna."
    },
    recibo: {
        titulo: "Comprobante de Liquidación y Entrega",
        alerta: "* Comprobante de liquidación de saldo y entrega física del reloj *",
        observaciones: "Garantía local limitada de 12 meses en el funcionamiento de la maquinaria. Pieza entregada a entera satisfacción.",
        legal: "Se hace constar la entrega física a entera satisfacción del cliente de la pieza descrita, habiéndose liquidado el saldo total correspondiente. Este documento sirve como comprobante de propiedad y recepción del artículo."
    },
    certificado: {
        titulo: "Certificado de Autenticidad",
        alerta: "* Certificación Oficial Royal Watch MTY *",
        observaciones: "Esta certificación de autenticidad se basa en un análisis estético e interno detallado.",
        legal: "Royal Watch MTY certifica solemnemente que el reloj detallado en este documento ha sido inspeccionado minuciosamente por nuestros expertos relojeros, concluyendo que todos sus componentes (caja, bisel, esfera, manecillas, cristal y movimiento) son originales y legítimos de la manufactura correspondiente."
    }
};

// Initialize Icons
function initIcons() {
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

// Dom Loaded
document.addEventListener("DOMContentLoaded", () => {
    loadInitialData();
    setupNavigation();
    setupClients();
    setupProducts();
    setupQuotationForm();
    setupVendorsModal();

    // Check for draft
    const draftStr = localStorage.getItem("rw_quote_draft");
    let restored = false;
    if (draftStr) {
        restored = restoreDraftQuote();
    }
    if (!restored) {
        resetQuotationForm();
    }

    // Sync sidebar vendor badge
    if (vendors.length > 0) {
        document.getElementById("badge-vendedor").textContent = vendors[0].nombre;
    }

    // CRM modal events
    const btnCloseCrm = document.getElementById("btn-close-crm");
    const btnSaveCrmNotes = document.getElementById("btn-save-crm-notes");

    if (btnCloseCrm) btnCloseCrm.addEventListener("click", closeCRM);
    if (btnSaveCrmNotes) btnSaveCrmNotes.addEventListener("click", guardarNotasCRM);

    renderProductsTable();
    renderClientsTable();
    renderClientsDropdown();
    renderHistoryTable();
    renderCommandCenter();
    initIcons();
});

// Load data
function loadInitialData() {
    // Custom products and deleted list
    const customProds = JSON.parse(localStorage.getItem("rw_custom_products") || "[]");
    const deletedRefs = JSON.parse(localStorage.getItem("rw_deleted_products") || "[]");
    const deletedSet = new Set(deletedRefs.filter(Boolean));

    // Base catalog from watches_catalog.js
    let baseCatalog = [];
    if (typeof WATCHES_PRODUCTS !== 'undefined' && WATCHES_PRODUCTS.length > 0) {
        baseCatalog = WATCHES_PRODUCTS;
    }

    products = baseCatalog.filter(p => !p.referencia || !deletedSet.has(p.referencia));
    products = [...products, ...customProds];

    // Clients
    const storedClients = localStorage.getItem("rw_clients");
    if (storedClients) {
        clients = JSON.parse(storedClients);
    } else {
        clients = [...DEFAULT_CLIENTS];
        localStorage.setItem("rw_clients", JSON.stringify(clients));
    }

    // Vendors
    const storedVendors = localStorage.getItem("rw_vendors");
    if (storedVendors) {
        vendors = JSON.parse(storedVendors);
        // Force update old mock profiles or old bank accounts to Alejandro Luna
        let hasOld = false;
        vendors = vendors.map(v => {
            if (v.nombre === "Royal Watch MTY Staff" || v.nombre === "Royal Watch Staff" || v.tel === "81 1234 5678" || (v.nombre === "Alejandro Luna" && v.banco.includes("BBVA"))) {
                hasOld = true;
                return {
                    nombre: "Alejandro Luna",
                    tel: "81 2198 0008",
                    email: "a.luna@royalwatchmty.com",
                    banco: "Banco Nu México\nBeneficiario: Alejandro Luna\nCLABE: 638180010141018767",
                    notifPago: "pagos@royalwatchmty.com"
                };
            }
            return v;
        });
        if (hasOld) {
            localStorage.setItem("rw_vendors", JSON.stringify(vendors));
        }
    } else {
        vendors = [...DEFAULT_VENDORS];
        localStorage.setItem("rw_vendors", JSON.stringify(vendors));
    }

    // Apply status overrides to base catalog & custom products
    const statusOverrides = JSON.parse(localStorage.getItem("rw_product_statuses") || "{}");
    products.forEach(p => {
        const key = p.referencia || `${p.marca}_${p.modelo}`;
        if (statusOverrides[key]) {
            p.status = statusOverrides[key];
        } else {
            p.status = p.status || "Disponible";
        }
    });

    // Quotes History
    const storedQuotes = localStorage.getItem("rw_quotes");
    quotes = storedQuotes ? JSON.parse(storedQuotes) : [];
}

// -------------------------------------------------------------
// NAVIGATION
// -------------------------------------------------------------
function setupNavigation() {
    const navButtons = document.querySelectorAll(".nav-btn");
    const sections = document.querySelectorAll(".content-section");

    navButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetId = btn.getAttribute("data-target");

            navButtons.forEach(b => b.classList.remove("active"));
            sections.forEach(s => s.classList.remove("active"));

            btn.classList.add("active");
            document.getElementById(targetId).classList.add("active");

            document.querySelector(".main-content").scrollTop = 0;
            
            if (targetId === "section-dashboard") {
                renderCommandCenter();
            } else if (targetId === "section-historial") {
                renderHistoryTable();
            } else if (targetId === "section-productos") {
                renderProductsTable();
            } else if (targetId === "section-clientes") {
                renderClientsTable();
            }
        });
    });
}

// -------------------------------------------------------------
// CLIENTS
// -------------------------------------------------------------
function setupClients() {
    const formNuevoCliente = document.getElementById("form-nuevo-cliente");
    const searchClientes = document.getElementById("search-clientes");

    formNuevoCliente.addEventListener("submit", (e) => {
        e.preventDefault();
        const empresa = document.getElementById("cli-empresa").value.trim();
        const contacto = document.getElementById("cli-contacto").value.trim();
        const email = document.getElementById("cli-email").value.trim();
        const tel = document.getElementById("cli-tel").value.trim();

        if (contacto) {
            clients.push({ empresa: empresa || "Particular", contacto, email, tel });
            localStorage.setItem("rw_clients", JSON.stringify(clients));
            formNuevoCliente.reset();
            renderClientsTable();
            renderClientsDropdown();
            alert("¡Cliente guardado con éxito!");
        }
    });

    searchClientes.addEventListener("input", () => {
        renderClientsTable(searchClientes.value.trim());
    });
}

function renderClientsTable(filter = "") {
    const tbody = document.getElementById("table-clientes-body");
    const countSpan = document.getElementById("cli-count");
    tbody.innerHTML = "";

    const filtered = clients.filter(c => 
        (c.contacto || "").toLowerCase().includes(filter.toLowerCase()) || 
        (c.empresa || "").toLowerCase().includes(filter.toLowerCase())
    );

    countSpan.textContent = filtered.length;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">No se encontraron clientes.</td></tr>`;
        return;
    }

    filtered.forEach((c) => {
        const actualIdx = clients.indexOf(c);
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td style="font-weight: 600; color: var(--accent-gold);">${c.contacto}</td>
            <td>${c.empresa || 'Particular'}</td>
            <td>${c.email || '-'}</td>
            <td>${c.tel || '-'}</td>
            <td class="actions-cell" style="white-space: nowrap;">
                <button class="btn btn-secondary btn-small" onclick="abrirExpedienteCRM(${actualIdx})" title="Ver Expediente CRM" style="margin-right: 6px; padding: 4px 8px; font-size:10px;">
                    👤 Expediente
                </button>
                <button class="btn-icon btn-small text-danger" onclick="deleteClient(${actualIdx})" title="Eliminar Cliente" style="display:inline-flex; vertical-align: middle;">
                    <i data-lucide="trash-2" style="width: 14px; height: 14px; stroke: var(--accent-red)"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    initIcons();
}

function deleteClient(index) {
    if (confirm("¿Seguro que deseas eliminar este cliente?")) {
        clients.splice(index, 1);
        localStorage.setItem("rw_clients", JSON.stringify(clients));
        renderClientsTable();
        renderClientsDropdown();
    }
}

function renderClientsDropdown() {
    const select = document.getElementById("form-select-cliente");
    select.innerHTML = '<option value="">-- Seleccionar Cliente --</option>';
    
    clients.forEach((c, index) => {
        const option = document.createElement("option");
        option.value = index;
        option.textContent = `${c.contacto} (${c.empresa || 'Particular'})`;
        select.appendChild(option);
    });
}

// -------------------------------------------------------------
// PRODUCTS (WATCH CATALOG)
// -------------------------------------------------------------
function setupProducts() {
    const formNuevoProducto = document.getElementById("form-nuevo-producto");
    const searchProductos = document.getElementById("search-productos");
    const btnExportar = document.getElementById("btn-exportar-productos");
    const inputImportar = document.getElementById("input-importar-productos");
    const btnImportarTrigger = document.getElementById("btn-importar-productos-trigger");

    formNuevoProducto.addEventListener("submit", (e) => {
        e.preventDefault();
        const marca = document.getElementById("prod-marca").value.trim();
        const modelo = document.getElementById("prod-modelo").value.trim();
        const referencia = document.getElementById("prod-referencia").value.trim().toUpperCase();
        const medida = document.getElementById("prod-medida").value.trim();
        const material = document.getElementById("prod-material").value.trim();
        const caratula = document.getElementById("prod-caratula").value.trim();
        const precio = parseFloat(document.getElementById("prod-precio").value);
        const status = document.getElementById("prod-status").value;

        if (marca && modelo && !isNaN(precio)) {
            const newProd = { marca, modelo, referencia, medida, material, caratula, precio, status: status || "Disponible" };
            products.push(newProd);
            
            // Save custom list
            const customProducts = JSON.parse(localStorage.getItem("rw_custom_products") || "[]");
            customProducts.push(newProd);
            localStorage.setItem("rw_custom_products", JSON.stringify(customProducts));
            
            formNuevoProducto.reset();
            renderProductsTable();
            alert("¡Reloj guardado en catálogo!");
        }
    });

    searchProductos.addEventListener("input", () => {
        renderProductsTable(searchProductos.value.trim());
    });

    // Export JSON
    btnExportar.addEventListener("click", () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(products, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "catalogo_royal_watch_mty.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    });

    // Import JSON
    btnImportarTrigger.addEventListener("click", () => {
        inputImportar.click();
    });

    inputImportar.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                if (Array.isArray(imported)) {
                    const valid = imported.every(item => item.marca && item.modelo && typeof item.precio === 'number');
                    if (valid) {
                        if (confirm(`Se importarán ${imported.length} relojes. ¿Deseas sobreescribir tu catálogo actual?`)) {
                            products = imported;
                            localStorage.setItem("rw_custom_products", JSON.stringify(imported));
                            localStorage.removeItem("rw_deleted_products");
                        } else {
                            products = [...products, ...imported];
                            const customProducts = JSON.parse(localStorage.getItem("rw_custom_products") || "[]");
                            localStorage.setItem("rw_custom_products", JSON.stringify([...customProducts, ...imported]));
                        }
                        renderProductsTable();
                        alert("¡Catálogo importado correctamente!");
                    } else {
                        alert("Error: Formato incorrecto. Debe contener marca, modelo y precio.");
                    }
                }
            } catch (err) {
                alert("Error al leer el archivo JSON.");
            }
        };
        reader.readAsText(file);
    });

    // Brand filters
    document.querySelectorAll(".cat-tag-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            if (btn.classList.contains("active")) {
                btn.classList.remove("active");
                searchProductos.value = "";
            } else {
                document.querySelectorAll(".cat-tag-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                searchProductos.value = btn.getAttribute("data-filter");
            }
        });
    });

    // Image Preview Lightbox Events
    const modalImgPreview = document.getElementById("modal-image-preview");
    const btnCloseImgPreview = document.getElementById("btn-close-image-preview");
    if (btnCloseImgPreview && modalImgPreview) {
        btnCloseImgPreview.addEventListener("click", () => {
            modalImgPreview.classList.remove("active");
        });
        modalImgPreview.addEventListener("click", (e) => {
            if (e.target === modalImgPreview) {
                modalImgPreview.classList.remove("active");
            }
        });
    }
}

function renderProductsTable(filter = "") {
    const tbody = document.getElementById("table-productos-body");
    const countSpan = document.getElementById("prod-count");
    tbody.innerHTML = "";

    const filtered = products.filter(p => {
        const term = filter.toLowerCase();
        return (p.marca || "").toLowerCase().includes(term) ||
               (p.modelo || "").toLowerCase().includes(term) ||
               (p.referencia || "").toLowerCase().includes(term);
    });

    countSpan.textContent = filtered.length;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 20px;">No se encontraron piezas en el catálogo.</td></tr>`;
        return;
    }

    filtered.forEach((p) => {
        const actualIdx = products.indexOf(p);
        const currentStatus = p.status || "Disponible";
        let statusClass = "status-disponible";
        if (currentStatus === "Apartado") statusClass = "status-apartado";
        if (currentStatus === "Consignado") statusClass = "status-consignado";
        if (currentStatus === "Vendido") statusClass = "status-vendido";

        const imgPath = p.imagen || "royalwatch logo hd sin fondo.png";
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>
                <img src="${imgPath}" class="table-prod-img" style="width: 48px; height: 48px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-color); cursor: pointer;" onclick="verImagenCatalogo('${imgPath}', '${p.marca.replace(/'/g, "\\'")}', '${p.modelo.replace(/'/g, "\\'")}', '${(p.referencia || '').replace(/'/g, "\\'")}')" title="Ver imagen en tamaño completo">
            </td>
            <td style="font-weight: 700; color: var(--accent-gold);">${p.marca}</td>
            <td><strong>${p.modelo}</strong><br><span style="font-family: monospace; font-size: 11px; color: var(--text-muted);">${p.referencia || 'S/R'}</span></td>
            <td>${p.medida || '-'} / ${p.material || '-'}</td>
            <td style="font-weight: 600;">$ ${p.precio.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</td>
            <td>
                <select class="prod-status-select ${statusClass}" onchange="changeProductStatus(${actualIdx}, this.value)">
                    <option value="Disponible" ${currentStatus === "Disponible" ? "selected" : ""}>Disponible</option>
                    <option value="Apartado" ${currentStatus === "Apartado" ? "selected" : ""}>Apartado</option>
                    <option value="Consignado" ${currentStatus === "Consignado" ? "selected" : ""}>Consignado</option>
                    <option value="Vendido" ${currentStatus === "Vendido" ? "selected" : ""}>Vendido</option>
                </select>
            </td>
            <td class="actions-cell">
                <button class="btn-icon btn-small" onclick="deleteProduct(${actualIdx})" title="Eliminar Producto">
                    <i data-lucide="trash-2" style="width: 16px; height: 16px; stroke: var(--accent-red)"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    initIcons();
}

function deleteProduct(index) {
    if (confirm("¿Deseas eliminar este reloj del catálogo?")) {
        const prodToDelete = products[index];
        products.splice(index, 1);

        const customProducts = JSON.parse(localStorage.getItem("rw_custom_products") || "[]");
        const customIndex = customProducts.findIndex(p => p.referencia === prodToDelete.referencia && p.modelo === prodToDelete.modelo);
        if (customIndex > -1) {
            customProducts.splice(customIndex, 1);
            localStorage.setItem("rw_custom_products", JSON.stringify(customProducts));
        } else if (prodToDelete.referencia) {
            const deletedRefs = JSON.parse(localStorage.getItem("rw_deleted_products") || "[]");
            if (!deletedRefs.includes(prodToDelete.referencia)) {
                deletedRefs.push(prodToDelete.referencia);
                localStorage.setItem("rw_deleted_products", JSON.stringify(deletedRefs));
            }
        }
        renderProductsTable();
    }
}

// -------------------------------------------------------------
// QUOTATION & FORM LOGIC
// -------------------------------------------------------------
function setupQuotationForm() {
    const selectCliente = document.getElementById("form-select-cliente");
    const btnAgregarPartida = document.getElementById("btn-agregar-partida");
    const btnNuevaCotizacion = document.getElementById("btn-nueva-cotizacion");
    const btnGuardarCotizacion = document.getElementById("btn-guardar-cotizacion");
    const btnImprimirPDF = document.getElementById("btn-imprimir-pdf");
    const btnCompartirWA = document.getElementById("btn-compartir-wa");
    const tipoDocSelect = document.getElementById("form-tipo-doc");
    const monedaSelect = document.getElementById("form-moneda");
    const inputTC = document.getElementById("form-tc");
    const btnQuickCliente = document.getElementById("btn-nuevo-cliente-rapido");

    if (btnCompartirWA) {
        btnCompartirWA.addEventListener("click", () => {
            compartirCotizacionPorWA();
        });
    }

    // Currency toggle / TC box visibility
    monedaSelect.addEventListener("change", () => {
        const boxTC = document.getElementById("tc-box-container");
        const isMXN = (monedaSelect.value === "MXN");
        
        if (isMXN) {
            boxTC.style.display = "block";
        } else {
            boxTC.style.display = "none";
        }

        // Update existing rows
        const rows = document.querySelectorAll("#form-partidas-list .partida-row");
        rows.forEach(row => {
            const chkLabel = row.querySelector(".chk-row-usd-label");
            const priceLabel = row.querySelector(".lbl-precio-unitario");
            
            if (chkLabel && priceLabel) {
                if (isMXN) {
                    chkLabel.style.display = "block";
                    priceLabel.textContent = "Precio Unitario";
                } else {
                    chkLabel.style.display = "none";
                    const chk = row.querySelector(".chk-row-usd");
                    if (chk) chk.checked = true; // force USD if document is USD
                    priceLabel.textContent = "Precio Unitario (USD)";
                }
            }
        });

        recalcularTotales();
        saveDraftQuote();
    });

    inputTC.addEventListener("input", () => {
        recalcularTotales();
        saveDraftQuote();
    });

    // Document Type logic
    tipoDocSelect.addEventListener("change", () => {
        applyDocumentTemplate(tipoDocSelect.value);
        saveDraftQuote();
    });

    // Fast quick client creation
    btnQuickCliente.addEventListener("click", () => {
        const nom = prompt("Nombre completo del Cliente:");
        if (!nom) return;
        const emp = prompt("Empresa / Procedencia (opcional):") || "Particular";
        const email = prompt("Email (opcional):") || "";
        const tel = prompt("Teléfono (opcional):") || "";
        
        const cObj = { empresa: emp, contacto: nom, email, tel };
        clients.push(cObj);
        localStorage.setItem("rw_clients", JSON.stringify(clients));
        renderClientsDropdown();
        renderClientsTable();
        // Auto select last
        selectCliente.value = clients.length - 1;
        selectCliente.dispatchEvent(new Event("change"));
    });

    // Populate profile default
    selectCliente.addEventListener("change", () => {
        const clientIndex = selectCliente.value;
        if (clientIndex !== "") {
            const client = clients[clientIndex];
            document.getElementById("form-empresa").value = client.empresa || "Particular";
            document.getElementById("form-contacto").value = client.contacto || "";
            document.getElementById("form-email-cliente").value = client.email || "";
            document.getElementById("form-tel-cliente").value = client.tel || "";
        } else {
            document.getElementById("form-empresa").value = "";
            document.getElementById("form-contacto").value = "";
            document.getElementById("form-email-cliente").value = "";
            document.getElementById("form-tel-cliente").value = "";
        }
        updateFolioAutomatically();
    });

    // Sync input fields with labels
    const inputsToSync = [
        "form-folio", "form-fecha", "form-empresa", "form-contacto", "form-email-cliente", "form-tel-cliente",
        "form-vendedor", "form-email-vendedor", "form-tel-vendedor", "form-banco", "form-notif-pago",
        "form-pago", "form-vigencia", "form-entrega", "form-observaciones"
    ];

    inputsToSync.forEach(id => {
        const el = document.getElementById(id);
        el.addEventListener("input", () => {
            syncInputsToPreview();
            saveDraftQuote();
        });
    });

    document.getElementById("form-contacto").addEventListener("input", () => {
        updateFolioAutomatically();
    });

    document.getElementById("form-fecha").addEventListener("change", () => {
        updateFolioAutomatically();
    });

    document.getElementById("form-pago-anticipo").addEventListener("input", (e) => {
        const val = parseFloat(e.target.value) || 0;
        const chkSello = document.getElementById("form-chk-sello-anticipo");
        if (chkSello) {
            chkSello.checked = (val > 0);
        }
        recalcularTotales();
        saveDraftQuote();
    });

    const chkSello = document.getElementById("form-chk-sello-anticipo");
    if (chkSello) {
        chkSello.addEventListener("change", () => {
            recalcularTotales();
            saveDraftQuote();
        });
    }

    document.getElementById("form-descuento-global").addEventListener("input", () => {
        recalcularTotales();
        saveDraftQuote();
    });

    btnAgregarPartida.addEventListener("click", () => {
        agregarPartidaFila();
        saveDraftQuote();
    });

    btnNuevaCotizacion.addEventListener("click", () => {
        if (confirm("¿Deseas vaciar el formulario actual para crear una nueva cotización?")) {
            resetQuotationForm();
            localStorage.removeItem("rw_quote_draft");
        }
    });

    btnGuardarCotizacion.addEventListener("click", () => {
        guardarBorradorHistorial();
    });

    btnImprimirPDF.addEventListener("click", () => {
        const folioVal = document.getElementById("form-folio").value || "RWM-DOCUMENTO";
        const tipoDoc = document.getElementById("form-tipo-doc").value;
        const contacto = document.getElementById("form-contacto").value || "Cliente";
        
        let docLabel = "Cotización";
        if (tipoDoc === "consignacion") docLabel = "Contrato de Consignación";
        if (tipoDoc === "avaluo") docLabel = "Oferta de Compra - Avalúo";
        if (tipoDoc === "recibo") docLabel = "Comprobante de Liquidación y Entrega";
        if (tipoDoc === "anticipo_pedido") docLabel = "Comprobante de Anticipo y Solicitud de Pedido";
        if (tipoDoc === "certificado") docLabel = "Certificado de Autenticidad";
        
        // Format as: "Folio - Formato - Cliente" (removing any potential invalid filename characters)
        const printTitle = `${folioVal} - ${docLabel} - ${contacto}`.replace(/[\/\\:*?"<>|]/g, "-");
        
        const oldTitle = document.title;
        document.title = printTitle;
        window.print();
        setTimeout(() => {
            document.title = oldTitle;
        }, 1000);
    });
}

function applyDocumentTemplate(type) {
    const template = DOCUMENT_TEMPLATES[type] || DOCUMENT_TEMPLATES.cotizacion;
    const titleEl = document.getElementById("lbl-quote-title");
    titleEl.textContent = template.titulo;
    
    // Scale down long titles dynamically to prevent overlapping with the logo
    if (template.titulo.length > 25) {
        titleEl.style.fontSize = "14px";
        titleEl.style.letterSpacing = "1.5px";
    } else if (template.titulo.length > 15) {
        titleEl.style.fontSize = "17px";
        titleEl.style.letterSpacing = "2px";
    } else {
        titleEl.style.fontSize = "";
        titleEl.style.letterSpacing = "";
    }

    document.getElementById("lbl-alerta").textContent = template.alerta;
    document.getElementById("form-observaciones").value = template.observaciones;
    document.getElementById("lbl-observaciones").textContent = template.observaciones;
    
    // Set legal text
    const legalBox = document.getElementById("lbl-legal-text");
    const signatures = document.getElementById("sheet-signatures-block");
    if (template.legal) {
        legalBox.innerHTML = `<div class="legal-title">TÉRMINOS Y CONDICIONES LEGALES</div><div>${template.legal}</div>`;
        legalBox.style.display = "block";
    } else {
        legalBox.style.display = "none";
    }
    
    // Always display signature block for cursive and client acceptance signatures
    if (signatures) {
        signatures.style.display = "flex";
    }

    // Toggle price visibility for Certificates of Authenticity
    const printSheet = document.getElementById("print-sheet");
    if (type === "certificado") {
        printSheet.classList.add("hide-prices");
    } else {
        printSheet.classList.remove("hide-prices");
    }

    // Sync title of signatures
    if (type === "consignacion") {
        document.getElementById("sig-vendedor-label").textContent = "Recibe (Royal Watch MTY)";
        document.getElementById("sig-cliente-label").textContent = "Firma del Propietario / Cliente";
    } else if (type === "avaluo") {
        document.getElementById("sig-vendedor-label").textContent = "Valuador (Royal Watch MTY)";
        document.getElementById("sig-cliente-label").textContent = "Firma del Interesado / Cliente";
    } else if (type === "certificado") {
        document.getElementById("sig-vendedor-label").textContent = "Certificador Autorizado";
        document.getElementById("sig-cliente-label").textContent = "Testigo de Verificación";
    } else if (type === "anticipo_pedido") {
        document.getElementById("sig-vendedor-label").textContent = "Recibe Anticipo / Asesor";
        document.getElementById("sig-cliente-label").textContent = "Firma del Solicitante / Cliente";
    } else if (type === "recibo") {
        document.getElementById("sig-vendedor-label").textContent = "Entrega / Asesor";
        document.getElementById("sig-cliente-label").textContent = "Firma del Cliente (Recibido de Conformidad)";
    } else {
        document.getElementById("sig-vendedor-label").textContent = "Asesor de Ventas";
        document.getElementById("sig-cliente-label").textContent = "Firma del Cliente (Aceptación)";
    }
}

function syncInputsToPreview() {
    document.getElementById("lbl-folio").textContent = document.getElementById("form-folio").value || "--";
    document.getElementById("lbl-fecha").textContent = document.getElementById("form-fecha").value || "--";
    document.getElementById("lbl-empresa").textContent = document.getElementById("form-empresa").value || "--";
    document.getElementById("lbl-contacto").textContent = document.getElementById("form-contacto").value || "--";
    document.getElementById("lbl-email-cliente").textContent = document.getElementById("form-email-cliente").value || "--";
    document.getElementById("lbl-tel-cliente").textContent = document.getElementById("form-tel-cliente").value || "--";
    
    const vendedorVal = document.getElementById("form-vendedor").value || "--";
    document.getElementById("lbl-vendedor").textContent = vendedorVal;
    
    const cursiveSigText = document.getElementById("cursive-sig-text");
    if (cursiveSigText) {
        cursiveSigText.textContent = vendedorVal;
    }
    
    document.getElementById("lbl-email-vendedor").textContent = document.getElementById("form-email-vendedor").value || "--";
    document.getElementById("lbl-tel-vendedor").textContent = document.getElementById("form-tel-vendedor").value || "--";
    document.getElementById("lbl-pago").textContent = document.getElementById("form-pago").value || "--";
    document.getElementById("lbl-vigencia").textContent = document.getElementById("form-vigencia").value || "--";
    document.getElementById("lbl-entrega").textContent = document.getElementById("form-entrega").value || "--";
    document.getElementById("lbl-banco").innerHTML = document.getElementById("form-banco").value.replace(/\n/g, "<br>");
    document.getElementById("lbl-notif-pago").textContent = document.getElementById("form-notif-pago").value || "--";
    document.getElementById("lbl-observaciones").textContent = document.getElementById("form-observaciones").value || "--";
}

function getSanitizedClientName(name) {
    if (!name) return "CLIENTE";
    let clean = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    clean = clean.replace(/[^A-Z0-9\s]/g, "");
    clean = clean.trim().replace(/\s+/g, "-");
    if (clean.length > 18) {
        clean = clean.substring(0, 18);
        if (clean.endsWith("-")) {
            clean = clean.substring(0, clean.length - 1);
        }
    }
    return clean || "CLIENTE";
}

function generateAutoFolio() {
    const dateVal = document.getElementById("form-fecha").value;
    let today = new Date();
    if (dateVal) {
        const parts = dateVal.split("-");
        if (parts.length === 3) {
            today = new Date(parts[0], parts[1] - 1, parts[2]);
        }
    }
    const d = String(today.getDate()).padStart(2, '0');
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const y = today.getFullYear();
    
    const clientInput = document.getElementById("form-contacto");
    const clientVal = clientInput ? clientInput.value.trim() : "";
    
    if (clientVal) {
        const clientClean = getSanitizedClientName(clientVal);
        return `RWM-${d}${m}${y}-${clientClean}`;
    } else {
        const num = Math.floor(Math.random() * 90) + 10;
        return `RWM-${d}${m}${y}-${num}`;
    }
}

function updateFolioAutomatically() {
    const folioInput = document.getElementById("form-folio");
    if (folioInput) {
        folioInput.value = generateAutoFolio();
        syncInputsToPreview();
        saveDraftQuote();
    }
}

function resetQuotationForm() {
    document.getElementById("form-folio").value = generateAutoFolio();
    document.getElementById("form-fecha").value = new Date().toISOString().substring(0, 10);
    document.getElementById("form-tipo-doc").value = "cotizacion";
    document.getElementById("form-moneda").value = "USD";
    document.getElementById("tc-box-container").style.display = "none";
    document.getElementById("form-tc").value = "17.80";
    document.getElementById("form-select-cliente").value = "";
    document.getElementById("form-empresa").value = "";
    document.getElementById("form-contacto").value = "";
    document.getElementById("form-email-cliente").value = "";
    document.getElementById("form-tel-cliente").value = "";
    document.getElementById("form-descuento-global").value = "0";
    document.getElementById("form-pago-anticipo").value = "0.00";
    document.getElementById("form-entrega").value = "Inmediata";
    document.getElementById("form-nota-interna").value = "";
    
    const chkSello = document.getElementById("form-chk-sello-anticipo");
    if (chkSello) {
        chkSello.checked = false;
    }
    const stamp = document.getElementById("sheet-paid-stamp");
    if (stamp) {
        stamp.style.display = "none";
    }

    // Vendor defaults
    if (vendors.length > 0) {
        const v = vendors[0];
        document.getElementById("form-vendedor").value = v.nombre;
        document.getElementById("form-email-vendedor").value = v.email;
        document.getElementById("form-tel-vendedor").value = v.tel;
        document.getElementById("form-banco").value = v.banco;
        document.getElementById("form-notif-pago").value = v.notifPago;
    }

    // Reset items
    document.getElementById("form-partidas-list").innerHTML = "";
    currentPartidaCount = 0;
    agregarPartidaFila(); // start with 1 row

    applyDocumentTemplate("cotizacion");
    syncInputsToPreview();
    recalcularTotales();
}

// -------------------------------------------------------------
// DYNAMIC ROWS & CALCULATIONS
// -------------------------------------------------------------
function agregarPartidaFila(data = null) {
    currentPartidaCount++;
    const container = document.getElementById("form-partidas-list");
    const rowId = `partida-${Date.now()}-${currentPartidaCount}`;

    const globalMoneda = document.getElementById("form-moneda")?.value || "USD";
    const showUSDLabel = (globalMoneda === "MXN") ? "block" : "none";
    const labelText = (globalMoneda === "MXN") ? "Precio Unitario" : "Precio Unitario (USD)";

    const tr = document.createElement("div");
    tr.className = "partida-row";
    tr.id = rowId;
    tr.innerHTML = `
        <div class="partida-header-row">
            <div class="partida-title-badge">
                <span class="partida-num">${currentPartidaCount}</span>
                <span style="font-weight: 600; font-size: 12px; color: var(--text-secondary);">Detalles de la Pieza</span>
            </div>
            <div class="partida-actions">
                <button type="button" class="btn-sort" onclick="moverFila('${rowId}', -1)" title="Subir"><i data-lucide="chevron-up" style="width: 14px; height: 14px;"></i></button>
                <button type="button" class="btn-sort" onclick="moverFila('${rowId}', 1)" title="Bajar"><i data-lucide="chevron-down" style="width: 14px; height: 14px;"></i></button>
                <button type="button" class="btn-danger-link btn-small" onclick="eliminarFila('${rowId}')"><i data-lucide="trash-2" style="width: 14px; height: 14px;"></i> Eliminar</button>
            </div>
        </div>

        <div class="partida-inputs-grid">
            <div class="form-group" style="position: relative;">
                <label>Buscador Marca/Modelo</label>
                <input type="text" class="partida-search" placeholder="Escribe para buscar..." autocomplete="off">
            </div>
            <div class="form-group">
                <label>Descripción Completa</label>
                <input type="text" class="partida-desc" placeholder="Rolex Submariner con bisel cerámico..." required>
            </div>
            <div class="form-group">
                <label class="lbl-precio-unitario">${labelText}</label>
                <div class="input-currency">
                    <span>$</span>
                    <input type="number" class="partida-precio" step="0.01" value="0.00">
                </div>
                <label class="chk-row-usd-label" style="display: ${showUSDLabel}; font-size: 10px; margin-top: 4px; text-transform: none; cursor: pointer; color: var(--text-secondary);">
                    <input type="checkbox" class="chk-row-usd" checked> Precio en USD (Convertir)
                </label>
            </div>
        </div>

        <div class="partida-specs-grid">
            <div class="form-group">
                <label style="color: var(--accent-gold);">Referencia</label>
                <input type="text" class="partida-ref" placeholder="Ej: 126610LN">
            </div>
            <div class="form-group">
                <label style="color: var(--accent-gold);">Condición</label>
                <select class="partida-estado">
                    <option value="Nuevo (Set Completo)">Nuevo (Set Completo)</option>
                    <option value="Excelente / Mint">Excelente / Mint</option>
                    <option value="Muy Bueno">Muy Bueno</option>
                    <option value="Usado / Vintage">Usado / Vintage</option>
                </select>
            </div>
            <div class="form-group">
                <label style="color: var(--accent-gold);">Cantidad</label>
                <input type="number" class="partida-cant" value="1" min="1">
            </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
            <div class="form-group" style="margin-bottom: 0;">
                <label>Accesorios Incluidos</label>
                <div class="accessory-checkboxes">
                    <label class="accessory-label"><input type="checkbox" class="chk-box" checked> Caja</label>
                    <label class="accessory-label"><input type="checkbox" class="chk-papeles" checked> Papeles / Tarjeta</label>
                    <label class="accessory-label"><input type="checkbox" class="chk-manual"> Manual</label>
                    <label class="accessory-label"><input type="checkbox" class="chk-factura"> Factura</label>
                </div>
            </div>
        </div>
    `;

    container.appendChild(tr);
    initIcons();

    // Attach listeners
    const inputSearch = tr.querySelector(".partida-search");
    const inputDesc = tr.querySelector(".partida-desc");
    const inputPrecio = tr.querySelector(".partida-precio");
    const inputCant = tr.querySelector(".partida-cant");
    const inputRef = tr.querySelector(".partida-ref");
    const selectEstado = tr.querySelector(".partida-estado");
    const chkRowUsd = tr.querySelector(".chk-row-usd");

    const checkboxes = tr.querySelectorAll(".chk-box, .chk-papeles, .chk-manual, .chk-factura");

    const changeTrigger = () => {
        recalcularTotales();
        saveDraftQuote();
    };

    inputDesc.addEventListener("input", changeTrigger);
    inputPrecio.addEventListener("input", changeTrigger);
    inputCant.addEventListener("input", changeTrigger);
    inputRef.addEventListener("input", changeTrigger);
    selectEstado.addEventListener("change", changeTrigger);
    checkboxes.forEach(c => c.addEventListener("change", changeTrigger));
    chkRowUsd.addEventListener("change", changeTrigger);



    // Auto-complete search logic
    inputSearch.addEventListener("focus", () => {
        showAutocompletePanel(inputSearch, (selectedItem) => {
            inputSearch.value = `${selectedItem.marca} ${selectedItem.modelo}`;
            inputDesc.value = `${selectedItem.marca} ${selectedItem.modelo} (${selectedItem.medida} / ${selectedItem.material} / Esfera ${selectedItem.caratula})`;
            inputPrecio.value = selectedItem.precio;
            inputRef.value = selectedItem.referencia || "";
            changeTrigger();
        });
    });

    // If preloaded data exists
    if (data) {
        inputDesc.value = data.descripcion || "";
        inputPrecio.value = data.precio || 0;
        inputCant.value = data.cantidad || 1;
        inputRef.value = data.referencia || "";
        selectEstado.value = data.estado || "Nuevo (Set Completo)";
        
        tr.querySelector(".chk-box").checked = !!data.incluyeCaja;
        tr.querySelector(".chk-papeles").checked = !!data.incluyePapeles;
        tr.querySelector(".chk-manual").checked = !!data.incluyeManual;
        tr.querySelector(".chk-factura").checked = !!data.incluyeFactura;
        
        if (data.isPrecioUsd !== undefined) {
            tr.querySelector(".chk-row-usd").checked = !!data.isPrecioUsd;
        }
    }

    reordernarNumerosPartida();
    recalcularTotales();
}

function showAutocompletePanel(inputEl, onSelect) {
    // Remove existing
    let oldPanel = document.querySelector(".autocomplete-suggestions");
    if (oldPanel) oldPanel.remove();

    const panel = document.createElement("div");
    panel.className = "autocomplete-suggestions";
    panel.innerHTML = `
        <div class="autocomplete-header">
            <input type="text" class="inner-search-input" placeholder="Escribe marca, modelo o referencia...">
        </div>
        <div class="autocomplete-results">
            <!-- results -->
        </div>
    `;

    inputEl.parentNode.appendChild(panel);
    const innerSearch = panel.querySelector(".inner-search-input");
    const resultsContainer = panel.querySelector(".autocomplete-results");

    const renderResults = (query = "") => {
        resultsContainer.innerHTML = "";
        const q = query.toLowerCase().trim();
        
        const matches = products.filter(p => {
            if (!q) return true;
            return (p.marca || "").toLowerCase().includes(q) || 
                   (p.modelo || "").toLowerCase().includes(q) || 
                   (p.referencia || "").toLowerCase().includes(q);
        }).slice(0, 10);

        if (matches.length === 0) {
            resultsContainer.innerHTML = `<div style="padding: 10px; font-size:12px; color: var(--text-muted); text-align:center;">No se encontraron piezas.</div>`;
            return;
        }

        matches.forEach(item => {
            const row = document.createElement("div");
            row.className = "suggestion-item";
            row.style.display = "flex";
            row.style.justifyContent = "space-between";
            row.style.alignItems = "center";
            row.style.gap = "12px";
            row.style.padding = "8px 12px";
            
            const imgPath = item.imagen || "royalwatch logo hd sin fondo.png";
            row.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; flex-grow: 1;">
                    <img src="${imgPath}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-color); flex-shrink: 0;">
                    <div>
                        <span class="suggestion-brand">${item.marca}</span>
                        <strong>${item.modelo}</strong>
                        ${item.referencia ? `<br><span class="suggestion-ref" style="font-family: monospace; font-size: 10px; color: var(--text-muted);">${item.referencia}</span>` : ""}
                    </div>
                </div>
                <div class="suggestion-price" style="font-weight: bold; color: var(--accent-gold); white-space: nowrap;">$${item.precio.toLocaleString()} USD</div>
            `;
            row.addEventListener("click", () => {
                onSelect(item);
                panel.remove();
            });
            resultsContainer.appendChild(row);
        });
    };

    innerSearch.focus();
    renderResults();

    innerSearch.addEventListener("input", (e) => {
        renderResults(e.target.value);
    });

    // Close panel click outside
    const outsideClick = (e) => {
        if (!panel.contains(e.target) && e.target !== inputEl) {
            panel.remove();
            document.removeEventListener("mousedown", outsideClick);
        }
    };
    document.addEventListener("mousedown", outsideClick);
}

function reordernarNumerosPartida() {
    const rows = document.querySelectorAll("#form-partidas-list .partida-row");
    rows.forEach((row, index) => {
        row.querySelector(".partida-num").textContent = index + 1;
    });
}

function eliminarFila(rowId) {
    const row = document.getElementById(rowId);
    if (row) {
        row.remove();
        reordernarNumerosPartida();
        recalcularTotales();
        saveDraftQuote();
    }
}

function moverFila(rowId, direction) {
    const container = document.getElementById("form-partidas-list");
    const rows = Array.from(container.children);
    const index = rows.findIndex(r => r.id === rowId);
    if (index === -1) return;

    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= rows.length) return;

    const targetRow = rows[index];
    const referenceRow = rows[newIndex];

    if (direction === -1) {
        container.insertBefore(targetRow, referenceRow);
    } else {
        container.insertBefore(targetRow, referenceRow.nextSibling);
    }
    reordernarNumerosPartida();
    recalcularTotales();
    saveDraftQuote();
}

function recalcularTotales() {
    const rows = document.querySelectorAll("#form-partidas-list .partida-row");
    const tbody = document.getElementById("sheet-items-body");
    tbody.innerHTML = "";

    const moneda = document.getElementById("form-moneda").value;
    const tc = parseFloat(document.getElementById("form-tc").value) || 17.80;
    const descGlobal = parseFloat(document.getElementById("form-descuento-global").value) || 0;

    let subtotalDoc = 0;

    rows.forEach((row, index) => {
        const desc = row.querySelector(".partida-desc").value || "--";
        const precio = parseFloat(row.querySelector(".partida-precio").value) || 0;
        const cant = parseInt(row.querySelector(".partida-cant").value) || 1;
        const ref = row.querySelector(".partida-ref").value || "";
        const est = row.querySelector(".partida-estado").value;
        const chkRowUsd = row.querySelector(".chk-row-usd");
        const isRowUsd = chkRowUsd ? chkRowUsd.checked : true;

        const caja = row.querySelector(".chk-box").checked;
        const papeles = row.querySelector(".chk-papeles").checked;
        const manual = row.querySelector(".chk-manual").checked;
        const factura = row.querySelector(".chk-factura").checked;

        // Price calculations for sheet
        let unitPriceSheet = precio;
        let totalValSheet = precio * cant;

        if (moneda === "MXN") {
            if (isRowUsd) {
                unitPriceSheet = precio * tc;
            } else {
                unitPriceSheet = precio;
            }
            totalValSheet = unitPriceSheet * cant;
        }

        subtotalDoc += totalValSheet;

        // Find matched product to get its image
        let imageHTML = "";
        const refUpper = (ref || "").trim().toUpperCase();
        const descLower = (desc || "").toLowerCase();
        
        const matched = products.find(p => {
            const pRef = (p.referencia || "").trim().toUpperCase();
            if (refUpper && pRef === refUpper) {
                return true;
            }
            const pMarca = (p.marca || "").toLowerCase();
            const pModel = (p.modelo || "").toLowerCase();
            return pMarca && pModel && descLower.includes(pMarca) && descLower.includes(pModel);
        });
        
        if (matched && matched.imagen) {
            imageHTML = `<img src="${matched.imagen}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid var(--paper-border); margin-right: 12px; flex-shrink: 0;">`;
        }

        // Render sheet table row
        const sheetTr = document.createElement("tr");

        // Accessories badges HTML
        const accHTML = `
            <div class="sheet-watch-accessories">
                <span class="accessory-badge ${caja ? 'active' : ''}">Caja</span>
                <span class="accessory-badge ${papeles ? 'active' : ''}">Garantía / Tarjeta</span>
                <span class="accessory-badge ${manual ? 'active' : ''}">Manual</span>
                <span class="accessory-badge ${factura ? 'active' : ''}">Factura</span>
            </div>
        `;

        sheetTr.innerHTML = `
            <td style="text-align: center; font-weight: bold; border-right: 1px solid var(--paper-border);">${index + 1}</td>
            <td style="text-align: center; border-right: 1px solid var(--paper-border);">${cant}</td>
            <td style="border-right: 1px solid var(--paper-border);">
                <div style="display: flex; align-items: center;">
                    ${imageHTML}
                    <div class="sheet-watch-details" style="flex-grow: 1;">
                        <div class="sheet-watch-title">${desc}</div>
                        <div class="sheet-watch-meta">
                            Ref: <strong>${ref || 'S/R'}</strong> | Estado: <strong>${est}</strong>
                        </div>
                        ${accHTML}
                    </div>
                </div>
            </td>
            <td style="text-align: right; border-right: 1px solid var(--paper-border); font-family: monospace;">$${unitPriceSheet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="text-align: right; font-family: monospace; font-weight: bold;">$${totalValSheet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        `;
        tbody.appendChild(sheetTr);
    });

    // Set empty message if no rows
    if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--paper-text-muted); padding: 30px;">Agregue piezas en el formulario para comenzar.</td></tr>`;
    }

    // Calculations of Totals
    let currencyLabel = (moneda === "MXN") ? "Mxn$" : "Usd$";

    let subtotalFinal = subtotalDoc;
    let descuentoFinal = subtotalFinal * (descGlobal / 100);
    let totalFinal = subtotalFinal - descuentoFinal;

    const anticipo = parseFloat(document.getElementById("form-pago-anticipo")?.value) || 0;
    const saldo = totalFinal - anticipo;

    // Update fields
    document.getElementById("lbl-subtotal").textContent = subtotalFinal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    const descRow = document.getElementById("sheet-discount-row");
    if (descGlobal > 0) {
        document.getElementById("lbl-desc-pct-title").textContent = `Descuento (${descGlobal}%):`;
        document.getElementById("lbl-descuento-val").textContent = `-${descuentoFinal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        descRow.style.display = "table-row";
    } else {
        descRow.style.display = "none";
    }

    document.getElementById("lbl-total").textContent = totalFinal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const anticipoRow = document.getElementById("sheet-anticipo-row");
    const saldoRow = document.getElementById("sheet-saldo-row");
    if (anticipo > 0) {
        document.getElementById("lbl-anticipo-val").textContent = anticipo.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        document.getElementById("lbl-saldo-val").textContent = saldo.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        anticipoRow.style.display = "table-row";
        saldoRow.style.display = "table-row";
    } else {
        anticipoRow.style.display = "none";
        saldoRow.style.display = "none";
    }

    // Update all currencies symbols
    document.querySelectorAll(".totals-table .cur").forEach(c => {
        c.textContent = currencyLabel;
    });

    // Update exchange rate conversion notice if MXN
    const noticeEl = document.getElementById("exchange-rate-notice");
    if (moneda === "MXN") {
        noticeEl.innerHTML = `⚠️ Precios calculados a tipo de cambio de <strong>$${tc.toFixed(2)} MXN</strong> por Dólar (USD).`;
        noticeEl.style.display = "block";
    } else {
        noticeEl.style.display = "none";
    }

    // Toggle Paid Stamp visibility
    const chkSello = document.getElementById("form-chk-sello-anticipo");
    const stamp = document.getElementById("sheet-paid-stamp");
    if (chkSello && stamp) {
        stamp.style.display = chkSello.checked ? "block" : "none";
    }
}

// -------------------------------------------------------------
// DRAFTS & LOCAL STORAGE
// -------------------------------------------------------------
function saveDraftQuote() {
    const rows = document.querySelectorAll("#form-partidas-list .partida-row");
    const items = [];
    rows.forEach(row => {
        items.push({
            descripcion: row.querySelector(".partida-desc").value,
            precio: parseFloat(row.querySelector(".partida-precio").value) || 0,
            cantidad: parseInt(row.querySelector(".partida-cant").value) || 1,
            referencia: row.querySelector(".partida-ref").value,
            estado: row.querySelector(".partida-estado").value,
            isPrecioUsd: row.querySelector(".chk-row-usd") ? row.querySelector(".chk-row-usd").checked : true,
            incluyeCaja: row.querySelector(".chk-box").checked,
            incluyePapeles: row.querySelector(".chk-papeles").checked,
            incluyeManual: row.querySelector(".chk-manual").checked,
            incluyeFactura: row.querySelector(".chk-factura").checked
        });
    });

    const draft = {
        folio: document.getElementById("form-folio").value,
        fecha: document.getElementById("form-fecha").value,
        tipoDoc: document.getElementById("form-tipo-doc").value,
        moneda: document.getElementById("form-moneda").value,
        tc: document.getElementById("form-tc").value,
        clientIndex: document.getElementById("form-select-cliente").value,
        empresa: document.getElementById("form-empresa").value,
        contacto: document.getElementById("form-contacto").value,
        email: document.getElementById("form-email-cliente").value,
        tel: document.getElementById("form-tel-cliente").value,
        descuentoGlobal: document.getElementById("form-descuento-global").value,
        pagoAnticipo: document.getElementById("form-pago-anticipo").value,
        selloAnticipo: document.getElementById("form-chk-sello-anticipo") ? document.getElementById("form-chk-sello-anticipo").checked : false,
        notaInterna: document.getElementById("form-nota-interna").value,
        vendedor: document.getElementById("form-vendedor").value,
        emailVendedor: document.getElementById("form-email-vendedor").value,
        telVendedor: document.getElementById("form-tel-vendedor").value,
        banco: document.getElementById("form-banco").value,
        notifPago: document.getElementById("form-notif-pago").value,
        observaciones: document.getElementById("form-observaciones").value,
        tiempoEntrega: document.getElementById("form-entrega").value,
        items
    };

    localStorage.setItem("rw_quote_draft", JSON.stringify(draft));
}

function restoreDraftQuote() {
    const draftStr = localStorage.getItem("rw_quote_draft");
    if (!draftStr) return false;

    try {
        const d = JSON.parse(draftStr);
        
        // Correct old mock advisor/bank details if present in draft
        if (d.vendedor === "Royal Watch MTY Staff" || d.vendedor === "Royal Watch Staff" || d.telVendedor === "81 1234 5678" || (d.banco && d.banco.includes("BBVA"))) {
            d.vendedor = "Alejandro Luna";
            d.telVendedor = "81 2198 0008";
            d.emailVendedor = "a.luna@royalwatchmty.com";
            d.banco = "Banco Nu México\nBeneficiario: Alejandro Luna\nCLABE: 638180010141018767";
        }

        document.getElementById("form-folio").value = d.folio || "";
        document.getElementById("form-fecha").value = d.fecha || "";
        document.getElementById("form-tipo-doc").value = d.tipoDoc || "cotizacion";
        document.getElementById("form-moneda").value = d.moneda || "USD";
        document.getElementById("form-tc").value = d.tc || "17.80";
        document.getElementById("form-select-cliente").value = d.clientIndex || "";
        document.getElementById("form-empresa").value = d.empresa || "";
        document.getElementById("form-contacto").value = d.contacto || "";
        document.getElementById("form-email-cliente").value = d.email || "";
        document.getElementById("form-tel-cliente").value = d.tel || "";
        document.getElementById("form-descuento-global").value = d.descuentoGlobal || "0";
        document.getElementById("form-pago-anticipo").value = d.pagoAnticipo || "0.00";
        document.getElementById("form-nota-interna").value = d.notaInterna || "";
        document.getElementById("form-vendedor").value = d.vendedor || "";
        document.getElementById("form-email-vendedor").value = d.emailVendedor || "";
        document.getElementById("form-tel-vendedor").value = d.telVendedor || "";
        document.getElementById("form-banco").value = d.banco || "";
        document.getElementById("form-notif-pago").value = d.notifPago || "";
        document.getElementById("form-observaciones").value = d.observaciones || "";
        document.getElementById("form-entrega").value = d.tiempoEntrega || "Inmediata";
        
        const chkSello = document.getElementById("form-chk-sello-anticipo");
        if (chkSello) {
            chkSello.checked = !!d.selloAnticipo;
        }

        if (d.moneda === "MXN") {
            document.getElementById("tc-box-container").style.display = "block";
        } else {
            document.getElementById("tc-box-container").style.display = "none";
        }

        // Restore items
        const container = document.getElementById("form-partidas-list");
        container.innerHTML = "";
        currentPartidaCount = 0;
        
        if (d.items && d.items.length > 0) {
            d.items.forEach(item => {
                agregarPartidaFila(item);
            });
        } else {
            agregarPartidaFila();
        }

        applyDocumentTemplate(d.tipoDoc);
        syncInputsToPreview();
        recalcularTotales();
        return true;
    } catch (err) {
        console.error("Error al restaurar borrador", err);
        return false;
    }
}

// -------------------------------------------------------------
// HISTORIAL LOGIC
// -------------------------------------------------------------
function guardarBorradorHistorial() {
    const rows = document.querySelectorAll("#form-partidas-list .partida-row");
    if (rows.length === 0) {
        alert("Agregue al menos una pieza para poder guardar en el historial.");
        return;
    }

    const items = [];
    rows.forEach(row => {
        items.push({
            descripcion: row.querySelector(".partida-desc").value,
            precio: parseFloat(row.querySelector(".partida-precio").value) || 0,
            cantidad: parseInt(row.querySelector(".partida-cant").value) || 1,
            referencia: row.querySelector(".partida-ref").value,
            estado: row.querySelector(".partida-estado").value,
            isPrecioUsd: row.querySelector(".chk-row-usd") ? row.querySelector(".chk-row-usd").checked : true,
            incluyeCaja: row.querySelector(".chk-box").checked,
            incluyePapeles: row.querySelector(".chk-papeles").checked,
            incluyeManual: row.querySelector(".chk-manual").checked,
            incluyeFactura: row.querySelector(".chk-factura").checked
        });
    });

    const quoteObj = {
        id: Date.now(),
        folio: document.getElementById("form-folio").value,
        fecha: document.getElementById("form-fecha").value,
        tipoDoc: document.getElementById("form-tipo-doc").value,
        moneda: document.getElementById("form-moneda").value,
        tc: document.getElementById("form-tc").value,
        contacto: document.getElementById("form-contacto").value || "--",
        empresa: document.getElementById("form-empresa").value || "Particular",
        email: document.getElementById("form-email-cliente").value,
        tel: document.getElementById("form-tel-cliente").value,
        descuentoGlobal: document.getElementById("form-descuento-global").value,
        pagoAnticipo: document.getElementById("form-pago-anticipo").value,
        notaInterna: document.getElementById("form-nota-interna").value,
        vendedor: document.getElementById("form-vendedor").value,
        emailVendedor: document.getElementById("form-email-vendedor").value,
        telVendedor: document.getElementById("form-tel-vendedor").value,
        banco: document.getElementById("form-banco").value,
        notifPago: document.getElementById("form-notif-pago").value,
        observaciones: document.getElementById("form-observaciones").value,
        tiempoEntrega: document.getElementById("form-entrega").value || "Inmediata",
        items
    };

    // If matching folio already exists, confirm overwrite
    const existingIndex = quotes.findIndex(q => q.folio === quoteObj.folio);
    if (existingIndex > -1) {
        if (confirm(`El folio ${quoteObj.folio} ya existe en el historial. ¿Deseas sobreescribirlo?`)) {
            quotes[existingIndex] = quoteObj;
            alert("¡Cotización actualizada en el historial!");
        } else {
            return;
        }
    } else {
        quotes.push(quoteObj);
        alert("¡Cotización guardada exitosamente en el historial!");
    }
    // Auto-deduct inventory if recibo de venta, if payment is made, or if it is an anticipo request
    const isSale = (quoteObj.tipoDoc === "recibo" || quoteObj.tipoDoc === "anticipo_pedido") || (parseFloat(quoteObj.pagoAnticipo) > 0);
    if (isSale) {
        let updatedCount = 0;
        quoteObj.items.forEach(it => {
            const ref = (it.referencia || "").trim().toUpperCase();
            const desc = (it.descripcion || "").toLowerCase();

            products.forEach(p => {
                const pRef = (p.referencia || "").trim().toUpperCase();
                const pModel = (p.modelo || "").toLowerCase();
                const pMarca = (p.marca || "").toLowerCase();

                let isMatch = false;
                if (ref && pRef === ref) {
                    isMatch = true;
                } else if (!ref && desc.includes(pModel) && desc.includes(pMarca)) {
                    isMatch = true;
                }

                if (isMatch && p.status !== "Vendido") {
                    p.status = "Vendido";
                    
                    const statusOverrides = JSON.parse(localStorage.getItem("rw_product_statuses") || "{}");
                    const productKey = p.referencia || `${p.marca}_${p.modelo}`;
                    statusOverrides[productKey] = "Vendido";
                    localStorage.setItem("rw_product_statuses", JSON.stringify(statusOverrides));

                    const customProducts = JSON.parse(localStorage.getItem("rw_custom_products") || "[]");
                    const customIdx = customProducts.findIndex(cp => cp.referencia === p.referencia && cp.modelo === p.modelo);
                    if (customIdx > -1) {
                        customProducts[customIdx].status = "Vendido";
                        localStorage.setItem("rw_custom_products", JSON.stringify(customProducts));
                    }
                    
                    updatedCount++;
                }
            });
        });
        
        if (updatedCount > 0) {
            renderProductsTable();
            console.log(`Auto-deducidas ${updatedCount} piezas a estatus "Vendido" en el catálogo.`);
        }
    }

    localStorage.setItem("rw_quotes", JSON.stringify(quotes));
    renderHistoryTable();
    renderCommandCenter();
}

function renderHistoryTable(filter = "") {
    const tbody = document.getElementById("table-historial-body");
    const countSpan = document.getElementById("history-count");
    tbody.innerHTML = "";

    const searchInput = document.getElementById("search-historial");
    const query = filter || (searchInput ? searchInput.value.trim() : "");

    const filtered = quotes.filter(q => {
        const term = query.toLowerCase();
        return (q.folio || "").toLowerCase().includes(term) ||
               (q.contacto || "").toLowerCase().includes(term) ||
               (q.empresa || "").toLowerCase().includes(term);
    }).reverse();

    if (countSpan) countSpan.textContent = filtered.length;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">No hay cotizaciones registradas.</td></tr>`;
        return;
    }

    filtered.forEach(q => {
        // Calculate total for history list view
        let total = 0;
        q.items.forEach(it => { total += it.precio * it.cantidad; });
        let finalVal = total;
        if (q.moneda === "MXN") {
            finalVal = total * (parseFloat(q.tc) || 1);
        }

        // Apply discount
        let descVal = finalVal * ((parseFloat(q.descuentoGlobal) || 0) / 100);
        let totalNeto = finalVal - descVal;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td style="font-family: monospace; font-weight: bold; color: var(--accent-gold);">${q.folio}</td>
            <td>${q.fecha}</td>
            <td><strong>${q.contacto}</strong><br><span style="font-size: 11px; color: var(--text-muted);">${q.empresa}</span></td>
            <td><span class="badge-privado" style="background-color: var(--bg-card); border:1px solid var(--border-color); color: var(--text-secondary); font-size:9px;">${
                q.tipoDoc === "cotizacion" ? "COTIZACIÓN" :
                q.tipoDoc === "anticipo_pedido" ? "ANTICIPO Y PEDIDO" :
                q.tipoDoc === "recibo" ? "LIQUIDACIÓN Y ENTREGA" :
                q.tipoDoc === "consignacion" ? "CONSIGNACIÓN" :
                q.tipoDoc === "avaluo" ? "AVALÚO" :
                q.tipoDoc === "certificado" ? "CERTIFICADO" : q.tipoDoc.toUpperCase()
            }</span></td>
            <td style="font-weight: bold;">$ ${totalNeto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${q.moneda}</td>
            <td class="actions-cell">
                <div class="actions-cell-buttons">
                    <button class="btn btn-secondary btn-small" onclick="cargarCotizacionHistorial(${q.id})" title="Cargar"><i data-lucide="folder-open" style="width:12px; height:12px;"></i> Cargar</button>
                    <button class="btn btn-secondary btn-small" onclick="compartirWhatsAppDesdeHistorial(${q.id})" title="Compartir WA" style="border-color:#22c55e; color:#22c55e; background-color:rgba(34,197,94,0.03);"><i data-lucide="message-square" style="width:12px; height:12px; stroke:#22c55e;"></i> WA</button>
                    <button class="btn btn-secondary btn-small text-danger" onclick="eliminarCotizacionHistorial(${q.id})" title="Eliminar"><i data-lucide="trash-2" style="width:12px; height:12px; stroke: var(--accent-red)"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    initIcons();
}

function cargarCotizacionHistorial(id) {
    const q = quotes.find(item => item.id === id);
    if (!q) return;

    if (confirm(`¿Deseas cargar la cotización con folio ${q.folio}? Esto reemplazará los datos actuales del formulario.`)) {
        document.getElementById("form-folio").value = q.folio;
        document.getElementById("form-fecha").value = q.fecha;
        document.getElementById("form-tipo-doc").value = q.tipoDoc;
        document.getElementById("form-moneda").value = q.moneda;
        document.getElementById("form-tc").value = q.tc;
        document.getElementById("form-empresa").value = q.empresa;
        document.getElementById("form-contacto").value = q.contacto;
        document.getElementById("form-email-cliente").value = q.email || "";
        document.getElementById("form-tel-cliente").value = q.tel || "";
        document.getElementById("form-descuento-global").value = q.descuentoGlobal || "0";
        document.getElementById("form-pago-anticipo").value = q.pagoAnticipo || "0.00";
        document.getElementById("form-nota-interna").value = q.notaInterna || "";
        document.getElementById("form-vendedor").value = q.vendedor;
        document.getElementById("form-email-vendedor").value = q.emailVendedor;
        document.getElementById("form-tel-vendedor").value = q.telVendedor;
        document.getElementById("form-banco").value = q.banco;
        document.getElementById("form-notif-pago").value = q.notifPago;
        document.getElementById("form-observaciones").value = q.observaciones;
        document.getElementById("form-entrega").value = q.tiempoEntrega || "Inmediata";

        if (q.moneda === "MXN") {
            document.getElementById("tc-box-container").style.display = "block";
        } else {
            document.getElementById("tc-box-container").style.display = "none";
        }

        // Restore items
        const container = document.getElementById("form-partidas-list");
        container.innerHTML = "";
        currentPartidaCount = 0;
        
        q.items.forEach(item => {
            agregarPartidaFila(item);
        });

        applyDocumentTemplate(q.tipoDoc);
        syncInputsToPreview();
        recalcularTotales();

        // Switch to editor
        document.getElementById("btn-nav-nueva").click();
        alert(`Folio ${q.folio} cargado en el panel de creación.`);
    }
}

function eliminarCotizacionHistorial(id) {
    if (confirm("¿Seguro que deseas eliminar esta cotización del historial?")) {
        const idx = quotes.findIndex(item => item.id === id);
        if (idx > -1) {
            quotes.splice(idx, 1);
            localStorage.setItem("rw_quotes", JSON.stringify(quotes));
            renderHistoryTable();
            renderCommandCenter();
        }
    }
}

// -------------------------------------------------------------
// VENDORS MANAGEMENT
// -------------------------------------------------------------
function setupVendorsModal() {
    const modal = document.getElementById("modal-vendors");
    const btnOpen = document.getElementById("btn-abrir-vendors");
    const btnClose = document.getElementById("btn-close-vendors");
    const formVendor = document.getElementById("form-gestion-vendedor");
    const listContainer = document.getElementById("modal-vendors-list");
    const selectProfile = document.getElementById("select-vendor-profile");

    // Open
    btnOpen.addEventListener("click", () => {
        modal.classList.add("active");
        renderModalVendorsList();
    });

    // Close
    btnClose.addEventListener("click", () => {
        modal.classList.remove("active");
    });

    // Handle submit
    formVendor.addEventListener("submit", (e) => {
        e.preventDefault();
        const nombre = document.getElementById("vendor-nombre").value.trim();
        const tel = document.getElementById("vendor-tel").value.trim();
        const email = document.getElementById("vendor-email").value.trim();
        const banco = document.getElementById("vendor-banco").value.trim();
        const notifPago = document.getElementById("vendor-notif-pago").value.trim();

        if (nombre) {
            const vendorObj = { nombre, tel, email, banco, notifPago };
            if (currentVendorEditIndex === -1) {
                vendors.push(vendorObj);
            } else {
                vendors[currentVendorEditIndex] = vendorObj;
                currentVendorEditIndex = -1; // reset
                document.getElementById("btn-submit-vendor").textContent = "Guardar Perfil";
            }

            localStorage.setItem("rw_vendors", JSON.stringify(vendors));
            formVendor.reset();
            renderModalVendorsList();
            populateVendorsDropdown();
            alert("Perfil guardado con éxito.");
        }
    });

    // Dropdown Profile Select
    selectProfile.addEventListener("change", () => {
        const idx = selectProfile.value;
        if (idx !== "") {
            const v = vendors[idx];
            document.getElementById("form-vendedor").value = v.nombre;
            document.getElementById("form-email-vendedor").value = v.email;
            document.getElementById("form-tel-vendedor").value = v.tel;
            document.getElementById("form-banco").value = v.banco;
            document.getElementById("form-notif-pago").value = v.notifPago;
            // Also sync sidebar user badge
            document.getElementById("badge-vendedor").textContent = v.nombre;
            syncInputsToPreview();
            saveDraftQuote();
        }
    });

    // Populate dropdown initially
    populateVendorsDropdown();
}

function populateVendorsDropdown() {
    const select = document.getElementById("select-vendor-profile");
    select.innerHTML = '<option value="">-- Seleccionar perfil --</option>';
    vendors.forEach((v, index) => {
        const option = document.createElement("option");
        option.value = index;
        option.textContent = v.nombre;
        select.appendChild(option);
    });
}

function renderModalVendorsList() {
    const container = document.getElementById("modal-vendors-list");
    container.innerHTML = "";

    if (vendors.length === 0) {
        container.innerHTML = `<div style="padding: 10px; text-align: center; color: var(--text-muted);">No hay perfiles registrados.</div>`;
        return;
    }

    vendors.forEach((v, index) => {
        const row = document.createElement("div");
        row.className = "vendor-list-item";
        row.innerHTML = `
            <div>
                <strong>${v.nombre}</strong><br>
                <span style="font-size: 11px; color: var(--text-muted);">${v.email} | ${v.tel}</span>
            </div>
            <div>
                <button type="button" class="btn btn-secondary btn-small" onclick="editVendorProfile(${index})" style="margin-right: 4px;">Editar</button>
                <button type="button" class="btn btn-secondary btn-small text-danger" onclick="deleteVendorProfile(${index})">Borrar</button>
            </div>
        `;
        container.appendChild(row);
    });
}

window.editVendorProfile = function(index) {
    const v = vendors[index];
    currentVendorEditIndex = index;
    
    document.getElementById("vendor-nombre").value = v.nombre;
    document.getElementById("vendor-tel").value = v.tel;
    document.getElementById("vendor-email").value = v.email;
    document.getElementById("vendor-banco").value = v.banco;
    document.getElementById("vendor-notif-pago").value = v.notifPago;

    document.getElementById("btn-submit-vendor").textContent = "Actualizar Perfil";
};

window.deleteVendorProfile = function(index) {
    if (confirm("¿Deseas eliminar este perfil de vendedor?")) {
        vendors.splice(index, 1);
        localStorage.setItem("rw_vendors", JSON.stringify(vendors));
        renderModalVendorsList();
        populateVendorsDropdown();
        currentVendorEditIndex = -1;
        document.getElementById("btn-submit-vendor").textContent = "Guardar Perfil";
    }
};

// -------------------------------------------------------------
// INVENTORY STATUS CONTROLS
// -------------------------------------------------------------
window.changeProductStatus = function(index, newStatus) {
    if (index >= 0 && index < products.length) {
        const prod = products[index];
        prod.status = newStatus;

        // Save modification to custom products if applicable
        const customProducts = JSON.parse(localStorage.getItem("rw_custom_products") || "[]");
        const customIdx = customProducts.findIndex(p => p.referencia === prod.referencia && p.modelo === prod.modelo);
        if (customIdx > -1) {
            customProducts[customIdx].status = newStatus;
            localStorage.setItem("rw_custom_products", JSON.stringify(customProducts));
        }

        // Save override in status db
        const statusOverrides = JSON.parse(localStorage.getItem("rw_product_statuses") || "{}");
        const productKey = prod.referencia || `${prod.marca}_${prod.modelo}`;
        statusOverrides[productKey] = newStatus;
        localStorage.setItem("rw_product_statuses", JSON.stringify(statusOverrides));

        renderProductsTable();
        renderCommandCenter();
        alert("Estatus de la pieza actualizado a: " + newStatus);
    }
};

// -------------------------------------------------------------
// CLIENT CRM (MINI CRM) LOGIC
// -------------------------------------------------------------
let currentCrmClientIndex = -1;

window.abrirExpedienteCRM = function(index) {
    const client = clients[index];
    if (!client) return;

    currentCrmClientIndex = index;
    
    // Fill client info
    document.getElementById("crm-client-name").textContent = client.contacto;
    document.getElementById("crm-client-info").textContent = `${client.empresa || 'Particular'} | Email: ${client.email || '-'} | Tel: ${client.tel || '-'}`;
    
    // Load note
    const storedNotes = localStorage.getItem(`rw_crm_notes_${client.contacto}`) || "";
    document.getElementById("crm-client-notes").value = storedNotes;

    // Search cross-history
    const clientNameLower = (client.contacto || "").toLowerCase().trim();
    const clientEmailLower = (client.email || "").toLowerCase().trim();
    const clientTelClean = (client.tel || "").replace(/\s+/g, "");

    const clientDocs = quotes.filter(q => {
        const qName = (q.contacto || "").toLowerCase().trim();
        const qEmail = (q.email || "").toLowerCase().trim();
        const qTel = (q.tel || "").replace(/\s+/g, "");

        return (qName === clientNameLower) || 
               (clientEmailLower && qEmail === clientEmailLower) || 
               (clientTelClean && qTel === clientTelClean);
    });

    // Sum totals in USD
    let totalSpentUSD = 0;
    clientDocs.forEach(q => {
        let docTotalVal = 0;
        q.items.forEach(it => {
            let itemTotal = it.precio * it.cantidad;
            if (q.moneda === "MXN") {
                const docTc = parseFloat(q.tc) || 17.80;
                if (it.isPrecioUsd === false) {
                    itemTotal = (it.precio / docTc) * it.cantidad;
                }
            }
            docTotalVal += itemTotal;
        });
        const discPct = parseFloat(q.descuentoGlobal) || 0;
        totalSpentUSD += docTotalVal * (1 - (discPct / 100));
    });

    document.getElementById("crm-stat-total").textContent = `$${totalSpentUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
    document.getElementById("crm-stat-docs").textContent = `${clientDocs.length} registro(s)`;

    // Draw doc history
    const tbody = document.getElementById("crm-history-table-body");
    tbody.innerHTML = "";

    if (clientDocs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 14px;">No hay documentos registrados para este cliente.</td></tr>`;
    } else {
        clientDocs.forEach(q => {
            const tr = document.createElement("tr");
            let docSum = 0;
            q.items.forEach(it => { docSum += it.precio * it.cantidad; });
            const disc = docSum * ((parseFloat(q.descuentoGlobal) || 0) / 100);
            const net = docSum - disc;

            tr.innerHTML = `
                <td>${q.fecha}</td>
                <td style="font-family: monospace; font-weight: bold; color: var(--accent-gold);">${q.folio}</td>
                <td><span class="badge-privado" style="background-color: var(--bg-card); border:1px solid var(--border-color); color: var(--text-secondary); font-size:8px; padding: 1px 4px;">${
                    q.tipoDoc === "cotizacion" ? "COTIZACIÓN" :
                    q.tipoDoc === "anticipo_pedido" ? "ANTICIPO Y PEDIDO" :
                    q.tipoDoc === "recibo" ? "LIQUIDACIÓN Y ENTREGA" :
                    q.tipoDoc === "consignacion" ? "CONSIGNACIÓN" :
                    q.tipoDoc === "avaluo" ? "AVALÚO" :
                    q.tipoDoc === "certificado" ? "CERTIFICADO" : q.tipoDoc.toUpperCase()
                }</span></td>
                <td style="font-weight: bold;">$${net.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${q.moneda}</td>
                <td style="text-align: center;">
                    <button class="btn btn-secondary btn-small" onclick="cargarCotizacionDesdeCRM(${q.id})" style="padding: 2px 6px; font-size:10px;">Cargar</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    document.getElementById("modal-client-crm").classList.add("active");
};

window.cargarCotizacionDesdeCRM = function(id) {
    document.getElementById("modal-client-crm").classList.remove("active");
    cargarCotizacionHistorial(id);
};

window.guardarNotasCRM = function() {
    if (currentCrmClientIndex === -1) return;
    const client = clients[currentCrmClientIndex];
    if (!client) return;

    const notes = document.getElementById("crm-client-notes").value.trim();
    localStorage.setItem(`rw_crm_notes_${client.contacto}`, notes);
    alert("Notas de expediente guardadas correctamente.");
};

window.closeCRM = function() {
    document.getElementById("modal-client-crm").classList.remove("active");
    currentCrmClientIndex = -1;
};

// -------------------------------------------------------------
// WHATSAPP QUICK SHARE LOGIC
// -------------------------------------------------------------
window.compartirCotizacionPorWA = function(quoteObj = null) {
    let folio, contacto, tel, moneda, descuentoGlobal, items, tipoDoc, tiempoEntrega;

    if (quoteObj) {
        folio = quoteObj.folio;
        contacto = quoteObj.contacto;
        tel = quoteObj.tel;
        moneda = quoteObj.moneda;
        descuentoGlobal = parseFloat(quoteObj.descuentoGlobal) || 0;
        items = quoteObj.items;
        tipoDoc = quoteObj.tipoDoc;
        tiempoEntrega = quoteObj.tiempoEntrega;
    } else {
        folio = document.getElementById("form-folio").value;
        contacto = document.getElementById("form-contacto").value || "Cliente";
        tel = document.getElementById("form-tel-cliente").value || "";
        moneda = document.getElementById("form-moneda").value;
        descuentoGlobal = parseFloat(document.getElementById("form-descuento-global").value) || 0;
        tipoDoc = document.getElementById("form-tipo-doc").value;
        tiempoEntrega = document.getElementById("form-entrega").value;

        items = [];
        const rows = document.querySelectorAll("#form-partidas-list .partida-row");
        rows.forEach(row => {
            items.push({
                descripcion: row.querySelector(".partida-desc").value || "Reloj de Lujo",
                precio: parseFloat(row.querySelector(".partida-precio").value) || 0,
                cantidad: parseInt(row.querySelector(".partida-cant").value) || 1,
            });
        });
    }

    if (items.length === 0) {
        alert("Agrega al menos una pieza para poder compartir por WhatsApp.");
        return;
    }

    let docLabel = "Cotización";
    if (tipoDoc === "consignacion") docLabel = "Contrato de Consignación";
    if (tipoDoc === "avaluo") docLabel = "Oferta de Compra / Avalúo";
    if (tipoDoc === "recibo") docLabel = "Comprobante de Liquidación y Entrega";
    if (tipoDoc === "anticipo_pedido") docLabel = "Comprobante de Anticipo y Solicitud de Pedido";
    if (tipoDoc === "certificado") docLabel = "Certificado de Autenticidad";

    let totalSum = 0;
    let itemsText = "";
    items.forEach(it => {
        totalSum += it.precio * it.cantidad;
        itemsText += `- ${it.cantidad}x ${it.descripcion}\n`;
    });
    const desc = totalSum * (descuentoGlobal / 100);
    const finalNet = totalSum - desc;

    let msg = `Hola *${contacto}*, le comparto los detalles de su *${docLabel}* de *Royal Watch MTY*:\n\n`;
    msg += `*Folio:* ${folio}\n`;
    msg += `*Detalle de Pieza(s):*\n${itemsText}`;
    
    if (tipoDoc !== "certificado") {
        msg += `\n*Total Neto:* $${finalNet.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${moneda}\n`;
    }
    
    if (tiempoEntrega) {
        msg += `*Tiempo de Entrega:* ${tiempoEntrega}\n`;
    }
    
    msg += `\nQuedo a sus órdenes.\n*Asesor:* Alejandro Luna\n*Tel/WhatsApp:* 81 2198 0008\n*Royal Watch MTY*`;

    const encodedMsg = encodeURIComponent(msg);
    const cleanTel = tel.replace(/[^0-9]/g, "");

    let waUrl = `https://api.whatsapp.com/send?text=${encodedMsg}`;
    if (cleanTel) {
        const formattedTel = cleanTel.length === 10 ? `52${cleanTel}` : cleanTel;
        waUrl = `https://api.whatsapp.com/send?phone=${formattedTel}&text=${encodedMsg}`;
    }

    window.open(waUrl, "_blank");
};

window.compartirWhatsAppDesdeHistorial = function(id) {
    const q = quotes.find(item => item.id === id);
    if (q) {
        compartirCotizacionPorWA(q);
    }
};

// -------------------------------------------------------------
// COMMAND CENTER (DASHBOARD) LOGIC
// -------------------------------------------------------------
function renderCommandCenter() {
    // 1. Calculate KPI Metrics
    const activeProducts = products.filter(p => p.status === "Disponible" || p.status === "Consignado");
    const stockCount = activeProducts.length;
    const inventoryValue = activeProducts.reduce((sum, p) => sum + (parseFloat(p.precio) || 0), 0);

    let salesTotal = 0;
    let advancesTotal = 0;

    quotes.forEach(q => {
        // Calculate total net in USD
        let totalVal = 0;
        q.items.forEach(it => {
            let priceUsd = it.precio;
            if (q.moneda === "MXN" && !it.isPrecioUsd) {
                priceUsd = it.precio / (parseFloat(q.tc) || 17.80);
            }
            totalVal += priceUsd * it.cantidad;
        });
        const descPct = parseFloat(q.descuentoGlobal) || 0;
        const netTotalUsd = totalVal * (1 - (descPct / 100));

        if (q.tipoDoc === "recibo") {
            salesTotal += netTotalUsd;
        }

        let anticipoUsd = parseFloat(q.pagoAnticipo) || 0;
        if (q.moneda === "MXN") {
            anticipoUsd = anticipoUsd / (parseFloat(q.tc) || 17.80);
        }
        advancesTotal += anticipoUsd;
    });

    // Update KPI UI Elements
    const salesEl = document.getElementById("kpi-sales");
    const advancesEl = document.getElementById("kpi-advances");
    const inventoryValEl = document.getElementById("kpi-inventory-val");
    const stockCountEl = document.getElementById("kpi-stock-count");

    if (salesEl) salesEl.textContent = `$${salesTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
    if (advancesEl) advancesEl.textContent = `$${advancesTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
    if (inventoryValEl) inventoryValEl.textContent = `$${inventoryValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
    if (stockCountEl) stockCountEl.textContent = stockCount;

    // 2. Inventory Status Distribution (Disponible, Apartado, Consignado, Vendido)
    const countDisponible = products.filter(p => p.status === "Disponible" || p.status === "disponible").length;
    const countApartado = products.filter(p => p.status === "Apartado" || p.status === "apartado").length;
    const countConsignado = products.filter(p => p.status === "Consignado" || p.status === "consignado").length;
    const countVendido = products.filter(p => p.status === "Vendido" || p.status === "vendido").length;

    const totalStatusCount = countDisponible + countApartado + countConsignado + countVendido;
    const pctDisponible = totalStatusCount > 0 ? (countDisponible / totalStatusCount) * 100 : 0;
    const pctApartado = totalStatusCount > 0 ? (countApartado / totalStatusCount) * 100 : 0;
    const pctConsignado = totalStatusCount > 0 ? (countConsignado / totalStatusCount) * 100 : 0;
    const pctVendido = totalStatusCount > 0 ? (countVendido / totalStatusCount) * 100 : 0;

    const lblDisponible = document.getElementById("bar-lbl-disponible");
    const barDisponible = document.getElementById("bar-progress-disponible");
    const lblApartado = document.getElementById("bar-lbl-apartado");
    const barApartado = document.getElementById("bar-progress-apartado");
    const lblConsignado = document.getElementById("bar-lbl-consignado");
    const barConsignado = document.getElementById("bar-progress-consignado");
    const lblVendido = document.getElementById("bar-lbl-vendido");
    const barVendido = document.getElementById("bar-progress-vendido");

    if (lblDisponible) lblDisponible.textContent = `${countDisponible} ${countDisponible === 1 ? 'pieza' : 'piezas'}`;
    if (barDisponible) barDisponible.style.width = `${pctDisponible}%`;
    if (lblApartado) lblApartado.textContent = `${countApartado} ${countApartado === 1 ? 'pieza' : 'piezas'}`;
    if (barApartado) barApartado.style.width = `${pctApartado}%`;
    if (lblConsignado) lblConsignado.textContent = `${countConsignado} ${countConsignado === 1 ? 'pieza' : 'piezas'}`;
    if (barConsignado) barConsignado.style.width = `${pctConsignado}%`;
    if (lblVendido) lblVendido.textContent = `${countVendido} ${countVendido === 1 ? 'pieza' : 'piezas'}`;
    if (barVendido) barVendido.style.width = `${pctVendido}%`;

    // 3. Top Brands in Stock
    const brandCounts = {};
    activeProducts.forEach(p => {
        const brand = p.marca || "Sin Marca";
        brandCounts[brand] = (brandCounts[brand] || 0) + 1;
    });

    const sortedBrands = Object.entries(brandCounts).sort((a, b) => b[1] - a[1]);
    const brandsListContainer = document.getElementById("dashboard-brands-list");

    if (brandsListContainer) {
        brandsListContainer.innerHTML = "";
        if (sortedBrands.length === 0) {
            brandsListContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 10px; font-size: 13px;">No hay piezas en stock.</div>`;
        } else {
            const maxVal = sortedBrands[0][1];
            sortedBrands.slice(0, 8).forEach(([brand, count]) => {
                const pct = maxVal > 0 ? (count / maxVal) * 100 : 0;
                const brandRow = document.createElement("div");
                brandRow.className = "dashboard-brand-row";
                brandRow.innerHTML = `
                    <div class="brand-info-row">
                        <span class="brand-name">${brand}</span>
                        <span class="brand-count">${count} ${count === 1 ? 'pieza' : 'piezas'}</span>
                    </div>
                    <div class="brand-progress-track">
                        <div class="brand-progress-bar" style="width: ${pct}%;"></div>
                    </div>
                `;
                brandsListContainer.appendChild(brandRow);
            });
        }
    }

    // 4. Recent Quotes
    const recentQuotesContainer = document.getElementById("dashboard-recent-quotes");
    if (recentQuotesContainer) {
        recentQuotesContainer.innerHTML = "";
        const recentQuotes = [...quotes].reverse().slice(0, 5);

        if (recentQuotes.length === 0) {
            recentQuotesContainer.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 20px;">No hay cotizaciones registradas.</td></tr>`;
        } else {
            recentQuotes.forEach(q => {
                let total = 0;
                q.items.forEach(it => { total += it.precio * it.cantidad; });
                let finalVal = total;
                if (q.moneda === "MXN") {
                    finalVal = total * (parseFloat(q.tc) || 1);
                }
                let descVal = finalVal * ((parseFloat(q.descuentoGlobal) || 0) / 100);
                let totalNeto = finalVal - descVal;

                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td style="font-family: monospace; font-weight: bold; color: var(--accent-gold);">${q.folio}</td>
                    <td>
                        <div style="font-weight: 500;">${q.contacto}</div>
                        <div style="font-size: 10.5px; color: var(--text-muted);">${q.empresa}</div>
                    </td>
                    <td style="font-weight: bold; font-family: monospace;">$ ${totalNeto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${q.moneda}</td>
                    <td style="text-align: center; vertical-align: middle;">
                        <button class="btn btn-secondary btn-small" onclick="cargarCotizacionHistorial(${q.id})" style="padding: 4px 10px; font-size: 11px;">
                            <i data-lucide="folder-open" style="width: 11px; height: 11px; margin-right: 2px;"></i> Abrir
                        </button>
                    </td>
                `;
                recentQuotesContainer.appendChild(tr);
            });
            initIcons();
        }
    }
}

// -------------------------------------------------------------
// CATALOG IMAGE PREVIEW LIGHTBOX
// -------------------------------------------------------------
window.verImagenCatalogo = function(imgPath, brand, model, ref) {
    const modal = document.getElementById("modal-image-preview");
    const img = document.getElementById("image-preview-img");
    const title = document.getElementById("image-preview-title");
    const refEl = document.getElementById("image-preview-ref");

    if (modal && img && title && refEl) {
        img.src = imgPath;
        title.textContent = `${brand} - ${model}`;
        refEl.textContent = `Referencia: ${ref || 'Sin Referencia'}`;
        modal.classList.add("active");
    }
};
