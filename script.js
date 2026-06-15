/**
 * INED Certifica — script.js
 * Lee certificados.csv, verifica códigos y renderiza el resultado.
 * Funciona 100% en el cliente (GitHub Pages compatible).
 */

"use strict";

/* ── Estado global ─────────────────────────────────────── */
let certificados = [];   // Array de objetos {codigo, nombre, programa, nivel, fecha, estado}
let csvCargado   = false;

/* ── Entrada ────────────────────────────────────────────── */
window.addEventListener("DOMContentLoaded", async () => {
  await cargarCSV();
  escucharEnter();
  verificarDesdeURL();
});

/* ── Carga del CSV ──────────────────────────────────────── */
async function cargarCSV() {
  try {
    const resp = await fetch("certificados.csv");
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const texto = await resp.text();
    certificados = parsearCSV(texto);
    csvCargado   = true;
  } catch (err) {
    console.error("Error al cargar certificados.csv:", err);
    csvCargado = false;
  }
}

/**
 * Parsea el CSV de forma robusta:
 * - Ignora líneas vacías y la cabecera
 * - Soporta comas dentro de comillas
 * - Devuelve array de objetos con claves del header
 */
function parsearCSV(texto) {
  const lineas = texto.trim().split(/\r?\n/);
  if (lineas.length < 2) return [];

  const cabecera = lineas[0].split(",").map(c => c.trim().toLowerCase());

  return lineas.slice(1)
    .filter(l => l.trim() !== "")
    .map(linea => {
      const cols = dividirLineasCSV(linea);
      const obj  = {};
      cabecera.forEach((col, i) => {
        obj[col] = (cols[i] || "").trim().replace(/^"|"$/g, "");
      });
      return obj;
    });
}

/** Divide una línea CSV respetando comillas */
function dividirLineasCSV(linea) {
  const resultado = [];
  let actual = "";
  let dentro  = false;

  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (c === '"') {
      dentro = !dentro;
    } else if (c === "," && !dentro) {
      resultado.push(actual);
      actual = "";
    } else {
      actual += c;
    }
  }
  resultado.push(actual);
  return resultado;
}

/* ── Verificación desde URL ─────────────────────────────── */
function verificarDesdeURL() {
  const params = new URLSearchParams(window.location.search);
  const codigo = params.get("codigo") || params.get("code") || params.get("id");
  if (codigo) {
    const input = document.getElementById("codigoInput");
    input.value = codigo;
    buscarCertificado();
  }
}

/* ── Buscar certificado ─────────────────────────────────── */
function buscarCertificado() {
  const input   = document.getElementById("codigoInput");
  const codigo  = normalizar(input.value);

  const resultEl  = document.getElementById("resultado");
  const cargEl    = document.getElementById("cargando");

  if (!codigo) {
    mostrarError("Ingresa el código de verificación para continuar.");
    input.focus();
    return;
  }

  if (!csvCargado) {
    mostrarError("No se pudo cargar la base de datos de certificados. Verifica la conexión o recarga la página.");
    return;
  }

  /* Animación de carga mínima */
  resultEl.classList.add("hidden");
  cargEl.classList.remove("hidden");

  setTimeout(() => {
    cargEl.classList.add("hidden");

    const cert = certificados.find(c => normalizar(c.codigo) === codigo);

    if (!cert) {
      renderNoEncontrado(codigo);
    } else if (normalizar(cert.estado) === "anulado") {
      renderAnulado(cert);
    } else {
      renderValido(cert);
    }
  }, 600);
}

/** Normaliza texto: minúsculas, sin espacios extra */
function normalizar(str) {
  return (str || "").trim().toLowerCase().replace(/\s+/g, " ");
}

/* ── Renders ────────────────────────────────────────────── */
function renderValido(cert) {
  const html = `
    <div class="estado-valido">
      <div class="resultado-status">
        <div class="status-icon">✓</div>
        <div class="status-texts">
          <span class="status-label">Certificado Válido</span>
          <span class="status-sub">Verificado en el registro digital de INED</span>
        </div>
      </div>
      <div class="cert-body">
        <div class="cert-seal">
          <div class="seal-ring">
            <span class="seal-check">🏅</span>
          </div>
        </div>
        <div class="cert-grid">
          <div class="cert-field full">
            <span class="field-label">Nombre del participante</span>
            <span class="field-value destacado">${escapar(cert.nombre)}</span>
          </div>
          <div class="cert-field full">
            <span class="field-label">Programa / Idioma</span>
            <span class="field-value">${escapar(cert.programa)}</span>
          </div>
          <div class="cert-field">
            <span class="field-label">Nivel certificado</span>
            <span class="field-value">${escapar(cert.nivel)}</span>
          </div>
          <div class="cert-field">
            <span class="field-label">Fecha de emisión</span>
            <span class="field-value">${formatearFecha(cert.fecha)}</span>
          </div>
          <div class="cert-field full">
            <span class="field-label">Código de verificación</span>
            <span class="field-value codigo-val">${escapar(cert.codigo)}</span>
          </div>
          <div class="cert-field">
            <span class="field-label">Estado</span>
            <span class="estado-pill pill-valido">● ${escapar(cert.estado)}</span>
          </div>
        </div>
        <div class="cert-divider"></div>
        <div class="cert-auth">
          <span class="auth-icon">🔒</span>
          <span class="auth-text">La autenticidad de este certificado ha sido verificada en el registro digital de INED.</span>
        </div>
      </div>
    </div>`;
  mostrarResultado(html);
}

function renderAnulado(cert) {
  const html = `
    <div class="estado-anulado">
      <div class="resultado-status">
        <div class="status-icon">⚠</div>
        <div class="status-texts">
          <span class="status-label">Certificado Anulado</span>
          <span class="status-sub">Este certificado ha sido invalidado por INED</span>
        </div>
      </div>
      <div class="cert-body">
        <div class="cert-grid">
          <div class="cert-field full">
            <span class="field-label">Nombre del participante</span>
            <span class="field-value destacado">${escapar(cert.nombre)}</span>
          </div>
          <div class="cert-field">
            <span class="field-label">Programa / Idioma</span>
            <span class="field-value">${escapar(cert.programa)}</span>
          </div>
          <div class="cert-field">
            <span class="field-label">Nivel</span>
            <span class="field-value">${escapar(cert.nivel)}</span>
          </div>
          <div class="cert-field full">
            <span class="field-label">Código de verificación</span>
            <span class="field-value codigo-val">${escapar(cert.codigo)}</span>
          </div>
          <div class="cert-field">
            <span class="field-label">Estado</span>
            <span class="estado-pill pill-anulado">⚠ ${escapar(cert.estado)}</span>
          </div>
        </div>
        <div class="cert-divider"></div>
        <div class="cert-auth">
          <span class="auth-icon">⚠️</span>
          <span class="auth-text">Este certificado ha sido marcado como anulado en el registro digital de INED y no tiene validez oficial.</span>
        </div>
      </div>
    </div>`;
  mostrarResultado(html);
}

function renderNoEncontrado(codigoBuscado) {
  const html = `
    <div class="estado-noenc">
      <div class="resultado-status">
        <div class="status-icon">✕</div>
        <div class="status-texts">
          <span class="status-label">Certificado No Encontrado</span>
          <span class="status-sub">El código no existe en el registro digital</span>
        </div>
      </div>
      <div class="no-enc-body">
        <p>El código <strong>"${escapar(codigoBuscado)}"</strong> no se encontró en la base de datos de INED.<br>
        Verifica que el código esté escrito correctamente tal como aparece en el certificado.</p>
        <button class="btn-reintentar" onclick="limpiarYFocar()">
          ← Intentar de nuevo
        </button>
      </div>
    </div>`;
  mostrarResultado(html);
}

function mostrarError(mensaje) {
  const html = `
    <div class="estado-noenc">
      <div class="resultado-status">
        <div class="status-icon">!</div>
        <div class="status-texts">
          <span class="status-label">Error</span>
          <span class="status-sub">No se pudo completar la verificación</span>
        </div>
      </div>
      <div class="no-enc-body">
        <p>${escapar(mensaje)}</p>
        <button class="btn-reintentar" onclick="limpiarYFocar()">← Volver</button>
      </div>
    </div>`;
  mostrarResultado(html);
}

function mostrarResultado(html) {
  const resultEl = document.getElementById("resultado");
  resultEl.innerHTML = html;
  resultEl.classList.remove("hidden");
  resultEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* ── Helpers ────────────────────────────────────────────── */
function escapar(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Intenta formatear la fecha (YYYY-MM-DD o DD/MM/YYYY) a formato largo en español.
 * Si no puede, devuelve el texto original.
 */
function formatearFecha(str) {
  if (!str) return "—";
  try {
    let d;
    if (/^\d{4}-\d{2}-\d{2}$/.test(str.trim())) {
      d = new Date(str.trim() + "T00:00:00");
    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(str.trim())) {
      const [dd, mm, yyyy] = str.trim().split("/");
      d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
    } else {
      return escapar(str);
    }
    if (isNaN(d)) return escapar(str);
    return d.toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return escapar(str);
  }
}

function limpiarYFocar() {
  const resultEl = document.getElementById("resultado");
  resultEl.classList.add("hidden");
  const input = document.getElementById("codigoInput");
  input.value = "";
  input.focus();
}

function escucharEnter() {
  document.getElementById("codigoInput")
    .addEventListener("keydown", e => {
      if (e.key === "Enter") buscarCertificado();
    });
}
