// ╔══════════════════════════════════════════════════════════════╗
// ║          RIFA GRATIS M — app.js (30 TICKETS GRATIS)         ║
// ╚══════════════════════════════════════════════════════════════╝

const PRECIO_BOLETO      = 0;      
const BOLETOS_EXACTOS    = 30;     
const TOTAL_BOLETOS      = 10000;  
const BOLETOS_POR_PAGINA = 500;    
const VIP_URL = 'https://chat.whatsapp.com/HlIRyaYEKU86h2oQPZTCaM'; 

let ticketStates    = new Map();
let availableList   = [];
let currentPage     = 1;
let totalPages      = 1;
let selectedTickets = new Set();
let cdInterval      = null;

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('statMin').textContent    = BOLETOS_EXACTOS;
  
  showToast('⏳ Cargando rifas...', 1800);
  await loadTicketStates();
  buildAvailableList();

  const configReq = await db.from('landing_config').select('ventas_activas').eq('id', 'main').single();
  const configData = configReq.data;
  
  if (configData && configData.ventas_activas === false) {
    document.getElementById('ticketGrid').innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;background:rgba(239,68,68,0.15);border:2px dashed #ef4444;border-radius:12px;margin:20px;"><h2 style="color:#ef4444;font-size:24px;margin-bottom:10px;">🛑 VENTAS PAUSADAS 🛑</h2><p style="color:#fca5a5;">Estamos esperando los resultados.</p></div>';
    document.getElementById('btnPagar').style.display = 'none';
    const floatingBar = document.getElementById('floatingBar');
    if (floatingBar) floatingBar.style.display = 'none';
    return;
  }

  renderPage();
  updateSalesBar();
  setTimeout(() => openTermsModal(), 600);
});

async function loadTicketStates() {
  try {
    ticketStates.clear();
    let desde = 0, hasta = 999, hayMasData = true;
    while (hayMasData) {
      const { data, error } = await db.from('tickets').select('numero,estado').in('estado', ['vendido','reservado']).range(desde, hasta);
      if (error) throw error;
      if (data && data.length > 0) {
        data.forEach(t => ticketStates.set(parseInt(t.numero), t.estado));
        if (data.length < 1000) { hayMasData = false; } else { desde += 1000; hasta += 1000; }
      } else { hayMasData = false; }
    }
  } catch(e) { showToast('⚠️ Error al sincronizar números', 2000); }
}

function buildAvailableList() {
  availableList = [];
  for (let i = 0; i < TOTAL_BOLETOS; i++) {
    if (!ticketStates.has(i)) availableList.push(i);
  }
  totalPages = Math.max(1, Math.ceil(availableList.length / BOLETOS_POR_PAGINA));
  if (currentPage > totalPages) currentPage = 1;
}

function updateSalesBar() {
  const sold = TOTAL_BOLETOS - availableList.length;
  const pct  = Math.round((sold / TOTAL_BOLETOS) * 100);
  const fillEl = document.getElementById('salesFill');
  const pctEl  = document.getElementById('salesPct');
  const soldEl = document.getElementById('salesSold');
  if (fillEl) fillEl.style.width = pct + '%';
  if (pctEl) pctEl.textContent = pct + '%';
  if (soldEl) soldEl.textContent = sold;
  const disp = document.getElementById('statDisp');
  if (disp) disp.textContent = availableList.length;
}

function renderPage() {
  const grid = document.getElementById('ticketGrid');
  if (!grid) return;
  grid.innerHTML = '';
  const start = (currentPage - 1) * BOLETOS_POR_PAGINA;
  const end = start + BOLETOS_POR_PAGINA;
  
  for (let i = start; i < end && i < TOTAL_BOLETOS; i++) {
    let numStr = i.toString().padStart(4, '0');
    let t = document.createElement('div');
    t.className = 'ticket ' + (selectedTickets.has(i) ? 'ticket-selected' : 'ticket-available');
    t.textContent = numStr;
    if (ticketStates.has(i)) {
      t.style.opacity = '0.3';
      t.style.cursor = 'not-allowed';
      t.style.background = ticketStates.get(i) === 'vendido' ? 'rgba(239,68,68,0.2)' : 'rgba(234,179,8,0.2)';
    } else {
      t.onclick = () => toggleTicket(i);
    }
    grid.appendChild(t);
  }
  document.getElementById('pageIndicator').textContent = `${currentPage} / ${totalPages}`;
  document.getElementById('btnPrev').disabled = (currentPage === 1);
  document.getElementById('btnNext').disabled = (currentPage === totalPages);
}

function toggleTicket(num) {
  if (selectedTickets.has(num)) {
    selectedTickets.delete(num);
  } else {
    selectedTickets.add(num);
  }
  renderPage();
  updateFloatingBar();
}

function changePage(dir) {
  let newPage = currentPage + dir;
  if (newPage >= 1 && newPage <= totalPages) {
    currentPage = newPage;
    renderPage();
  }
}

function jumpToPage() {
  let input = parseInt(document.getElementById('pageJump').value);
  if (!isNaN(input) && input >= 1 && input <= totalPages) {
    currentPage = input;
    renderPage();
  } else {
    showToast(`Ingresa una pág entre 1 y ${totalPages}`);
  }
}

function randomSelect() {
  selectedTickets.clear();
  let pool = [...availableList];
  if (pool.length < BOLETOS_EXACTOS) { showToast(`❌ Solo quedan ${pool.length} boletos disponibles.`); return; }
  
  for (let i = 0; i < BOLETOS_EXACTOS; i++) {
    const j = i + Math.floor(Math.random() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
    selectedTickets.add(pool[i]);
  }
  
  const first = Math.min(...selectedTickets);
  currentPage = Math.floor(availableList.indexOf(first) / BOLETOS_POR_PAGINA) + 1;
  renderPage();
  updateFloatingBar();
  showToast(`🎲 ¡Tus 30 números fueron asignados al azar!`, 2000);
}

function clearSelection(showMsg) {
  selectedTickets.clear();
  renderPage();
  updateFloatingBar();
  if (showMsg !== false) showToast('🗑️ Selección limpia', 1500);
}

function updateFloatingBar() {
  let count = selectedTickets.size;
  document.getElementById('countLabel').innerHTML = `${count} / 30`;
  let tPrice = document.getElementById('totalPrice');
  if (tPrice) tPrice.textContent = `GRATIS`;
  let pct = Math.min((count / BOLETOS_EXACTOS) * 100, 100);
  document.getElementById('progressBar').style.width = pct + '%';
}

function openTermsModal() {
  if (!localStorage.getItem('termsAgreed')) document.getElementById('termsModal').style.display = 'flex';
}

function acceptTerms() {
  localStorage.setItem('termsAgreed', 'true');
  document.getElementById('termsModal').style.display = 'none';
}

function openPayModal() {
  let count = selectedTickets.size;
  
  if (count === 0) {
    showToast('⚠️ No has seleccionado ningún boleto.');
    return;
  }
  if (count < BOLETOS_EXACTOS) {
    let faltan = BOLETOS_EXACTOS - count;
    showToast(`⚠️ Mínimo son 30. Te faltan ${faltan} números.`);
    return;
  }
  if (count > BOLETOS_EXACTOS) {
    let sobran = count - BOLETOS_EXACTOS;
    showToast(`⚠️ Son 30 nada más. Por favor elimine ${sobran}.`);
    return;
  }

  const chips = document.getElementById('selectedChips');
  if (chips) {
    chips.innerHTML = '';
    [...selectedTickets].sort((a,b) => a-b).forEach(n => {
      const c = document.createElement('span');
      c.className = 'selected-chip';
      c.textContent = String(n).padStart(4,'0');
      chips.appendChild(c);
    });
  }
  
  document.getElementById('payModal').style.display = 'flex';
}

function closePayModal() { document.getElementById('payModal').style.display = 'none'; }
function copyText(text, msg) { navigator.clipboard.writeText(text).then(() => showToast(msg)); }

function previewCapture(input) {
  let file = input.files[0];
  if (file) {
    let reader = new FileReader();
    reader.onload = e => {
      let img = document.getElementById('capturePreview');
      if(img) {
        img.src = e.target.result;
        img.classList.remove('hidden');
      }
      let uploadText = document.getElementById('uploadText');
      if(uploadText) uploadText.textContent = "Foto cargada ✅";
      let uploadIcon = document.getElementById('uploadIcon');
      if(uploadIcon) uploadIcon.textContent = "🖼️";
    };
    reader.readAsDataURL(file);
  }
}

// ─────────────────────────────────────────
// LÓGICA DE COMPRA (CORREGIDA Y MODO DIAGNÓSTICO)
// ─────────────────────────────────────────
async function submitOrder(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.innerHTML = '⏳ Procesando y Verificando...';
  
  const nombre = document.getElementById('fNombre').value;
  const cedula = document.getElementById('fCedula').value;
  const whatsapp = document.getElementById('fWhatsapp').value;
  const totalPagado = selectedTickets.size * PRECIO_BOLETO;
  
  // Manejo seguro del comprobante
  const refEl = document.getElementById('fRef');
  const referencia = refEl ? refEl.value : '000000';
  
  const fileInput = document.getElementById('fCapture');
  const file = fileInput ? fileInput.files[0] : null;
  const numerosArr = Array.from(selectedTickets).sort((a,b) => a-b);

  try {
    // 1. Verificación de duplicados
    const { data: duplicados, error: errDup } = await db
      .from('pedidos')
      .select('id')
      .or(`cedula.eq.${cedula},whatsapp.eq.${whatsapp}`);
      
    if (errDup) {
        alert("🚨 ERROR DE LECTURA (Duplicados): " + errDup.message);
        throw errDup;
    }
    
    if (duplicados && duplicados.length > 0) {
      showToast('⚠️ REGISTRO DENEGADO: Ya existe un registro con esta cédula o teléfono.', 4500);
      btn.disabled = false;
      btn.innerHTML = '🚀 Confirmar y Asignar';
      return; 
    }

    // 2. Subida de comprobante
    let captureUrl = null;
    if (file) {
        const ext = file.name.split('.').pop();
        const filePath = `captures/${Date.now()}_${cedula}.${ext}`;
        // upsert: true previene errores si el archivo existe
        const { error: uploadError } = await db.storage.from('captures').upload(filePath, file, { upsert: true });
        
        if (uploadError) {
            alert("🚨 ERROR AL SUBIR FOTO: " + uploadError.message);
            throw uploadError;
        }
        captureUrl = db.storage.from('captures').getPublicUrl(filePath).data.publicUrl;
    }

    // 3. Guardar Pedido (Corregido ref_comprobante y array de numeros)
    const { data: pData, error: pError } = await db.from('pedidos').insert([{
      nombre: nombre, 
      cedula: cedula, 
      whatsapp: whatsapp, 
      total: totalPagado, 
      ref_comprobante: referencia, 
      numeros: numerosArr, 
      capture_url: captureUrl, 
      estado: 'pendiente'
    }]).select().single();
    
    if (pError) {
        alert("🚨 ERROR AL GUARDAR REGISTRO: " + pError.message + "\nDetalles: " + pError.details);
        throw pError;
    }

    // 4. Reservar Tickets
    const ticketsToInsert = numerosArr.map(n => ({ numero: n, pedido_id: pData.id, estado: 'reservado' }));
    const { error: tErr } = await db.from('tickets').upsert(ticketsToInsert, { onConflict: 'numero' });
    
    if (tErr) {
        alert("🚨 ERROR AL BLOQUEAR TICKETS: " + tErr.message);
        throw tErr;
    }

    numerosArr.forEach(n => ticketStates.set(n, 'reservado'));
    buildAvailableList();
    closePayModal();
    
    // Telegram (Aislado)
    try {
        await notificarTelegram(nombre, numerosArr.length, totalPagado, referencia);
    } catch(telErr) {
        console.warn("Telegram no respondió, pero los datos se guardaron", telErr);
    }
    
    // Éxito
    const summary = document.getElementById('successSummary');
    if (summary) {
        summary.innerHTML = `
          <div class="text-white">👤 ${nombre}</div>
          <div class="text-white">🎟️ ${numerosArr.length} boletos</div>
          <div class="text-white text-xs mt-1 text-gray-400">C.I: ${cedula}</div>
        `;
    }
    const sModal = document.getElementById('successModal');
    if (sModal) sModal.style.display = 'flex';
    
    clearSelection(false);
    renderPage();
    updateSalesBar();
    startVIPCountdown();
    
  } catch(error) {
    showToast('❌ Ocurrió un error. Revisa la ventana de alerta.');
    btn.disabled = false;
    btn.innerHTML = '🚀 Confirmar y Asignar';
  }
}

async function notificarTelegram(nombre, boletos, total, ref) {
  const BOT_TOKEN = '8666595624:AAGoWxS-9QGxtB1p4opumRqWoyB4n-Su4tI'; 
  const CHAT_ID = '5873749605'; 
  const mensaje = `🚨 ¡NUEVO REGISTRO GRATIS! 🔰\n\n👤 Cliente: ${nombre}\n🎟️ Boletos: ${boletos}`;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text: mensaje })
  });
}

const searchInput = document.getElementById('searchInput');
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    let val = e.target.value;
    if (val.length === 4) {
      let tickets = document.querySelectorAll('.ticket');
      tickets.forEach(tk => {
        if (tk.textContent === val) {
          tk.style.boxShadow = '0 0 15px #F97316';
          setTimeout(() => tk.style.boxShadow = '', 2000);
        }
      });
    }
  });
}

function openVerifyModal() { document.getElementById('verifyModal').style.display = 'flex'; }
function closeVerifyModal() { document.getElementById('verifyModal').style.display = 'none'; document.getElementById('verifyResults').innerHTML=''; }

async function buscarMisBoletos() {
  const btn = document.getElementById('btnBuscarBoletos');
  const cedula = document.getElementById('verifyCedula').value.trim();
  const resultsDiv = document.getElementById('verifyResults');
  if(cedula.length < 5) { showToast('Ingresa una cédula válida'); return; }
  
  btn.textContent = '⏳'; btn.disabled = true; resultsDiv.innerHTML = '';
  try {
    const { data, error } = await db.from('pedidos').select('id,nombre,cedula,numeros,estado').ilike('cedula', '%' + cedula.replace(/^[VEJvej]-?/,'') + '%');
    if (error) throw error;
    if (!data || data.length === 0) {
      resultsDiv.innerHTML = `<div style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:14px;padding:16px;text-align:center;color:#FCA5A5;font-weight:700">❌ No se encontraron registros.</div>`;
    } else {
      let html = '';
      data.forEach(p => {
        let badge = p.estado === 'aprobado' ? '<span style="background:rgba(34,197,94,.2);color:#86EFAC;padding:2px 6px;border-radius:6px;font-size:11px">Aprobado</span>' : '<span style="background:rgba(234,179,8,.2);color:#FDE68A;padding:2px 6px;border-radius:6px;font-size:11px">Pendiente</span>';
        html += `<div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:12px;margin-bottom:8px;font-size:13px;"><div class="flex justify-between mb-2"><strong>${p.nombre}</strong>${badge}</div><div class="text-gray-400 text-xs mb-1">Boletos: <span class="text-white">${p.numeros}</span></div></div>`;
      });
      resultsDiv.innerHTML = html;
    }
  } catch (err) {
    resultsDiv.innerHTML = '<div style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:14px;padding:16px;text-align:center;color:#FCA5A5;font-weight:700">❌ Error al consultar. Revisa tu conexión.</div>';
  } finally {
    btn.textContent = 'Buscar'; btn.disabled = false;
  }
}

function showToast(msg, duration = 3000) {
  const old = document.querySelector('.toast'); if (old) old.remove();
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), duration);
}

function startVIPCountdown() {
  let c = 3;
  document.getElementById('cdNum').textContent = c;
  document.getElementById('cdRing').style.setProperty('--pct', '100%');
  if (cdInterval) clearInterval(cdInterval);
  cdInterval = setInterval(() => {
    c--;
    document.getElementById('cdNum').textContent = c;
    document.getElementById('cdRing').style.setProperty('--pct', (c/3)*100 + '%');
    if (c <= 0) { clearInterval(cdInterval); goVIP(); }
  }, 1000);
}

function goVIP() { window.location.href = VIP_URL; }
function closeSuccessModal() { document.getElementById('successModal').style.display = 'none'; window.location.reload(); }
