// ============================================================
// SISTEMA DE RESERVAS — ESPAÇOS SENAC BRASILÉIA
// Offline-first com sincronização Firebase (opcional)
// ============================================================

// ─── ESPAÇOS DISPONÍVEIS ────────────────────────────────────
const ESPACOS = [
  {
    id: "auditorio",
    nome: "Auditório Senac",
    sala: "",
    descricao: "Espaço institucional",
    icone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
  },
  {
    id: "lab105",
    nome: "Lab. Informática",
    sala: "Sala 105",
    descricao: "Laboratório de Informática",
    icone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>`
  },
  {
    id: "lab106",
    nome: "Lab. Informática",
    sala: "Sala 106",
    descricao: "Laboratório de Informática",
    icone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>`
  },
  {
    id: "hardware107",
    nome: "Lab. Hardware",
    sala: "Sala 107",
    descricao: "Sala de Hardware",
    icone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="12" x="3" y="6" rx="2"/><path d="M7 6V4M12 6V4M17 6V4M7 18v2M12 18v2M17 18v2"/></svg>`
  },
  {
    id: "lab112",
    nome: "Lab. de Saúde",
    sala: "Sala 112",
    descricao: "Laboratório de Saúde",
    icone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z"/></svg>`
  }
];

// ─── ESPAÇO ATIVO (via query param ?espaco=) ─────────────────
function getEspacoAtivo() {
  const param = new URLSearchParams(window.location.search).get("espaco") || "auditorio";
  return ESPACOS.find(e => e.id === param) || ESPACOS[0];
}

function getEspacoById(id) {
  return ESPACOS.find(e => e.id === id) || ESPACOS[0];
}

// ─── FIREBASE CONFIG ───────────────────────────────────────
// Substitua os valores abaixo pelas credenciais do seu
// projeto no Firebase Console → Configurações do Projeto
// → Seus aplicativos → SDK de configuração (Config).
// Deixe SUA_API_KEY_AQUI e os demais inalterados para
// operar apenas com armazenamento local (offline).
const FIREBASE_CONFIG = {
  apiKey:            "SUA_API_KEY_AQUI",
  authDomain:        "SEU_PROJETO.firebaseapp.com",
  projectId:         "SEU_PROJETO",
  storageBucket:     "SEU_PROJETO.appspot.com",
  messagingSenderId: "SEU_MESSAGING_SENDER_ID",
  appId:             "SEU_APP_ID"
};

// ─── ESTADO GLOBAL DO FIREBASE ─────────────────────────────
let _firebaseApp  = null;
let _firestoreDb  = null;
let _firebaseAuth = null;
let _firebaseReady = false;

// ─── VERIFICAÇÃO SE O FIREBASE ESTÁ CONFIGURADO ─────────────
function isFirebaseConfigured() {
  return (
    FIREBASE_CONFIG.apiKey &&
    FIREBASE_CONFIG.apiKey !== "SUA_API_KEY_AQUI" &&
    FIREBASE_CONFIG.projectId &&
    FIREBASE_CONFIG.projectId !== "SEU_PROJETO"
  );
}

// ─── CARREGAMENTO DINÂMICO DE SDK ───────────────────────────
function loadScript(url) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${url}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = url;
    s.onload  = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// ─── INICIALIZAÇÃO DO FIREBASE ──────────────────────────────
async function initFirebase() {
  if (_firebaseReady || !isFirebaseConfigured()) return false;

  try {
    const CDN = "https://www.gstatic.com/firebasejs/10.12.2/";
    await loadScript(CDN + "firebase-app-compat.js");
    await loadScript(CDN + "firebase-firestore-compat.js");
    await loadScript(CDN + "firebase-auth-compat.js");

    if (!firebase.apps.length) {
      _firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
    } else {
      _firebaseApp = firebase.app();
    }
    _firestoreDb  = firebase.firestore();
    _firebaseAuth = firebase.auth();
    _firebaseReady = true;

    console.log("[Senac] Firebase inicializado ✓");
    setupFirebaseRealtimeSync();
    return true;
  } catch (err) {
    console.warn("[Senac] Falha ao inicializar Firebase — modo offline ativo.", err);
    return false;
  }
}

// ─── SINCRONIZAÇÃO EM TEMPO REAL ─────────────────────────────
function setupFirebaseRealtimeSync() {
  if (!_firestoreDb) return;

  _firestoreDb.collection("reservas")
    .onSnapshot((snapshot) => {
      try {
        const cloudList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Funde com reservas locais que ainda não foram sincronizadas
        const localList = _getLocalReservations();
        const cloudIds  = new Set(cloudList.map(r => r.id));

        // Reservas locais não encontradas na nuvem (criadas offline)
        const pendingLocal = localList.filter(r => !cloudIds.has(r.id));

        // Enviar reservas pendentes para a nuvem
        pendingLocal.forEach(r => {
          const { id, ...data } = r;
          _firestoreDb.collection("reservas").doc(id).set(data).catch(console.warn);
        });

        // Salvar lista mesclada no localStorage
        const merged = [...cloudList, ...pendingLocal];
        _saveLocalReservations(merged);

        window.dispatchEvent(new Event("reservations-changed"));
      } catch (e) {
        console.warn("[Senac] Erro no sync em tempo real:", e);
      }
    }, (err) => {
      console.warn("[Senac] Erro ao escutar o Firestore:", err);
    });
}

// ─── INTERNOS DO LOCALSTORAGE ───────────────────────────────
function getStorageKey(espacoId) {
  return `senac_reservas_${espacoId || getEspacoAtivo().id}_v1`;
}
// Mantida por compatibilidade com código legado
const STORAGE_KEY = "senac_reservas_auditorio_v1";

function _getLocalReservations(espacoId) {
  try {
    const key = getStorageKey(espacoId);
    // Migração: tenta ler chave legada "senac_auditorio_reservas_v1" para o auditório
    if (!espacoId || espacoId === "auditorio") {
      const legacyKey = "senac_auditorio_reservas_v1";
      const legacy = localStorage.getItem(legacyKey);
      if (legacy) {
        localStorage.setItem(key, legacy);
        localStorage.removeItem(legacyKey);
      }
    }
    const raw = localStorage.getItem(key);
    const list = raw ? JSON.parse(raw) : [];
    return list.filter(r =>
      r && typeof r.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.date)
    );
  } catch { return []; }
}

function _saveLocalReservations(list, espacoId) {
  localStorage.setItem(getStorageKey(espacoId), JSON.stringify(list));
}

// ─── API PÚBLICA ─────────────────────────────────────────────

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const WEEKDAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const TIME_SLOTS = [
  "07:30-09:00",
  "09:00-10:30",
  "10:30-12:00",
  "13:00-14:30",
  "14:30-16:00",
  "16:00-17:30",
  "17:30-19:00",
  "19:00-22:00"
];

// ─── FERIADOS ────────────────────────────────────────────────
const FERIADOS_NACIONAIS_FIXOS = {
  "01-01": "Confraternização Universal",
  "04-21": "Tiradentes",
  "05-01": "Dia do Trabalho",
  "09-07": "Independência do Brasil",
  "10-12": "Nossa Senhora Aparecida / Dia das Crianças",
  "11-02": "Finados",
  "11-15": "Proclamação da República",
  "11-20": "Consciência Negra",
  "12-25": "Natal"
};

const FERIADOS_ACRE_FIXOS = {
  "01-20": "Dia do Católico (AC)",
  "01-23": "Dia do Evangélico (AC)",
  "03-08": "Dia Internacional da Mulher (AC)",
  "06-15": "Aniversário do Acre",
  "09-05": "Dia da Amazônia",
  "11-17": "Tratado de Petrópolis (AC)"
};

const FERIADOS_BRASILEIA_FIXOS = {
  "07-03": "Aniversário de Brasiléia"
};

function calcularFeriadosMoveis(ano) {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mesPascoa = Math.floor((h + l - 7 * m + 114) / 31);
  const diaPascoa = ((h + l - 7 * m + 114) % 31) + 1;

  const pascoa = new Date(ano, mesPascoa - 1, diaPascoa);
  const carnavalTerca   = new Date(pascoa); carnavalTerca.setDate(pascoa.getDate() - 47);
  const carnavalSegunda = new Date(pascoa); carnavalSegunda.setDate(pascoa.getDate() - 48);
  const sextaSanta      = new Date(pascoa); sextaSanta.setDate(pascoa.getDate() - 2);
  const corpusChristi   = new Date(pascoa); corpusChristi.setDate(pascoa.getDate() + 60);

  function toKey(d) { return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

  function obterSegundoDomingo(ano, mes) {
    let domingos = 0;
    for (let dia = 1; dia <= 14; dia++) {
      const d = new Date(ano, mes, dia);
      if (d.getDay() === 0) {
        domingos++;
        if (domingos === 2) return d;
      }
    }
    return null;
  }

  const diaDasMaes = obterSegundoDomingo(ano, 4); // Maio
  const diaDosPais = obterSegundoDomingo(ano, 7); // Agosto

  return {
    [toKey(carnavalSegunda)]: "Segunda de Carnaval",
    [toKey(carnavalTerca)]:   "Carnaval",
    [toKey(sextaSanta)]:      "Sexta-Feira Santa",
    [toKey(pascoa)]:          "Páscoa",
    [toKey(corpusChristi)]:   "Corpus Christi",
    [toKey(diaDasMaes)]:      "Dia das Mães",
    [toKey(diaDosPais)]:      "Dia dos Pais"
  };
}

function getFeriadosDoAno(ano) {
  const feriados = {};
  const moveis = calcularFeriadosMoveis(ano);
  for (const [mmdd, nome] of Object.entries(moveis))
    feriados[`${ano}-${mmdd}`] = nome;
  for (const [mmdd, nome] of Object.entries(FERIADOS_NACIONAIS_FIXOS))
    feriados[`${ano}-${mmdd}`] = nome;
  for (const [mmdd, nome] of Object.entries(FERIADOS_ACRE_FIXOS))
    feriados[`${ano}-${mmdd}`] = nome;
  for (const [mmdd, nome] of Object.entries(FERIADOS_BRASILEIA_FIXOS))
    feriados[`${ano}-${mmdd}`] = nome;
  return feriados;
}

function getFeriadoNome(dateISO) {
  if (!dateISO) return null;
  const ano = parseInt(dateISO.split("-")[0], 10);
  return getFeriadosDoAno(ano)[dateISO] || null;
}

// ─── RESERVAS (CRUD) ─────────────────────────────────────────

function getReservations(espacoId) {
  return _getLocalReservations(espacoId || getEspacoAtivo().id);
}

function getAllReservations() {
  // Retorna todas as reservas de todos os espaços, adicionando o campo 'espaco'
  return ESPACOS.flatMap(e => {
    const reservas = _getLocalReservations(e.id);
    return reservas.map(r => ({ ...r, espaco: e.id }));
  });
}

function saveReservations(list, espacoId) {
  _saveLocalReservations(list, espacoId || getEspacoAtivo().id);
  window.dispatchEvent(new Event("reservations-changed"));
}

function addReservation(r, espacoId) {
  if (!r.date || typeof r.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(r.date))
    return { ok: false, error: "Data inválida ou não especificada." };
  if (!r.slot || typeof r.slot !== "string" || !r.slot.trim())
    return { ok: false, error: "Horário da reserva é obrigatório." };

  const eid = espacoId || getEspacoAtivo().id;
  const list = getReservations(eid);
  const conflict = list.find(x => {
    if (x.date !== r.date) return false;
    const existingInv = parseInterval(x.slot);
    const newInv = parseInterval(r.slot);
    if (!existingInv || !newInv) {
      return x.slot.trim().toLowerCase() === r.slot.trim().toLowerCase();
    }
    return newInv.start < existingInv.end && newInv.end > existingInv.start;
  });
  
  if (conflict)
    return { ok: false, error: "Conflito: Este horário se sobrepõe a uma reserva existente." };

  const item = {
    ...r,
    espaco: eid,
    id: (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()
      : generateUUID(),
    createdAt: new Date().toISOString()
  };
  list.push(item);
  _saveLocalReservations(list, eid);
  window.dispatchEvent(new Event("reservations-changed"));

  // Sincroniza com Firestore em background (não bloqueia a UI)
  if (_firebaseReady && _firestoreDb) {
    const { id, ...data } = item;
    _firestoreDb.collection("reservas").doc(id).set(data).catch(err =>
      console.warn("[Senac] Falha ao salvar no Firestore:", err)
    );
  }

  return { ok: true, reservation: item };
}

function updateReservation(id, patch, espacoId) {
  if (patch.date !== undefined &&
      (typeof patch.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(patch.date)))
    return { ok: false, error: "Data inválida." };

  const eid = espacoId || getEspacoAtivo().id;
  const list = getReservations(eid);
  const idx  = list.findIndex(x => x.id === id);
  if (idx === -1) return { ok: false, error: "Reserva não encontrada." };

  if (patch.date !== undefined || patch.slot !== undefined) {
    const newDate = patch.date !== undefined ? patch.date : list[idx].date;
    const newSlot = patch.slot !== undefined ? patch.slot : list[idx].slot;
    
    const conflict = list.find(x => {
      if (x.id === id || x.date !== newDate) return false;
      const existingInv = parseInterval(x.slot);
      const newInv = parseInterval(newSlot);
      if (!existingInv || !newInv) {
        return x.slot.trim().toLowerCase() === newSlot.trim().toLowerCase();
      }
      return newInv.start < existingInv.end && newInv.end > existingInv.start;
    });
    if (conflict) return { ok: false, error: "Conflito: O horário atualizado se sobrepõe a outra reserva existente." };
  }

  list[idx] = { ...list[idx], ...patch };
  _saveLocalReservations(list, eid);
  window.dispatchEvent(new Event("reservations-changed"));

  // Sincroniza com Firestore em background
  if (_firebaseReady && _firestoreDb) {
    _firestoreDb.collection("reservas").doc(id).update(patch).catch(err =>
      console.warn("[Senac] Falha ao atualizar no Firestore:", err)
    );
  }

  return { ok: true };
}

function deleteReservation(id, espacoId) {
  const eid = espacoId || getEspacoAtivo().id;
  const list = getReservations(eid).filter(x => x.id !== id);
  _saveLocalReservations(list, eid);
  window.dispatchEvent(new Event("reservations-changed"));

  // Remove do Firestore em background
  if (_firebaseReady && _firestoreDb) {
    _firestoreDb.collection("reservas").doc(id).delete().catch(err =>
      console.warn("[Senac] Falha ao excluir do Firestore:", err)
    );
  }

  return { ok: true };
}

// ─── FUNÇÕES AUXILIARES ──────────────────────────────────────

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c =>
    ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c])
  );
}

function parseInterval(slotStr) {
  if (!slotStr) return null;
  const s = slotStr.toLowerCase();
  if (s.includes("integral") || s.includes("dia todo") || s.includes("dia inteiro") ||
      s.includes("todo o dia") || s.includes("o dia todo"))
    return { start: 450, end: 1320 }; // 07:30 às 22:00
  if (s.includes("manhã") || s.includes("manha"))
    return { start: 450, end: 720 };  // 07:30 às 12:00
  if (s.includes("tarde"))
    return { start: 780, end: 1080 }; // 13:00 às 18:00
  if (s.includes("noite"))
    return { start: 1080, end: 1320 }; // 18:00 às 22:00

  const regex = /(\d{1,2})[h:](\d{2})?/gi;
  const matches = [];
  let match;
  while ((match = regex.exec(slotStr)) !== null) {
    const hours   = parseInt(match[1], 10);
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    matches.push(hours * 60 + minutes);
  }
  if (matches.length >= 2) return { start: matches[0], end: matches[1] };
  if (matches.length === 1) return { start: matches[0], end: matches[0] + 90 };
  return null;
}

function formatDatePT(dateISO) {
  if (!dateISO) return "";
  const [y, m, d] = dateISO.split("-");
  return `${d}/${m}/${y}`;
}

function pad(n) { return String(n).padStart(2, "0"); }

function toISODate(year, month0, day) {
  return `${year}-${pad(month0 + 1)}-${pad(day)}`;
}

function getReservationsByDate(date, espacoId) {
  return getReservations(espacoId || getEspacoAtivo().id).filter(r => r.date === date);
}

function getDayStatus(dateISO, espacoId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateISO + "T00:00:00");
  if (d < today) return "past";
  const slots = getReservations(espacoId || getEspacoAtivo().id).filter(r => r.date === dateISO);
  if (slots.length === 0) return "free";
  if (slots.length >= TIME_SLOTS.length) return "full";
  return "partial";
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ─── TRANSIÇÕES DE PÁGINAS (SPA-like) ───────────────────────

function navigateWithTransition(url) {
  const page   = document.querySelector(".page");
  const header = document.querySelector(".site-header");
  if (page) {
    page.style.transition = "opacity 0.1s ease";
    page.style.opacity    = "0";
  }
  setTimeout(() => { window.location.href = url; }, 120);
}

function initPageTransitions() {
  document.addEventListener("click", e => {
    const a = e.target.closest("a");
    if (!a) return;
    const href = a.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("javascript:") || a.target === "_blank") return;
    if (e.ctrlKey || e.shiftKey || e.metaKey) return;
    e.preventDefault();
    navigateWithTransition(href);
  });
}

// ─── BOOTSTRAP ───────────────────────────────────────────────

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initPageTransitions();
    initFirebase(); // tenta conectar Firebase em background
  });
} else {
  initPageTransitions();
  initFirebase();
}

// Exporta funções de autenticação Firebase para o admin.html
window._getFirebaseAuth = () => _firebaseAuth;
window._isFirebaseReady = () => _firebaseReady;
