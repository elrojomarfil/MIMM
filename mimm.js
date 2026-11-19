/* ==========================================================
   MIMM - Código compartido
   La URL del Apps Script se cambia SOLO acá.
   ========================================================== */
(function () {
    const MIMM = {};
    window.MIMM = MIMM;

    MIMM.API_URL = "https://script.google.com/macros/s/AKfycbx_CVZ3dNCLh7ToFu2Y44jkLrRpVPpSrUyZPFDsT3rYpxBIfiF6JgjVftXbWl_Oy9b-9g/exec";

    // ---------- Utilidades ----------
    MIMM.esc = function (s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    };

    MIMM.normalizarTel = function (v) {
        let t = String(v || "").replace(/\D/g, "");
        if (t.length === 10) t = "549" + t;
        return t;
    };

    MIMM.toast = function (msg) {
        let el = document.getElementById("toast");
        if (!el) {
            el = document.createElement("div");
            el.id = "toast";
            el.className = "toast";
            document.body.appendChild(el);
        }
        el.textContent = msg;
        el.classList.add("show");
        clearTimeout(MIMM._toastT);
        MIMM._toastT = setTimeout(function () { el.classList.remove("show"); }, 2600);
    };

    // ---------- Navegación ----------
    MIMM.NAV = [
        { href: "tarifario.html", ico: "💰", label: "Tarifario" },
        { href: "facturas.html",  ico: "🧾", label: "Facturas" },
        { href: "bolsa.html",     ico: "📋", label: "Bolsa" },
        { href: "agenda.html",    ico: "🎸", label: "Agenda" },
        { href: "publicar.html",  ico: "➕", label: "Publicar" }
    ];

    MIMM.pagina = function () {
        return location.pathname.split("/").pop() || "index.html";
    };

    MIMM.volver = function () {
        try {
            if (document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1) {
                history.back();
                return;
            }
        } catch (e) {}
        location.href = "index.html";
    };

    function initNav() {
        const actual = MIMM.pagina();
        const nav = document.getElementById("bottomNav");
        if (nav) {
            nav.innerHTML = '<div class="bottom-nav-inner">' + MIMM.NAV.map(function (n) {
                const act = n.href === actual;
                return '<a class="nav-item' + (act ? " active" : "") + '" href="' + n.href + '"' +
                    (act ? ' aria-current="page"' : "") + '><span class="ico">' + n.ico + "</span><span>" + n.label + "</span></a>";
            }).join("") + "</div>";

            // Entre secciones se reemplaza la entrada del historial: "atrás" siempre vuelve al inicio
            nav.addEventListener("click", function (e) {
                const a = e.target.closest("a.nav-item");
                if (!a || actual === "index.html") return;
                e.preventDefault();
                if (a.getAttribute("href") !== actual) location.replace(a.getAttribute("href"));
            });
        }
        const back = document.getElementById("btnBack");
        if (back) back.addEventListener("click", MIMM.volver);
    }

    // ---------- Lectura de datos del Apps Script (JSONP) ----------
    MIMM.jsonp = function (params, timeoutMs) {
        return new Promise(function (resolve, reject) {
            const cb = "mimm_cb_" + Date.now() + "_" + Math.floor(Math.random() * 1e6);
            const qs = Object.keys(params || {}).map(function (k) {
                return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]);
            }).join("&");
            const s = document.createElement("script");
            let done = false;
            let t = null;

            function limpiar() {
                done = true;
                clearTimeout(t);
                delete window[cb];
                s.remove();
            }

            t = setTimeout(function () { if (!done) { limpiar(); reject(new Error("timeout")); } }, timeoutMs || 15000);
            window[cb] = function (d) { if (done) return; limpiar(); resolve(d); };
            s.onerror = function () { if (!done) { limpiar(); reject(new Error("red")); } };
            s.src = MIMM.API_URL + "?" + qs + (qs ? "&" : "") + "callback=" + cb;
            document.body.appendChild(s);
        });
    };

    // ---------- Avisos (con caché de 60 s para que cambiar de sección sea instantáneo) ----------
    const CACHE_KEY = "mimm_avisos_cache_v1";

    MIMM.limpiarCache = function () {
        try { sessionStorage.removeItem(CACHE_KEY); } catch (e) {}
    };

    MIMM.getAvisos = function (forzar) {
        if (!forzar) {
            try {
                const c = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
                if (c && Date.now() - c.t < 60000) return Promise.resolve(c.d);
            } catch (e) {}
        }
        return MIMM.jsonp({ accion: "avisos" }).then(function (d) {
            if (!Array.isArray(d)) throw new Error("formato");
            const lista = d.slice().reverse(); // más nuevos primero
            try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), d: lista })); } catch (e) {}
            return lista;
        });
    };

    const ETIQUETAS = {
        banda: "Buscan músico / integrante",
        sesionista: "Sesionistas y grabación",
        tecnico: "Técnicos / sonido / iluminación",
        ofrezco: "Ofrezco servicios / clases"
    };

    MIMM.tarjetaAviso = function (item) {
        const cat = String(item.categoria || "trabajo").toLowerCase().trim();
        const esConcierto = cat === "concierto";
        const tel = MIMM.normalizarTel(item.whatsapp);
        const msg = encodeURIComponent('Hola ' + (item.autor || "colega") + ', me interesa tu publicación "' + item.titulo + '" vista en el MIMM.');
        const card = document.createElement("div");
        card.className = "listing-card" + (esConcierto ? " concierto" : "");
        card.innerHTML =
            (!esConcierto && ETIQUETAS[cat] ? '<span class="tag">' + MIMM.esc(ETIQUETAS[cat]) + "</span>" : "") +
            '<div class="listing-title">' + MIMM.esc(item.titulo) + "</div>" +
            '<div class="listing-autor">👤 Publicado por: ' + MIMM.esc(item.autor || "Comunidad MIMM") + "</div>" +
            '<div class="listing-meta"><span>📍 ' + MIMM.esc(item.zona) + "</span>" +
            (esConcierto && item.fechaEvento ? "<span>📅 " + MIMM.esc(item.fechaEvento) + "</span>" : "") + "</div>" +
            '<div class="listing-desc">' + MIMM.esc(item.descripcion) + "</div>" +
            (tel ? '<a class="wa-btn" href="https://wa.me/' + tel + "?text=" + msg + '" target="_blank" rel="noopener">💬 Contactar por WhatsApp</a>' : "");
        return card;
    };

    MIMM.textoBusqueda = function (item) {
        return [item.autor, item.titulo, item.zona, item.descripcion].join(" ").toLowerCase();
    };

    initNav();
})();
