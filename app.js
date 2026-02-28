// ╔══════════════════════════════════════════════════════════════╗
// ║          RIFAS EL MENOR — app.js  v4                        ║
// ║  Cambia SOLO las líneas marcadas con ◄                      ║
// ╚══════════════════════════════════════════════════════════════╝

const PRECIO_BOLETO      = 5;      // ◄ Precio en Bs. por boleto
const MINIMO_BOLETOS     = 20;     // ◄ Mínimo de boletos a comprar
const TOTAL_BOLETOS      = 10000;  // 0000-9999 — no tocar
const BOLETOS_POR_PAGINA = 500;    // boletos por página — no tocar
const VIP_URL = 'https://chat.whatsapp.com/ChkSensk7jPHY5qS8e2VRM?mode=gi_t';

// ─────────────────────────────────────────
// ESTADO GLOBAL
// ─────────────────────────────────────────
let ticketStates    = new Map();
let availableList   = [];
let currentPage     = 1;
let totalPages      = 1;
let selectedTickets = new Set();
let cdInterval      = null;

// ─────────────────────────────────────────
// INICIO
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('statPrecio').textContent = PRECIO_BOLETO;
  document.getElementById('statMin').textContent    = MINIMO_BOLETOS;
  document.getElementById('minLabel').textContent   = MINIMO_BOLETOS;

  showToast('⏳ Cargando rifas...', 1800);
  await loadTicketStates();
  buildAvailableList();
  renderPage();
  updateStats();
  updateSalesBar();

  // ★ Abre el modal de Términos automáticamente al cargar
  setTimeout(() => openTermsModal(), 600);
});

// ─────────────────────────────────────────
// CARGAR ESTADOS DESDE SUPABASE
// ─────────────────────────────────────────
async function loadTicketStates() {
  try {
    const { data, error } = await db
      .from('tickets').select('numero,estado')
      .in('estado', ['vendido','reservado']);
    if (error) throw error;
    if (data) data.forEach(t => ticketStates.set(parseInt(t.numero), t.estado));
  } catch(e) {
    console.error('loadTicketStates:', e);
    showToast('⚠️ Sin conexión. Modo demo.', 2000);
  }
}

// ─────────────────────────────────────────
// CONSTRUIR LISTA DE DISPONIBLES
// ─────────────────────────────────────────
function buildAvailableList() {
  availableList = [];
  for (let i = 0; i < TOTAL_BOLETOS; i++) {
    if (!ticketStates.has(i)) availableList.push(i);
  }
  totalPages = Math.max(1, Math.ceil(availableList.length / BOLETOS_POR_PAGINA));
  if (currentPage > totalPages) currentPage = 1;
}

// ─────────────────────────────────────────
// ★ BARRA DE VENTAS — actualiza header
// ─────────────────────────────────────────
function updateSalesBar() {
  const sold = TOTAL_BOLETOS - availableList.length;
  const pct  = Math.round((sold / TOTAL_BOLETOS) * 100);
  const rem  = availableList.length;

  const fillEl = document.getElementById('salesFill');
  const pctEl  = document.getElementById('salesPct');
  const soldEl = document.getElementById('salesSold');
  const remEl  = document.getElementById('salesRem');

  if (fillEl) fillEl.style.width = pct + '%';
  if (pctEl)  pctEl.textContent  = pct + '%';
  if (soldEl) soldEl.textContent = sold.toLocaleString();
  if (remEl)  remEl.textContent  = rem.toLocaleString();
}

// ─────────────────────────────────────────
// RENDERIZADO
// ─────────────────────────────────────────
function renderPage() {
  const grid  = document.getElementById('ticketGrid');
  const start = (currentPage - 1) * BOLETOS_POR_PAGINA;
  const end   = Math.min(start + BOLETOS_POR_PAGINA, availableList.length);
  const slice = availableList.slice(start, end);

  const frag = document.createDocumentFragment();
  slice.forEach(num => frag.appendChild(createTicketElement(num)));
  grid.innerHTML = '';
  grid.appendChild(frag);

  document.getElementById('pageIndicator').textContent =
    availableList.length > 0 ? `${currentPage} / ${totalPages}` : '—';
  document.getElementById('btnPrev').disabled = currentPage === 1;
  document.getElementById('btnNext').disabled = currentPage === totalPages || availableList.length === 0;

  const ji = document.getElementById('pageJump');
  if (ji) { ji.max = totalPages; ji.placeholder = `1-${totalPages}`; }
}

function createTicketElement(num) {
  const btn = document.createElement('button');
  btn.className = 'ticket'; btn.dataset.num = num;
  btn.textContent = String(num).padStart(4,'0');
  applyTicketStyle(btn, num);
  btn.addEventListener('click', () => toggleTicket(num));
  return btn;
}

function applyTicketStyle(btn, num) {
  btn.className = 'ticket';
  btn.classList.add(selectedTickets.has(num) ? 'ticket-selected' : 'ticket-available');
  btn.disabled = false;
}

// ─────────────────────────────────────────
// TOGGLE TICKET
// ─────────────────────────────────────────
function toggleTicket(num) {
  selectedTickets.has(num) ? selectedTickets.delete(num) : selectedTickets.add(num);
  const btn = document.querySelector(`.ticket[data-num="${num}"]`);
  if (btn) applyTicketStyle(btn, num);
  updateFloatingBar();
}

// ─────────────────────────────────────────
// SELECCIÓN ALEATORIA Fisher-Yates
// ─────────────────────────────────────────
function randomSelect() {
  clearSelection(false);
  if (availableList.length < MINIMO_BOLETOS) {
    showToast('⚠️ No hay suficientes números disponibles', 2500); return;
  }
  const pool = availableList.slice();
  for (let i = 0; i < MINIMO_BOLETOS; i++) {
    const j = i + Math.floor(Math.random() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
    selectedTickets.add(pool[i]);
  }
  const first = Math.min(...selectedTickets);
  currentPage = Math.floor(availableList.indexOf(first) / BOLETOS_POR_PAGINA) + 1;
  renderPage(); updateFloatingBar();
  showToast(`🎲 ¡${MINIMO_BOLETOS} números elegidos al azar!`, 2000);
}

// ─────────────────────────────────────────
// LIMPIAR
// ─────────────────────────────────────────
function clearSelection(showMsg = true) {
  selectedTickets.clear();
  document.querySelectorAll('.ticket-selected')
    .forEach(b => applyTicketStyle(b, parseInt(b.dataset.num)));
  updateFloatingBar();
  if (showMsg) showToast('🗑️ Selección limpiada', 1500);
}

// ─────────────────────────────────────────
// BARRA FLOTANTE
// ─────────────────────────────────────────
function updateFloatingBar() {
  const count = selectedTickets.size;
  document.getElementById('countLabel').innerHTML =
    `${count} / <span id="minLabel">${MINIMO_BOLETOS}</span>`;
  document.getElementById('progressBar').style.width =
    Math.min((count / MINIMO_BOLETOS) * 100, 100) + '%';
  document.getElementById('totalPrice').textContent = `Bs. ${count * PRECIO_BOLETO}`;
  const btn = document.getElementById('btnPagar');
  btn.disabled = count < MINIMO_BOLETOS;
  btn.style.opacity = count >= MINIMO_BOLETOS ? '1' : '0.4';
}

function updateStats() {
  document.getElementById('statDisp').textContent = availableList.length.toLocaleString();
}

// ─────────────────────────────────────────
// BÚSQUEDA
// ─────────────────────────────────────────
document.getElementById('searchInput').addEventListener('input', function() {
  const val = this.value.trim();
  if (val === '') { renderPage(); return; }
  const num = parseInt(val);
  if (isNaN(num) || num < 0 || num > 9999) return;
  const idx = availableList.indexOf(num);
  if (idx === -1) { showToast('🔒 Ese número ya no está disponible', 2000); return; }
  currentPage = Math.floor(idx / BOLETOS_POR_PAGINA) + 1;
  renderPage();
  setTimeout(() => {
    const btn = document.querySelector(`.ticket[data-num="${num}"]`);
    if (btn) {
      btn.scrollIntoView({ behavior:'smooth', block:'center' });
      btn.style.boxShadow = '0 0 0 3px #0EA5E9, 0 0 20px rgba(14,165,233,.6)';
      setTimeout(() => { btn.style.boxShadow = ''; }, 2000);
    }
  }, 120);
});

// ─────────────────────────────────────────
// PAGINACIÓN
// ─────────────────────────────────────────
function changePage(dir) {
  const p = currentPage + dir;
  if (p < 1 || p > totalPages) return;
  currentPage = p; renderPage();
  window.scrollTo({ top:0, behavior:'smooth' });
}
function jumpToPage() {
  const v = parseInt(document.getElementById('pageJump').value);
  if (v >= 1 && v <= totalPages) {
    currentPage = v; renderPage();
    window.scrollTo({ top:0, behavior:'smooth' });
  }
}

// ═══════════════════════════════════════════════════
// ★ MODAL TÉRMINOS — abre automáticamente al cargar
// ═══════════════════════════════════════════════════
function openTermsModal() {
  document.getElementById('termsModal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function acceptTerms() {
  document.getElementById('termsModal').style.display = 'none';
  document.body.style.overflow = '';
  const anchor = document.getElementById('ticketSection');
  if (anchor) anchor.scrollIntoView({ behavior:'smooth', block:'start' });
}

// ─────────────────────────────────────────
// MODAL PAGO
// ─────────────────────────────────────────
function openPayModal() {
  if (selectedTickets.size < MINIMO_BOLETOS) {
    showToast(`⚠️ Mínimo ${MINIMO_BOLETOS} boletos`, 2000); return;
  }
  const chips = document.getElementById('selectedChips');
  chips.innerHTML = '';
  [...selectedTickets].sort((a,b) => a-b).forEach(n => {
    const c = document.createElement('span');
    c.className = 'selected-chip'; c.textContent = String(n).padStart(4,'0');
    chips.appendChild(c);
  });
  document.getElementById('modalTotal').textContent = `Bs. ${selectedTickets.size * PRECIO_BOLETO}`;
  document.getElementById('payModal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
function closePayModal() {
  document.getElementById('payModal').style.display = 'none';
  document.body.style.overflow = '';
}

function previewCapture(input) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const prev = document.getElementById('capturePreview');
    prev.src = e.target.result; prev.classList.remove('hidden');
    document.getElementById('uploadIcon').textContent = '✅';
    document.getElementById('uploadText').textContent = file.name;
  };
  reader.readAsDataURL(file);
}

// ═══════════════════════════════════════════════════
// ENVIAR PEDIDO con verificación anti-duplicado
// ═══════════════════════════════════════════════════
async function submitOrder(e) {
  e.preventDefault();
  const nombre      = document.getElementById('fNombre').value.trim();
  const cedula      = document.getElementById('fCedula').value.trim();
  const whatsapp    = document.getElementById('fWhatsapp').value.trim();
  const ref         = document.getElementById('fRef').value.trim();
  const captureFile = document.getElementById('fCapture').files[0];

  if (!nombre || !cedula || !whatsapp || !ref || !captureFile) {
    showToast('⚠️ Completa todos los campos', 2000); return;
  }
  if (!/^[0-9]{6}$/.test(ref)) {
    showToast('⚠️ El comprobante debe tener exactamente 6 dígitos', 2500); return;
  }

  const btn = e.target.querySelector('button[type="submit"]');
  btn.textContent = '⏳ Verificando...'; btn.disabled = true;
  const numerosArr = [...selectedTickets].sort((a,b) => a-b);

  // Verificación anti-duplicado
  try {
    const { data:conf, error:cErr } = await db
      .from('tickets').select('numero,estado')
      .in('numero', numerosArr).in('estado', ['reservado','vendido']);
    if (cErr) throw cErr;
    if (conf && conf.length > 0) {
      conf.forEach(t => { ticketStates.set(parseInt(t.numero), t.estado); selectedTickets.delete(parseInt(t.numero)); });
      buildAvailableList(); renderPage(); updateStats(); updateSalesBar(); updateFloatingBar();
      const lista = conf.map(t => String(t.numero).padStart(4,'0')).join(', ');
      btn.textContent = '🚀 Confirmar y Reservar'; btn.disabled = false;
      closePayModal();
      showToast(`⚡ Los nros. ${lista} acaban de ser apartados. Elige otros.`, 5500);
      return;
    }
  } catch(vErr) {
    console.error('Anti-dup:', vErr);
    showToast('❌ Error al verificar. Intenta de nuevo.', 3000);
    btn.textContent = '🚀 Confirmar y Reservar'; btn.disabled = false; return;
  }

  btn.textContent = '⏳ Enviando...';

  try {
    // 1. Subir comprobante
    const ext = captureFile.name.split('.').pop();
    const fileName = `captures/${Date.now()}_${cedula.replace(/\W/g,'')}.${ext}`;
    const { error:upErr } = await db.storage.from('captures')
      .upload(fileName, captureFile, { contentType:captureFile.type });
    if (upErr) throw upErr;
    const { data:{ publicUrl } } = db.storage.from('captures').getPublicUrl(fileName);

    // 2. Insertar pedido
    const total = numerosArr.length * PRECIO_BOLETO;
    const { data:pedido, error:pedErr } = await db.from('pedidos')
      .insert([{ nombre, cedula, whatsapp, ref_comprobante:ref, numeros:numerosArr, total, capture_url:publicUrl, estado:'pendiente' }])
      .select().single();
    if (pedErr) throw pedErr;

    // 3. Reservar tickets
    const { error:tErr } = await db.from('tickets')
      .upsert(numerosArr.map(n => ({ numero:n, estado:'reservado', pedido_id:pedido.id })), { onConflict:'numero' });
    if (tErr) throw tErr;

    // 4. Actualizar local
    numerosArr.forEach(n => ticketStates.set(n, 'reservado'));
    buildAvailableList();
    closePayModal();
    
    // ★ AQUÍ SE ACTIVA TU BOT DE TELEGRAM AUTOMÁTICAMENTE ★
    notificarTelegram(nombre, numerosArr.length, total, ref);

    showSuccessModal({ nombre, cedula, whatsapp, ref, numeros:numerosArr, total });
    clearSelection(false);
    renderPage(); updateStats(); updateSalesBar();

  } catch(err) {
    console.error('submitOrder:', err);
    showToast('❌ Error al enviar. Intenta de nuevo.', 3000);
    btn.textContent = '🚀 Confirmar y Reservar'; btn.disabled = false;
  }
}

// ─────────────────────────────────────────
// MODAL ÉXITO + COUNTDOWN VIP
// ─────────────────────────────────────────
function showSuccessModal({ nombre, cedula, whatsapp, ref, numeros, total }) {
  document.getElementById('successSummary').innerHTML = `
    <div class="space-y-1 text-sm">
      <div class="flex justify-between"><span class="text-gray-400">Nombre:</span><span class="font-bold">${nombre}</span></div>
      <div class="flex justify-between"><span class="text-gray-400">Cédula:</span><span class="font-bold">${cedula}</span></div>
      <div class="flex justify-between"><span class="text-gray-400">WhatsApp:</span><span class="font-bold">${whatsapp}</span></div>
      <div class="flex justify-between"><span class="text-gray-400">Ref.:</span><span class="font-bold text-yellow-300">...${ref}</span></div>
      <div class="flex justify-between"><span class="text-gray-400">Boletos:</span><span class="font-bold">${numeros.length}</span></div>
      <div class="flex justify-between"><span class="text-gray-400">Total:</span><span class="font-black text-teal-300">Bs. ${total}</span></div>
    </div>`;
  document.getElementById('successModal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  startCountdown();
}

function startCountdown() {
  if (cdInterval) clearInterval(cdInterval);
  const TOTAL = 3; let rem = TOTAL;
  const ring = document.getElementById('cdRing');
  const num  = document.getElementById('cdNum');
  const set  = s => {
    if (ring) ring.style.setProperty('--pct', Math.round((s/TOTAL)*100)+'%');
    if (num)  num.textContent = s;
  };
  set(rem);
  cdInterval = setInterval(() => {
    rem--; set(rem);
    if (rem <= 0) { clearInterval(cdInterval); cdInterval = null; goVIP(); }
  }, 1000);
}

function goVIP() {
  if (cdInterval) { clearInterval(cdInterval); cdInterval = null; }
  window.open(VIP_URL, '_blank');
}

function closeSuccessModal() {
  if (cdInterval) { clearInterval(cdInterval); cdInterval = null; }
  document.getElementById('successModal').style.display = 'none';
  document.body.style.overflow = '';
  document.getElementById('payForm').reset();
  document.getElementById('capturePreview').classList.add('hidden');
  document.getElementById('uploadIcon').textContent = '📎';
  document.getElementById('uploadText').textContent = 'Toca para subir la foto del comprobante';
}

// ═══════════════════════════════════════════════════
// ★ COPIAR AL PORTAPAPELES
// ═══════════════════════════════════════════════════
function copyText(text, toastMsg = 'Copiado ✅') {
  navigator.clipboard.writeText(text)
    .then(() => showToast(toastMsg, 1800))
    .catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.cssText = 'position:fixed;opacity:0;';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      showToast(toastMsg, 1800);
    });
}

// ─────────────────────────────────────────
// VERIFICAR MIS BOLETOS
// ─────────────────────────────────────────
function openVerifyModal() {
  document.getElementById('verifyCedula').value = '';
  document.getElementById('verifyResults').innerHTML = '';
  document.getElementById('verifyModal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('verifyCedula').focus(), 300);
}
function closeVerifyModal() {
  document.getElementById('verifyModal').style.display = 'none';
  document.body.style.overflow = '';
}

async function buscarMisBoletos() {
  const cedula = document.getElementById('verifyCedula').value.trim();
  if (!cedula) { showToast('⚠️ Escribe tu cédula primero', 2000); return; }
  const btn = document.getElementById('btnBuscarBoletos');
  btn.textContent = '⏳...'; btn.disabled = true;
  const resultsDiv = document.getElementById('verifyResults');
  resultsDiv.innerHTML = '';
  try {
    const { data, error } = await db.from('pedidos')
      .select('id,nombre,cedula,numeros,total,estado,created_at')
      .ilike('cedula', `%${cedula.replace(/^[VEJvej]-?/,'')}%`);
    if (error) throw error;
    if (!data || data.length === 0) {
      resultsDiv.innerHTML = `
        <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);
          border-radius:14px;padding:24px 16px;text-align:center;">
          <div style="font-size:40px;margin-bottom:8px">🔎</div>
          <div style="font-weight:800;margin-bottom:4px">Sin resultados</div>
          <div style="font-size:13px;color:#9B8EC4">No encontramos pedidos con esa cédula.</div>
        </div>`;
      return;
    }
    const badges = {
      pendiente:{ icon:'⏳', label:'Pago pendiente', color:'#FBB124', bg:'rgba(251,191,36,.1)', border:'rgba(251,191,36,.35)' },
      aprobado: { icon:'✅', label:'¡Confirmado!',   color:'#5EEAD4', bg:'rgba(20,184,166,.1)', border:'rgba(20,184,166,.35)' },
      rechazado:{ icon:'❌', label:'Rechazado',       color:'#FCA5A5', bg:'rgba(239,68,68,.1)',  border:'rgba(239,68,68,.35)'  },
    };
    resultsDiv.innerHTML =
      `<div style="font-size:12px;font-weight:800;color:#9B8EC4;margin-bottom:8px;">
        ${data.length} PEDIDO${data.length>1?'S':''} ENCONTRADO${data.length>1?'S':''}:
       </div>` +
      data.map(p => {
        const b = badges[p.estado] || badges.pendiente;
        const nums = (p.numeros||[]).map(n => `<span class="vr-num">${String(n).padStart(4,'0')}</span>`).join('');
        const fecha = new Date(p.created_at).toLocaleString('es-VE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
        return `
        <div class="vr-card" style="background:${b.bg};border-color:${b.border}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;gap:8px;">
            <div>
              <div style="font-weight:800;font-size:15px">${p.nombre}</div>
              <div style="font-size:11px;color:#9B8EC4;margin-top:2px">${fecha}</div>
            </div>
            <span style="background:rgba(0,0,0,.3);border-radius:8px;padding:4px 10px;
              font-size:11px;font-weight:800;color:${b.color};white-space:nowrap;flex-shrink:0">
              ${b.icon} ${b.label}</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;margin-bottom:10px;">
            <div><span style="color:#9B8EC4;font-size:11px;display:block">Cédula</span><b>${p.cedula}</b></div>
            <div><span style="color:#9B8EC4;font-size:11px;display:block">Boletos</span><b>${(p.numeros||[]).length}</b></div>
            <div style="grid-column:span 2"><span style="color:#9B8EC4;font-size:11px;display:block">Total pagado</span>
              <b style="color:#5EEAD4;font-size:16px">Bs. ${p.total}</b></div>
          </div>
          <div><div style="font-size:11px;font-weight:800;color:#9B8EC4;margin-bottom:4px">TUS NÚMEROS:</div><div>${nums}</div></div>
        </div>`;
      }).join('');
  } catch(err) {
    console.error(err);
    resultsDiv.innerHTML = `
      <div style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);
        border-radius:14px;padding:16px;text-align:center;color:#FCA5A5;font-weight:700">
        ❌ Error al consultar. Revisa tu conexión.
      </div>`;
  } finally {
    btn.textContent = 'Buscar'; btn.disabled = false;
  }
}

// ─────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────
function showToast(msg, duration = 2000) {
  const old = document.querySelector('.toast'); if (old) old.remove();
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), duration);
}

// ─────────────────────────────────────────
// NOTIFICACIONES TELEGRAM
// ─────────────────────────────────────────
async function notificarTelegram(nombre, boletos, total, ref) {
  const BOT_TOKEN = '8666595624:AAGoWxS-9QGxtB1p4opumRqWoyB4n-Su4tI'; 
  const CHAT_ID = '5873749605'; 
  
  const mensaje = `🚨 ¡NUEVA RESERVA! 🚨\n\n👤 Cliente: ${nombre}\n🎟️ Boletos: ${boletos}\n💰 Pago: Bs. ${total}\n🧾 Referencia: ${ref}\n\nRevisa el panel de Admin. 🏃‍♂️💨`;

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text: mensaje })
    });
  } catch (error) {
    console.log('Error enviando Telegram:', error);
  }
}
